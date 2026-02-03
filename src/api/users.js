import client from './client';

export const usersAPI = {
  getCurrentUser: async () => {
    const response = await client.get('/users/me');
    return response.data;
  },

  getUserProfile: async (identifier) => {
    const response = await client.get(`/users/${identifier}`);
    return response.data;
  },

  updateProfile: async (profileData) => {
    const response = await client.patch('/users/me', profileData);
    return response.data;
  },

  searchUsers: async (searchTerm) => {
    const response = await client.get('/users/search', {
      params: { q: searchTerm },
    });
    return response.data;
  },

  getUserRatings: async (userId) => {
    const response = await client.get(`/users/${userId}/ratings`);
    return response.data;
  },
};
