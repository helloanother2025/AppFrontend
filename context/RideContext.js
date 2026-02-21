
import React, { createContext, useContext, useCallback, useRef, useState } from 'react';
import { ridesAPI } from '../src/api/rides';
import { normalizeRideList, normalizeRide } from '../src/utils/rideMapper';

// Update a ride's passengers in myRides and joinedRides by rideId
// (must be after getRideDetails is defined)


const RideContext = createContext();

const getInitialRideData = () => ({
  creator: { name: '', handle: '' },
  start: { name: '', coords: null },
  destination: { name: '', coords: null },
  transportMode: '',
  rideProvider: '',
  date: { day: '', time: '' },
  totalPassengers: 0,
  fare: '',
  partners: [],
  gender: 'Any',
  preferences: '',
  routePolyline: '',
});

export const RideProvider = ({ children }) => {
  const [rideData, setRideData] = useState(getInitialRideData());

  const [rides, setRides] = useState([]);
  const [myRides, setMyRides] = useState([]);
  const [joinedRides, setJoinedRides] = useState([]);
  const [selectedRide, setSelectedRide] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const createInFlightRef = useRef(false);
  const lastCreateKeyRef = useRef(null);
  const lastCreateAtRef = useRef(0);
  const lastCreatedRideRef = useRef(null);

  const fetchAvailableRides = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await ridesAPI.getAvailableRides(filters);
      const normalized = normalizeRideList(data?.rides ?? data ?? []);
      setRides(normalized);
      return normalized;
    } catch (err) {
      console.error('Failed to fetch rides:', err);
      setRides([]);
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
    } catch (err) {
      console.error('Failed to fetch my rides:', err);
      setMyRides([]);
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
      console.log('🔵 Fetching joined rides...');
      const data = await ridesAPI.getJoinedRides(filters);
      console.log('📦 Joined rides data:', data);
      const normalized = normalizeRideList(data?.rides ?? data ?? []);
      console.log('✅ Normalized joined rides:', normalized.length, 'rides');
      setJoinedRides(normalized);
      return normalized;
    } catch (err) {
      console.error('❌ Failed to fetch joined rides:', err);
      setJoinedRides([]);
      setError(err.message || 'Failed to fetch joined rides');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getRideDetails = useCallback(async (rideId) => {
    if (!rideId) return null;

    setLoading(true);
    setError(null);
    try {
      const data = await ridesAPI.getRideDetails(rideId);
      const ride = normalizeRide({
        ...data?.ride,
        passengers: data?.passengers,
      });
      setSelectedRide(ride);
      return ride;
    } catch (err) {
      console.error('Failed to fetch ride details:', err);
      setSelectedRide(null);
      setError(err.message || 'Failed to fetch ride details');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createRide = useCallback(async (data) => {
    const startTimeKey = data?.startTime
      ? new Date(data.startTime).toISOString().slice(0, 16)
      : null;
    const createKey = JSON.stringify({
      startLocation: data?.startLocation,
      endLocation: data?.endLocation,
      startTime: startTimeKey,
      transportMode: data?.transportMode,
      availableSeats: data?.availableSeats,
      fare: data?.fare,
      rideProvider: data?.rideProvider,
      genderPreference: data?.genderPreference,
      notes: data?.notes,
      routePolyline: data?.routePolyline,
    });

    const now = Date.now();
    if (createInFlightRef.current || (lastCreateKeyRef.current === createKey && now - lastCreateAtRef.current < 15000)) {
      return lastCreatedRideRef.current;
    }

    setLoading(true);
    setError(null);
    try {
      createInFlightRef.current = true;
      lastCreateKeyRef.current = createKey;
      lastCreateAtRef.current = now;

      const response = await ridesAPI.createRide(data);
      const created = normalizeRide(response?.ride ?? response);
      if (created) {
        setRides((prev) => (prev.some((r) => String(r.id) === String(created.id)) ? prev : [created, ...prev]));
        setSelectedRide(created);
        lastCreatedRideRef.current = created;
      }
      return created;
    } catch (err) {
      console.error('Failed to create ride:', err);
      setError(err.message || 'Failed to create ride');
      throw err;
    } finally {
      createInFlightRef.current = false;
      setLoading(false);
    }
  }, []);

  const resetRideData = useCallback(() => {
    setRideData(getInitialRideData());
  }, []);

  const completeRide = useCallback(async (rideId, completionData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await ridesAPI.completeRide(rideId, completionData);
      const updatedRide = normalizeRide(response?.ride ?? response?.data ?? response);
      if (updatedRide) {
        setRides((prev) => prev.map((r) => (String(r.id) === String(rideId) ? { ...r, ...updatedRide } : r)));
        setMyRides((prev) => prev.map((r) => (String(r.id) === String(rideId) ? { ...r, ...updatedRide } : r)));
        setJoinedRides((prev) => prev.map((r) => (String(r.id) === String(rideId) ? { ...r, ...updatedRide } : r)));
        setSelectedRide(updatedRide);
      }
      // Refresh rides lists to reflect completion
      await Promise.all([fetchMyRides(), fetchJoinedRides()]);
      return response;
    } catch (err) {
      console.error('Failed to complete ride:', err);
      setError(err.message || 'Failed to complete ride');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchMyRides, fetchJoinedRides]);

  const selectRide = useCallback((ride) => {
    if (!ride) return;
    setSelectedRide(normalizeRide(ride));
  }, []);

  const updateRideStatus = useCallback(async (rideId, status) => {
    setLoading(true);
    setError(null);
    try {
      const response = await ridesAPI.updateRideStatus(rideId, status);
      
      let updatedRide = null;
      if (response?.ride || response?.data) {
        updatedRide = normalizeRide(response.ride ?? response.data);
      } else {
        updatedRide = { status }; // Partial update for UI
      }

      if (updatedRide) {
        setRides((prev) => prev.map((r) => (String(r.id) === String(rideId) ? { ...r, ...updatedRide } : r)));
        setMyRides((prev) => prev.map((r) => (String(r.id) === String(rideId) ? { ...r, ...updatedRide } : r)));
        setJoinedRides((prev) => prev.map((r) => (String(r.id) === String(rideId) ? { ...r, ...updatedRide } : r)));
        
        if (updatedRide?.start) {
          setSelectedRide(updatedRide);
        } else {
          setSelectedRide((prev) => (prev && String(prev.id) === String(rideId) ? { ...prev, ...updatedRide } : prev));
        }
      }

      // Refresh rides lists to reflect status change
      await Promise.all([fetchMyRides(), fetchJoinedRides()]);

      let finalReturnedRide = updatedRide;
      if (!finalReturnedRide?.start) {
        // Fetch full ride details if the backend didn't return them in the update response
        finalReturnedRide = await getRideDetails(rideId);
      }
      
      return finalReturnedRide ?? response;
    } catch (err) {
      console.error('Failed to update ride status:', err);
      setError(err.message || 'Failed to update ride status');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchMyRides, fetchJoinedRides, getRideDetails]);

  const deleteRide = useCallback(async (rideId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await ridesAPI.deleteRide(rideId);
      setRides((prev) => prev.filter((r) => String(r.id) !== String(rideId)));
      setMyRides((prev) => prev.filter((r) => String(r.id) !== String(rideId)));
      setJoinedRides((prev) => prev.filter((r) => String(r.id) !== String(rideId)));
      if (selectedRide && String(selectedRide.id) === String(rideId)) {
        setSelectedRide(null);
      }
      return response;
    } catch (err) {
      console.error('Failed to delete ride:', err);
      setError(err.message || 'Failed to delete ride');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [selectedRide]);


  // Update a ride's passengers in myRides and joinedRides by rideId
  const updateRidePassengers = useCallback(async (rideId) => {
    const ride = await getRideDetails(rideId);
    if (ride) {
      setMyRides((prev) => prev.map((r) => String(r.id) === String(ride.id) ? { ...r, ...ride } : r));
      setJoinedRides((prev) => prev.map((r) => String(r.id) === String(ride.id) ? { ...r, ...ride } : r));
    }
  }, [getRideDetails]);

  return (
    <RideContext.Provider
      value={{
        rideData,
        setRideData,
        resetRideData,
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
        completeRide,
        updateRideStatus,
        deleteRide,
        selectRide,
        updateRidePassengers,
      }}
    >
      {children}
    </RideContext.Provider>
  );
};

export const useRide = () => useContext(RideContext);
