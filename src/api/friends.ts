import client from './client';

export const friendsAPI = {
  sendFriendRequest: async (userId: string | number) => {
    return client.post('/friends/request', { receiverId: userId });
  },

  getFriends: async (userId: string | number) => {
    const res = await client.get(`/friends/${userId}`);
    return res.data;
  },

  getReceivedRequests: async () => {
    const res = await client.get('/friends/requests/received');
    return res.data?.friendRequests || [];
  },

  getSentRequests: async () => {
    const res = await client.get('/friends/requests/sent');
    return res.data?.friendRequests || [];
  },

  acceptFriendRequest: async (requestId: string | number) => {
    return client.patch(`/friends/request/${requestId}/accept`);
  },

  declineFriendRequest: async (requestId: string | number) => {
    return client.patch(`/friends/request/${requestId}/reject`);
  },
};
