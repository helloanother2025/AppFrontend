import client from './client';
import { handleApiError, withRetry } from '../utils/errorHandler';

export interface RideFilters {
  transportMode?: string;
  genderPreference?: string;
  afterDate?: string;
  beforeDate?: string;
  startLocationLat?: number;
  startLocationLng?: number;
  endLocationLat?: number;
  endLocationLng?: number;
  radiusKm?: number;
  searchType?: string;
  page?: number;
  limit?: number;
}

export interface CreateRideData {
  startLocation: { lat: number; lng: number; name: string };
  endLocation: { lat: number; lng: number; name: string };
  startTime: string;
  transportMode: string;
  transportDetail?: string;
  availableSeats: number;
  fare: number | null;
  rideProvider?: string;
  genderPreference?: string | null;
  notes?: string;
  routePolyline?: string;
}

export interface RemovePassengerData {
  report?: boolean;
  reportReason?: string;
  reportDetails?: string;
}

export interface UpdateRideStatusOptions {
  transferToUserId?: string | number;
  forceCancel?: boolean;
}

export const ridesAPI = {
  createRide: async (rideData: CreateRideData) => {
    try {
      const response = await client.post('/rides', {
        startLocation: rideData.startLocation,
        endLocation: rideData.endLocation,
        startTime: rideData.startTime,
        transportMode: rideData.transportMode,
        transportDetail: rideData.transportDetail || null,
        availableSeats: rideData.availableSeats,
        fare: parseFloat(String(rideData.fare)),
        rideProvider: rideData.rideProvider || null,
        genderPreference: rideData.genderPreference ?? null,
        notes: rideData.notes,
        routePolyline: rideData.routePolyline,
      });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error, 'Failed to create ride'));
    }
  },

  getAvailableRides: async (filters: RideFilters = {}) => {
    try {
      const params: Record<string, unknown> = {};
      if (filters.transportMode) params.transportMode = String(filters.transportMode).toLowerCase();
      if (filters.genderPreference) params.genderPreference = String(filters.genderPreference).toLowerCase();
      if (filters.afterDate) params.afterDate = filters.afterDate;
      if (filters.beforeDate) params.beforeDate = filters.beforeDate;
      if (filters.startLocationLat) params.startLocationLat = filters.startLocationLat;
      if (filters.startLocationLng) params.startLocationLng = filters.startLocationLng;
      if (filters.endLocationLat) params.endLocationLat = filters.endLocationLat;
      if (filters.endLocationLng) params.endLocationLng = filters.endLocationLng;
      if (filters.radiusKm) params.radiusKm = filters.radiusKm;
      if (filters.searchType) params.searchType = filters.searchType;
      const response = await withRetry(() => client.get('/rides', { params }));
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error, 'Failed to fetch available rides'));
    }
  },

  getMyRides: async (filters: RideFilters = {}) => {
    try {
      const params = { page: filters.page || 1, limit: filters.limit || 10 };
      const response = await withRetry(() => client.get('/rides/driver/my-rides', { params }));
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error, 'Failed to fetch your rides'));
    }
  },

  getJoinedRides: async (filters: RideFilters = {}) => {
    try {
      const params = { page: filters.page || 1, limit: filters.limit || 10 };
      const response = await withRetry(() => client.get('/rides/passenger/my-rides', { params }));
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error, 'Failed to fetch joined rides'));
    }
  },

  getRideDetails: async (rideId: string | number) => {
    try {
      const response = await withRetry(() => client.get(`/rides/${rideId}`));
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error, 'Failed to fetch ride details'));
    }
  },

  updateRideStatus: async (
    rideId: string | number,
    status: string,
    options: UpdateRideStatusOptions = {}
  ) => {
    try {
      const response = await client.patch(`/rides/${rideId}/status`, {
        status,
        transferToUserId: options.transferToUserId ?? null,
        forceCancel: Boolean(options.forceCancel),
      });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error, 'Failed to update ride status'));
    }
  },

  cancelRide: async (rideId: string | number, reason?: string) => {
    try {
      const response = await client.patch(`/rides/${rideId}/status`, { status: 'cancelled', cancelReason: reason });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error, 'Failed to cancel ride'));
    }
  },

  updateRide: async (rideId: string | number, rideData: Partial<CreateRideData>) => {
    try {
      const response = await client.put(`/rides/${rideId}`, {
        ...rideData,
        transportDetail: rideData.transportDetail || null,
        fare:
          rideData.fare === undefined || rideData.fare === null
            ? null
            : parseFloat(String(rideData.fare)),
      });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error, 'Failed to update ride'));
    }
  },

  deleteRide: async (rideId: string | number) => {
    try {
      const response = await client.delete(`/rides/${rideId}`);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error, 'Failed to delete ride'));
    }
  },

  removePassenger: async (
    rideId: string | number,
    passengerId: string | number,
    data: RemovePassengerData = {}
  ) => {
    try {
      const response = await client.delete(`/rides/${rideId}/passenger/${passengerId}`, {
        data: {
          report: Boolean(data.report),
          reportReason: data.reportReason || null,
          reportDetails: data.reportDetails || null,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error, 'Failed to remove passenger'));
    }
  },

  sendPanicAlert: async (rideId: string | number) => {
    try {
      const response = await client.post(`/rides/${rideId}/panic`);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error, 'Failed to send panic alert'));
    }
  },
};
