import client from './client';
import { handleApiError, withRetry } from '../utils/errorHandler';

export const ridesAPI = {
  /**
   * Create a new ride
   */
  createRide: async (rideData) => {
    try {
      if (
        !rideData.startLocation ||
        !rideData.endLocation ||
        !rideData.startTime ||
        !rideData.transportMode ||
        rideData.availableSeats === undefined ||
        rideData.fare === undefined
      ) {
        throw new Error('Missing required ride fields');
      }

      const response = await client.post('/rides', {
        startLocation: rideData.startLocation,
        endLocation: rideData.endLocation,
        startTime: rideData.startTime,
        transportMode: rideData.transportMode,
        availableSeats: rideData.availableSeats,
        fare: parseFloat(rideData.fare),
        rideProvider: rideData.rideProvider || 'Private',
        genderPreference: rideData.genderPreference ?? null,
        notes: rideData.notes,
        routePolyline: rideData.routePolyline,
      });
      return response.data;
    } catch (error) {
      const message = handleApiError(error, 'Failed to create ride');
      throw new Error(message);
    }
  },

  /**
   * Get all available rides with optional filters
   */
  getAvailableRides: async (filters = {}) => {
    try {
      const params = {
        page: filters.page || 1,
        limit: filters.limit || 10,
      };

      if (filters.transportMode) params.transportMode = filters.transportMode;
      if (filters.genderPreference) params.genderPreference = filters.genderPreference;
      if (filters.afterDate) params.afterDate = filters.afterDate;
      if (filters.beforeDate) params.beforeDate = filters.beforeDate;

      const response = await withRetry(() =>
        client.get('/rides', { params })
      );
      return response.data;
    } catch (error) {
      const message = handleApiError(error, 'Failed to fetch available rides');
      throw new Error(message);
    }
  },

  /**
   * Get rides I created (my rides)
   */
  getMyRides: async (filters = {}) => {
    try {
      const params = {
        page: filters.page || 1,
        limit: filters.limit || 10,
      };

      const response = await withRetry(() =>
        client.get('/rides/driver/my-rides', { params })
      );
      return response.data;
    } catch (error) {
      const message = handleApiError(error, 'Failed to fetch your rides');
      throw new Error(message);
    }
  },

  /**
   * Get rides I joined (as passenger)
   */
  getJoinedRides: async (filters = {}) => {
    try {
      const params = {
        page: filters.page || 1,
        limit: filters.limit || 10,
      };

      const response = await withRetry(() =>
        client.get('/rides/passenger/my-rides', { params })
      );
      return response.data;
    } catch (error) {
      const message = handleApiError(error, 'Failed to fetch joined rides');
      throw new Error(message);
    }
  },

  /**
   * Get specific ride details
   */
  getRideDetails: async (rideId) => {
    try {
      if (!rideId) {
        throw new Error('Ride ID is required');
      }

      const response = await withRetry(() =>
        client.get(`/rides/${rideId}`)
      );
      return response.data;
    } catch (error) {
      const message = handleApiError(error, 'Failed to fetch ride details');
      throw new Error(message);
    }
  },

  /**
   * Update ride status
   */
  updateRideStatus: async (rideId, status) => {
    try {
      if (!['unactive', 'started', 'cancelled', 'completed', 'expired'].includes(status)) {
        throw new Error('Invalid ride status');
      }

      const response = await client.patch(`/rides/${rideId}/status`, { status });
      return response.data;
    } catch (error) {
      const message = handleApiError(error, 'Failed to update ride status');
      throw new Error(message);
    }
  },

  /**
   * Complete a ride with fare finalization
   */
  completeRide: async (rideId, completionData) => {
    try {
      if (!completionData.actualFare) {
        throw new Error('Actual fare is required');
      }

      const response = await client.post(`/rides/${rideId}/complete`, {
        actualFare: completionData.actualFare,
        endLocation: completionData.endLocation,
        completionTime: completionData.completionTime || new Date().toISOString(),
      });
      return response.data;
    } catch (error) {
      const message = handleApiError(error, 'Failed to complete ride');
      throw new Error(message);
    }
  },

  /**
   * Calculate fare based on distance and duration
   */
  calculateFare: async (rideId, fareData) => {
    try {
      if (!fareData.distance || !fareData.duration) {
        throw new Error('Distance and duration are required');
      }

      const response = await client.post(`/rides/${rideId}/calculate-fare`, {
        distance: fareData.distance,
        duration: fareData.duration,
        baseFare: fareData.baseFare || 50,
        perKmRate: fareData.perKmRate || 10,
        perMinuteRate: fareData.perMinuteRate || 2,
      });
      return response.data;
    } catch (error) {
      const message = handleApiError(error, 'Failed to calculate fare');
      throw new Error(message);
    }
  },

  /**
   * Cancel a ride
   */
  cancelRide: async (rideId, reason) => {
    try {
      const response = await client.patch(`/rides/${rideId}/status`, {
        status: 'cancelled',
        cancelReason: reason,
      });
      return response.data;
    } catch (error) {
      const message = handleApiError(error, 'Failed to cancel ride');
      throw new Error(message);
    }
  },

  /**
   * Delete a past ride (creator only)
   */
  deleteRide: async (rideId) => {
    try {
      const response = await client.delete(`/rides/${rideId}`);
      return response.data;
    } catch (error) {
      const message = handleApiError(error, 'Failed to delete ride');
      throw new Error(message);
    }
  },
};
