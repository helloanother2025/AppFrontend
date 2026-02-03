import client from './client';

export const notificationsAPI = {
  getNotifications: async (isRead = false, limit = 20) => {
    const params = { limit };
    
    // Support 'all', true, false, or string values
    if (isRead !== 'all') {
      params.isRead = isRead === true || isRead === 'true' ? 'true' : 'false';
    } else {
      params.isRead = 'all';
    }
    
    const response = await client.get('/notifications', { params });
    return response.data;
  },

  markAsRead: async (notificationId) => {
    const response = await client.patch(`/notifications/${notificationId}/read`);
    return response.data;
  },

  deleteNotification: async (notificationId) => {
    const response = await client.delete(`/notifications/${notificationId}`);
    return response.data;
  },
};
