/**
 * Loading State Manager
 * Manages loading states across the app during API calls
 */

let loadingCount = 0;
const loadingListeners = new Set();

export const loadingStateManager = {
  increment: () => {
    loadingCount++;
    notifyListeners();
  },

  decrement: () => {
    if (loadingCount > 0) {
      loadingCount--;
      notifyListeners();
    }
  },

  isLoading: () => loadingCount > 0,

  subscribe: (listener) => {
    loadingListeners.add(listener);
    return () => loadingListeners.delete(listener);
  },
};

const notifyListeners = () => {
  loadingListeners.forEach((listener) => listener(loadingStateManager.isLoading()));
};

/**
 * Hook to use global loading state
 */
import { useState, useEffect } from 'react';

export const useGlobalLoading = () => {
  const [isLoading, setIsLoading] = useState(loadingStateManager.isLoading());

  useEffect(() => {
    return loadingStateManager.subscribe(setIsLoading);
  }, []);

  return isLoading;
};
