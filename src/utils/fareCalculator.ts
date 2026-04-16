import { haversineKm, getParsedRouteCoords, projectPointToRoute, type LatLng } from './routeMatcher';

export interface FareParticipant {
  userId?: number | string;
  name: string;
  handle?: string;
  distance: number | null;
  fare: string; // Fixed 2 decimals
  isCreator?: boolean;
  startName?: string;
  endName?: string;
}

export interface FareBreakdownResult {
  breakdown: FareParticipant[];
  summary: {
    totalFare: number;
    totalDistanceKm: number | null;
    participants: number;
    method: 'equal' | 'distance';
  };
}

/**
 * Calculate equal fare split among all participants.
 */
function calculateEqualSplit(
  participants: Array<{
    userId?: number | string;
    name: string;
    handle?: string;
    isCreator?: boolean;
    startName?: string;
    endName?: string;
  }>,
  totalFare: number
): FareParticipant[] {
  const participantCount = Math.max(1, participants.length);
  const farePerPerson = (totalFare / participantCount).toFixed(2);

  return participants.map((p) => ({
    userId: p.userId,
    name: p.name,
    handle: p.handle,
    distance: null, // Not applicable for equal split
    fare: farePerPerson,
    isCreator: p.isCreator,
    startName: p.startName,
    endName: p.endName,
  }));
}

/**
 * Calculate distance-based fare split.
 * Each participant pays proportionally to the distance they travel on the ride route.
 */
function calculateDistanceRatio(
  creator: {
    userId?: number | string;
    name: string;
    handle?: string;
    startName?: string;
    endName?: string;
  },
  partners: Array<{
    userId?: number | string;
    name: string;
    handle?: string;
    startCoords?: LatLng;
    endCoords?: LatLng;
    startName?: string;
    endName?: string;
  }>,
  routeCoords: LatLng[],
  totalFare: number
): { breakdown: FareParticipant[]; totalDistanceKm: number } {
  // Calculate total route distance
  let totalDistanceKm = 0;
  for (let i = 0; i < routeCoords.length - 1; i++) {
    totalDistanceKm += haversineKm(routeCoords[i], routeCoords[i + 1]);
  }

  const participants: Array<{ participant: any; distance: number; isCreator: boolean }> = [];

  // Creator travels the full ride distance
  participants.push({
    participant: creator,
    distance: totalDistanceKm,
    isCreator: true,
  });

  // Partners: project onto route and cap within ride bounds
  for (const partner of partners) {
    let effectiveKm = 0;

    if (
      partner.startCoords &&
      partner.endCoords &&
      Number.isFinite(partner.startCoords.latitude) &&
      Number.isFinite(partner.startCoords.longitude) &&
      Number.isFinite(partner.endCoords.latitude) &&
      Number.isFinite(partner.endCoords.longitude)
    ) {
      // Project partner's start/end onto the ride route
      const startProj = projectPointToRoute(partner.startCoords, routeCoords, 2);
      const endProj = projectPointToRoute(partner.endCoords, routeCoords, 2);

      // Clamp to ride bounds (0 to totalDistanceKm)
      const clampedStartPos = Math.min(Math.max(startProj.posKm, 0), totalDistanceKm);
      const clampedEndPos = Math.min(Math.max(endProj.posKm, 0), totalDistanceKm);

      // Calculate distance traveled ON the ride route
      effectiveKm = Math.max(0, clampedEndPos - clampedStartPos);
    }

    participants.push({
      participant: partner,
      distance: effectiveKm,
      isCreator: false,
    });
  }

  // Calculate total distance traveled by all participants
  const sumDistances = participants.reduce((sum, p) => sum + p.distance, 0) || 1;

  // Calculate fare proportional to distance traveled
  const breakdown = participants.map((p) => ({
    userId: p.participant.userId,
    name: p.participant.name,
    handle: p.participant.handle,
    distance: p.distance,
    fare: ((p.distance / sumDistances) * totalFare).toFixed(2),
    isCreator: p.isCreator,
    startName: p.participant.startName,
    endName: p.participant.endName,
  }));

  return { breakdown, totalDistanceKm };
}

/**
 * Calculate fare breakdown for ride completion.
 * 
 * @param options Configuration object with ride data
 * @param options.creator Creator info { userId, name, handle?, startName?, endName? }
 * @param options.partners Array of passengers who joined { userId, name, handle?, startCoords?, endCoords?, startName?, endName? }
 * @param options.totalFare Total fare to split
 * @param options.routePolyline Route as GeoJSON or encoded format
 * @param options.rideStart Ride start coordinates { latitude, longitude }
 * @param options.rideEnd Ride end coordinates { latitude, longitude }
 * @param options.method 'equal' or 'distance' split method (default: 'distance')
 * @returns Breakdown with participant fares and summary
 */
export function calculateFareBreakdown(options: {
  creator: {
    userId?: number | string;
    name: string;
    handle?: string;
    startName?: string;
    endName?: string;
  };
  partners: Array<{
    userId?: number | string;
    name: string;
    handle?: string;
    startCoords?: LatLng;
    endCoords?: LatLng;
    startName?: string;
    endName?: string;
  }>;
  totalFare: number;
  routePolyline?: any;
  rideStart: LatLng;
  rideEnd: LatLng;
  method?: 'equal' | 'distance';
}): FareBreakdownResult {
  const totalFare = Math.max(0, Number(options.totalFare) || 0);
  const method = options.method === 'equal' ? 'equal' : 'distance';

  // Parse route polyline
  const routeCoords = getParsedRouteCoords(options.routePolyline, options.rideStart, options.rideEnd);

  let breakdown: FareParticipant[] = [];
  let totalDistanceKm = 0;

  if (method === 'equal') {
    const allParticipants = [options.creator, ...options.partners];
    breakdown = calculateEqualSplit(allParticipants, totalFare);

    // Calculate total distance for summary (even though equal split doesn't use it)
    for (let i = 0; i < routeCoords.length - 1; i++) {
      totalDistanceKm += haversineKm(routeCoords[i], routeCoords[i + 1]);
    }
  } else {
    const result = calculateDistanceRatio(options.creator, options.partners, routeCoords, totalFare);
    breakdown = result.breakdown;
    totalDistanceKm = result.totalDistanceKm;
  }

  return {
    breakdown,
    summary: {
      totalFare,
      totalDistanceKm: method === 'distance' ? totalDistanceKm : null,
      participants: breakdown.length,
      method,
    },
  };
}

/**
 * Get display text for fare calculation method.
 */
export function getMethodDisplayText(method: 'equal' | 'distance'): string {
  return method === 'equal' ? 'Equal Split' : 'Distance-Based';
}

/**
 * Get description for fare calculation method.
 */
export function getMethodDescription(method: 'equal' | 'distance'): string {
  if (method === 'equal') {
    return 'Fare split equally among all participants';
  }
  return 'Fare split proportionally based on distance traveled on the ride route';
}
