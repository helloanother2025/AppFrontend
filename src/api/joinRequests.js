import client from './client';

export const joinRequestsAPI = {
  submitJoinRequest: async (rideId, seatsRequested, message) => {
    const response = await client.post('/join-requests', {
      rideId,
      seatsRequested,
      message,
    });
    return response.data;
  },

  getJoinRequests: async (rideId) => {
    const response = await client.get(`/join-requests/ride/${rideId}`);
    return response.data;
  },

  acceptJoinRequest: async (requestId, seatsBooked) => {
    const response = await client.patch(`/join-requests/${requestId}/accept`, {
      seatsBooked,
    });
    return response.data;
  },

  rejectJoinRequest: async (requestId) => {
    const response = await client.patch(`/join-requests/${requestId}/reject`);
    return response.data;
  },
};
