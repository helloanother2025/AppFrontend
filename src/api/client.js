import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { loadingStateManager } from '../utils/loadingStateManager';
import { router } from 'expo-router';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

client.interceptors.request.use(async (config) => {
  try {
    loadingStateManager.increment();
    const token = await SecureStore.getItemAsync('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Token attached to request:', config.url);
    } else {
      console.log('No token found in SecureStore for request:', config.url);
    }
  } catch (error) {
    console.error('Error retrieving token:', error);
  }
  return config;
}, (error) => {
  loadingStateManager.decrement();
  return Promise.reject(error);
});

client.interceptors.response.use(
  (response) => {
    loadingStateManager.decrement();
    console.log('✅ API Response:', response.config.url, response.status);
    return response;
  },
  async (error) => {
    loadingStateManager.decrement();
    console.error('❌ API Error:', error.config?.url, error.response?.status);
    console.error('Error details:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default client;
