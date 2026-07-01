// Push Notification Utility for BillByteKOT
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || (window.location.origin + '/api');

// Convert VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Check if push notifications are supported
export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

// Get current notification permission status
export function getNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission; // 'granted', 'denied', or 'default'
}

// Request notification permission
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return { success: false, error: 'Notifications not supported' };
  }
  
  try {
    const permission = await Notification.requestPermission();
    return { success: permission === 'granted', permission };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Subscribe to push notifications
export async function subscribeToPush(userId = null) {
  if (!isPushSupported()) {
    return { success: false, error: 'Push notifications not supported' };
  }

  const vapidKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
  if (!vapidKey || vapidKey.length < 87) {
    // VAPID key not configured — skip silently, don't spam console
    return { success: false, error: 'VAPID key not configured' };
  }

  try {
    // Request permission first
    const permResult = await requestNotificationPermission();
    if (!permResult.success) {
      return { success: false, error: 'Permission denied' };
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      });
    }

    // Send subscription to backend
    const response = await axios.post(`${API}/push/subscribe`, {
      subscription: subscription.toJSON(),
      user_id: userId,
      device_info: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language
      }
    });

    return { success: true, subscription, response: response.data };
  } catch (error) {
    console.error('Push subscription error:', error);
    return { success: false, error: error.message };
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPush() {
  if (!isPushSupported()) {
    return { success: false, error: 'Push notifications not supported' };
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      // Notify backend
      await axios.post(`${API}/push/unsubscribe`, {
        endpoint: subscription.endpoint
      }).catch(() => {}); // Ignore errors
      
      // Unsubscribe locally
      await subscription.unsubscribe();
    }
    
    return { success: true };
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    return { success: false, error: error.message };
  }
}

// Check if user is subscribed
export async function isSubscribedToPush() {
  if (!isPushSupported()) return false;
  
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}

// Show local notification (for testing)
export function showLocalNotification(title, options = {}) {
  if (Notification.permission !== 'granted') {
    console.log('Notification permission not granted');
    return;
  }
  
  const defaultOptions = {
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    tag: 'billbytekot-local',
    ...options
  };
  
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      registration.showNotification(title, defaultOptions);
    });
  } else {
    new Notification(title, defaultOptions);
  }
}

// Start polling for in-app notifications
let pollingInterval = null;

export function startNotificationPolling(apiUrl, interval = 60000) {
  // Clear any existing interval
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
  
  const checkNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await axios.get(`${apiUrl}/notifications/unread`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const notifications = response.data?.notifications || [];
      
      // Show notification for new unread items
      if (notifications.length > 0 && Notification.permission === 'granted') {
        const latest = notifications[0];
        showLocalNotification(latest.title || 'New Notification', {
          body: latest.message || latest.body,
          tag: `notification-${latest.id}`,
          data: { url: latest.action_url || '/' }
        });
      }
    } catch (error) {
      // Silently fail - don't spam console
    }
  };
  
  // Check immediately, then at interval
  checkNotifications();
  pollingInterval = setInterval(checkNotifications, interval);
  
  return () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
  };
}

export function stopNotificationPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

export default {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribedToPush,
  showLocalNotification,
  startNotificationPolling,
  stopNotificationPolling
};
