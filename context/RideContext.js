import React, { createContext, useContext, useCallback, useState } from 'react';
import user from '../data/userData.json';
import ridesFallback from '../data/rideData.json';
import { ridesAPI } from '../src/api/rides';
import { normalizeRideList, normalizeRide } from '../src/utils/rideMapper';

const RideContext = createContext();

export const RideProvider = ({ children }) => {
  const [rideData, setRideData] = useState({
    creator: {name: user[0].name, handle: user[0].handle},
    start: { name: '', coords: null },
    destination: { name: '', coords: null },
    transport: '',
    date: {day: '', time: ''},
    totalPassengers: 0,
    fare: '',
    partners: [],
    gender: 'Any',
    preferences: '',
    routePolyline: ''
  });

  const [rides, setRides] = useState(normalizeRideList(ridesFallback));
  const [myRides, setMyRides] = useState([]);
  const [joinedRides, setJoinedRides] = useState([]);
  const [selectedRide, setSelectedRide] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
      const fallback = normalizeRideList(ridesFallback);
      setRides(fallback);
      setError(err.message || 'Failed to fetch rides');
      return fallback;
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
      const fallback = normalizeRideList(ridesFallback);
      setMyRides(fallback);
      setError(err.message || 'Failed to fetch my rides');
      return fallback;
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
    } catch (err) {
      console.error('Failed to fetch joined rides:', err);
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
      const fallback = normalizeRide(ridesFallback.find((r) => String(r.id) === String(rideId)) || ridesFallback[0]);
      setSelectedRide(fallback);
      setError(err.message || 'Failed to fetch ride details');
      return fallback;
    } finally {
      setLoading(false);
    }
  }, []);

  const createRide = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await ridesAPI.createRide(data);
      const created = normalizeRide(response?.ride ?? response);
      if (created) {
        setRides((prev) => [created, ...prev]);
        setSelectedRide(created);
      }
      return created;
    } catch (err) {
      console.error('Failed to create ride:', err);
      setError(err.message || 'Failed to create ride');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const completeRide = useCallback(async (rideId, completionData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await ridesAPI.completeRide(rideId, completionData);
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

  const updateRideStatus = useCallback(async (rideId, status) => {
    setLoading(true);
    setError(null);
    try {
      const response = await ridesAPI.updateRideStatus(rideId, status);
      // Refresh rides lists to reflect status change
      await Promise.all([fetchMyRides(), fetchJoinedRides()]);
      return response;
    } catch (err) {
      console.error('Failed to update ride status:', err);
      setError(err.message || 'Failed to update ride status');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchMyRides, fetchJoinedRides]);

  return (
    <RideContext.Provider
      value={{
        rideData,
        setRideData,
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
      }}
    >
      {children}
    </RideContext.Provider>
  );
};

export const useRide = () => useContext(RideContext);
