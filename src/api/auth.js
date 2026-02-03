import * as SecureStore from 'expo-secure-store';
import client from './client';

const storeSession = async ({ token, userId, userUuid }) => {
  if (!token) {
    console.log('No token to store');
    return null;
  }
  console.log('Storing auth session with token:', token.substring(0, 20) + '...');
  await SecureStore.setItemAsync('authToken', token);
  if (userId) {
    await SecureStore.setItemAsync('userId', String(userId));
  }
  if (userUuid) {
    await SecureStore.setItemAsync('userUuid', String(userUuid));
  }
  return token;
};

export const authAPI = {
  register: async (email, password, name, username, phone, gender, university, department, address, fb) => {
    const response = await client.post('/auth/register', {
      email,
      password,
      name,
      username,
      phone,
      gender,
      university,
      department,
      address,
      fb,
    });

    const { token, userId, userUuid } = response.data || {};
    await storeSession({ token, userId, userUuid });

    return {
      token,
      userId,
      userUuid,
    };
  },

  login: async (email, password) => {
    const response = await client.post('/auth/login', { email, password });
    const { token, userId, userUuid } = response.data || {};
    
    await storeSession({ token, userId, userUuid });

    return {
      token,
      userId,
      userUuid,
    };
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('authToken');
    await SecureStore.deleteItemAsync('userId');
    await SecureStore.deleteItemAsync('userUuid');
  },

  getCurrentUser: async () => {
    const response = await client.get('/users/me');
    return response.data;
  },
};
