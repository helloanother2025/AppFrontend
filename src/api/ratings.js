import client from './client';
import { handleApiError } from '../utils/errorHandler';

export const ratingsAPI = {
  /**
   * Submit a rating for a user
   */
  submitRating: async (rideId, rateeId, rating, comment = '') => {
    try {
      if (!rideId || !rateeId) {
        throw new Error('Ride ID and ratee ID are required');
      }

      if (!rating || rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      const response = await client.post('/ratings', {
        rideId,
        rateeId,
        rating: parseInt(rating),
        comment: comment.trim(),
      });

      return response.data;
    } catch (error) {
      const message = handleApiError(error, 'Failed to submit rating');
      throw new Error(message);
    }
  },

  /**
   * Get ratings for a user
   */
  getUserRatings: async (userId) => {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const response = await client.get(`/ratings/user/${userId}`);
      return response.data;
    } catch (error) {
      const message = handleApiError(error, 'Failed to fetch ratings');
      throw new Error(message);
    }
  },

  /**
   * Get average rating for a user (shortcut)
   */
  getUserAverageRating: async (userId) => {
    try {
      const data = await ratingsAPI.getUserRatings(userId);
      return {
        average: data.average,
        totalRatings: data.total_ratings,
        ratings: data.ratings,
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Check if user has already rated another user for a ride
   */
  checkIfRated: async (rideId, rateeId) => {
    try {
      // This would be a backend endpoint if needed
      // For now, just validate the inputs
      if (!rideId || !rateeId) {
        throw new Error('Ride ID and ratee ID are required');
      }
      return true;
    } catch (error) {
      throw error;
    }
  },
};
