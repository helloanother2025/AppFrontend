import client from './client';
import { handleApiError } from '../utils/errorHandler';

export interface LocationPoint {
  lat: number;
  lng: number;
  name: string;
}

export interface JoinRequestExtras {
  routePolyline?: string;
  calculatedFare?: number;
  segmentDistanceKm?: number;
  detourDistanceKm?: number;
  estimatedDurationMin?: number;
  pricingVersion?: string;
  pickupAddress?: string;
  dropAddress?: string;
  requestMessage?: string;
}

export const joinRequestsAPI = {
  submitJoinRequest: async (
    rideId: string | number,
    startLocation: LocationPoint,
    endLocation: LocationPoint,
    extras: JoinRequestExtras = {}
  ) => {
    try {
      const response = await client.post('/join-requests', {
        rideId,
        startLocation,
        endLocation,
        routePolyline: extras.routePolyline,
        calculatedFare: extras.calculatedFare,
        segmentDistanceKm: extras.segmentDistanceKm,
        detourDistanceKm: extras.detourDistanceKm,
        estimatedDurationMin: extras.estimatedDurationMin,
        pricingVersion: extras.pricingVersion,
        pickupAddress: extras.pickupAddress,
        dropAddress: extras.dropAddress,
        requestMessage: extras.requestMessage,
      });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error, 'Failed to submit join request'));
    }
  },

  getJoinRequests: async (rideId: string | number) => {
    const response = await client.get(`/join-requests/ride/${rideId}`);
    return response.data?.joinRequests || [];
  },

  getJoinRequest: async (requestId: string | number) => {
    const response = await client.get(`/join-requests/${requestId}`);
    return response.data;
  },

  getMyRequests: async () => {
    const response = await client.get('/join-requests/my-requests');
    return response.data?.joinRequests || [];
  },

  acceptJoinRequest: async (requestId: string | number) => {
    const response = await client.patch(`/join-requests/${requestId}/accept`);
    return response.data;
  },

  rejectJoinRequest: async (requestId: string | number) => {
    const response = await client.patch(`/join-requests/${requestId}/reject`);
    return response.data;
  },

  cancelJoinRequest: async (requestId: string | number) => {
    const response = await client.patch(`/join-requests/${requestId}/cancel`);
    return response.data;
  },

  checkJoinStatus: async (rideId: string | number) => {
    const response = await client.get(`/join-requests/status/${rideId}`);
    return response.data;
  },
  sendReminder: async (requestId: string | number) => {
    const response = await client.post(`/join-requests/${requestId}/remind`);
    return response.data;
  },
};
