export type TransportMode = 'Car' | 'CNG' | 'Bus' | 'Bike' | 'Microbus' | 'Rickshaw' | 'Other';
export type RideStatus = 'unactive' | 'started' | 'completed' | 'cancelled' | 'expired';
export type GenderPreference = 'Any' | 'Male' | 'Female';
export type JoinStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'removed';

import * as mockData from '../data/mockData';

export const transportEmoji: Record<TransportMode, string> = {
  Car: '🚗',
  CNG: '🛺',
  Bus: '🚌',
  Bike: '🏍️',
  Microbus: '🚐',
  Rickshaw: '🛺',
  Other: '🚙',
};





export type User = RideCreator;
export type Ride = NormalizedRide;

export interface RideLocation {


  name: string;
  shortName: string;
  coords?: { lat: number; lng: number } | null;
  lat: number;
  lng: number;
}


export interface RideCreator {
  id: string;
  user_id?: string;
  name: string;
  username: string;
  handle?: string;
  avatar?: string;
  // User interface compatibility
  gender?: 'Male' | 'Female';
  rating?: number;
  ridesCreated?: number;
  ridesJoined?: number;
  university?: string;
  department?: string;
  bio?: string;
  phone?: string;
  email?: string;
  facebook?: string;
  address?: string;
  studentId?: string;
}


export interface RidePartner {
  name: string;
  handle: string;
  user_id: string | null;
  start: { name: string; coords: { lat: number; lng: number } | null };
  destination: { name: string; coords: { lat: number; lng: number } | null };
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  time: string;
  read: boolean;
}

export interface NormalizedRide {
  id: string;
  start: RideLocation;
  destination: RideLocation;
  // Aliases for legacy component compatibility
  from: RideLocation;
  to: RideLocation;
  
  creator: RideCreator;
  partners: RidePartner[];
  passengers?: any[]; // Full passenger data from backend with route_polyline
  date: { day: string; time: string };
  startTime: string; // Internal standard
  departureTime: string; // Alias for legacy
  
  fare: number | null;
  currency: string; // Alias

  totalPassengers: number;
  seats: number; // Alias
  currentPassengers: number; // Derived
  
  transportMode: string;
  transport: TransportMode; // Alias
  transportDetail: string; // Alias
  
  rideProvider: string;


  preferences: string;
  notes: string; // Alias for legacy
  gender: string;
  genderPreference: GenderPreference; // Alias
  routePolyline: string;
  totalDistanceKm?: number;
  fareStatus: 'complete' | 'pending' | null;
  createdAt: string;
  status: RideStatus;
}





export const formatRideDate = (value: any) => {
  if (!value) return { day: '', time: '' };
  const date = new Date(value);
  if (isNaN(date.getTime())) return { day: '', time: '' };

  const day = date.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return { day, time };
};

export const formatRideTime = (value: any) => formatRideDate(value).time;

export const ensureHandle = (handleValue: string | null | undefined, username?: string) => {

  const val = handleValue || username || 'user';
  return val.startsWith('@') ? val : `@${val}`;
};

const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatCoordLabel = (lat: number | null, lng: number | null, fallback: string) => {
  if (lat == null || lng == null) return fallback;
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
};

