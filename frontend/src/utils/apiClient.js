import axios from 'axios';
import { toast } from 'sonner';
import { logger } from './logger';

// Create axios instance with default timeout and retry logic
const apiClient = axios.create({
  timeout: 10000, // 10 second default — fast fail, don't hang the UI
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor to add auth token and timeout handling
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Polling endpoints get short timeouts — fail fast, next poll will retry
    if (config.url?.includes('/orders') || config.url?.includes('/tables') || config.url?.includes('/menu')) {
      config.timeout = config.timeout || 8000;
    }

    // Uploads/exports get longer timeout
    if (config.url?.includes('/upload') || config.url?.includes('/export')) {
      config.timeout = 45000;
    }

    if (!config._retryCount) {
      config._retryCount = 0;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — only retry network errors, NOT timeouts on polling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const retryCount = originalRequest?._retryCount || 0;

    // DO NOT retry timeouts on polling endpoints — just fail fast and show error
    const isPollingEndpoint = originalRequest?.url?.includes('/orders') ||
                              originalRequest?.url?.includes('/tables') ||
                              originalRequest?.url?.includes('/menu');

    if ((error.code === 'ECONNABORTED' || error.message?.includes('timeout')) && isPollingEndpoint) {
      return Promise.reject(error); // Fail immediately, no retry
    }

    // Retry network errors once (not timeouts) for non-polling endpoints
    if ((error.code === 'ERR_NETWORK' || !error.response) && retryCount < 1 && !isPollingEndpoint) {
      originalRequest._retryCount = retryCount + 1;
      await new Promise(resolve => setTimeout(resolve, 1000));
      try {
        return await apiClient(originalRequest);
      } catch (retryError) {
        return Promise.reject(retryError);
      }
    }
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      toast.error('Session expired. Please login again.', {
        duration: 5000,
        style: {
          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
          color: 'white'
        }
      });
      
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
      
      return Promise.reject(error);
    }
    
    return Promise.reject(error);
  }
);

// Helper function for critical operations with custom retry logic
export const apiWithRetry = async (requestConfig, maxRetries = 1) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const response = await apiClient(requestConfig);
      return response;
    } catch (error) {
      lastError = error;

      const status = error.response?.status;
      const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');

      // Never retry timeouts — fail fast so UI shows error immediately
      if (isTimeout) break;

      // Don't retry definitive client errors
      if (status >= 400 && status < 500 && status !== 408 && status !== 429) break;

      if (attempt === maxRetries + 1) break;

      const delay = status === 503
        ? Math.min(2000 * attempt, 6000)
        : Math.min(1000 * attempt, 3000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

// Helper function for non-critical operations (fail silently)
export const apiSilent = async (requestConfig) => {
  try {
    return await apiClient(requestConfig);
  } catch (error) {
    logger.debug('Silent API call failed:', error.message);
    return { data: null, error };
  }
};

// Helper function for background operations (no user notifications)
export const apiBackground = async (requestConfig) => {
  try {
    // Create a new axios instance for background requests to avoid interceptor conflicts
    const backgroundClient = axios.create({
      timeout: requestConfig.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        ...requestConfig.headers
      }
    });
    
    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      backgroundClient.defaults.headers.Authorization = `Bearer ${token}`;
    }
    
    // Simple error handling for background requests
    backgroundClient.interceptors.response.use(
      (response) => response,
      (error) => {
        logger.debug('Background API error:', error.message);
        return Promise.reject(error);
      }
    );
    
    const response = await backgroundClient(requestConfig);
    return response;
  } catch (error) {
    logger.debug('Background API call failed:', error.message);
    throw error;
  }
};

export default apiClient;