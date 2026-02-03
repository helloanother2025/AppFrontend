import React, { createContext, useCallback, useContext, useReducer, useEffect } from 'react';
import { notificationsAPI } from '../src/api/notifications';

const NotificationsContext = createContext();

const initialState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: true, error: null };
    case 'SET_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'SET_NOTIFICATIONS':
      return {
        ...state,
        notifications: action.payload,
        unreadCount: action.payload.filter(n => !n.isRead).length,
        loading: false,
      };
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      };
    case 'MARK_AS_READ':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.payload ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };
    case 'DELETE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload),
      };
    case 'CLEAR_ALL':
      return { ...state, notifications: [], unreadCount: 0 };
    default:
      return state;
  }
};

export const NotificationsProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const fetchNotifications = useCallback(async (isRead = false, limit = 20) => {
    dispatch({ type: 'SET_LOADING' });
    try {
      const data = await notificationsAPI.getNotifications(isRead, limit);
      dispatch({
        type: 'SET_NOTIFICATIONS',
        payload: data.notifications ?? data.data ?? [],
      });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  }, []);

  const markAsRead = useCallback(async (notificationId) => {
    dispatch({ type: 'MARK_AS_READ', payload: notificationId });
    try {
      await notificationsAPI.markAsRead(notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId) => {
    dispatch({ type: 'DELETE_NOTIFICATION', payload: notificationId });
    try {
      await notificationsAPI.deleteNotification(notificationId);
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const unreadNotifications = state.notifications.filter(n => !n.isRead);
    for (const notif of unreadNotifications) {
      await markAsRead(notif.id);
    }
  }, [state.notifications, markAsRead]);

  const clearAll = useCallback(async () => {
    for (const notif of state.notifications) {
      await deleteNotification(notif.id);
    }
  }, [state.notifications, deleteNotification]);

  return (
    <NotificationsContext.Provider
      value={{
        ...state,
        fetchNotifications,
        markAsRead,
        deleteNotification,
        markAllAsRead,
        clearAll,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
};
