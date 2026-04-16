import React, { createContext, useContext, useCallback, useState, type ReactNode } from 'react';
import { joinRequestsAPI, type JoinRequestExtras } from '../api/joinRequests';
import { normalizeRide } from '../utils/rideMapper';

interface JoinRequest {
  id: number;
  rideId: number;
  requesterId: number;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  requestedAt?: string;
  start_lat: number | null;
  start_lng: number | null;
  dest_lat: number | null;
  dest_lng: number | null;
  startLocation?: { name: string; lat: number | null; lng: number | null };
  endLocation?: { name: string; lat: number | null; lng: number | null };
  routePolyline?: any;
  requestMessage?: string;
  calculatedFare?: number;
  segmentDistanceKm?: number;
  detourDistanceKm?: number;
  estimatedDurationMin?: number;
  pricingVersion?: string;
  pickupAddress?: string;
  dropAddress?: string;
  requester?: {
    id?: string;
    name: string;
    username: string;
    avatar?: string;
  };
  ride?: any; // Normalized ride if fetched
}

interface JoinContextValue {
  incomingRequests: JoinRequest[];
  myRequests: JoinRequest[];
  loading: boolean;
  error: string | null;
  fetchIncomingRequests: (rideId: number) => Promise<JoinRequest[]>;
  fetchMyRequests: () => Promise<JoinRequest[]>;
  acceptRequest: (requestId: number) => Promise<any>;
  rejectRequest: (requestId: number) => Promise<any>;
  cancelJoinRequest: (requestId: number) => Promise<any>;
  submitRequest: (rideId: number, start: any, end: any, extras?: JoinRequestExtras) => Promise<any>;
}


const JoinContext = createContext<JoinContextValue | null>(null);

