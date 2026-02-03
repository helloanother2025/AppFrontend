import client from './client';

export const notificationsAPI = {
  getNotifications: async (isRead = false, limit = 20) => {
    const response = await client.get('/notifications', {
      params: { isRead: isRead ? 'true' : 'false', limit },
    });
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
