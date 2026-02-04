import React, { createContext, useCallback, useContext, useReducer, useEffect } from 'react';
import { usersAPI } from '../src/api/users';
import { authAPI } from '../src/api/auth';
import client from '../src/api/client';
import * as SecureStore from 'expo-secure-store';

const UserContext = createContext();

const initialState = {
  currentUser: null,
  userProfiles: {}, // Cache for user profiles
  loading: false,
  error: null,
  isAuthenticated: false,
  initialized: false,
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: true, error: null };
    case 'SET_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'SET_CURRENT_USER':
      return { 
        ...state, 
        currentUser: action.payload, 
        loading: false, 
        isAuthenticated: !!action.payload,
        initialized: true,
      };
    case 'SET_USER_PROFILE':
      return {
        ...state,
        userProfiles: {
          ...state.userProfiles,
          [action.payload.identifier]: action.payload.data,
        },
        loading: false,
      };
    case 'LOGOUT':
      return { 
        ...initialState, 
        loading: false, 
        initialized: true,
        isAuthenticated: false,
      };
    case 'INITIALIZE':
      return { ...state, initialized: true, loading: false };
    default:
      return state;
  }
};

export const UserProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Don't auto-fetch on mount, let components fetch when needed
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await SecureStore.getItemAsync('authToken');
        if (token) {
          client.defaults.headers.common.Authorization = `Bearer ${token}`;
          try {
            const userData = await usersAPI.getCurrentUser();
            dispatch({ type: 'SET_CURRENT_USER', payload: userData });
            return;
          } catch (err) {
            await SecureStore.deleteItemAsync('authToken');
            await SecureStore.deleteItemAsync('userId');
            await SecureStore.deleteItemAsync('userUuid');
            delete client.defaults.headers.common.Authorization;
            dispatch({ type: 'LOGOUT' });
            return;
          }
        }
        dispatch({ type: 'INITIALIZE' });
      } catch (error) {
        console.log('Auth check error:', error);
        dispatch({ type: 'INITIALIZE' });
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    dispatch({ type: 'SET_LOADING' });
    try {
      const { token, userId, userUuid } = await authAPI.login(email, password);
      
      // Fetch current user data
      const userData = await usersAPI.getCurrentUser();
      dispatch({ type: 'SET_CURRENT_USER', payload: userData });
      
      return userData;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.response?.data?.error || error.message });
      throw error;
    }
  }, []);

  const register = useCallback(async (email, password, firstName, lastName, phone) => {
    dispatch({ type: 'SET_LOADING' });
    try {
      const { token, userId, userUuid } = await authAPI.register(email, password, firstName, lastName, phone);
      
      // Fetch current user data
      const userData = await usersAPI.getCurrentUser();
      dispatch({ type: 'SET_CURRENT_USER', payload: userData });
      
      return userData;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.response?.data?.error || error.message });
      throw error;
    }
  }, []);

  const fetchCurrentUser = useCallback(async () => {
    dispatch({ type: 'SET_LOADING' });
    try {
      const data = await usersAPI.getCurrentUser();
      dispatch({ type: 'SET_CURRENT_USER', payload: data });
      return data;
    } catch (error) {
      if (error.response?.status === 401) {
        // Token is invalid or expired, clear it
        await SecureStore.deleteItemAsync('authToken');
        await SecureStore.deleteItemAsync('userId');
        await SecureStore.deleteItemAsync('userUuid');
        dispatch({ type: 'LOGOUT' });
        return null;
      }
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, []);

  const fetchUserProfile = useCallback(async (identifier) => {
    // Return cached profile if available
    if (state.userProfiles[identifier]) {
      return state.userProfiles[identifier];
    }

    dispatch({ type: 'SET_LOADING' });
    try {
      const data = await usersAPI.getUserProfile(identifier);
      dispatch({ type: 'SET_USER_PROFILE', payload: { identifier, data } });
      return data;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, [state.userProfiles]);

  const updateProfile = useCallback(async (profileData) => {
    dispatch({ type: 'SET_LOADING' });
    try {
      const data = await usersAPI.updateProfile(profileData);
      dispatch({ type: 'SET_CURRENT_USER', payload: data });
      return data;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, []);

  const searchUsers = useCallback(async (searchTerm) => {
    try {
      const data = await usersAPI.searchUsers(searchTerm);
      return data;
    } catch (error) {
      // If 401, user not authenticated; return empty
      if (error.response?.status === 401) {
        return { users: [] };
      }
      console.error('Search error:', error.message);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    await authAPI.logout();
    dispatch({ type: 'LOGOUT' });
  }, []);

  return (
    <UserContext.Provider
      value={{
        ...state,
        login,
        register,
        fetchCurrentUser,
        fetchUserProfile,
        updateProfile,
        searchUsers,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
};
