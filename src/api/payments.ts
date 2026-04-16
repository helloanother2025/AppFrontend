import client from './client';
import { handleApiError, withRetry } from '../utils/errorHandler';

export type PaymentStatus = 'pending' | 'completed' | 'failed';

export const paymentsAPI = {
  createPayment: async (rideId: number, amount: number, distance?: number) => {
    try {
      const response = await client.post('/payments', {
        rideId,
        amount,
        distance: distance ?? null,
      });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error, 'Failed to create payment'));
    }
  },

  getMyPayments: async () => {
    try {
      const response = await withRetry(() => client.get('/payments/my-payments'));
      return response.data?.payments || [];
    } catch (error) {
      throw new Error(handleApiError(error, 'Failed to fetch payments'));
    }
  },

  updatePaymentStatus: async (paymentId: number, status: PaymentStatus) => {
    try {
      const response = await client.patch(`/payments/${paymentId}/status`, { status });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error, 'Failed to update payment status'));
    }
  },
};