export const normalizeRide = (ride: any): NormalizedRide | null => {
  if (!ride) return null;

  const startTime = ride.start_time || ride.startTime || ride.dateTime;
  const startLocationName =
    ride.start_name ||
    ride.start_address ||
    ride.start_location_name ||
    ride.from_name ||
    (typeof ride.startLocation === 'string' ? ride.startLocation : ride.startLocation?.name) ||
    (typeof ride.start === 'string' ? ride.start : ride.start?.name);
  const destinationName =
    ride.dest_name ||
    ride.dest_address ||
    ride.dest_location_name ||
    ride.destination_name ||
    ride.to_name ||
    (typeof ride.endLocation === 'string' ? ride.endLocation : ride.endLocation?.name) ||
    (typeof ride.destination === 'string' ? ride.destination : ride.destination?.name) ||
    (typeof ride.to === 'string' ? ride.to : ride.to?.name);
  const startLat =
    toNumberOrNull(ride.start_lat) ??
    toNumberOrNull(ride.start?.coords?.lat) ??
    toNumberOrNull(ride.start?.lat);
  const startLng =
    toNumberOrNull(ride.start_lng) ??
    toNumberOrNull(ride.start?.coords?.lng) ??
    toNumberOrNull(ride.start?.lng);
  const destLat =
    toNumberOrNull(ride.dest_lat) ??
    toNumberOrNull(ride.destination?.coords?.lat) ??
    toNumberOrNull(ride.destination?.lat) ??
    toNumberOrNull(ride.to?.coords?.lat) ??
    toNumberOrNull(ride.to?.lat);
  const destLng =
    toNumberOrNull(ride.dest_lng) ??
    toNumberOrNull(ride.destination?.coords?.lng) ??
    toNumberOrNull(ride.destination?.lng) ??
    toNumberOrNull(ride.to?.coords?.lng) ??
    toNumberOrNull(ride.to?.lng);
  
  const startLoc = {
    name: startLocationName || formatCoordLabel(startLat, startLng, 'Pickup point'),
    shortName: startLocationName || formatCoordLabel(startLat, startLng, 'Pickup point'),
    coords:
      startLat != null && startLng != null
        ? { lat: startLat, lng: startLng }
        : ride.start?.coords ?? null,
    lat: startLat ?? 0,
    lng: startLng ?? 0,
  };

  const destLoc = {
    name: destinationName || formatCoordLabel(destLat, destLng, 'Drop-off point'),
    shortName: destinationName || formatCoordLabel(destLat, destLng, 'Drop-off point'),
    coords:
      destLat != null && destLng != null
        ? { lat: destLat, lng: destLng }
        : ride.destination?.coords ?? ride.to?.coords ?? null,
    lat: destLat ?? 0,
    lng: destLng ?? 0,
  };


  const partners = Array.isArray(ride.passengers)
    ? ride.passengers.map((p: any) => ({
        name: p.name,
        handle: ensureHandle(p.username || p.handle, p.username),
        user_id: p.user_id || p.id || p.passenger_id || null,
        start: {
          name: p.start_name || p.start_address || 'Pickup',
          coords: (p.start_lat && p.start_lng) ? { lat: Number(p.start_lat), lng: Number(p.start_lng) } : null,
        },
        destination: {
          name: p.dest_name || p.dest_address || 'Drop-off',
          coords: (p.dest_lat && p.dest_lng) ? { lat: Number(p.dest_lat), lng: Number(p.dest_lng) } : null,
        },
      }))
    : [];

  const transport = ride.transport_mode || ride.transportMode || ride.transport || '';
  const seats = Number(ride.available_seats ?? ride.availableSeats ?? ride.seats ?? 1);

  const creator = {
    id: String(ride.creator_id || ride.creatorId || ride.user_id || ride.userId || ''),
    user_id: String(ride.creator_id || ride.creatorId || ride.user_id || ride.userId || ''),
    name: ride.name || ride.creator_name || ride.creator?.name || 'Unknown',
    username: ride.username || ride.creator_username || ride.creator?.username || 'user',
    handle: ensureHandle(ride.username || ride.creator_username || ride.creator?.handle),
    avatar: ride.avatar_url || ride.avatar || ride.creator?.avatar_url || ride.creator?.avatar,
    // Default values for legacy User compatibility
    gender: (ride.gender_preference || ride.genderPreference || ride.gender || 'Male') as 'Male' | 'Female',
    rating: Number(ride.rating || ride.creator?.rating || 5.0),
    ridesCreated: Number(ride.ridesCreated || 0),
    ridesJoined: Number(ride.ridesJoined || 0),
    university: ride.university || ride.creator?.university,
    department: ride.department || ride.creator?.department,
  };


  return {
    id: String(ride.ride_id || ride.id || ''),
    start: startLoc,
    destination: destLoc,
    from: startLoc,
    to: destLoc,
    creator,
    partners,
    date: formatRideDate(startTime),
    startTime: String(startTime),
    departureTime: String(startTime),
    fare: ride.fare !== null && ride.fare !== undefined && ride.fare !== '' ? Number(ride.fare) : null,
    currency: ride.currency || 'BDT',

    totalPassengers: seats,
    seats: Math.max(0, seats),
    currentPassengers: partners.length,
    transportMode: transport,
    transport: transport as TransportMode,
    transportDetail: ride.transport_detail || ride.transportDetail || '',
    rideProvider: ride.ride_provider || ride.rideProvider || '',

    preferences: ride.preference_notes || ride.notes || '',
    notes: ride.preference_notes || ride.notes || '',
    gender: ride.gender_preference || ride.genderPreference || ride.gender || 'Any',
    genderPreference: (ride.gender_preference || ride.genderPreference || ride.gender || 'Any') as GenderPreference,
    routePolyline: ride.route_polyline || ride.routePolyline || '',
    totalDistanceKm:
      ride.total_distance_km != null
        ? Number(ride.total_distance_km)
        : ride.totalDistanceKm != null
          ? Number(ride.totalDistanceKm)
          : undefined,
    fareStatus: ride.completion_time ? 'complete' : (ride.status === 'completed' ? 'pending' : null),
    createdAt: String(ride.created_at || ride.createdAt || ''),
    status: (ride.current_status || ride.status || 'unactive') as RideStatus,
  };

};


