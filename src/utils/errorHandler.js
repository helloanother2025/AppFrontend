/**
 * API Error Handler Utility
 * Provides consistent error handling across the app
 */

export const handleApiError = (error, defaultMessage = 'An error occurred') => {
  if (error.response?.data?.error) {
    return error.response.data.error;
  }

  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.message) {
    return error.message;
  }

  if (error.status === 401) {
    return 'Authentication failed. Please log in again.';
  }

  if (error.status === 403) {
    return 'You do not have permission to perform this action.';
  }

  if (error.status === 404) {
    return 'The requested resource was not found.';
  }

  if (error.status === 500) {
    return 'Server error. Please try again later.';
  }

  if (error.code === 'ECONNABORTED') {
    return 'Request timeout. Please check your connection.';
  }

  if (error.code === 'ENOTFOUND' || error.code === 'ERR_NETWORK') {
    return 'Network error. Please check your internet connection.';
  }

  return defaultMessage;
};

export const isRetryableError = (error) => {
  if (!error.response) {
    // Network errors are retryable
    return true;
  }

  const status = error.response.status;

  // 5xx errors are retryable
  if (status >= 500) {
    return true;
  }

  // 408 (Request Timeout) and 429 (Too Many Requests) are retryable
  if (status === 408 || status === 429) {
    return true;
  }

  // 401 and 403 are not retryable
  if (status === 401 || status === 403) {
    return false;
  }

  return false;
};

export const withRetry = async (fn, maxRetries = 3, delayMs = 1000) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!isRetryableError(error) || attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff
      const delay = delayMs * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

/**
 * Validation helpers for common patterns
 */

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhoneNumber = (phone) => {
  // Basic phone validation - can be customized for specific countries
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
};

export const validateUsername = (username) => {
  // Username: 3-20 chars, alphanumeric, underscores/hyphens
  const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
  return usernameRegex.test(username);
};

export const validatePassword = (password) => {
  // Minimum 8 chars, at least one number, one uppercase, one lowercase
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

/**
 * Form validation helper
 */
export const validateFormFields = (values, schema) => {
  const errors = {};

  Object.keys(schema).forEach((field) => {
    const rules = schema[field];
    const value = values[field];

    if (rules.required && (!value || value.toString().trim() === '')) {
      errors[field] = `${field} is required`;
      return;
    }

    if (rules.minLength && value && value.toString().length < rules.minLength) {
      errors[field] = `${field} must be at least ${rules.minLength} characters`;
      return;
    }

    if (rules.maxLength && value && value.toString().length > rules.maxLength) {
      errors[field] = `${field} must be at most ${rules.maxLength} characters`;
      return;
    }

    if (rules.pattern && value && !rules.pattern.test(value)) {
      errors[field] = rules.patternMessage || `${field} is invalid`;
      return;
    }

    if (rules.custom && value) {
      const customError = rules.custom(value);
      if (customError) {
        errors[field] = customError;
      }
    }
  });

  return errors;
};
