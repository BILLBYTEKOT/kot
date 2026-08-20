import { useState, useEffect } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Analytics } from '@vercel/analytics/react';

// ✅ Import Performance Optimization Modules
import {
  lazyImageLoader,
  expiringCache,
  ServiceWorkerManager,
  ResourcePrefetcher,
  MemoryManager
} from './utils/frontendPerformanceOptimization';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import Dashboard from './pages/Dashboard';
import MenuPage from './pages/MenuPage';
import CounterSalePage from './pages/CounterSalePage';
import CounterSaleRouter from './pages/CounterSaleRouter';
import OrdersPage from './pages/OrdersPage';
import TablesPage from './pages/TablesPage';
import KitchenPage from './pages/KitchenPage';
import InventoryPage from './pages/InventoryPage';
import ExpensePage from './pages/ExpensePage';
import ReportsPage from './pages/ReportsPage';
import BillingPage from './pages/BillingPage';
import SettingsPage from './pages/SettingsPage';
import SubscriptionPage from './pages/SubscriptionPage';
import BusinessSetupPage from './pages/BusinessSetupPage';
import StaffManagementPage from './pages/StaffManagementPage';
import LandingPage from './pages/LandingPage';
import { BluetoothPrinterProvider } from './contexts/BluetoothPrinterContext';
import SEOPage from './pages/SEOPage';
import TrackOrderPage from './pages/TrackOrderPage';
import SharedReceiptPage from './pages/SharedReceiptPage';
import CustomerOrderPage from './pages/CustomerOrderPage';
import DownloadPage from './pages/DownloadPage';
import BlogPage from './pages/BlogPage';
import BlogPostPage from './pages/BlogPostPage';
import ContactPage from './pages/ContactPage';
import OrderDisplayPage from './pages/OrderDisplayPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import HelpPage from './pages/HelpPage';
import SuperAdminPage from './pages/SuperAdminPage';
import OpsPanel from './pages/OpsPanel';
import ReferEarnPage from './pages/ReferEarnPage';
import RestaurantBillingSoftwarePage from './pages/RestaurantBillingSoftwarePage';
import KOTSoftwarePage from './pages/KOTSoftwarePage';
import POSSoftwarePage from './pages/POSSoftwarePage';
import BrandPage from './pages/BrandPage';
import PublicMenuPage from './pages/PublicMenuPage';
import NotFound from './pages/NotFound';
import PWAHomePage from './pages/PWAHomePage';
import CityLandingPage from './pages/CityLandingPage';
import ComparisonPage from './pages/ComparisonPage';
import DesktopInfo from './components/DesktopInfo';

import { Toaster } from './components/ui/sonner';
import { setupAutoSync } from './utils/offlineSync';
import { startNotificationPolling, requestNotificationPermission } from './utils/pushNotifications';
import { rewriteRequestUrl } from './utils/backendRouter';

// Reduce noisy logs in production by default.
// Set localStorage.DEBUG_LOGS = 'true' to re-enable console logs.
if (typeof window !== 'undefined') {
  const debugLogs = localStorage.getItem('DEBUG_LOGS') === 'true';
  if (!debugLogs) {
    console.log = () => {};
    console.info = () => {};
    console.debug = () => {};
  }
}

// Electron navigation handler component
const ElectronNavigator = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    if (window.electronAPI?.onNavigate) {
      window.electronAPI.onNavigate((path) => {
        navigate(path);
      });
    }
  }, [navigate]);
  
  return null;
};

// During local development, prefer the running backend on port 10000 so the UI
// can authenticate and exercise features against the same server that is launched here.
const BACKEND_URL = 'http://127.0.0.1:10000';
const LOCAL_BACKEND_URL = 'http://127.0.0.1:10000';
export const API = `${BACKEND_URL || LOCAL_BACKEND_URL}/api`;
export const SUPER_ADMIN_API_PREFIX = '/api/super-admin';

// Robust storage helper that uses multiple storage mechanisms
const AUTH_STORAGE_KEY = 'billbytekot_auth';

