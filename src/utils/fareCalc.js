// Fare calculation utility for rides
// Usage: import { calculateFareBreakdown } from './fareCalc';
// Returns: { breakdown: Array, summary: { totalFare, totalDistanceKm, participants } }

import * as polyline from '@mapbox/polyline';

const toRad = (x) => (x * Math.PI) / 180;
function haversineKm(a, b) {
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function xyAt(refLat, p) {
  return { x: toRad(p.longitude) * Math.cos(toRad(refLat)), y: toRad(p.latitude) };
}
function projectPointToSegment(p, v, w) {
  const refLat = (v.latitude + w.latitude) / 2;
  const P = xyAt(refLat, p);
  const V = xyAt(refLat, v);
  const W = xyAt(refLat, w);
  const vx = W.x - V.x; const vy = W.y - V.y;
  const len2 = vx * vx + vy * vy;
  let t = 0; if (len2 > 0) { t = ((P.x - V.x) * vx + (P.y - V.y) * vy) / len2; t = Math.max(0, Math.min(1, t)); }
  const proj = { latitude: v.latitude + t * (w.latitude - v.latitude), longitude: v.longitude + t * (w.longitude - v.longitude) };
  const distKm = haversineKm(p, proj);
  const segLenKm = haversineKm(v, w);
  return { distKm, t, proj, segLenKm };
}
function projectPointToRoute(location, routeCoords, thresholdKm = 2) {
  if (!location || !routeCoords || routeCoords.length < 2) return { onRoute: false, posKm: -1, minDistKm: Infinity };
  let bestMinDist = Infinity; let bestPosKm = 0; let cumulative = 0;
  for (let i = 0; i < routeCoords.length - 1; i++) {
    const v = routeCoords[i]; const w = routeCoords[i + 1];
    const { distKm, t, segLenKm } = projectPointToSegment(location, v, w);
    if (distKm < bestMinDist) { bestMinDist = distKm; bestPosKm = cumulative + t * segLenKm; }
    cumulative += segLenKm;
  }
  return { onRoute: bestMinDist <= thresholdKm, posKm: bestPosKm, minDistKm: bestMinDist };
}

export function calculateFareBreakdown(currentRide) {
  const rideStart = currentRide.start.coords;
  const rideEnd = currentRide.destination.coords;
  const totalFare = parseFloat(currentRide.fare);

  // Decode route polyline and compute total route length
  const routeCoords = currentRide.routePolyline
    ? polyline.decode(currentRide.routePolyline).map(([lat, lng]) => ({ latitude: lat, longitude: lng }))
    : [
        { latitude: rideStart.lat, longitude: rideStart.lng },
        { latitude: rideEnd.lat, longitude: rideEnd.lng },
      ];

  let totalDistanceKm = 0;
  for (let i = 0; i < routeCoords.length - 1; i++) {
    totalDistanceKm += haversineKm(routeCoords[i], routeCoords[i + 1]);
  }

  const participants = [];
  // Creator travels the full ride distance
  participants.push({
    name: currentRide.creator.name,
    handle: currentRide.creator.handle,
    distance: totalDistanceKm,
    isCreator: true,
    startName: currentRide.start?.name || 'Start',
    endName: currentRide.destination?.name || 'Destination',
  });

  // Partners: project onto route and cap within ride bounds
  for (const partner of currentRide.partners) {
    if (
      !partner.start ||
      !partner.start.coords ||
      typeof partner.start.coords.lat !== 'number' ||
      typeof partner.start.coords.lng !== 'number' ||
      !partner.destination ||
      !partner.destination.coords ||
      typeof partner.destination.coords.lat !== 'number' ||
      typeof partner.destination.coords.lng !== 'number'
    ) {
      continue;
    }
    const start = { latitude: partner.start.coords.lat, longitude: partner.start.coords.lng };
    const end = { latitude: partner.destination.coords.lat, longitude: partner.destination.coords.lng };

    const startProj = projectPointToRoute(start, routeCoords, 2);
    const endProj = projectPointToRoute(end, routeCoords, 2);

    const clampedStartPos = Math.min(Math.max(startProj.posKm, 0), totalDistanceKm);
    const clampedEndPos = Math.min(Math.max(endProj.posKm, 0), totalDistanceKm);
    const effectiveKm = Math.max(0, clampedEndPos - clampedStartPos);

    participants.push({
      name: partner.name,
      handle: partner.handle,
      distance: effectiveKm,
      isCreator: false,
      startName: partner.start?.name || 'Pickup',
      endName: partner.destination?.name || 'Drop-off',
    });
  }

  const sumDistances = participants.reduce((sum, p) => sum + p.distance, 0) || 1;

  const breakdown = participants.map((p) => ({
    name: p.name,
    handle: p.handle,
    distance: p.distance,
    fare: ((p.distance / sumDistances) * totalFare).toFixed(2),
    isCreator: p.isCreator,
    startName: p.startName,
    endName: p.endName,
  }));

  return {
    breakdown,
    summary: { totalFare, totalDistanceKm, participants: participants.length },
  };
}
