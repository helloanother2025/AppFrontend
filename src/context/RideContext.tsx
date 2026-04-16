import React, { createContext, useContext, useCallback, useRef, useState, type ReactNode } from 'react';
import { ridesAPI, type CreateRideData, type UpdateRideStatusOptions } from '../api/rides';
import { normalizeRide, normalizeRideList, availableRides, type NormalizedRide } from '../utils/rideMapper';
import { useUser } from './UserContext';

interface RideContextValue {
  rides: NormalizedRide[];
  myRides: NormalizedRide[];
  joinedRides: NormalizedRide[];
  selectedRide: NormalizedRide | null;
  loading: boolean;
  error: string | null;
  fetchAvailableRides: (filters?: any, useMock?: boolean) => Promise<NormalizedRide[]>;
  fetchMyRides: (filters?: any) => Promise<NormalizedRide[]>;
  fetchJoinedRides: (filters?: any) => Promise<NormalizedRide[]>;
  getRideDetails: (rideId: string | number) => Promise<NormalizedRide | null>;
  createRide: (data: CreateRideData) => Promise<NormalizedRide>;
  updateRide: (rideId: string | number, data: Partial<CreateRideData>) => Promise<NormalizedRide | null>;
  updateRideStatus: (rideId: number, status: string, options?: UpdateRideStatusOptions) => Promise<any>;
  selectRide: (ride: any) => void;
}

const RideContext = createContext<RideContextValue | null>(null);

export function RideProvider({ children }: { children: ReactNode }) {
  const { user: currentUser } = useUser();
  const [rides, setRides] = useState<NormalizedRide[]>([]);
  const [myRides, setMyRides] = useState<NormalizedRide[]>([]);
  const [joinedRides, setJoinedRides] = useState<NormalizedRide[]>([]);
  const [selectedRide, setSelectedRide] = useState<NormalizedRide | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailableRides = useCallback(async (filters = {}, useMock = false) => {
    setLoading(true);
    setError(null);
    try {
      if (useMock) {
        // Simulate a short delay for "fetching" feel
        await new Promise((resolve) => setTimeout(resolve, 800));
        const normalized = normalizeRideList(availableRides);
        setRides(normalized);
        return normalized;
      }
      const data = await ridesAPI.getAvailableRides(filters);
      const normalized = normalizeRideList(data?.rides ?? data ?? []);
      setRides(normalized);
      return normalized;
    } catch (err: any) {
      console.error('Failed to fetch rides:', err);
      setError(err.message || 'Failed to fetch rides');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMyRides = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await ridesAPI.getMyRides(filters);
      const normalized = normalizeRideList(data?.rides ?? data ?? []);
      setMyRides(normalized);
      return normalized;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch my rides');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchJoinedRides = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await ridesAPI.getJoinedRides(filters);
      const normalized = normalizeRideList(data?.rides ?? data ?? []);
      setJoinedRides(normalized);
      return normalized;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch joined rides');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getRideDetails = useCallback(async (rideId: string | number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await ridesAPI.getRideDetails(rideId);
      const ride = normalizeRide(data?.ride ?? data);
      if (ride) {
        // Attach full passenger data with route polylines to the normalized ride
        const passengers = data?.passengers || [];
        (ride as any).passengers = passengers;
        setSelectedRide(ride);
      }
      return ride;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch ride details');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createRide = useCallback(async (data: CreateRideData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await ridesAPI.createRide(data);
      const created = normalizeRide(response?.ride ?? response);
      if (!created) throw new Error('Failed to normalize created ride');
      
      setRides((prev) => [created, ...prev]);
      setMyRides((prev) => [created, ...prev]);
      setSelectedRide(created);
      return created;
    } catch (err: any) {
      setError(err.message || 'Failed to create ride');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateRide = useCallback(async (rideId: string | number, data: Partial<CreateRideData>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await ridesAPI.updateRide(rideId, data);
      const updated = normalizeRide(response?.ride ?? response);
      if (updated) {
        setRides((prev) => prev.map((ride) => String(ride.id) === String(rideId) ? updated : ride));
        setMyRides((prev) => prev.map((ride) => String(ride.id) === String(rideId) ? updated : ride));
        setJoinedRides((prev) => prev.map((ride) => String(ride.id) === String(rideId) ? updated : ride));
        setSelectedRide(updated);
      }

      return updated;
    } catch (err: any) {
      setError(err.message || 'Failed to update ride');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateRideStatus = useCallback(async (rideId: number, status: string, options: UpdateRideStatusOptions = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await ridesAPI.updateRideStatus(rideId, status, options);
      const updated = normalizeRide(response?.ride ?? response);
      if (updated) {
        setRides((prev) => prev.map((r) => String(r.id) === String(rideId) ? updated : r));
        setMyRides((prev) => prev.map((r) => String(r.id) === String(rideId) ? updated : r));
        setSelectedRide(updated);
      }

      return response;
    } catch (err: any) {
      setError(err.message || 'Failed to update ride status');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const selectRide = useCallback((ride: any) => {
    if (!ride) {
      setSelectedRide(null);
      return;
    }

    // If this is already a normalized ride shape, keep it as-is to avoid dropping fields.
    if (ride.start && ride.destination && ride.creator && ride.from && ride.to) {
      setSelectedRide(ride as NormalizedRide);
      return;
    }

    const normalized = normalizeRide(ride);
    setSelectedRide(normalized);
  }, []);

  return (
    <RideContext.Provider
      value={{
        rides,
        myRides,
        joinedRides,
        selectedRide,
        loading,
        error,
        fetchAvailableRides,
        fetchMyRides,
        fetchJoinedRides,
        getRideDetails,
        createRide,
        updateRide,
        updateRideStatus,
        selectRide,
      }}
    >
      {children}
    </RideContext.Provider>
  );
}

export function useRide() {
  const ctx = useContext(RideContext);
  if (!ctx) throw new Error('useRide must be used within RideProvider');
  return ctx;
}