// IndexedDB helper for most reliable mobile storage
const openAuthDB = () => {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open('BillByteKOT_Auth', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('auth')) {
          db.createObjectStore('auth', { keyPath: 'id' });
        }
      };
    } catch (e) {
      reject(e);
    }
  });
};

const saveToIndexedDB = async (token, userData) => {
  try {
    const db = await openAuthDB();
    const tx = db.transaction('auth', 'readwrite');
    const store = tx.objectStore('auth');
    store.put({ id: 'session', token, user: userData, timestamp: Date.now() });
    console.log('Saved to IndexedDB');
  } catch (e) {
    console.log('IndexedDB save failed:', e);
  }
};

const getFromIndexedDB = async () => {
  try {
    const db = await openAuthDB();
    const tx = db.transaction('auth', 'readonly');
    const store = tx.objectStore('auth');
    return new Promise((resolve) => {
      const request = store.get('session');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
};

const clearIndexedDB = async () => {
  try {
    const db = await openAuthDB();
    const tx = db.transaction('auth', 'readwrite');
    const store = tx.objectStore('auth');
    store.delete('session');
  } catch (e) {
    // Ignore
  }
};

// Set a cookie with long expiry
const setCookie = (name, value, days = 30) => {
  try {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    // Use SameSite=Strict for better security, Secure only on HTTPS
    const isSecure = window.location.protocol === 'https:';
    const secureFlag = isSecure ? '; Secure' : '';
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/${secureFlag}; SameSite=Strict`;
    console.log('Cookie set:', name);
  } catch (e) {
    console.log('Cookie storage not available:', e);
  }
};

// Get cookie value
const getCookie = (name) => {
  try {
    const value = document.cookie.split('; ').find(row => row.startsWith(name + '='));
    return value ? decodeURIComponent(value.split('=')[1]) : null;
  } catch (e) {
    return null;
  }
};

// Delete cookie
const deleteCookie = (name) => {
  try {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  } catch (e) {
    // Ignore
  }
};

// Store auth data in multiple places for redundancy
const storeAuthData = (token, userData) => {
  const authData = JSON.stringify({ token, user: userData, timestamp: Date.now() });
  
  // Primary: localStorage
  try {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem(AUTH_STORAGE_KEY, authData);
    console.log('Saved to localStorage');
  } catch (e) {
    console.log('localStorage not available');
  }
  
  // Backup 1: sessionStorage
  try {
    sessionStorage.setItem('token_backup', token);
    sessionStorage.setItem('user_backup', JSON.stringify(userData));
    console.log('Saved to sessionStorage');
  } catch (e) {
    console.log('sessionStorage not available');
  }
  
  // Backup 2: Cookie (for mobile apps that clear localStorage)
  setCookie('auth_token', token, 30);
  setCookie('auth_user', JSON.stringify(userData), 30);
  
  // Backup 3: IndexedDB (most reliable for mobile PWAs)
  saveToIndexedDB(token, userData);
};

// Retrieve auth data from any available source (sync version)
const getAuthData = () => {
  let token = null;
  let userData = null;
  
  // Try localStorage first
  try {
    token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (userStr) userData = JSON.parse(userStr);
    if (token) console.log('Auth found in localStorage');
  } catch (e) {
    console.log('localStorage read failed');
  }
  
  // Try sessionStorage backup
  if (!token) {
    try {
      token = sessionStorage.getItem('token_backup');
      const userStr = sessionStorage.getItem('user_backup');
      if (userStr) userData = JSON.parse(userStr);
      
      // Restore to localStorage if found
      if (token) {
        console.log('Auth found in sessionStorage, restoring to localStorage');
        localStorage.setItem('token', token);
        if (userData) localStorage.setItem('user', JSON.stringify(userData));
      }
    } catch (e) {
      console.log('sessionStorage read failed');
    }
  }
  
  // Try cookie backup (most reliable for mobile)
  if (!token) {
    token = getCookie('auth_token');
    const userCookie = getCookie('auth_user');
    if (userCookie) {
      try {
        userData = JSON.parse(userCookie);
      } catch (e) {
        // Invalid cookie data
      }
    }
    
    // Restore to localStorage if found in cookie
    if (token) {
      console.log('Auth found in cookie, restoring to localStorage');
      try {
        localStorage.setItem('token', token);
        if (userData) localStorage.setItem('user', JSON.stringify(userData));
      } catch (e) {
        // localStorage might not be available
      }
    }
  }
  
  return { token, user: userData };
};

// Async version that also checks IndexedDB
const getAuthDataAsync = async () => {
  // First try sync sources
  let { token, user: userData } = getAuthData();
  
  // If not found, try IndexedDB
  if (!token) {
    const idbData = await getFromIndexedDB();
    if (idbData && idbData.token) {
      console.log('Auth found in IndexedDB, restoring');
      token = idbData.token;
      userData = idbData.user;
      
      // Restore to other storage mechanisms
      try {
        localStorage.setItem('token', token);
        if (userData) localStorage.setItem('user', JSON.stringify(userData));
      } catch (e) {}
      
      setCookie('auth_token', token, 30);
      if (userData) setCookie('auth_user', JSON.stringify(userData), 30);
    }
  }
  
  return { token, user: userData };
};

// Clear all auth data
const clearAuthData = () => {
  console.log('Clearing all auth data');
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (e) {}
  
  try {
    sessionStorage.removeItem('token_backup');
    sessionStorage.removeItem('user_backup');
  } catch (e) {}
  
  deleteCookie('auth_token');
  deleteCookie('auth_user');
  
  // Also clear IndexedDB
  clearIndexedDB();
};

// Helper to get token from any available storage
const getStoredToken = () => {
  const { token } = getAuthData();
  return token;
};

// Helper to get stored user
const getStoredUser = () => {
  const { user } = getAuthData();
  return user;
};

// Configure axios with performance optimizations
axios.defaults.timeout = 60000; // 60 second timeout (increased for Render free tier)
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Add request interceptor for retry logic and auth
axios.interceptors.request.use(
  (config) => {
    // Ensure auth token is always included
    const token = getStoredToken();
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Route super-admin traffic across the render backend pool so one overloaded
    // instance does not become the single choke point for all admin activity.
    if (config.url?.includes(SUPER_ADMIN_API_PREFIX)) {
      config.url = rewriteRequestUrl(config.url);
    }
    
    // Add timestamp to prevent caching issues
    if (config.method === 'get') {
      config.params = { ...config.params, _t: Date.now() };
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Enhanced response interceptor with better error handling
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    const originalRequest = error.config;
    
    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Clear invalid token and redirect to login
      console.log('🔑 Token invalid/expired, clearing auth and redirecting to login');
      delete axios.defaults.headers.common['Authorization'];
      clearAuthData();
      
      // Call global logout callback to clear React state
      if (globalLogoutCallback) {
        globalLogoutCallback();
      }
      
      // Redirect to login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      
      return Promise.reject(error);
    }
    
    // Handle 403 Forbidden errors
    if (error.response?.status === 403) {
      console.error('🚫 Access forbidden:', config?.url);
      // Don't retry 403 errors - they won't succeed
      return Promise.reject(error);
    }
    
    // Handle 404 Not Found errors (missing endpoints)
    if (error.response?.status === 404) {
      console.error('🔍 Endpoint not found:', config?.url);
      // Don't retry 404 errors - endpoint doesn't exist
      return Promise.reject(error);
    }
    
    // Retry logic for network errors or 5xx server errors only
    if (!config || !config.retry) {
      config.retry = 0;
    }
    
    const shouldRetry = 
      config.retry < 2 && // Max 2 retries
      (!error.response || error.response.status >= 500 || error.code === 'ECONNABORTED');
    
    if (shouldRetry) {
      config.retry += 1;
      console.log(`🔄 Retrying request (${config.retry}/2) for server error:`, config?.url);
      
      // Ensure auth token is included in retry
      const token = getStoredToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * config.retry));
      
      return axios(config);
    }
    
    return Promise.reject(error);
  }
);

// Global logout callback - will be set by App component
let globalLogoutCallback = null;

export const setLogoutCallback = (callback) => {
  globalLogoutCallback = callback;
};

export const logout = () => {
  // Clear all storage
  delete axios.defaults.headers.common['Authorization'];
  clearAuthData();
  
  // Call the global callback to clear React state
  if (globalLogoutCallback) {
    globalLogoutCallback();
  }
};

export const setAuthToken = (token, userData = null) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Get existing user data if not provided
    if (!userData) {
      userData = getStoredUser();
    }
    
    // Store in all available storage mechanisms
    storeAuthData(token, userData);
  } else {
    delete axios.defaults.headers.common['Authorization'];
    clearAuthData();
  }
};

const PrivateRoute = ({ children, requireSetup = true, isAuthChecking }) => {
  // Show loading while auth is being checked
  if (isAuthChecking) {
    return <AuthLoading />;
  }
  
  const { token, user } = getAuthData();
  
  // If no token at all, redirect to login
  if (!token) {
    console.log('PrivateRoute: No token, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  // If user data exists and setup is required but not completed
  if (requireSetup && user?.role === 'admin' && user?.setup_completed === false) {
    return <Navigate to="/setup" replace />;
  }
  
  console.log('PrivateRoute: Access granted for', user?.username);
  return children;
};

const SetupRoute = ({ children, isAuthChecking }) => {
  if (isAuthChecking) {
    return <AuthLoading />;
  }
  const token = getStoredToken();
  return token ? children : <Navigate to="/login" replace />;
};

// Route for home page - redirects to dashboard if logged in
const HomeRoute = ({ isAuthChecking, pricing }) => {
  // Wait for auth check to complete (includes IndexedDB)
  if (isAuthChecking) {
    console.log('HomeRoute: Still checking auth...');
    return <AuthLoading />;
  }
  
  // Check all storage sources
  const { token, user } = getAuthData();
  console.log('HomeRoute: Auth check complete - token:', !!token, 'user:', user?.username);
  
  if (token) {
    console.log('HomeRoute: User logged in, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }
  
  console.log('HomeRoute: No token, showing landing page');
  return <LandingPage pricing={pricing} />;
};

// Route for login page - redirects to dashboard if already logged in
const LoginRoute = ({ setUser, isAuthChecking }) => {
  // Wait for auth check to complete (includes IndexedDB)
  if (isAuthChecking) {
    return <AuthLoading />;
  }
  
  // Check all storage sources
  const { token } = getAuthData();
  
  if (token) {
    console.log('LoginRoute: User already logged in, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }
  
  return <LoginPage setUser={setUser} />;
};

// Loading component for auth check
const AuthLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

// Create a context to share auth checking state (removed unused variable)

function App() {
  const [user, setUser] = useState(() => {
    // Initialize user from any available storage immediately
    const storedUser = getStoredUser();
    console.log('Initial user from storage:', storedUser ? storedUser.username : 'none');
    return storedUser;
  });
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [pricing, setPricing] = useState(null);

  // Set up the global logout callback
  useEffect(() => {
    setLogoutCallback(() => {
      setUser(null);
    });
    return () => setLogoutCallback(null);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      // Use async version to also check IndexedDB
      const { token, user: storedUser } = await getAuthDataAsync();
      console.log('Auth init - token exists:', !!token, 'user exists:', !!storedUser);
      
      if (token) {
        // Set the token in axios headers
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // If we have cached user data, use it immediately
        if (storedUser) {
          setUser(storedUser);
          console.log('Restored user from storage:', storedUser.username);
        }
        
        // Try to fetch fresh user data in background (don't block on this)
        fetchUser().catch(err => {
          console.log('Background user fetch failed, using cached data:', err.message);
          // Keep using cached user - don't clear it
        });
      }
      
      setIsAuthChecking(false);
    };
    
    initAuth();
    
    // Fetch pricing data for banners
    const fetchPricingData = async () => {
      try {
        console.log('Fetching pricing data...');
        const response = await axios.get(`${API}/public/pricing`);
        console.log('Pricing data received:', response.data);
        setPricing(response.data);
      } catch (error) {
        console.log('Failed to fetch pricing data:', error);
        // Set fallback pricing to ensure banners can still show - 5% Early Adopter Discount
        setPricing({
          regular_price: 1999,
          regular_price_display: '₹1999',
          campaign_price: 1899,
          campaign_price_display: '₹1899',
          campaign_active: true,
          campaign_name: 'Early Adopter Special - 5% OFF',
          campaign_discount_percent: 5,
          early_adopter: true,
          early_adopter_eligible: true,
          early_adopter_discount: 5,
          early_adopter_spots_left: 850,
          trial_expired_discount: 5,
          trial_expired_price: 1899,
          trial_expired_price_display: '₹1899'
        });
      }
    };
    fetchPricingData();
    
    // ✅ PERFORMANCE: Initialize optimization modules
    console.log('⚡ Initializing performance optimizations...');
    
    // Initialize lazy image loader
    lazyImageLoader.init()
    console.log('📸 Lazy image loader initialized')
    
    // Prefetch critical resources — use the actual backend host from env, not a hardcoded stale URL
    try {
      const beHost = new URL(process.env.REACT_APP_BACKEND_URL || window.location.origin).hostname;
      ResourcePrefetcher.prefetchDNS(beHost);
      ResourcePrefetcher.preconnect(beHost);
      console.log('🔗 Resource prefetching enabled for', beHost);
    } catch (e) {
      console.log('🔗 Resource prefetching skipped');
    }
    
    // Initialize Service Worker Manager
    ServiceWorkerManager.register()
      .then(reg => console.log('✅ Service Worker registered'))
      .catch(err => console.log('⚠️ Service Worker registration failed:', err))
    
    // Setup memory monitoring (log every 5 minutes)
    const memoryMonitor = setInterval(() => {
      const stats = MemoryManager.getMemoryUsage()
      if (stats) {
        console.log('💾 Memory:', stats.jsHeapSize, '/', stats.jsHeapLimit)
      }
    }, 5 * 60 * 1000)
    
    // Setup offline support with cache prefetching
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then(registration => {
          console.log('✅ Service Worker ready for offline support')
        })
        .catch(err => console.log('Service Worker not ready:', err))
    }
    
    // Setup auto-cleanup of expired cache (every 2 minutes)
    const cacheCleanup = setInterval(() => {
      const statsBefore = expiringCache.getStats?.()
      // Cache cleanup happens automatically, but we can log stats
      if (statsBefore) {
        console.log('📊 Cache stats:', statsBefore)
      }
    }, 2 * 60 * 1000)
    
    // Setup Auto Sync
    setupAutoSync(axios.create({ baseURL: API }));
    
    // Start notification polling for in-app notifications (less frequent)
    startNotificationPolling(API, 120000); // Check every 2 minutes instead of 1
    
    // Keep-alive ping to prevent Render free tier cold starts
    // Ping every 10 minutes to keep the server warm
    const keepAliveInterval = setInterval(async () => {
      try {
        await axios.get(`${API}/ping`, { timeout: 5000 });
        console.log('Keep-alive ping successful');
      } catch (e) {
        // Silent fail - server might be waking up
        console.log('Keep-alive ping failed, server may be cold starting');
      }
    }, 10 * 60 * 1000); // 10 minutes
    
    // Initial ping to wake up server immediately
    axios.get(`${API}/ping`, { timeout: 10000 }).catch(() => {});
    
    // Request notification permission after a delay (better UX)
    setTimeout(() => {
      if (Notification.permission === 'default') {
        requestNotificationPermission();
      }
    }, 10000);
    
    // Register service worker for offline support
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(async (registration) => {
          console.log('Service Worker registered:', registration.scope);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New version available!');
              }
            });
          });
          
          // Subscribe to push notifications if permission granted
          if (Notification.permission === 'granted') {
            try {
              const { subscribeToPush } = await import('./utils/pushNotifications');
              const userId = localStorage.getItem('userId') || null;
              await subscribeToPush(userId);
              console.log('Push notifications subscribed');
            } catch (e) {
              console.log('Push subscription skipped:', e.message);
            }
          }
        })
        .catch(err => console.log('Service Worker registration failed:', err));
    }

    // Setup axios interceptor for trial expiration
    const interceptor = axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status === 402) {
          // Trial expired or subscription required
          const message = error.response.data?.detail || 'Your trial has expired. Please subscribe to continue.';
          
          // Show error toast
          import('./components/ui/sonner').then(({ toast }) => {
            toast.error(message, {
              duration: 5000,
              action: {
                label: 'Subscribe',
                onClick: () => window.location.href = '/subscription'
              }
            });
          });

          // Redirect to subscription page after delay
          setTimeout(() => {
            if (window.location.pathname !== '/subscription') {
              window.location.href = '/subscription';
            }
          }, 3000);
        }
        return Promise.reject(error);
      }
    );

    // Cleanup interceptor and intervals on unmount
    return () => {
      axios.interceptors.response.eject(interceptor);
      clearInterval(keepAliveInterval);
      clearInterval(memoryMonitor);
      clearInterval(cacheCleanup);
      
      // ✅ PERFORMANCE: Cleanup optimization modules
      lazyImageLoader.disconnect()
      console.log('📸 Lazy image loader cleaned up')
    };
  }, []);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      const userData = response.data;
      setUser(userData);
      
      // Store user data in all storage mechanisms
      const token = getStoredToken();
      if (token) {
        storeAuthData(token, userData);
      }
      
      return true;
    } catch (e) {
      console.error('Failed to fetch user:', e.message);
      
      // Handle specific error cases
      if (e.response?.status === 401) {
        // Token is invalid/expired - clear auth data
        console.log('🔑 Token expired, clearing auth data');
        setAuthToken(null);
        setUser(null);
        return false;
      } else if (e.response?.status === 403) {
        // Access forbidden - keep cached user but log issue
        console.log('🚫 Access forbidden to /auth/me endpoint');
        const storedUser = getStoredUser();
        if (storedUser) {
          setUser(storedUser);
          console.log('Using cached user data due to 403 error');
          return true;
        }
      } else if (e.response?.status === 404) {
        // Endpoint doesn't exist - use cached user
        console.log('🔍 /auth/me endpoint not found, using cached user');
        const storedUser = getStoredUser();
        if (storedUser) {
          setUser(storedUser);
          return true;
        }
      } else {
        // Network error or other issue - keep using cached user
        console.log('🌐 Network error, using cached user data');
        const storedUser = getStoredUser();
        if (storedUser) {
          setUser(storedUser);
          return true;
        }
      }
      
      return false;
    }
  };

  return (
    <div className="App">
      <BluetoothPrinterProvider>
      <BrowserRouter>
        <ElectronNavigator />
        <Routes>
          <Route path="/" element={<HomeRoute isAuthChecking={isAuthChecking} pricing={pricing} />} />
          <Route path="/login" element={<LoginRoute setUser={setUser} isAuthChecking={isAuthChecking} />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage setUser={setUser} />} />
          <Route
            path="/setup"
            element={
              <SetupRoute isAuthChecking={isAuthChecking}>
                <BusinessSetupPage user={user} />
              </SetupRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute isAuthChecking={isAuthChecking}>
                <Dashboard user={user} />
              </PrivateRoute>
            }
          />
          <Route
            path="/menu"
            element={
              <PrivateRoute isAuthChecking={isAuthChecking}>
                <MenuPage user={user} />
              </PrivateRoute>
            }
          />
          <Route
            path="/counter-sale"
            element={
              <PrivateRoute isAuthChecking={isAuthChecking}>
                <CounterSaleRouter user={user} />
              </PrivateRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <PrivateRoute isAuthChecking={isAuthChecking}>
                <OrdersPage user={user} />
              </PrivateRoute>
            }
          />
          <Route
            path="/orders/display"
            element={
              <PrivateRoute isAuthChecking={isAuthChecking}>
                <OrderDisplayPage user={user} />
              </PrivateRoute>
            }
          />
          <Route
            path="/billing/:orderId"
            element={
              <PrivateRoute isAuthChecking={isAuthChecking}>
                <BillingPage user={user} />
              </PrivateRoute>
            }
          />
          <Route
            path="/tables"
            element={
              <PrivateRoute isAuthChecking={isAuthChecking}>
                <TablesPage user={user} />
              </PrivateRoute>
            }
          />
          <Route
            path="/kitchen"
            element={
              <PrivateRoute isAuthChecking={isAuthChecking}>
                <KitchenPage user={user} />
              </PrivateRoute>
            }
          />
          <Route
            path="/inventory"
            element={
              <PrivateRoute isAuthChecking={isAuthChecking}>
                <InventoryPage user={user} />
              </PrivateRoute>
            }
          />
          <Route
            path="/expenses"
            element={
              <PrivateRoute isAuthChecking={isAuthChecking}>
                <ExpensePage user={user} />
              </PrivateRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <PrivateRoute isAuthChecking={isAuthChecking}>
                <ReportsPage user={user} />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <PrivateRoute isAuthChecking={isAuthChecking}>
                <SettingsPage user={user} />
              </PrivateRoute>
            }
          />
          <Route
            path="/subscription"
            element={
              <PrivateRoute isAuthChecking={isAuthChecking}>
                <SubscriptionPage user={user} />
              </PrivateRoute>
            }
          />
          <Route
            path="/staff"
            element={
              <PrivateRoute isAuthChecking={isAuthChecking}>
                <StaffManagementPage user={user} />
              </PrivateRoute>
            }
          />
          <Route
            path="/refer-earn"
            element={
              <PrivateRoute isAuthChecking={isAuthChecking}>
                <ReferEarnPage user={user} />
              </PrivateRoute>
            }
          />
          {/* Public Routes - No Auth Required */}
          <Route path="/seo" element={<SEOPage />} />
          <Route path="/restaurant-billing-software-india" element={<SEOPage />} />
          <Route path="/restaurant-billing-software" element={<RestaurantBillingSoftwarePage />} />
          <Route path="/kot-software" element={<KOTSoftwarePage />} />
          <Route path="/pos-software-for-restaurants" element={<POSSoftwarePage />} />
          <Route path="/billbytekot" element={<BrandPage />} />
          <Route path="/about-billbytekot" element={<BrandPage />} />
          <Route path="/what-is-billbytekot" element={<BrandPage />} />
          <Route path="/track/:trackingToken" element={<TrackOrderPage />} />
          <Route path="/receipt/:encodedReceipt" element={<SharedReceiptPage />} />
          <Route path="/order/:orgId" element={<CustomerOrderPage />} />
          <Route path="/menu/:orgId" element={<PublicMenuPage />} />
          <Route path="/r/:restaurantSlug/menu" element={<PublicMenuPage />} />
          <Route path="/download" element={<DownloadPage />} />
          <Route path="/downloads" element={<DownloadPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/help" element={<PrivateRoute isAuthChecking={isAuthChecking}><HelpPage user={user} /></PrivateRoute>} />
          <Route path="/ops" element={<OpsPanel />} />
          <Route path="/super-admin" element={<SuperAdminPage />} />
          <Route path="/admin" element={<SuperAdminPage />} />
          <Route path="/pwa" element={<PWAHomePage />} />
          <Route path="/city/:citySlug" element={<CityLandingPage />} />
          <Route path="/compare/:comparisonSlug" element={<ComparisonPage />} />
          {/* 404 Not Found Route - Must be last */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <DesktopInfo />
      </BrowserRouter>
      </BluetoothPrinterProvider>
      <Toaster position="top-center" richColors />
      <Analytics />
    </div>
  );
}

export default App;
