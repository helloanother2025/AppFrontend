import * as SecureStore from 'expo-secure-store';
import client from './client';

interface SessionData {
  token: string;
  userId?: number;
  userUuid?: string;
}

const storeSession = async ({ token, userId, userUuid }: SessionData) => {
  if (!token) return null;
  await SecureStore.setItemAsync('authToken', token);
  client.defaults.headers.common.Authorization = `Bearer ${token}`;
  if (userId) await SecureStore.setItemAsync('userId', String(userId));
  if (userUuid) await SecureStore.setItemAsync('userUuid', String(userUuid));
  return token;
};

export const authAPI = {
  register: async (
    email: string,
    password: string,
    name: string,
    username: string,
    phone: string,
    gender: string,
    university: string,
    department: string,
    address: string,
    fb?: string
  ) => {
    const response = await client.post('/auth/register', {
      email, password, name, username, phone, gender, university, department, address, fb,
    });
    const { token, userId, userUuid } = response.data || {};
    await storeSession({ token, userId, userUuid });
    return { token, userId, userUuid };
  },

  login: async (email: string, password: string) => {
    const response = await client.post('/auth/login', { email, password });
    const { token, userId, userUuid } = response.data || {};
    await storeSession({ token, userId, userUuid });
    return { token, userId, userUuid };
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('authToken');
    await SecureStore.deleteItemAsync('userId');
    await SecureStore.deleteItemAsync('userUuid');
    delete client.defaults.headers.common.Authorization;
  },

  getCurrentUser: async () => {
    const response = await client.get('/users/me');
    return response.data;
  },

  getStoredToken: () => SecureStore.getItemAsync('authToken'),
  getStoredUserId: () => SecureStore.getItemAsync('userId'),
};
