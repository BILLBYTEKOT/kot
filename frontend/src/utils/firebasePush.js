/**
 * Firebase Cloud Messaging (FCM) for Push Notifications
 * 
 * This enables REAL push notifications like WhatsApp/Zomato that work
 * even when the app is completely closed!
 * 
 * Setup:
 * 1. Create Firebase project at https://console.firebase.google.com
 * 2. Add web app to get config
 * 3. Add config to environment variables
 */

import axios from 'axios';

const API = process.env.REACT_APP_API_URL || (window.location.origin + '/api');

// Firebase config from environment
const FIREBASE_CONFIG = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

let messaging = null;
let fcmToken = null;

/**
 * Initialize Firebase Messaging
 */
export async function initializeFirebase() {
  // Check if running in TWA/Android app
  const isTWA = document.referrer.includes('android-app://') || 
                window.matchMedia('(display-mode: standalone)').matches;
  
  if (!isTWA) {
    console.log('Not running in TWA, skipping Firebase init');
    return null;
  }
  
  try {
    // Dynamic import Firebase
    const { initializeApp } = await import('firebase/app');
    const { getMessaging, getToken, onMessage } = await import('firebase/messaging');
    
    if (!FIREBASE_CONFIG.apiKey) {
      console.log('Firebase config not set');
      return null;
    }
    
    const app = initializeApp(FIREBASE_CONFIG);
    messaging = getMessaging(app);
    
    console.log('Firebase initialized');
    return messaging;
  } catch (error) {
    console.error('Firebase init error:', error);
    return null;
  }
}

/**
 * Request notification permission and get FCM token
 */
export async function requestFCMPermission() {
  if (!('Notification' in window)) {
    return { success: false, error: 'Notifications not supported' };
  }
  
  try {
    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      return { success: false, error: 'Permission denied' };
    }
    
    // Get FCM token
    const token = await getFCMToken();
    
    if (token) {
      // Register token with backend
      await registerFCMToken(token);
      return { success: true, token };
    }
    
    return { success: false, error: 'Failed to get FCM token' };
  } catch (error) {
    console.error('FCM permission error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get FCM token
 */
export async function getFCMToken() {
  if (!messaging) {
    await initializeFirebase();
  }
  
  if (!messaging) {
    return null;
  }
  
  try {
    const { getToken } = await import('firebase/messaging');
    
    // Get token with VAPID key
    const vapidKey = process.env.REACT_APP_FIREBASE_VAPID_KEY;
    
    fcmToken = await getToken(messaging, { vapidKey });
    console.log('FCM Token:', fcmToken?.substring(0, 20) + '...');
    
    return fcmToken;
  } catch (error) {
    console.error('Get FCM token error:', error);
    return null;
  }
}

/**
 * Register FCM token with backend
 */
export async function registerFCMToken(token) {
  try {
    const userId = localStorage.getItem('userId') || null;
    
    const response = await axios.post(`${API}/fcm/register`, {
      fcm_token: token,
      user_id: userId,
      device_info: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        standalone: window.matchMedia('(display-mode: standalone)').matches
      }
    });
    
    console.log('FCM token registered:', response.data);
    return response.data;
  } catch (error) {
    console.error('FCM register error:', error);
    return null;
  }
}

/**
 * Listen for foreground messages
 */
export function onForegroundMessage(callback) {
  if (!messaging) return;
  
  import('firebase/messaging').then(({ onMessage }) => {
    onMessage(messaging, (payload) => {
      console.log('Foreground message:', payload);
      
      // Show notification manually for foreground
      if (Notification.permission === 'granted') {
        const { title, body, image } = payload.notification || {};
        
        new Notification(title || 'BillByteKOT', {
          body: body || 'New notification',
          icon: '/icon-192.png',
          image: image,
          badge: '/icon-192.png',
          tag: 'billbytekot-fcm',
          data: payload.data
        });
      }
      
      if (callback) callback(payload);
    });
  });
}

/**
 * Unregister FCM token
 */
export async function unregisterFCMToken() {
  if (!fcmToken) return;
  
  try {
    await axios.post(`${API}/fcm/unregister`, { token: fcmToken });
    fcmToken = null;
  } catch (error) {
    console.error('FCM unregister error:', error);
  }
}

export default {
  initializeFirebase,
  requestFCMPermission,
  getFCMToken,
  registerFCMToken,
  onForegroundMessage,
  unregisterFCMToken
};
