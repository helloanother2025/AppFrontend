export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface RouteMatchMetrics {
  isMatch: boolean;
  matchType: 'PERFECT' | 'GOOD' | 'WEAK' | 'NO_MATCH';
  confidenceScore: number;
  isFallbackRoute: boolean;
  warnings: string[];
  totalRouteDistanceKm: number;
  directionOk: boolean;
  pickupDistanceKm: number;
  dropDistanceKm: number;
  pickupPosKm: number;
  dropPosKm: number;
  segmentDistanceKm: number;
  detourDistanceKm: number;
}

const toRad = (x: number) => (x * Math.PI) / 180;

function safeJsonParse(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function normalizeRoutePayload(routePolyline: unknown): unknown {
  // Some records come double-encoded from storage/network layers.
  let parsed: unknown = routePolyline;
  for (let i = 0; i < 3; i++) {
    const next = safeJsonParse(parsed);
    if (next === parsed) break;
    parsed = next;
  }
  return parsed;
}

function pickCoordinatesArray(payload: any): any[] | null {
  if (!payload || typeof payload !== 'object') return null;
  if (Array.isArray(payload.coordinates)) return payload.coordinates;
  if (payload.geometry && Array.isArray(payload.geometry.coordinates)) return payload.geometry.coordinates;
  if (payload.polyline && Array.isArray(payload.polyline.coordinates)) return payload.polyline.coordinates;
  if (payload.route && Array.isArray(payload.route.coordinates)) return payload.route.coordinates;
  return null;
}

function toLatLng(coord: any): LatLng | null {
  if (Array.isArray(coord) && coord.length >= 2) {
    const lng = Number(coord[0]);
    const lat = Number(coord[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { latitude: lat, longitude: lng };
    }
    return null;
  }

  if (coord && typeof coord === 'object') {
    const lat = Number(coord.latitude ?? coord.lat);
    const lng = Number(coord.longitude ?? coord.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { latitude: lat, longitude: lng };
    }
  }

  return null;
}

/**
 * Calculates the Haversine distance between two points in kilometers.
 */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function xyAt(refLat: number, p: LatLng) {
  return { x: toRad(p.longitude) * Math.cos(toRad(refLat)), y: toRad(p.latitude) };
}

/**
 * Projects a point onto a line segment defined by v and w.
 */
function projectPointToSegment(p: LatLng, v: LatLng, w: LatLng) {
  const refLat = (v.latitude + w.latitude) / 2;
  const P = xyAt(refLat, p);
  const V = xyAt(refLat, v);
  const W = xyAt(refLat, w);
  const vx = W.x - V.x;
  const vy = W.y - V.y;
  const len2 = vx * vx + vy * vy;
  let t = 0;
  if (len2 > 0) {
    t = ((P.x - V.x) * vx + (P.y - V.y) * vy) / len2;
    t = Math.max(0, Math.min(1, t));
  }
  const proj = {
    latitude: v.latitude + t * (w.latitude - v.latitude),
    longitude: v.longitude + t * (w.longitude - v.longitude),
  };
  const distKm = haversineKm(p, proj);
  const segLenKm = haversineKm(v, w);
  return { distKm, t, proj, segLenKm };
}

/**
 * Projects a point onto a full route (array of coordinates).
 */
export function projectPointToRoute(location: LatLng, routeCoords: LatLng[], thresholdKm = 2) {
  if (!location || !routeCoords || routeCoords.length < 2) {
    return { onRoute: false, posKm: -1, minDistKm: Infinity, projectedPoint: null as LatLng | null, segmentIndex: -1 };
  }

  const cumulativeDistances: number[] = [0];
  for (let i = 0; i < routeCoords.length - 1; i++) {
    cumulativeDistances.push(cumulativeDistances[i] + haversineKm(routeCoords[i], routeCoords[i + 1]));
  }

  const totalRouteDistanceKm = cumulativeDistances[cumulativeDistances.length - 1];

  let bestMinDist = Infinity;
  let bestPosKm = 0;
  let bestProjectedPoint: LatLng | null = null;
  let bestSegmentIndex = -1;
  for (let i = 0; i < routeCoords.length - 1; i++) {
    const v = routeCoords[i];
    const w = routeCoords[i + 1];
    const { distKm, t, segLenKm, proj } = projectPointToSegment(location, v, w);
    if (distKm < bestMinDist) {
      bestMinDist = distKm;
      bestPosKm = cumulativeDistances[i] + t * segLenKm;
      bestProjectedPoint = proj;
      bestSegmentIndex = i;
    }
  }

  // Clamp position to route bounds for numeric stability.
  bestPosKm = Math.max(0, Math.min(bestPosKm, totalRouteDistanceKm));

  return {
    onRoute: bestMinDist <= thresholdKm,
    posKm: bestPosKm,
    minDistKm: bestMinDist,
    projectedPoint: bestProjectedPoint,
    segmentIndex: bestSegmentIndex,
  };
}

/**
 * Decodes the route polyline (GeoJSON or straight line) into coordinates.
 */
export function getParsedRouteCoords(routePolyline: any, rideStart: LatLng, rideEnd: LatLng): LatLng[] {
  const isValidPoint = (p: LatLng) => {
    return (
      Number.isFinite(p.latitude) &&
      Number.isFinite(p.longitude) &&
      p.latitude >= -90 &&
      p.latitude <= 90 &&
      p.longitude >= -180 &&
      p.longitude <= 180
    );
  };

  if (routePolyline) {
    try {
      const parsed = normalizeRoutePayload(routePolyline);
      const coords = pickCoordinatesArray(parsed);
      if (Array.isArray(coords) && coords.length > 1) {
        const mapped = coords
          .map(toLatLng)
          .filter((point): point is LatLng => point !== null)
          .filter(isValidPoint);
        if (mapped.length > 1) {
          return mapped;
        }
      }
    } catch (e) {
      console.warn('Failed to parse routePolyline as GeoJSON:', e);
    }
  }
  return [rideStart, rideEnd];
}

export function getParsedRouteWithMeta(routePolyline: any, rideStart: LatLng, rideEnd: LatLng) {
  const parsed = getParsedRouteCoords(routePolyline, rideStart, rideEnd);
  const isFallbackRoute = parsed.length === 2 &&
    parsed[0].latitude === rideStart.latitude &&
    parsed[0].longitude === rideStart.longitude &&
    parsed[1].latitude === rideEnd.latitude &&
    parsed[1].longitude === rideEnd.longitude;

  const cumulativeDistances: number[] = [0];
  for (let i = 0; i < parsed.length - 1; i++) {
    cumulativeDistances.push(cumulativeDistances[i] + haversineKm(parsed[i], parsed[i + 1]));
  }

  return {
    routeCoords: parsed,
    isFallbackRoute,
    totalRouteDistanceKm: cumulativeDistances[cumulativeDistances.length - 1] || 0,
    cumulativeDistances,
  };
}

/**
 * Check if a sub-ride (user's A to B) is "on the way" of a driver's route.
 */
export function isRideOnTheWay(
  userStart: LatLng,
  userEnd: LatLng,
  driverRouteCoords: LatLng[],
  thresholdKm = 2
): boolean {
  const startProj = projectPointToRoute(userStart, driverRouteCoords, thresholdKm);
  const endProj = projectPointToRoute(userEnd, driverRouteCoords, thresholdKm);

  if (!startProj.onRoute || !endProj.onRoute) {
    return false;
  }

  // Direction check: start must come before end
  return startProj.posKm < endProj.posKm;
}

export function getRouteDistanceKm(routeCoords: LatLng[]): number {
  if (!routeCoords || routeCoords.length < 2) return 0;

  let total = 0;
  for (let i = 0; i < routeCoords.length - 1; i++) {
    total += haversineKm(routeCoords[i], routeCoords[i + 1]);
  }
  return total;
}

export function getRouteMatchMetrics(
  userStart: LatLng,
  userEnd: LatLng,
  driverRouteCoords: LatLng[],
  thresholdKm = 2
): RouteMatchMetrics {
  const MIN_SEGMENT_DISTANCE_KM = 1;
  const MAX_DETOUR_KM = 5;
  const HARD_THRESHOLD_CAP_KM = Math.max(0.1, thresholdKm);

  const totalRouteDistanceKm = getRouteDistanceKm(driverRouteCoords);
  // Strict threshold scales with route length, capped to avoid too-lenient matches.
  const strictThresholdKm = Math.min(HARD_THRESHOLD_CAP_KM, 0.15 * Math.max(totalRouteDistanceKm, 0));
  // Soft threshold for ranking (not hard rejection) to avoid hiding near-valid rides.
  const softThresholdKm = Math.max(HARD_THRESHOLD_CAP_KM, 0.2 * Math.max(totalRouteDistanceKm, 1));

  const fallback: RouteMatchMetrics = {
    isMatch: false,
    matchType: 'NO_MATCH',
    confidenceScore: 0,
    isFallbackRoute: driverRouteCoords.length === 2,
    warnings: ['insufficient_route_geometry'],
    totalRouteDistanceKm,
    directionOk: false,
    pickupDistanceKm: Infinity,
    dropDistanceKm: Infinity,
    pickupPosKm: -1,
    dropPosKm: -1,
    segmentDistanceKm: 0,
    detourDistanceKm: 0,
  };

  if (!userStart || !userEnd || !driverRouteCoords || driverRouteCoords.length < 2) {
    return fallback;
  }

  const pickupProjection = projectPointToRoute(userStart, driverRouteCoords, thresholdKm);
  const dropProjection = projectPointToRoute(userEnd, driverRouteCoords, thresholdKm);

  const directionOk = pickupProjection.posKm >= 0 && dropProjection.posKm >= 0 && pickupProjection.posKm < dropProjection.posKm;
  const segmentDistanceKm = Math.max(0, dropProjection.posKm - pickupProjection.posKm);

  // More realistic detour: user points to their projected points.
  const pickupDetourKm = pickupProjection.projectedPoint ? haversineKm(userStart, pickupProjection.projectedPoint) : pickupProjection.minDistKm;
  const dropDetourKm = dropProjection.projectedPoint ? haversineKm(userEnd, dropProjection.projectedPoint) : dropProjection.minDistKm;
  const detourDistanceKm = Math.max(0, pickupDetourKm + dropDetourKm);

  const warnings: string[] = [];
  if (driverRouteCoords.length === 2) warnings.push('fallback_route_geometry');
  if (!directionOk) warnings.push('direction_mismatch');
  if (segmentDistanceKm < MIN_SEGMENT_DISTANCE_KM) warnings.push('segment_too_short');
  if (detourDistanceKm > MAX_DETOUR_KM) warnings.push('detour_too_high');

  const strictPass =
    pickupProjection.minDistKm <= strictThresholdKm &&
    dropProjection.minDistKm <= strictThresholdKm &&
    directionOk &&
    segmentDistanceKm >= MIN_SEGMENT_DISTANCE_KM &&
    detourDistanceKm <= MAX_DETOUR_KM;

  const goodPass =
    pickupProjection.minDistKm <= softThresholdKm &&
    dropProjection.minDistKm <= softThresholdKm &&
    directionOk &&
    segmentDistanceKm >= MIN_SEGMENT_DISTANCE_KM &&
    detourDistanceKm <= MAX_DETOUR_KM * 1.2;

  const weakPass =
    pickupProjection.minDistKm <= softThresholdKm * 1.35 &&
    dropProjection.minDistKm <= softThresholdKm * 1.35 &&
    directionOk &&
    segmentDistanceKm >= MIN_SEGMENT_DISTANCE_KM * 0.5 &&
    detourDistanceKm <= MAX_DETOUR_KM * 1.6;

  const matchType: RouteMatchMetrics['matchType'] = strictPass ? 'PERFECT' : goodPass ? 'GOOD' : weakPass ? 'WEAK' : 'NO_MATCH';
  const isMatch = matchType !== 'NO_MATCH';

  const pickupNorm = Math.min(1, pickupProjection.minDistKm / Math.max(softThresholdKm, 0.001));
  const dropNorm = Math.min(1, dropProjection.minDistKm / Math.max(softThresholdKm, 0.001));
  const detourPenalty = Math.min(1, detourDistanceKm / (MAX_DETOUR_KM * 1.6));
  const routeQualityPenalty = driverRouteCoords.length === 2 ? 1 : 0;
  const confidenceScore = Math.max(
    0,
    Math.min(1, 1 - (0.4 * pickupNorm + 0.4 * dropNorm + 0.1 * detourPenalty + 0.1 * routeQualityPenalty))
  );

  return {
    isMatch,
    matchType,
    confidenceScore,
    isFallbackRoute: driverRouteCoords.length === 2,
    warnings,
    totalRouteDistanceKm,
    directionOk,
    pickupDistanceKm: pickupProjection.minDistKm,
    dropDistanceKm: dropProjection.minDistKm,
    pickupPosKm: pickupProjection.posKm,
    dropPosKm: dropProjection.posKm,
    segmentDistanceKm,
    detourDistanceKm,
  };
}

export function calculateMatchScore(params: {
  pickupDistanceKm: number;
  dropDistanceKm: number;
  timeDifferenceMin: number;
  availableSeats: number;
  ownerRating: number;
}): number {
  const pickup = Number.isFinite(params.pickupDistanceKm) ? params.pickupDistanceKm : 25;
  const drop = Number.isFinite(params.dropDistanceKm) ? params.dropDistanceKm : 25;
  const timeDelta = Math.max(0, params.timeDifferenceMin || 0);
  const seats = Math.max(0, params.availableSeats || 0);
  const rating = Math.max(0, Math.min(5, params.ownerRating || 0));

  // Lower score is better. Better seats and ratings reduce the score.
  return pickup * 0.35 + drop * 0.35 + timeDelta * 0.02 - seats * 0.15 - rating * 0.25;
}
