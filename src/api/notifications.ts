import client from './client';

export const notificationsAPI = {
  getNotifications: async (isRead: boolean | 'all' = false, limit = 20, offset = 0) => {
    const params: Record<string, unknown> = { limit };
    params.offset = offset;
    if (isRead !== 'all') {
      params.isRead = isRead === true ? 'true' : 'false';
    } else {
      params.isRead = 'all';
    }
    const response = await client.get('/notifications', { params });
    return response.data;
  },

  markAsRead: async (notificationId: string | number) => {
    const response = await client.patch(`/notifications/${notificationId}/read`);
    return response.data;
  },

  markAllRead: async () => {
    const response = await client.patch('/notifications/mark-all/read');
    return response.data;
  },

  deleteNotification: async (notificationId: string | number) => {
    const response = await client.delete(`/notifications/${notificationId}`);
    return response.data;
  },
};
