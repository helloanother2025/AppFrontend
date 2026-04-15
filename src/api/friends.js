import client from './client';

export const friendsAPI = {
  sendFriendRequest: async (userId) => {
    return client.post(`/friends/request`, { receiverId: userId });
  },
  getFriends: async (userId) => {
    const res = await client.get(`/friends/${userId}`);
    return res.data;
  },
  getReceivedRequests: async () => {
    const res = await client.get('/friends/requests/received');
    return res.data?.friendRequests || [];
  },
  acceptFriendRequest: async (requestId) => {
    return client.patch(`/friends/request/${requestId}/accept`);
  },
  declineFriendRequest: async (requestId) => {
    return client.patch(`/friends/request/${requestId}/reject`);
  },
};
