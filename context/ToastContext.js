import React, { createContext, useCallback, useContext, useState } from 'react';
import { Alert } from 'react-native';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    const toast = { id, message, type };

    setToasts((prev) => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const showSuccess = useCallback(
    (message, duration = 3000) => showToast(message, 'success', duration),
    [showToast]
  );

  const showError = useCallback(
    (message, duration = 4000) => showToast(message, 'error', duration),
    [showToast]
  );

  const showWarning = useCallback(
    (message, duration = 3500) => showToast(message, 'warning', duration),
    [showToast]
  );

  const showInfo = useCallback(
    (message, duration = 3000) => showToast(message, 'info', duration),
    [showToast]
  );

  const hideToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const hideAll = useCallback(() => {
    setToasts([]);
  }, []);

  const value = {
    toasts,
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideToast,
    hideAll,
  };

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};
