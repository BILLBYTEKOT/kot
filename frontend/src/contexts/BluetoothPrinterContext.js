/**
 * Bluetooth Printer Context
 * 
 * Provides persistent Bluetooth printer connection management across page navigation.
 * Implements automatic reconnection, health monitoring, and print queue functionality.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

// Create context
const BluetoothPrinterContext = createContext(null);

// Storage key for device persistence
const STORAGE_KEY = 'bluetooth_printer_v2';

// Reconnection configuration
const RECONNECTION_CONFIG = {
  maxAttempts: 5,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2
};

// Printer service and characteristic UUIDs
const PRINTER_SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
];

const PRINTER_CHARACTERISTIC_UUIDS = [
  '00002af1-0000-1000-8000-00805f9b34fb',
  '49535343-8841-43f4-a8d4-ecbe34729bb3',
  '0000ff02-0000-1000-8000-00805f9b34fb',
];

// ESC/POS Commands
const ESC = 0x1B;
const GS = 0x1D;
const COMMANDS = {
  INIT: [ESC, 0x40],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_ON: [GS, 0x21, 0x30],
  NORMAL_SIZE: [GS, 0x21, 0x00],
  FEED_LINE: [0x0A],
  FEED_LINES: (n) => [ESC, 0x64, n],
  CUT_PARTIAL: [GS, 0x56, 0x01],
};

/**
 * Bluetooth Printer Provider Component
 */