export const normalizeRideList = (rides: any[] = []): NormalizedRide[] => 
  (Array.isArray(rides) ? rides : []).map(normalizeRide).filter((r): r is NormalizedRide => r !== null);

export const currentUser = mockData.currentUser as User & { rating: number };
export const user2 = mockData.user2 as User;
export const user3 = mockData.user3 as User;
export const user4 = mockData.user4 as User;
export const user5 = mockData.user5 as User;
export const user6 = mockData.user6 as User;
export const allUsers = mockData.allUsers as User[];
export const getUserById = mockData.getUserById;

export const iutCafeteria = mockData.iutCafeteria;
export const uttara = mockData.uttara;
export const dhanmondi = mockData.dhanmondi;
export const sector12 = mockData.sector12;
export const motijheel = mockData.motijheel;
export const mirpur = mockData.mirpur;
export const farmgate = mockData.farmgate;
export const boardBazar = mockData.boardBazar;

export const myActiveRide = mockData.myActiveRide as Ride;
export const myScheduledRide = mockData.myScheduledRide as Ride;
export const myCompletedRide = mockData.myCompletedRide as Ride;
export const myCancelledRide = mockData.myCancelledRide as Ride;
export const pastRideByUser2 = mockData.pastRideByUser2 as Ride;
export const availableRides = mockData.availableRides as Ride[];

export const incomingJoinRequests = mockData.incomingJoinRequests as any[];
export const myJoinRequests = mockData.myJoinRequests as any[];

export const friends = mockData.friends as User[];
export const chats = mockData.chats as any[];
export const groupChats = mockData.groupChats as any[];
export const notifications = mockData.notifications as any[];
export const reviews = mockData.reviews as any[];

export function haversineDistance(coord1: { latitude: number; longitude: number }, coord2: { latitude: number; longitude: number }): number;
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number;
export function haversineDistance(
  coordOrLat1: { latitude: number; longitude: number } | number,
  coordOrLng1: { latitude: number; longitude: number } | number,
  lat2?: number,
  lng2?: number,
) {
  const radiusKm = 6371;
  const coord1 = typeof coordOrLat1 === 'number'
    ? { latitude: coordOrLat1, longitude: Number(coordOrLng1) }
    : coordOrLat1;
  const coord2 = typeof coordOrLat1 === 'number'
    ? { latitude: Number(lat2), longitude: Number(lng2) }
    : coordOrLng1;
  if (typeof coord2 === 'number') {
    return 0;
  }
  const dLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const dLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.latitude * Math.PI) / 180) *
      Math.cos((coord2.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return radiusKm * c;
}
