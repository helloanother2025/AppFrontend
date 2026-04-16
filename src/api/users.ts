import client from './client';

export const usersAPI = {
  getCurrentUser: async () => {
    const response = await client.get('/users/me');
    return response.data;
  },

  getMyFriends: async () => {
    const response = await client.get('/users/me/friends');
    return response.data;
  },

  getUserProfile: async (identifier: string | number) => {
    const response = await client.get(`/users/${identifier}`);
    return response.data;
  },

  updateProfile: async (profileData: Record<string, unknown>) => {
    const response = await client.patch('/users/me', profileData);
    return response.data;
  },

  searchUsers: async (searchTerm: string) => {
    const response = await client.get('/users/search', { params: { q: searchTerm } });
    return response.data;
  },

  getUserRatings: async (userId: string | number) => {
    const response = await client.get(`/users/${userId}/ratings`);
    return response.data;
  },

  getUserRideStats: async (identifier: string | number) => {
    if (identifier === undefined || identifier === null || identifier === '') {
      return { createdCount: 0, joinedCount: 0 };
    }
    const response = await client.get(`/users/${identifier}/ride-stats`);
    return response.data;
  },
};
