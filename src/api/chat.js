import client from './client';
import { handleApiError, withRetry } from '../utils/errorHandler';

export const chatAPI = {
  /**
   * Get all chats for current user
   */
  getChats: async (page = 1, limit = 20) => {
    try {
      const response = await withRetry(() =>
        client.get('/chats', {
          params: { page, limit },
        })
      );
      return response.data;
    } catch (error) {
      const message = handleApiError(error, 'Failed to fetch chats');
      throw new Error(message);
    }
  },

  /**
   * Get single chat details
   */
  getChat: async (chatId) => {
    try {
      if (!chatId) {
        throw new Error('Chat ID is required');
      }

      const response = await withRetry(() =>
        client.get(`/chats/${chatId}`)
      );
      return response.data;
    } catch (error) {
      const message = handleApiError(error, 'Failed to fetch chat');
      throw new Error(message);
    }
  },

  /**
   * Get messages in a chat
   */
  getMessages: async (chatId, page = 1, limit = 50) => {
    try {
      if (!chatId) {
        throw new Error('Chat ID is required');
      }

      const response = await withRetry(() =>
        client.get(`/chats/${chatId}/messages`, {
          params: { page, limit },
        })
      );
      return response.data;
    } catch (error) {
      const message = handleApiError(error, 'Failed to fetch messages');
      throw new Error(message);
    }
  },

  /**
   * Create or get private chat with another user
   */
  getPrivateChat: async (otherUserId) => {
    try {
      if (!otherUserId) {
        throw new Error('Other user ID is required');
      }

      const response = await client.post(`/chats/private/${otherUserId}`);
      return response.data;
    } catch (error) {
      const message = handleApiError(error, 'Failed to create/get private chat');
      throw new Error(message);
    }
  },

  /**
   * Send message in a chat
   */
  sendMessage: async (chatId, content, mediaUrl) => {
    try {
      if (!chatId) {
        throw new Error('Chat ID is required');
      }

      if (!content && !mediaUrl) {
        throw new Error('Message content or media is required');
      }

      const response = await client.post(`/chats/${chatId}/messages`, {
        content,
        mediaUrl,
      });
      return response.data;
    } catch (error) {
      const message = handleApiError(error, 'Failed to send message');
      throw new Error(message);
    }
  },

  /**
   * Mark message as read
   */
  markMessageAsRead: async (chatId, messageId) => {
    try {
      const response = await client.patch(
        `/chats/${chatId}/messages/${messageId}/read`
      );
      return response.data;
    } catch (error) {
      const message = handleApiError(error, 'Failed to mark message as read');
      throw new Error(message);
    }
  },

  /**
   * Delete message
   */
  deleteMessage: async (chatId, messageId) => {
    try {
      const response = await client.delete(
        `/chats/${chatId}/messages/${messageId}`
      );
      return response.data;
    } catch (error) {
      const message = handleApiError(error, 'Failed to delete message');
      throw new Error(message);
    }
  },
};
