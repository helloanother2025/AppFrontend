import client from './client';
import { handleApiError, withRetry } from '../utils/errorHandler';

export const chatAPI = {
  getChats: async (page = 1, limit = 20, type?: 'ride' | 'private') => {
    try {
      const response = await withRetry(() => client.get('/chats', { params: { page, limit, type } }));
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error, 'Failed to fetch chats'));
    }
  },

  getChat: async (chatId: string | number) => {
    try {
      const response = await withRetry(() => client.get(`/chats/${chatId}`));
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error, 'Failed to fetch chat'));
    }
  },

  getMessages: async (chatId: string | number, page = 1, limit = 50) => {
    try {
      const response = await withRetry(() =>
        client.get(`/chats/${chatId}/messages`, { params: { page, limit } })
      );
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error, 'Failed to fetch messages'));
    }
  },

  getPrivateChat: async (otherUserId: string | number) => {
    try {
      const response = await withRetry(() => client.post(`/chats/private/${otherUserId}`));
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error, 'Failed to create/get private chat'));
    }
  },

  sendMessage: async (chatId: string | number, content?: string, mediaUrl?: string) => {
    try {
      const response = await client.post(`/chats/${chatId}/messages`, { content, mediaUrl });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error, 'Failed to send message'));
    }
  },

  markMessageAsRead: async (chatId: string | number, messageId: string | number) => {
    try {
      const response = await client.patch(`/chats/${chatId}/messages/${messageId}/read`);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error, 'Failed to mark message as read'));
    }
  },

  deleteMessage: async (chatId: string | number, messageId: string | number) => {
    try {
      const response = await client.delete(`/chats/${chatId}/messages/${messageId}`);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error, 'Failed to delete message'));
    }
  },
};
