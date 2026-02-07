import client from './client';

export const friendsAPI = {
  sendFriendRequest: async (userId) => {
    return client.post(`/friends/request`, { receiverId: userId });
  },
  getFriends: async (userId) => {
    return client.get(`/friends/${userId}`);
  },
  acceptFriendRequest: async (requestId) => {
    return client.patch(`/friends/request/${requestId}/accept`);
  },
  declineFriendRequest: async (requestId) => {
    return client.patch(`/friends/request/${requestId}/reject`);
  },
};