export function BluetoothPrinterProvider({ children }) {
  // Connection state
  const [device, setDevice] = useState(null);
  const [characteristic, setCharacteristic] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastConnectionTime, setLastConnectionTime] = useState(null);
  const [deviceInfo, setDeviceInfo] = useState(null);
  
  // Connection quality metrics
  const [connectionQuality, setConnectionQuality] = useState({
    successfulPrints: 0,
    failedPrints: 0,
    lastPrintTime: null
  });
  
  // Print queue
  const [printQueue, setPrintQueue] = useState([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  
  // Refs for cleanup and reconnection
  const reconnectTimeoutRef = useRef(null);
  const healthCheckIntervalRef = useRef(null);
  const disconnectHandlerRef = useRef(null);

  /**
   * Add job to print queue
   */
  const addToQueue = useCallback((job) => {
    setPrintQueue(prev => {
      if (prev.length >= 10) {
        toast.warning('Print queue full. Please wait.');
        return prev;
      }
      return [...prev, { ...job, id: Date.now().toString(), timestamp: Date.now(), retryCount: 0 }];
    });
    toast.info('Print job queued');
  }, []);

  /**
   * Load device info from localStorage
   */
  const loadDeviceInfo = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const info = JSON.parse(stored);
        setDeviceInfo(info);
        return info;
      }
    } catch (e) {
      console.error('Failed to load device info:', e);
      localStorage.removeItem(STORAGE_KEY);
    }
    return null;
  }, []);

  /**
   * Save device info to localStorage
   */
  const saveDeviceInfo = useCallback((deviceData) => {
    try {
      const info = {
        deviceId: deviceData.id,
        deviceName: deviceData.name,
        lastConnected: Date.now(),
        connectionCount: (deviceInfo?.connectionCount || 0) + 1
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
      setDeviceInfo(info);
    } catch (e) {
      console.error('Failed to save device info:', e);
    }
  }, [deviceInfo]);

  /**
   * Clear device info from localStorage
   */
  const clearDeviceInfo = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setDeviceInfo(null);
    } catch (e) {
      console.error('Failed to clear device info:', e);
    }
  }, []);

  /**
   * Calculate reconnection delay with exponential backoff
   */
  const calculateReconnectDelay = useCallback((attempt) => {
    return Math.min(
      RECONNECTION_CONFIG.baseDelay * Math.pow(RECONNECTION_CONFIG.backoffMultiplier, attempt),
      RECONNECTION_CONFIG.maxDelay
    );
  }, []);

  /**
   * Handle GATT server disconnection
   */
  const handleDisconnect = useCallback(() => {
    console.log('[BT Printer] Device disconnected');
    setIsConnected(false);
    setCharacteristic(null);
    
    // Don't clear device reference - we need it for reconnection
    toast.warning('Printer disconnected. Attempting to reconnect...');
    
    // Trigger automatic reconnection
    if (device && deviceInfo) {
      setIsReconnecting(true);
      setReconnectAttempts(0);
      reconnectPrinter();
    }
  }, [device, deviceInfo]);

  /**
   * Connect to Bluetooth printer
   */
  const connectPrinter = useCallback(async () => {
    if (!('bluetooth' in navigator)) {
      toast.error('Bluetooth not supported on this device');
      throw new Error('Bluetooth not supported');
    }

    setIsConnecting(true);

    try {
      toast.info('Searching for printers...');
      
      // Request Bluetooth device
      const selectedDevice = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: PRINTER_SERVICE_UUIDS
      });

      toast.info(`Connecting to ${selectedDevice.name || 'printer'}...`);
      
      // Connect to GATT server
      const server = await selectedDevice.gatt.connect();

      // Find printer service
      let service = null;
      for (const uuid of PRINTER_SERVICE_UUIDS) {
        try {
          service = await server.getPrimaryService(uuid);
          break;
        } catch (e) {
          continue;
        }
      }

      if (!service) {
        const services = await server.getPrimaryServices();
        if (services.length > 0) service = services[0];
      }

      if (!service) {
        throw new Error('No printer service found');
      }

      // Find writable characteristic
      let char = null;
      for (const uuid of PRINTER_CHARACTERISTIC_UUIDS) {
        try {
          char = await service.getCharacteristic(uuid);
          break;
        } catch (e) {
          continue;
        }
      }

      if (!char) {
        const chars = await service.getCharacteristics();
        for (const c of chars) {
          if (c.properties.write || c.properties.writeWithoutResponse) {
            char = c;
            break;
          }
        }
      }

      if (!char) {
        throw new Error('No writable characteristic found');
      }

      // Register disconnect handler
      if (disconnectHandlerRef.current) {
        selectedDevice.removeEventListener('gattserverdisconnected', disconnectHandlerRef.current);
      }
      disconnectHandlerRef.current = handleDisconnect;
      selectedDevice.addEventListener('gattserverdisconnected', handleDisconnect);

      // Update state
      setDevice(selectedDevice);
      setCharacteristic(char);
      setIsConnected(true);
      setIsConnecting(false);
      setIsReconnecting(false);
      setReconnectAttempts(0);
      setLastConnectionTime(Date.now());

      // Save device info
      saveDeviceInfo(selectedDevice);

      toast.success(`Connected to ${selectedDevice.name || 'Printer'}`);

      // Start health monitoring
      startHealthMonitoring();

      return selectedDevice;
    } catch (error) {
      setIsConnecting(false);
      setIsReconnecting(false);
      
      if (error.name === 'NotFoundError') {
        // User cancelled - don't show error
        return null;
      }
      
      console.error('Connection error:', error);
      toast.error(`Connection failed: ${error.message}`);
      throw error;
    }
  }, [handleDisconnect, saveDeviceInfo]);

  /**
   * Reconnect to printer with exponential backoff
   */
  const reconnectPrinter = useCallback(async () => {
    if (reconnectAttempts >= RECONNECTION_CONFIG.maxAttempts) {
      setIsReconnecting(false);
      toast.error('Unable to reconnect. Please reconnect manually.');
      return false;
    }

    const delay = calculateReconnectDelay(reconnectAttempts);
    console.log(`[BT Printer] Reconnection attempt ${reconnectAttempts + 1}/${RECONNECTION_CONFIG.maxAttempts} in ${delay}ms`);

    // Clear any existing timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(async () => {
      try {
        if (!device || !device.gatt) {
          throw new Error('No device to reconnect');
        }

        // Attempt to reconnect
        const server = await device.gatt.connect();

        // Find service and characteristic again
        let service = null;
        for (const uuid of PRINTER_SERVICE_UUIDS) {
          try {
            service = await server.getPrimaryService(uuid);
            break;
          } catch (e) {
            continue;
          }
        }

        if (!service) {
          const services = await server.getPrimaryServices();
          if (services.length > 0) service = services[0];
        }

        if (!service) {
          throw new Error('Service not found');
        }

        let char = null;
        for (const uuid of PRINTER_CHARACTERISTIC_UUIDS) {
          try {
            char = await service.getCharacteristic(uuid);
            break;
          } catch (e) {
            continue;
          }
        }

        if (!char) {
          const chars = await service.getCharacteristics();
          for (const c of chars) {
            if (c.properties.write || c.properties.writeWithoutResponse) {
              char = c;
              break;
            }
          }
        }

        if (!char) {
          throw new Error('Characteristic not found');
        }

        // Success!
        setCharacteristic(char);
        setIsConnected(true);
        setIsReconnecting(false);
        setReconnectAttempts(0);
        setLastConnectionTime(Date.now());

        toast.success('Printer reconnected!');

        // Process any queued print jobs
        if (printQueue.length > 0) {
          processQueue();
        }

        return true;
      } catch (error) {
        console.error(`Reconnection attempt ${reconnectAttempts + 1} failed:`, error);
        setReconnectAttempts(prev => prev + 1);
        
        // Try again
        reconnectPrinter();
        return false;
      }
    }, delay);
  }, [device, reconnectAttempts, calculateReconnectDelay, printQueue]);

  /**
   * Disconnect printer manually
   */
  const disconnectPrinter = useCallback(() => {
    if (device && device.gatt && device.gatt.connected) {
      device.gatt.disconnect();
    }

    // Remove disconnect handler
    if (device && disconnectHandlerRef.current) {
      device.removeEventListener('gattserverdisconnected', disconnectHandlerRef.current);
    }

    setDevice(null);
    setCharacteristic(null);
    setIsConnected(false);
    setIsReconnecting(false);
    setReconnectAttempts(0);
    
    clearDeviceInfo();
    stopHealthMonitoring();

    toast.info('Printer disconnected');
  }, [device, clearDeviceInfo]);

  /**
   * Check connection health
   */
  const checkConnectionHealth = useCallback(async () => {
    if (!device || !device.gatt || !device.gatt.connected) {
      return false;
    }

    if (!characteristic) {
      return false;
    }

    try {
      // Send a small test command to verify communication
      await characteristic.writeValue(new Uint8Array(COMMANDS.INIT));
      return true;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }, [device, characteristic]);

  /**
   * Start health monitoring
   */
  const startHealthMonitoring = useCallback(() => {
    // Clear any existing interval
    stopHealthMonitoring();

    // Check every 30 seconds
    healthCheckIntervalRef.current = setInterval(async () => {
      const isHealthy = await checkConnectionHealth();
      
      if (!isHealthy && isConnected) {
        console.log('[BT Printer] Health check failed, triggering reconnection');
        handleDisconnect();
      }
    }, 30000);
  }, [checkConnectionHealth, isConnected, handleDisconnect]);

  /**
   * Stop health monitoring
   */
  const stopHealthMonitoring = useCallback(() => {
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
      healthCheckIntervalRef.current = null;
    }
  }, []);

  /**
   * Send data to printer
   */
  const sendToPrinter = useCallback(async (data) => {
    if (!characteristic) {
      throw new Error('Printer not connected');
    }

    const uint8Array = new Uint8Array(data);
    const chunkSize = 20;

    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      try {
        if (characteristic.properties.writeWithoutResponse) {
          await characteristic.writeValueWithoutResponse(chunk);
        } else {
          await characteristic.writeValue(chunk);
        }
      } catch (e) {
        console.error('Write error:', e);
        throw e;
      }
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  }, [characteristic]);

  /**
   * Test print
   */
  const testPrint = useCallback(async () => {
    if (!isConnected) {
      toast.error('Printer not connected');
      throw new Error('Printer not connected');
    }

    try {
      await sendToPrinter(COMMANDS.INIT);
      await new Promise(r => setTimeout(r, 100));

      // Print test message
      const encoder = new TextEncoder();
      let data = [];
      
      data.push(...COMMANDS.ALIGN_CENTER);
      data.push(...COMMANDS.BOLD_ON);
      data.push(...COMMANDS.DOUBLE_ON);
      data.push(...encoder.encode('BillByteKOT'));
      data.push(...COMMANDS.NORMAL_SIZE);
      data.push(...COMMANDS.BOLD_OFF);
      data.push(...COMMANDS.FEED_LINE);
      data.push(...COMMANDS.FEED_LINE);
      
      data.push(...encoder.encode('Printer Test Successful!'));
      data.push(...COMMANDS.FEED_LINE);
      data.push(...encoder.encode(new Date().toLocaleString('en-IN')));
      data.push(...COMMANDS.FEED_LINE);
      data.push(...COMMANDS.FEED_LINES(3));
      data.push(...COMMANDS.CUT_PARTIAL);

      await sendToPrinter(data);

      // Update metrics
      setConnectionQuality(prev => ({
        ...prev,
        successfulPrints: prev.successfulPrints + 1,
        lastPrintTime: Date.now()
      }));

      toast.success('Test print sent!');
      return true;
    } catch (error) {
      console.error('Test print failed:', error);
      
      // Update metrics
      setConnectionQuality(prev => ({
        ...prev,
        failedPrints: prev.failedPrints + 1
      }));

      toast.error('Test print failed');
      throw error;
    }
  }, [isConnected, sendToPrinter]);

  /**
   * Print receipt/invoice
   */
  const printReceipt = useCallback(async (order, businessSettings = {}) => {
    if (!isConnected) {
      // Queue the job if not connected
      addToQueue({ type: 'receipt', order, businessSettings });
      toast.warning('Printer not connected. Job queued.');
      return false;
    }

    try {
      // Initialize printer
      await sendToPrinter(COMMANDS.INIT);
      await new Promise(r => setTimeout(r, 100));

      const encoder = new TextEncoder();
      let data = [];

      // Business name (large, centered, bold)
      data.push(...COMMANDS.ALIGN_CENTER);
      data.push(...COMMANDS.BOLD_ON);
      data.push(...COMMANDS.DOUBLE_ON);
      data.push(...encoder.encode(businessSettings.business_name || 'BillByteKOT'));
      data.push(...COMMANDS.NORMAL_SIZE);
      data.push(...COMMANDS.BOLD_OFF);
      data.push(...COMMANDS.FEED_LINE);

      // Address
      if (businessSettings.address) {
        data.push(...encoder.encode(businessSettings.address));
        data.push(...COMMANDS.FEED_LINE);
      }

      // Phone
      if (businessSettings.phone) {
        data.push(...encoder.encode(`Tel: ${businessSettings.phone}`));
        data.push(...COMMANDS.FEED_LINE);
      }

      // GST
      if (businessSettings.gst_number) {
        data.push(...encoder.encode(`GSTIN: ${businessSettings.gst_number}`));
        data.push(...COMMANDS.FEED_LINE);
      }

      // Separator
      data.push(...encoder.encode('='.repeat(32)));
      data.push(...COMMANDS.FEED_LINE);

      // Receipt header
      data.push(...COMMANDS.BOLD_ON);
      data.push(...encoder.encode('TAX INVOICE'));
      data.push(...COMMANDS.BOLD_OFF);
      data.push(...COMMANDS.FEED_LINE);
      data.push(...encoder.encode('-'.repeat(32)));
      data.push(...COMMANDS.FEED_LINE);

      // Order details (left aligned)
      data.push(...[ESC, 0x61, 0x00]); // Left align
      const orderDate = new Date(order.created_at).toLocaleString('en-IN');
      data.push(...encoder.encode(`Bill No: ${order.order_number || order.id?.slice(-6) || 'N/A'}`));
      data.push(...COMMANDS.FEED_LINE);
      data.push(...encoder.encode(`Date: ${orderDate}`));
      data.push(...COMMANDS.FEED_LINE);
      
      if (order.table_number) {
        data.push(...encoder.encode(`Table: ${order.table_number}`));
        data.push(...COMMANDS.FEED_LINE);
      }
      
      if (order.customer_name) {
        data.push(...encoder.encode(`Customer: ${order.customer_name}`));
        data.push(...COMMANDS.FEED_LINE);
      }

      data.push(...encoder.encode('-'.repeat(32)));
      data.push(...COMMANDS.FEED_LINE);

      // Items header
      data.push(...COMMANDS.BOLD_ON);
      data.push(...encoder.encode('Item              Qty    Amount'));
      data.push(...COMMANDS.BOLD_OFF);
      data.push(...COMMANDS.FEED_LINE);
      data.push(...encoder.encode('-'.repeat(32)));
      data.push(...COMMANDS.FEED_LINE);

      // Items
      const items = order.items || [];
      for (const item of items) {
        const name = (item.name || 'Item').substring(0, 16).padEnd(16);
        const qty = String(item.quantity || 1).padStart(3);
        const amount = `₹${((item.price || 0) * (item.quantity || 1)).toFixed(0)}`.padStart(9);
        data.push(...encoder.encode(`${name} ${qty} ${amount}`));
        data.push(...COMMANDS.FEED_LINE);
      }

      data.push(...encoder.encode('-'.repeat(32)));
      data.push(...COMMANDS.FEED_LINE);

      // Totals
      const subtotal = order.subtotal || items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
      const tax = order.tax || 0;
      const total = order.total || (subtotal + tax);

      data.push(...encoder.encode(`Subtotal:`.padEnd(20) + `₹${subtotal.toFixed(2)}`.padStart(12)));
      data.push(...COMMANDS.FEED_LINE);
      
      if (tax > 0) {
        const taxRate = order.tax_rate || businessSettings.tax_rate || 5;
        data.push(...encoder.encode(`Tax (${taxRate}%):`.padEnd(20) + `₹${tax.toFixed(2)}`.padStart(12)));
        data.push(...COMMANDS.FEED_LINE);
      }

      data.push(...encoder.encode('='.repeat(32)));
      data.push(...COMMANDS.FEED_LINE);
      
      data.push(...COMMANDS.BOLD_ON);
      data.push(...COMMANDS.DOUBLE_ON);
      data.push(...encoder.encode(`TOTAL:`.padEnd(10) + `₹${total.toFixed(2)}`.padStart(12)));
      data.push(...COMMANDS.NORMAL_SIZE);
      data.push(...COMMANDS.BOLD_OFF);
      data.push(...COMMANDS.FEED_LINE);
      
      data.push(...encoder.encode('='.repeat(32)));
      data.push(...COMMANDS.FEED_LINE);

      // Payment info
      if (order.payment_method) {
        data.push(...encoder.encode(`Payment: ${order.payment_method.toUpperCase()}`));
        data.push(...COMMANDS.FEED_LINE);
      }

      // Footer (centered)
      data.push(...COMMANDS.ALIGN_CENTER);
      data.push(...COMMANDS.FEED_LINE);
      data.push(...encoder.encode('Thank you for your visit!'));
      data.push(...COMMANDS.FEED_LINE);
      data.push(...encoder.encode('Please come again'));
      data.push(...COMMANDS.FEED_LINE);
      
      if (businessSettings.receipt_footer) {
        data.push(...encoder.encode(businessSettings.receipt_footer));
        data.push(...COMMANDS.FEED_LINE);
      }

      // Feed and cut
      data.push(...COMMANDS.FEED_LINES(4));
      data.push(...COMMANDS.CUT_PARTIAL);

      await sendToPrinter(data);

      // Update metrics
      setConnectionQuality(prev => ({
        ...prev,
        successfulPrints: prev.successfulPrints + 1,
        lastPrintTime: Date.now()
      }));

      toast.success('Receipt printed!');
      return true;
    } catch (error) {
      console.error('Receipt print failed:', error);
      
      // Update metrics
      setConnectionQuality(prev => ({
        ...prev,
        failedPrints: prev.failedPrints + 1
      }));

      toast.error('Receipt print failed');
      throw error;
    }
  }, [isConnected, sendToPrinter, addToQueue]);

  /**
   * Print KOT (Kitchen Order Ticket)
   */
  const printKOT = useCallback(async (order, businessSettings = {}) => {
    if (!isConnected) {
      // Queue the job if not connected
      addToQueue({ type: 'kot', order, businessSettings });
      toast.warning('Printer not connected. Job queued.');
      return false;
    }

    try {
      await sendToPrinter(COMMANDS.INIT);
      await new Promise(r => setTimeout(r, 100));

      const encoder = new TextEncoder();
      let data = [];

      // KOT Header (centered, large, bold)
      data.push(...COMMANDS.ALIGN_CENTER);
      data.push(...COMMANDS.BOLD_ON);
      data.push(...COMMANDS.DOUBLE_ON);
      data.push(...encoder.encode('*** KOT ***'));
      data.push(...COMMANDS.NORMAL_SIZE);
      data.push(...COMMANDS.BOLD_OFF);
      data.push(...COMMANDS.FEED_LINE);
      
      data.push(...encoder.encode('='.repeat(32)));
      data.push(...COMMANDS.FEED_LINE);

      // Order info (left aligned)
      data.push(...[ESC, 0x61, 0x00]); // Left align
      data.push(...COMMANDS.BOLD_ON);
      data.push(...encoder.encode(`Order: ${order.order_number || order.id?.slice(-6) || 'N/A'}`));
      data.push(...COMMANDS.BOLD_OFF);
      data.push(...COMMANDS.FEED_LINE);
      
      data.push(...encoder.encode(`Time: ${new Date().toLocaleTimeString('en-IN')}`));
      data.push(...COMMANDS.FEED_LINE);
      
      if (order.table_number) {
        data.push(...COMMANDS.BOLD_ON);
        data.push(...COMMANDS.DOUBLE_ON);
        data.push(...encoder.encode(`TABLE: ${order.table_number}`));
        data.push(...COMMANDS.NORMAL_SIZE);
        data.push(...COMMANDS.BOLD_OFF);
        data.push(...COMMANDS.FEED_LINE);
      }

      data.push(...encoder.encode('-'.repeat(32)));
      data.push(...COMMANDS.FEED_LINE);

      // Items
      const items = order.items || [];
      for (const item of items) {
        data.push(...COMMANDS.BOLD_ON);
        data.push(...encoder.encode(`${item.quantity}x ${item.name}`));
        data.push(...COMMANDS.BOLD_OFF);
        data.push(...COMMANDS.FEED_LINE);
        
        if (item.notes) {
          data.push(...encoder.encode(`   Note: ${item.notes}`));
          data.push(...COMMANDS.FEED_LINE);
        }
      }

      data.push(...encoder.encode('='.repeat(32)));
      data.push(...COMMANDS.FEED_LINE);
      
      data.push(...COMMANDS.BOLD_ON);
      data.push(...encoder.encode(`Total Items: ${items.reduce((sum, i) => sum + i.quantity, 0)}`));
      data.push(...COMMANDS.BOLD_OFF);
      data.push(...COMMANDS.FEED_LINE);

      // Feed and cut
      data.push(...COMMANDS.FEED_LINES(3));
      data.push(...COMMANDS.CUT_PARTIAL);

      await sendToPrinter(data);

      // Update metrics
      setConnectionQuality(prev => ({
        ...prev,
        successfulPrints: prev.successfulPrints + 1,
        lastPrintTime: Date.now()
      }));

      toast.success('KOT printed!');
      return true;
    } catch (error) {
      console.error('KOT print failed:', error);
      
      // Update metrics
      setConnectionQuality(prev => ({
        ...prev,
        failedPrints: prev.failedPrints + 1
      }));

      toast.error('KOT print failed');
      throw error;
    }
  }, [isConnected, sendToPrinter, addToQueue]);

  /**
   * Process print queue
   */
  const processQueue = useCallback(async () => {
    if (isProcessingQueue || printQueue.length === 0 || !isConnected) {
      return;
    }

    setIsProcessingQueue(true);

    for (const job of printQueue) {
      try {
        // Process job based on type
        if (job.type === 'test') {
          await testPrint();
        } else if (job.type === 'receipt') {
          await printReceipt(job.order, job.businessSettings);
        } else if (job.type === 'kot') {
          await printKOT(job.order, job.businessSettings);
        }

        // Remove from queue on success
        setPrintQueue(prev => prev.filter(j => j.id !== job.id));
      } catch (error) {
        console.error('Queue job failed:', error);
        
        // Retry logic
        if (job.retryCount < 3) {
          setPrintQueue(prev => prev.map(j => 
            j.id === job.id ? { ...j, retryCount: j.retryCount + 1 } : j
          ));
        } else {
          // Remove after 3 retries
          setPrintQueue(prev => prev.filter(j => j.id !== job.id));
          toast.error(`Print job failed after 3 attempts`);
        }
      }
    }

    setIsProcessingQueue(false);
  }, [isProcessingQueue, printQueue, isConnected, testPrint, printReceipt, printKOT]);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    // Load saved device info
    const savedInfo = loadDeviceInfo();
    
    // Note: We can't automatically reconnect on mount because Web Bluetooth
    // requires user interaction. The user must manually reconnect.
    if (savedInfo) {
      console.log('[BT Printer] Found saved device:', savedInfo.deviceName);
      toast.info(`Last connected to: ${savedInfo.deviceName}. Click to reconnect.`);
    }

    // Cleanup on unmount
    return () => {
      stopHealthMonitoring();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [loadDeviceInfo, stopHealthMonitoring]);

  // Context value
  const value = {
    // State
    device,
    characteristic,
    isConnected,
    isConnecting,
    isReconnecting,
    reconnectAttempts,
    lastConnectionTime,
    deviceInfo,
    connectionQuality,
    printQueue,
    
    // Methods
    connectPrinter,
    disconnectPrinter,
    reconnectPrinter,
    testPrint,
    printReceipt,
    printKOT,
    checkConnectionHealth,
    sendToPrinter,
    addToQueue,
  };

  // Expose live context snapshot on window so non-React utilities (printUtils.js)
  // can detect the connected printer and route print jobs through the Context.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__btPrinter = value;
    }
  }, [isConnected, device, characteristic, deviceInfo, printQueue]);

  return (
    <BluetoothPrinterContext.Provider value={value}>
      {children}
    </BluetoothPrinterContext.Provider>
  );
}

/**
 * Custom hook to use Bluetooth printer context
 */
export function useBluetoothPrinter() {
  const context = useContext(BluetoothPrinterContext);
  
  if (!context) {
    throw new Error('useBluetoothPrinter must be used within BluetoothPrinterProvider');
  }
  
  return context;
}

export default BluetoothPrinterContext;
