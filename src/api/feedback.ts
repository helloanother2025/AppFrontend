import client from './client';
import { handleApiError, withRetry } from '../utils/errorHandler';

export interface SubmitFeedbackData {
  rideId: string | number;
  revieweeId: string | number;
  rating: number;
  review?: string;
}

export const feedbackAPI = {
  submitFeedback: async (data: SubmitFeedbackData) => {
    try {
      const response = await client.post('/feedback/submit', {
        rideId: Number(data.rideId),
        revieweeId: Number(data.revieweeId),
        rating: Number(data.rating),
        review: data.review?.trim() || null,
      });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error, 'Failed to submit feedback'));
    }
  },

  getUserFeedback: async (userId: string | number) => {
    try {
      const response = await withRetry(() => client.get(`/feedback/user/${userId}`));
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error, 'Failed to fetch user feedback'));
    }
  },

  getUserAverageFeedback: async (userId: string | number) => {
    try {
      const response = await withRetry(() => client.get(`/feedback/user/${userId}/average`));
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error, 'Failed to fetch user average feedback'));
    }
  },

  getRideReviewerFeedback: async (rideId: string | number, reviewerId: string | number) => {
    try {
      const response = await withRetry(() => client.get(`/feedback/ride/${rideId}/reviewer/${reviewerId}`));
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error, 'Failed to fetch ride feedback submissions'));
    }
  },
};
