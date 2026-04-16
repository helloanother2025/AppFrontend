import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

type RetryableConfig = {
  __baseUrlRetried?: boolean;
  baseURL?: string;
  method?: string;
};

const ENV_API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || '').trim();
const HAS_EXPLICIT_API_BASE_URL = ENV_API_BASE_URL.length > 0;
const NETWORK_RETRY_COOLDOWN_MS = 15000;
const networkRetryCooldownByRequest = new Map<string, number>();

const getFallbackApiBaseUrl = (): string => {
  const hostUri =
    (Constants.expoConfig as { hostUri?: string } | null | undefined)?.hostUri ||
    (Constants as unknown as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig?.debuggerHost;

  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:5000/api`;
  }

  return 'http://localhost:5000/api';
};

const API_BASE_URL = ENV_API_BASE_URL || getFallbackApiBaseUrl();

const getAlternativeBaseUrls = (currentBaseUrl: string): string[] => {
  const hostUri =
    (Constants.expoConfig as { hostUri?: string } | null | undefined)?.hostUri ||
    (Constants as unknown as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig?.debuggerHost;

  if (HAS_EXPLICIT_API_BASE_URL) {
    const explicitSafeCandidates = [
      hostUri ? `http://${hostUri.split(':')[0]}:5000/api` : null,
    ].filter((url): url is string => Boolean(url));

    return Array.from(new Set(explicitSafeCandidates)).filter((url) => url !== currentBaseUrl);
  }

  const candidates = [
    'http://localhost:5000/api',
    hostUri ? `http://${hostUri.split(':')[0]}:5000/api` : null,
  ].filter((url): url is string => Boolean(url));

  return Array.from(new Set(candidates)).filter((url) => url !== currentBaseUrl);
};

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

client.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error retrieving token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handler for 401 errors - allows UserContext to set logout callback
let on401: (() => void) | null = null;

export const set401Handler = (handler: () => void) => {
  on401 = handler;
};

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const code = error?.code;
    const message = error?.message;
    const responseData = error?.response?.data;
    const baseUrl = error?.config?.baseURL || API_BASE_URL;
    const url = error?.config?.url || error?.request?.responseURL || 'unknown-endpoint';
    const method = (error?.config?.method || 'request').toUpperCase();
    const requestKey = `${method}:${url}`;
    const config = (error?.config || {}) as RetryableConfig;
    
    console.error('❌ API Error:', `${method} ${url}`, status ?? 'no-status');
    console.error('API Base URL:', baseUrl);
    console.error('Network details:', code || 'no-code', message || 'no-message');
    if (!status && code === 'ERR_NETWORK') {
      console.warn('Unable to reach API server. Verify backend is running and your app can access:', API_BASE_URL);
    }
    if (responseData) {
      console.error('API response payload:', responseData);
    }

    // Auto-retry once with known alternative hosts when transport fails before HTTP response.
    const lastRetryAt = networkRetryCooldownByRequest.get(requestKey) || 0;
    const retryCooldownActive = Date.now() - lastRetryAt < NETWORK_RETRY_COOLDOWN_MS;

    if (!status && code === 'ERR_NETWORK' && !config.__baseUrlRetried && !retryCooldownActive) {
      const alternatives = getAlternativeBaseUrls(baseUrl);
      for (const nextBaseUrl of alternatives) {
        try {
          networkRetryCooldownByRequest.set(requestKey, Date.now());
          console.warn('Retrying request with alternative API base URL:', nextBaseUrl);
          return await client.request({
            ...error.config,
            baseURL: nextBaseUrl,
            __baseUrlRetried: true,
          } as RetryableConfig);
        } catch (retryError) {
          const retryCode = (retryError as { code?: string })?.code || 'no-code';
          console.warn('Alternative API base URL failed:', nextBaseUrl, retryCode);
        }
      }
    }
    
    // Handle 401 Unauthorized - token is invalid or expired
    if (status === 401) {
      console.warn('🔐 Unauthorized access - clearing session and redirecting to login');
      if (on401) {
        on401();
      }
      // Continue to reject the error after calling handler
    }
    
    return Promise.reject(error);
  }
);

export default client;
