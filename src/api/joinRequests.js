import client from './client';

export const joinRequestsAPI = {
  submitJoinRequest: async (rideId, startLocation, endLocation, routePolyline) => {
    const response = await client.post('/join-requests', {
      rideId,
      startLocation,
      endLocation,
      routePolyline,
    });
    return response.data;
  },

  getJoinRequests: async (rideId) => {
    const response = await client.get(`/join-requests/ride/${rideId}`);
    return response.data;
  },

  getJoinRequest: async (requestId) => {
    const response = await client.get(`/join-requests/${requestId}`);
    return response.data;
  },

  getMyRequests: async () => {
    const response = await client.get('/join-requests/my-requests');
    return response.data;
  },

  acceptJoinRequest: async (requestId) => {
    const response = await client.patch(`/join-requests/${requestId}/accept`);
    return response.data;
  },

  rejectJoinRequest: async (requestId) => {
    const response = await client.patch(`/join-requests/${requestId}/reject`);
    return response.data;
  },

  cancelJoinRequest: async (requestId) => {
    const response = await client.patch(`/join-requests/${requestId}/cancel`);
    return response.data;
  },

  checkJoinStatus: async (rideId) => {
    const response = await client.get(`/join-requests/status/${rideId}`);
    return response.data;
  },
};