export function JoinProvider({ children }: { children: ReactNode }) {
  const [incomingRequests, setIncomingRequests] = useState<JoinRequest[]>([]);
  const [myRequests, setMyRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizeJoinRequest = useCallback((req: any): JoinRequest => {
    // Determine the status - backend uses 'current_status' alias in some queries
    const status = (req.current_status || req.status || 'pending') as JoinRequest['status'];
    
    // Normalize the ride part
    const ride = normalizeRide({
      ...req,
      id: req.ride_id || req.rideId,
      // Map ride-specific fields that might be prefixed
      start_name: req.ride_start_name || req.start_name,
      dest_name: req.ride_dest_name || req.dest_name,
      start_lat: req.ride_start_lat || req.start_lat,
      start_lng: req.ride_start_lng || req.start_lng,
      dest_lat: req.ride_dest_lat || req.dest_lat,
      dest_lng: req.ride_dest_lng || req.dest_lng,
      // Map creator fields
      creator_name: req.creator_name || req.name,
      creator_username: req.creator_handle || req.username,
      creator_id: req.creator_id,
    });

    const startLat = req.start_lat != null ? Number(req.start_lat) : null;
    const startLng = req.start_lng != null ? Number(req.start_lng) : null;
    const destLat = req.dest_lat != null ? Number(req.dest_lat) : null;
    const destLng = req.dest_lng != null ? Number(req.dest_lng) : null;
    const startLocationName = req.start_name || req.start_address || req.pickup_address || req.pickupAddress || (startLat != null && startLng != null ? `${startLat.toFixed(5)}, ${startLng.toFixed(5)}` : 'Pickup point');
    const destLocationName = req.dest_name || req.dest_address || req.drop_address || req.dropAddress || (destLat != null && destLng != null ? `${destLat.toFixed(5)}, ${destLng.toFixed(5)}` : 'Drop-off point');

    return {
      id: Number(req.request_id || req.id),
      rideId: Number(req.ride_id || req.rideId),
      requesterId: Number(req.partner_id || req.requesterId),
      status,
      requestedAt: String(req.timestamp || req.requested_at || req.created_at || ''),
      start_lat: startLat,
      start_lng: startLng,
      dest_lat: destLat,
      dest_lng: destLng,
      startLocation: {
        name: startLocationName,
        lat: startLat,
        lng: startLng,
      },
      endLocation: {
        name: destLocationName,
        lat: destLat,
        lng: destLng,
      },
      routePolyline: req.route_polyline || req.routePolyline || null,
      requestMessage: req.request_message || req.requestMessage || undefined,
      calculatedFare: req.calculated_fare != null ? Number(req.calculated_fare) : (req.calculatedFare != null ? Number(req.calculatedFare) : undefined),
      segmentDistanceKm: req.segment_distance_km != null ? Number(req.segment_distance_km) : (req.segmentDistanceKm != null ? Number(req.segmentDistanceKm) : undefined),
      detourDistanceKm: req.detour_distance_km != null ? Number(req.detour_distance_km) : (req.detourDistanceKm != null ? Number(req.detourDistanceKm) : undefined),
      estimatedDurationMin: req.estimated_duration_min != null ? Number(req.estimated_duration_min) : (req.estimatedDurationMin != null ? Number(req.estimatedDurationMin) : undefined),
      pricingVersion: req.pricing_version || req.pricingVersion || undefined,
      pickupAddress: req.pickup_address || req.pickupAddress || undefined,
      dropAddress: req.drop_address || req.dropAddress || undefined,
      requester: {
        id: String(req.partner_id || req.requesterId || ''),
        name: req.name || req.requester_name || 'Someone',
        username: req.username || req.requester_handle || 'user',
        avatar: req.avatar_url || req.avatar,
      } as any,
      ride,
    };
  }, []);

  const fetchIncomingRequests = useCallback(async (rideId: number) => {
    setLoading(true);
    try {
      const data = await joinRequestsAPI.getJoinRequests(rideId);
      const rawRequests = (data?.joinRequests || data || []);
      const normalized = Array.isArray(rawRequests) ? rawRequests.map(normalizeJoinRequest) : [];
      setIncomingRequests((prev) => {
        const others = prev.filter((req) => Number(req.rideId) !== Number(rideId));
        return [...others, ...normalized];
      });
      return normalized;
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [normalizeJoinRequest]);

  const fetchMyRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await joinRequestsAPI.getMyRequests();
      const rawRequests = (data?.joinRequests || data || []);
      const normalized = Array.isArray(rawRequests) ? rawRequests.map(normalizeJoinRequest) : [];
      setMyRequests(normalized);
      return normalized;
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [normalizeJoinRequest]);

  const acceptRequest = useCallback(async (requestId: number) => {
    try {
      const response = await joinRequestsAPI.acceptJoinRequest(requestId);
      setIncomingRequests((prev) => prev.map((req) => req.id === requestId ? { ...req, status: 'accepted' } : req));
      setMyRequests((prev) => prev.map((req) => req.id === requestId ? { ...req, status: 'accepted' } : req));
      return response;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const rejectRequest = useCallback(async (requestId: number) => {
    try {
      const response = await joinRequestsAPI.rejectJoinRequest(requestId);
      setIncomingRequests((prev) => prev.map((req) => req.id === requestId ? { ...req, status: 'rejected' } : req));
      setMyRequests((prev) => prev.map((req) => req.id === requestId ? { ...req, status: 'rejected' } : req));
      return response;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const cancelJoinRequest = useCallback(async (requestId: number) => {
    try {
      const response = await joinRequestsAPI.cancelJoinRequest(requestId);
      setMyRequests((prev) => prev.map((req) => req.id === requestId ? { ...req, status: 'cancelled' } : req));
      return response;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const submitRequest = useCallback(async (rideId: number, start: any, end: any, extras: JoinRequestExtras = {}) => {

    setLoading(true);
    try {
      const response = await joinRequestsAPI.submitJoinRequest(rideId, start, end, extras);
      fetchMyRequests(); // Refresh list after submitting
      return response;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchMyRequests]);

  return (
    <JoinContext.Provider
      value={{
        incomingRequests,
        myRequests,
        loading,
        error,
        fetchIncomingRequests,
        fetchMyRequests,
        acceptRequest,
        rejectRequest,
        cancelJoinRequest,
        submitRequest,
      }}

    >
      {children}
    </JoinContext.Provider>
  );
}

export function useJoinRequests() {
  const ctx = useContext(JoinContext);
  if (!ctx) throw new Error('useJoinRequests must be used within JoinProvider');
  return ctx;
}
