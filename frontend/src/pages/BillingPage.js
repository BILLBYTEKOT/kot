import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { API } from '../App';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { pushNotification } from '../utils/notificationStore';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Printer, CreditCard, Wallet, Smartphone, Download, MessageCircle, X, Check, Plus, Trash2, Search, Eye, FileText } from 'lucide-react';
import { printReceipt, manualPrintReceipt } from '../utils/printUtils';
import { processPaymentFast, preloadPaymentData } from '../utils/optimizedPayment';
import { billingCache } from '../utils/billingCache';
import { startBillingTimer, endBillingTimer } from '../utils/performanceMonitor';
import apiClient, { apiWithRetry, apiSilent } from '../utils/apiClient';
import { computePaymentState, determineBillingCompletionStatus } from '../utils/orderWorkflowRules';
import { paymentValidator, validatePayment } from '../utils/paymentValidator';
import { billingErrorLogger, logPaymentError, logValidationError, logNetworkError, logPerformanceIssue } from '../utils/billingErrorLogger';
import { paymentPerformanceMonitor, startPaymentMonitoring } from '../utils/paymentPerformanceMonitor';
import PrintPreviewModal from '../components/PrintPreviewModal';

const BillingPage = ({ user }) => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // Use order passed via navigation state for instant render, then refresh in background
  const navOrder = location.state?.order || null;
  const [order, setOrder] = useState(navOrder);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [showReceivedAmount, setShowReceivedAmount] = useState(false);
  const [splitPayment, setSplitPayment] = useState(false);
  const [cashAmount, setCashAmount] = useState('');
  const [cardAmount, setCardAmount] = useState('');
  const [upiAmount, setUpiAmount] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [matchedCustomer, setMatchedCustomer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [businessSettings, setBusinessSettings] = useState(null);
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [completedPaymentData, setCompletedPaymentData] = useState(null);
  const [discountType, setDiscountType] = useState('amount');
  const [discountValue, setDiscountValue] = useState('');
  const [customTaxRate, setCustomTaxRate] = useState(null);
  const [customPrice, setCustomPrice] = useState('');
  const [orderItems, setOrderItems] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState(null);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const priceInputRef = useRef(null);
  const isSelectingRef = useRef(false);
  // Add preview functionality
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  // Enhanced Print Preview Modal state
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printPreviewOrder, setPrintPreviewOrder] = useState(null);
  
  // Advanced UI state for better UX
  const [dropdownPosition, setDropdownPosition] = useState('bottom');
  const [isDropdownAnimating, setIsDropdownAnimating] = useState(false);
  const [screenHeight, setScreenHeight] = useState(window.innerHeight);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Open Print Preview Modal
  const openPrintPreview = () => {
    const discountAmt = calculateDiscountAmount();
    const receiptData = { 
      ...order, 
      items: orderItems, 
      subtotal: calculateSubtotal(), 
      tax: calculateTax(), 
      total: calculateTotal(), 
      discount: discountAmt, 
      discount_amount: discountAmt, 
      tax_rate: getEffectiveTaxRate(),
      status: 'completed',
      payment_method: splitPayment ? 'split' : paymentMethod,
      payment_received: (showReceivedAmount || splitPayment) ? calculateReceivedAmount() : calculateTotal(),
      balance_amount: Math.max(0, calculateTotal() - ((showReceivedAmount || splitPayment) ? calculateReceivedAmount() : calculateTotal())),
      customer_name: customerName || order.customer_name,
      customer_phone: customerPhone || order.customer_phone
    };
    if (splitPayment) {
      receiptData.cash_amount = parseFloat(cashAmount) || 0;
      receiptData.card_amount = parseFloat(cardAmount) || 0;
      receiptData.upi_amount = parseFloat(upiAmount) || 0;
      receiptData.credit_amount = Math.max(0, calculateTotal() - calculateReceivedAmount());
    }
    setPrintPreviewOrder(receiptData);
    setShowPrintPreview(true);
  };

  const handlePreview = async () => {
    try {
      const discountAmt = calculateDiscountAmount();
      const receiptData = { 
        ...order, 
        items: orderItems, 
        subtotal: calculateSubtotal(), 
        tax: calculateTax(), 
        total: calculateTotal(), 
        discount: discountAmt, 
        discount_amount: discountAmt, 
        tax_rate: getEffectiveTaxRate(),
        status: 'completed',
        payment_method: splitPayment ? 'split' : paymentMethod,
        payment_received: (showReceivedAmount || splitPayment) ? calculateReceivedAmount() : calculateTotal(),
        balance_amount: Math.max(0, calculateTotal() - ((showReceivedAmount || splitPayment) ? calculateReceivedAmount() : calculateTotal())),
        is_credit: Math.max(0, calculateTotal() - ((showReceivedAmount || splitPayment) ? calculateReceivedAmount() : calculateTotal())) > 0,
        customer_name: customerName || order.customer_name,
        customer_phone: customerPhone || order.customer_phone
      };

      // Add split payment details to receipt
      if (splitPayment) {
        receiptData.cash_amount = parseFloat(cashAmount) || 0;
        receiptData.card_amount = parseFloat(cardAmount) || 0;
        receiptData.upi_amount = parseFloat(upiAmount) || 0;
        receiptData.credit_amount = Math.max(0, calculateTotal() - calculateReceivedAmount());
      }

      // Generate preview content using the same logic as print
      const { generatePlainTextReceipt } = await import('../utils/printUtils');
      const preview = generatePlainTextReceipt(receiptData, businessSettings);
      setPreviewContent(preview);
      setShowPreview(true);
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Failed to generate preview');
    }
  };
  // Menu loading states for better UX
  const [searchFocused, setSearchFocused] = useState(false);
  const [lastSearchTime, setLastSearchTime] = useState(0);
  const [searchDebounceTimer, setSearchDebounceTimer] = useState(null);

  const captureWhatsappConsent = async (phoneNumber, name) => {
    const trimmedPhone = (phoneNumber || '').trim();
    if (!trimmedPhone) return;

    try {
      await apiSilent({
        method: 'post',
        url: `${API}/whatsapp/consent/on-phone-entry`,
        params: {
          phone_number: trimmedPhone,
          customer_name: name || order?.customer_name || '',
          order_id: orderId
        }
      });
    } catch (error) {
      console.warn('WhatsApp consent capture failed:', error);
    }
  };

  useEffect(() => {
    const phone = customerPhone.trim();
    if (phone.length < 7) {
      setMatchedCustomer(null);
      return undefined;
    }
    const timer = window.setTimeout(async () => {
      try {
        const response = await apiClient.get(`${API}/customers/phone/${encodeURIComponent(phone)}`);
        if (response.data?.found && response.data.customer) {
          setMatchedCustomer(response.data.customer);
          setCustomerName((current) => current || response.data.customer.name || '');
        } else {
          setMatchedCustomer(null);
        }
      } catch (error) {
        setMatchedCustomer(null);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [customerPhone]);

  useEffect(() => {
    loadBillingDataOptimized();
    
    // Advanced screen size and keyboard detection
    const handleResize = () => {
      setScreenHeight(window.innerHeight);
    };
    
    const handleVisualViewportChange = () => {
      if (window.visualViewport) {
        const keyboardHeight = window.innerHeight - window.visualViewport.height;
        setKeyboardHeight(keyboardHeight > 100 ? keyboardHeight : 0);
      }
    };
    
    window.addEventListener('resize', handleResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportChange);
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportChange);
      }
    };
  }, [orderId]);

  // 🚀 OPTIMIZED DATA LOADING - Use preloaded cache for instant billing
  const loadBillingDataOptimized = async () => {
    if (!orderId) return;

    startBillingTimer(orderId);

    // If we already have order from nav state, set items immediately so page is usable
    if (navOrder) {
      setOrderItems(navOrder.items || []);
      if (navOrder.customer_phone) setWhatsappPhone(navOrder.customer_phone);
    }

    try {
      const billingData = await billingCache.getBillingData(orderId, false);
      
      setOrder(billingData.order);
      setOrderItems(billingData.order.items || []);
      setBusinessSettings(billingData.businessSettings);
      setMenuItems(billingData.menuItems);
      
      const isOrderPaid = billingData.order.status === 'completed' || 
                         billingData.order.status === 'paid' || 
                         (billingData.order.payment_received > 0 && billingData.order.balance_amount === 0);
      
      if (isOrderPaid) {
        setPaymentCompleted(true);
        setCompletedPaymentData({
          received: billingData.order.payment_received || billingData.order.total,
          paymentMethod: billingData.order.payment_method || 'cash',
          balance: billingData.order.balance_amount || 0,
          isCredit: billingData.order.is_credit || false
        });
      }
      
      if (billingData.order.customer_phone) setWhatsappPhone(billingData.order.customer_phone);
      if (billingData.order.discount || billingData.order.discount_amount) {
        setDiscountType(billingData.order.discount_type || 'amount');
        setDiscountValue(billingData.order.discount_value || billingData.order.discount || '');
      }
      
      endBillingTimer(orderId, { cacheHit: true, dataSource: 'cache' });
      preloadPaymentData(orderId).catch(() => {});
      
    } catch (error) {
      console.error('❌ Failed to load billing data:', error);
      endBillingTimer(orderId, { cacheHit: false, dataSource: 'error', error: error.message });
      // Only navigate away if we have no order at all
      if (!order) {
        toast.error('Failed to load billing data');
        navigate('/orders');
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't close if we're in the middle of selecting
      if (isSelectingRef.current) {
        isSelectingRef.current = false;
        return;
      }
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowMenuDropdown(false);
        setSearchFocused(false);
      }
    };
    
    // Use click instead of mousedown - fires after touch events complete
    document.addEventListener('click', handleClickOutside, true);
    return () => {
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, []);

  // Intelligent dropdown positioning
  const calculateDropdownPosition = useCallback(() => {
    if (!dropdownRef.current) return 'bottom';
    
    const rect = dropdownRef.current.getBoundingClientRect();
    const availableSpaceBelow = screenHeight - rect.bottom - keyboardHeight;
    const availableSpaceAbove = rect.top;
    const dropdownHeight = 300; // Estimated dropdown height
    
    // If there's not enough space below but enough above, show above
    if (availableSpaceBelow < dropdownHeight && availableSpaceAbove > dropdownHeight) {
      return 'top';
    }
    
    return 'bottom';
  }, [screenHeight, keyboardHeight]);

  // Update dropdown position when needed
  useEffect(() => {
    if (showMenuDropdown) {
      const position = calculateDropdownPosition();
      setDropdownPosition(position);
    }
  }, [showMenuDropdown, calculateDropdownPosition]);

  // Debounced search for better performance with improved logic
  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value);
    setLastSearchTime(Date.now());
    
    // Clear existing timer
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }
    
    // Set new timer for dropdown show/hide with better logic
    const timer = setTimeout(() => {
      if (value.trim().length >= 1) { // Show dropdown after 1 character
        setShowMenuDropdown(true);
        setIsDropdownAnimating(true);
        setTimeout(() => setIsDropdownAnimating(false), 200);
      } else {
        setShowMenuDropdown(false);
      }
    }, 100); // Reduced debounce for faster response
    
    setSearchDebounceTimer(timer);
  }, [searchDebounceTimer]);
  
  // Handle menu item selection with improved feedback
  const handleAddMenuItem = useCallback((item) => {
    
    // Check if item already exists in order
    const existingItemIndex = orderItems.findIndex(orderItem => orderItem.menu_item_id === item.id);
    
    if (existingItemIndex >= 0) {
      // Increase quantity if item already exists
      const updatedItems = [...orderItems];
      updatedItems[existingItemIndex].quantity += 1;
      setOrderItems(updatedItems);
      toast.success(`Increased ${item.name} quantity to ${updatedItems[existingItemIndex].quantity}`);
    } else {
      // Add new item
      const newItem = {
        menu_item_id: item.id,
        name: item.name,
        quantity: 1,
        price: item.price,
        notes: ''
      };
      setOrderItems([...orderItems, newItem]);
      toast.success(`Added ${item.name} to order`);
    }
    
    // Clear search and hide dropdown
    setSearchQuery('');
    setShowMenuDropdown(false);
    setSearchFocused(false);
    
    // Focus back to search input for next item
    setTimeout(() => {
      const searchInput = document.querySelector('[data-testid="menu-search-input"]');
      if (searchInput) {
        searchInput.focus();
      }
    }, 100);
  }, [orderItems]);

  const fetchOrder = async () => {
    try {
      const response = await apiWithRetry({
        method: 'get',
        url: `${API}/orders/${orderId}`,
        timeout: 10000
      });
      setOrder(response.data);
      setOrderItems(response.data.items || []);
      
      // 🚀 CHECK PAYMENT STATUS: Set payment completed based on order status
      const isOrderPaid = response.data.status === 'completed' || 
                         response.data.status === 'paid' || 
                         (response.data.payment_received > 0 && response.data.balance_amount === 0);
      
      if (isOrderPaid) {
        setPaymentCompleted(true);
        setCompletedPaymentData({
          received: response.data.payment_received || response.data.total,
          paymentMethod: response.data.payment_method || 'cash',
          balance: response.data.balance_amount || 0,
          isCredit: response.data.is_credit || false
        });
      }
      
      if (response.data.customer_phone) setWhatsappPhone(response.data.customer_phone);
      if (response.data.discount || response.data.discount_amount) {
        setDiscountType(response.data.discount_type || 'amount');
        setDiscountValue(response.data.discount_value || response.data.discount || '');
      }
    } catch (error) {
      // Error handling is done by apiWithRetry
      navigate('/orders');
    }
  };

  const fetchMenuItems = async (forceRefresh = false) => {
    setMenuLoading(true);
    setMenuError(null);
    
    try {
      
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) {
        setMenuError('Authentication required. Please login again.');
        setMenuLoading(false);
        return;
      }
      
      // Try to use cached menu items for instant display (if not force refresh)
      const cacheKey = `menu_items_${user?.organization_id || user?.id || 'default'}`;
      const cachedData = localStorage.getItem(cacheKey);
      
      if (!forceRefresh && cachedData) {
        try {
          const { items, timestamp } = JSON.parse(cachedData);
          const cacheAge = Date.now() - timestamp;
          const CACHE_TTL = 2 * 60 * 1000; // 2 minutes for faster updates
          
          if (cacheAge < CACHE_TTL && items.length > 0) {
            setMenuItems(items);
            setMenuLoading(false);
            
            // Menu items are already fresh from billingCache - no need to refresh
            return;
          }
        } catch (e) {
          // Cache parse error - continue with fresh fetch
        }
      }
      
      // Add timeout and retry logic
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await apiWithRetry({
        method: 'get',
        url: `${API}/menu`,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal,
        timeout: 15000
      });
      
      clearTimeout(timeoutId);
      
      const items = Array.isArray(response.data) ? response.data : [];
      const availableItems = items.filter(item => item.available);
      
      setMenuItems(availableItems);
      
      // Cache the menu items with better error handling
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          items: availableItems,
          timestamp: Date.now()
        }));
      } catch (e) {
        // Cache storage failed - continue without caching
      }
      
      if (availableItems.length === 0) {
        setMenuError('No menu items available');
      }
      
    } catch (error) {
      
      let errorMessage = 'Failed to load menu items';
      
      if (error.name === 'AbortError') {
        errorMessage = 'Menu loading timed out. Please try again.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication expired. Please login again.';
        // Clear invalid token
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setTimeout(() => navigate('/login'), 2000);
      } else if (error.response?.status === 403) {
        errorMessage = 'Not authorized to view menu items.';
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      setMenuError(errorMessage);
      setMenuItems([]);
    } finally {
      setMenuLoading(false);
    }
  };

  // 🧠 SMART PAYMENT METHODS: Dynamic based on business logic
  const getAvailablePaymentMethods = useMemo(() => {
    const methods = [];
    
    // Cash - Always available for all restaurant types
    methods.push({ 
      id: 'cash', 
      icon: Wallet, 
      label: 'Cash', 
      color: '#22c55e',
      enabled: true,
      description: 'Cash payment'
    });
    
    // Card - Available for all except food trucks/stalls (typically no card machines)
    const businessType = businessSettings?.business_type || 'restaurant';
    const hasCardFacility = !['food-truck', 'stall'].includes(businessType);
    methods.push({ 
      id: 'card', 
      icon: CreditCard, 
      label: 'Card', 
      color: '#3b82f6',
      enabled: hasCardFacility,
      description: hasCardFacility ? 'Card payment' : 'Not available for this business type'
    });
    
    // UPI - Available if UPI ID is configured OR for modern business types
    const hasUpiId = businessSettings?.upi_id && businessSettings.upi_id.trim().length > 0;
    const isModernBusiness = ['restaurant', 'cafe', 'cloud-kitchen', 'takeaway-only'].includes(businessType);
    const upiEnabled = hasUpiId || isModernBusiness;
    methods.push({ 
      id: 'upi', 
      icon: Smartphone, 
      label: 'UPI', 
      color: '#8b5cf6',
      enabled: upiEnabled,
      description: upiEnabled ? 'UPI payment' : 'Configure UPI ID in settings'
    });
    
    // Credit - Available for restaurants with KOT mode (table service) or if explicitly needed
    const hasTableService = businessSettings?.kot_mode_enabled === true;
    const isFullServiceRestaurant = ['restaurant', 'cafe'].includes(businessType);
    const creditEnabled = hasTableService || isFullServiceRestaurant;
    methods.push({ 
      id: 'credit', 
      icon: FileText, 
      label: 'Credit', 
      color: '#f97316',
      enabled: creditEnabled,
      description: creditEnabled ? 'Customer pays later' : 'Not available for quick-service businesses'
    });
    
    return methods.filter(m => m.enabled);
  }, [businessSettings]);

  // Calculate grid columns based on available payment methods
  const paymentGridCols = useMemo(() => {
    const count = getAvailablePaymentMethods.length;
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count === 3) return 'grid-cols-3';
    return 'grid-cols-4';
  }, [getAvailablePaymentMethods]);

  const getCurrencySymbol = () => {
    const symbols = { 'INR': '₹', 'USD': '$', 'EUR': '€', 'GBP': '£' };
    return symbols[businessSettings?.currency || 'INR'] || '₹';
  };

  const priorPaid = useMemo(() => {
    const value = parseFloat(order?.payment_received);
    return Number.isFinite(value) ? value : 0;
  }, [order?.payment_received]);

  const calculateCurrentReceivedAmount = () => {
    if (splitPayment) {
      return (parseFloat(cashAmount) || 0) + (parseFloat(cardAmount) || 0) + (parseFloat(upiAmount) || 0);
    }
    return parseFloat(receivedAmount) || 0;
  };

  const calculateReceivedAmount = () => {
    // For credit payment method, received amount is always 0
    if (paymentMethod === 'credit' && !splitPayment && !showReceivedAmount) {
      return 0;
    }
    // For other payment methods, if not showing custom amount, assume full payment
    if (!splitPayment && !showReceivedAmount) {
      return calculateTotal();
    }
    const current = calculateCurrentReceivedAmount();
    return Math.max(0, priorPaid) + current;
  };

  const calculateBalanceAmount = () => {
    const total = calculateTotal();
    const received = calculateReceivedAmount();
    return Math.max(0, total - received);
  };

  const calculateChangeAmount = () => {
    const total = calculateTotal();
    const received = calculateReceivedAmount();
    return Math.max(0, received - total);
  };

  const isPartialPayment = () => {
    const total = calculateTotal();
    const received = calculateReceivedAmount();
    return received > 0 && received < total;
  };

  const isOverPayment = () => {
    const total = calculateTotal();
    const received = calculateReceivedAmount();
    return received > total;
  };

  const getTotalSplitAmount = () => {
    return (parseFloat(cashAmount) || 0) + (parseFloat(cardAmount) || 0) + (parseFloat(upiAmount) || 0);
  };


  // Memoized calculations to prevent unnecessary recalculations
  const subtotal = useMemo(() => orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0), [orderItems]);
  
  const discountAmount = useMemo(() => {
    const value = parseFloat(discountValue) || 0;
    if (value <= 0) return 0;
    if (discountType === 'percent') {
      const pct = Math.min(value, 100);
      return (subtotal * pct) / 100;
    }
    return Math.min(value, subtotal);
  }, [subtotal, discountValue, discountType]);

  const effectiveTaxRate = useMemo(() => {
    if (customTaxRate !== null) return customTaxRate;
    if (order?.tax_rate !== undefined) return order.tax_rate;
    if (order?.subtotal > 0 && order?.tax !== undefined) {
      return Math.round((order.tax / order.subtotal) * 100 * 100) / 100;
    }
    return businessSettings?.tax_rate ?? 5;
  }, [customTaxRate, order, businessSettings]);

  const tax = useMemo(() => {
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    return (taxableAmount * effectiveTaxRate) / 100;
  }, [subtotal, discountAmount, effectiveTaxRate]);

  const total = useMemo(() => Math.max(0, subtotal - discountAmount + tax), [subtotal, discountAmount, tax]);

  // Keep old function names for compatibility but use memoized values
  const calculateSubtotal = useCallback(() => subtotal, [subtotal]);
  const calculateDiscountAmount = useCallback(() => discountAmount, [discountAmount]);
  const calculateTax = useCallback(() => tax, [tax]);
  const calculateTotal = useCallback(() => total, [total]);
  const getEffectiveTaxRate = useCallback(() => effectiveTaxRate, [effectiveTaxRate]);

  // Get filtered menu items based on search with improved logic
  const filteredMenuItems = useMemo(() => {
    if (!searchQuery.trim() || menuItems.length === 0) {
      return [];
    }
    
    const query = searchQuery.toLowerCase().trim();
    
    // Multi-field search with scoring
    const searchResults = menuItems.map(item => {
      let score = 0;
      const name = item.name.toLowerCase();
      const category = item.category.toLowerCase();
      const description = (item.description || '').toLowerCase();
      
      // Exact name match gets highest score
      if (name === query) score += 100;
      // Name starts with query
      else if (name.startsWith(query)) score += 50;
      // Name contains query
      else if (name.includes(query)) score += 25;
      
      // Category matches
      if (category === query) score += 30;
      else if (category.includes(query)) score += 15;
      
      // Description matches
      if (description.includes(query)) score += 10;
      
      return { ...item, searchScore: score };
    })
    .filter(item => item.searchScore > 0)
    .sort((a, b) => b.searchScore - a.searchScore)
    .slice(0, 20); // Limit to top 20 results
    
    return searchResults;
  }, [searchQuery, menuItems]);
  
  const hasMatches = filteredMenuItems.length > 0;

  // Add custom item (when no menu match)
  const handleAddCustomItem = () => {
    const name = searchQuery.trim();
    const price = parseFloat(customPrice) || 0;
    if (!name) { toast.error('Enter item name'); return; }
    if (price <= 0) { toast.error('Enter price'); return; }
    setOrderItems([...orderItems, { menu_item_id: `custom_${Date.now()}`, name, price, quantity: 1, notes: 'Custom item' }]);
    setSearchQuery('');
    setCustomPrice('');
    setShowMenuDropdown(false);
    toast.success(`Added: ${name}`);
  };

  const handleItemQuantityChange = (index, delta) => {
    const updated = [...orderItems];
    const newQty = updated[index].quantity + delta;
    if (newQty < 1) updated.splice(index, 1);
    else updated[index].quantity = newQty;
    setOrderItems(updated);
  };

  const handleRemoveItem = (index) => setOrderItems(orderItems.filter((_, i) => i !== index));

  const updateOrderItems = async () => {
    if (orderItems.length === 0) { toast.error('Order must have at least one item'); return false; }
    try {
      const subtotal = calculateSubtotal();
      const discountAmt = calculateDiscountAmount();
      const tax = calculateTax();
      const total = calculateTotal();
      await apiWithRetry({
        method: 'put',
        url: `${API}/orders/${orderId}`,
        data: {
          items: orderItems, subtotal: subtotal - discountAmt, tax, tax_rate: getEffectiveTaxRate(), total,
          discount: discountAmt, discount_type: discountType, discount_value: parseFloat(discountValue) || 0, discount_amount: discountAmt
        },
        timeout: 12000
      });
      setOrder(prev => ({ ...prev, items: orderItems, subtotal: subtotal - discountAmt, tax, total }));
      return true;
    } catch (error) {
      toast.error('Failed to update order');
      return false;
    }
  };

  const releaseTable = async () => {
    const kotEnabled = businessSettings?.kot_mode_enabled !== false;
    if (!kotEnabled || !order?.table_id || order.table_id === 'counter') {
      return true;
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      // Try direct table status update first (more reliable)
      const updateData = {
        table_number: parseInt(order.table_number),
        capacity: order.capacity || 4,
        status: 'available',
        location: order.location || '',
        section: order.section || '',
        table_type: order.table_type || 'regular',
        notes: order.notes || ''
      };
      
      const response = await apiWithRetry({
        method: 'put',
        url: `${API}/tables/${order.table_id}`,
        data: updateData,
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout for table updates
      });
      
      // Success feedback without showing toast (to avoid confusion)
      return true;
      
    } catch (error) {
      // Try alternative approach - just mark as available
      try {
        await apiSilent({
          method: 'patch',
          url: `${API}/tables/${order.table_id}/status`,
          data: { status: 'available' },
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          timeout: 8000
        });
        return true;
      } catch (altError) {
        // Alternative method also failed
      }
      
      // Don't show error toast if table was actually cleared (common case)
      // Just continue - payment completed successfully
      return false; // Return false but don't block the payment process
    }
  };

  const processPayment = async () => {
    const total = calculateTotal();
    // Fix: Always calculate received amount correctly - default to full payment
    const rawReceived = (showReceivedAmount || splitPayment) ? calculateReceivedAmount() : total;
    const { payment_received: received, balance_amount: balance, is_credit: isCredit } = computePaymentState(total, rawReceived);
    const completionStatus = determineBillingCompletionStatus({ waiterName: order?.waiter_name, isCredit });
    
    setLoading(true);
    
    try {
      console.log('💳 Processing payment:', { orderId, total, received, balance, isCredit });
      
      // Prepare payment data - ensure all fields are explicitly set
      // CRITICAL FIX: QR orders (Self-Order) should stay 'pending' until kitchen marks as completed
      const paymentData = {
        order_id: orderId,
        status: completionStatus,
        payment_method: splitPayment ? 'split' : paymentMethod,
        payment_received: received,  // Always set explicitly
        balance_amount: balance,     // Always set explicitly (0 for full payment)
        is_credit: isCredit,         // Always set explicitly (false for full payment)
        discount: calculateDiscountAmount(),
        discount_type: discountType,
        discount_value: parseFloat(discountValue) || 0,
        discount_amount: calculateDiscountAmount(),
        total: total,
        updated_at: new Date().toISOString(),
        items: orderItems,
        subtotal: calculateSubtotal() - calculateDiscountAmount(),
        tax: calculateTax(),
        tax_rate: getEffectiveTaxRate(),
        table_id: order?.table_id
      };

      // Add customer info for partial payments
      if (isCredit && customerName) {
        paymentData.customer_name = customerName;
      }
      if (isCredit && customerPhone) {
        paymentData.customer_phone = customerPhone;
      }

      // Add split payment details if applicable
      if (splitPayment) {
        paymentData.cash_amount = parseFloat(cashAmount) || 0;
        paymentData.card_amount = parseFloat(cardAmount) || 0;
        paymentData.upi_amount = parseFloat(upiAmount) || 0;
        paymentData.credit_amount = balance;
      }
      
      console.log('📤 Sending payment data:', JSON.stringify(paymentData, null, 2));
      
      // Use optimized payment processor with callbacks for immediate UI feedback
      let result;
      try {
        result = await processPaymentFast(paymentData, {
          onStart: (data) => {
            console.log('🚀 Optimized payment processing started');
            // Optimistic UI update - show success immediately
            setCompletedPaymentData({
              received: received,
              balance: balance,
              total: total,
              isCredit: isCredit,
              paymentMethod: splitPayment ? 'split' : paymentMethod
            });
          },
          onError: (error) => {
            console.error('❌ Optimized payment processing failed:', error);
            logPaymentError(error, {
              orderId,
              amount: total,
              paymentMethod: splitPayment ? 'split' : paymentMethod,
              isCredit,
              tableNumber: order?.table_number
            });
            // Revert optimistic update on error
            setCompletedPaymentData(null);
          }
        });
        
        console.log('✅ Optimized payment processing completed:', result);
        
      } catch (optimizedError) {
        console.warn('⚠️ Optimized payment failed, falling back to standard processing:', optimizedError);
        
        // Log the optimized payment failure
        logPaymentError(optimizedError, {
          orderId,
          amount: total,
          paymentMethod: splitPayment ? 'split' : paymentMethod,
          isCredit,
          tableNumber: order?.table_number,
          fallback: true
        });
        
        // Fallback to standard payment processing with enhanced error handling
        const token = localStorage.getItem('token');
        
        try {
          result = await apiWithRetry({
            method: 'put',
            url: `${API}/orders/${orderId}`,
            data: paymentData,
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            timeout: 15000 // Longer timeout for payment processing
          });
          
          console.log('✅ Fallback payment processing completed:', result);
          
          // Set completed payment data for fallback
          setCompletedPaymentData({
            received: received,
            balance: balance,
            total: total,
            isCredit: isCredit,
            paymentMethod: splitPayment ? 'split' : paymentMethod
          });
          
          result = { success: true, processingTime: 0 };
          
        } catch (fallbackError) {
          console.error('❌ Fallback payment processing also failed:', fallbackError);
          
          // Enhanced error logging for fallback failure
          logPaymentError(fallbackError, {
            orderId,
            amount: total,
            paymentMethod: splitPayment ? 'split' : paymentMethod,
            isCredit,
            tableNumber: order?.table_number,
            fallback: true,
            originalError: optimizedError.message
          });
          
          // Check if it's a network error
          if (fallbackError.code === 'ERR_NETWORK' || !fallbackError.response) {
            logNetworkError(fallbackError, {
              url: `${API}/orders/${orderId}`,
              method: 'PUT',
              timeout: 15000
            });
          }
          
          throw fallbackError; // Re-throw to be handled by outer catch
        }
      }
      
      // 🗑️ CACHE INVALIDATION: Clear cached billing data after successful payment
      billingCache.invalidateOrder(orderId);
      
  toast.success(isCredit ? 'Partial payment recorded!' : 'Payment completed!');
  if (customerPhone.trim()) {
    apiSilent({
      method: 'post',
      url: `${API}/customers`,
      data: {
        name: customerName.trim() || 'Guest',
        phone: customerPhone.trim(),
        email: null,
        address: null,
        notes: null
      }
    }).catch((customerError) => console.warn('Customer save failed:', customerError));
  }
  setPaymentCompleted(true);
      
      // 🚀 IMMEDIATE EVENT DISPATCH: Notify OrdersPage about payment completion
      // IMPORTANT: Remove from active orders regardless of payment status (full or partial)
      const paymentCompletionEvent = new CustomEvent('paymentCompleted', {
        detail: {
          orderId: orderId,
          orderData: {
            ...order,
            status: completionStatus,
            payment_method: splitPayment ? 'split' : paymentMethod,
            payment_received: received,
            balance_amount: balance,
            is_credit: isCredit,
            total: total
          },
          // Flag to indicate this order should be removed from active orders
          removeFromActiveOrders: true
        }
      });
      
      console.log('🚀 Dispatching payment completion event:', paymentCompletionEvent.detail);
      window.dispatchEvent(paymentCompletionEvent);
      console.log('✅ Payment completion event dispatched successfully');
      
      // Also store in localStorage for cross-tab communication
      localStorage.setItem('paymentCompleted', JSON.stringify({
        orderId: orderId,
        orderData: {
          ...order,
          status: completionStatus,
          payment_method: splitPayment ? 'split' : paymentMethod,
          payment_received: received,
          balance_amount: balance,
          is_credit: isCredit,
          total: total
        },
        removeFromActiveOrders: true,
        timestamp: Date.now()
      }));
      
      // Clear the localStorage after a short delay
      setTimeout(() => {
        localStorage.removeItem('paymentCompleted');
      }, 5000);
      
      // Auto-print receipt immediately (only if auto-print is enabled)
      const discountAmt = calculateDiscountAmount();
      const receiptData = { 
        ...order, 
        items: orderItems, 
        subtotal: calculateSubtotal(), 
        tax: calculateTax(), 
        total: total, 
        discount: discountAmt, 
        discount_amount: discountAmt, 
        tax_rate: getEffectiveTaxRate(),
        status: completionStatus,
        payment_method: splitPayment ? 'split' : paymentMethod,
        payment_received: received,
        balance_amount: balance,
        is_credit: isCredit,
        customer_name: customerName || order.customer_name,
        customer_phone: customerPhone || order.customer_phone
      };

      // Add split payment details to receipt
      if (splitPayment) {
        receiptData.cash_amount = parseFloat(cashAmount) || 0;
        receiptData.card_amount = parseFloat(cardAmount) || 0;
        receiptData.upi_amount = parseFloat(upiAmount) || 0;
        receiptData.credit_amount = balance;
      }

      // Auto-print for fast POS workflow - default to TRUE for instant printing
      const shouldAutoPrint = businessSettings?.print_customization?.auto_print ?? true; // Default to TRUE for fast POS processing
      
      if (shouldAutoPrint) {
        // Print asynchronously without blocking UI - fire and forget
        printReceipt(receiptData, businessSettings)
          .then(() => {
            console.log('✅ Receipt printed successfully');
          })
          .catch(printError => {
            console.error('Print error:', printError);
            toast.info('💡 Print failed. Click Print button to retry.');
          });
        
        // Show success immediately without waiting for print
        toast.success('✅ Payment completed! Receipt printing...');
      } else {
        toast.success('Payment completed! Click Print button for receipt.');
      }
      
      // Release table asynchronously (don't block UI)
      releaseTable().catch(error => {
        console.warn('Table release failed but payment succeeded:', error);
        // Table release failed but payment succeeded - continue
      });
      
    } catch (error) {
      console.error('❌ Payment processing error:', error);
      
      // Enhanced error logging
      logPaymentError(error, {
        orderId,
        amount: total,
        paymentMethod: splitPayment ? 'split' : paymentMethod,
        isCredit,
        tableNumber: order?.table_number,
        errorDetails: {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        }
      });
      
      // Check if payment actually succeeded despite the error
      try {
        console.log('🔍 Verifying payment status after error...');
        const token = localStorage.getItem('token');
        const verifyResponse = await apiSilent({
          method: 'get',
          url: `${API}/orders/${orderId}`,
          headers: { Authorization: `Bearer ${token}` },
          timeout: 8000
        });
        
        const updatedOrder = verifyResponse?.data;
        if (updatedOrder && (updatedOrder.status === 'completed' || updatedOrder.payment_received > 0)) {
          console.log('✅ Payment verification successful - payment was processed despite error');
          
          // 🗑️ CACHE INVALIDATION: Clear cached billing data after successful payment
          billingCache.invalidateOrder(orderId);
          
          toast.success(isCredit ? 'Partial payment recorded!' : 'Payment completed!');
          setPaymentCompleted(true);
          setCompletedPaymentData({
            received: received,
            balance: balance,
            total: total,
            isCredit: isCredit,
            paymentMethod: splitPayment ? 'split' : paymentMethod
          });
          
          // Release table if needed
          releaseTable().catch(err => {
            console.warn('Table release failed but payment succeeded:', err);
            // Table release failed but payment succeeded
          });
          
          return; // Exit early - payment was successful
        } else {
          console.log('❌ Payment verification failed - payment was not processed');
        }
      } catch (verifyError) {
        console.error('❌ Could not verify payment status:', verifyError);
        logNetworkError(verifyError, {
          url: `${API}/orders/${orderId}`,
          method: 'GET',
          timeout: 8000
        });
      }
      
      // Payment failed - provide user-friendly error message
      let errorMessage = 'Payment failed. Please try again.';
      
      if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please login again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Not authorized to process payment.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Order not found. Please refresh and try again.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please try again or contact support if the issue persists.';
      } else if (error.code === 'ERR_NETWORK' || !error.response) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      throw error; // Re-throw for handlePayment to catch
      
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!order) { toast.error('Order not found'); return; }
    if (orderItems.length === 0) { toast.error('Order must have at least one item'); return; }

    const total = calculateTotal();
    const received = (showReceivedAmount || splitPayment) ? calculateReceivedAmount() : total;
    const balance = Math.max(0, total - received);
    const isCredit = balance > 0;

    if ((showReceivedAmount || splitPayment) && received <= 0 && paymentMethod !== 'credit') {
      toast.error('Please enter a valid received amount');
      return;
    }

    setLoading(true);

    try {
      const completionStatus = determineBillingCompletionStatus({ waiterName: order?.waiter_name, isCredit });
      
      // Single fast server call — wait for confirmation before showing success
      const response = await apiWithRetry({
        method: 'put',
        url: `${API}/orders/${orderId}`,
        data: {
          order_id: orderId,
          status: completionStatus,
          payment_method: splitPayment ? 'split' : paymentMethod,
          payment_received: received,
          balance_amount: balance,
          is_credit: isCredit,
          discount: calculateDiscountAmount(),
          discount_type: discountType,
          discount_value: parseFloat(discountValue) || 0,
          discount_amount: calculateDiscountAmount(),
          total,
          items: orderItems,
          subtotal: calculateSubtotal() - calculateDiscountAmount(),
          tax: calculateTax(),
          tax_rate: getEffectiveTaxRate(),
          table_id: order?.table_id,
          ...(splitPayment && {
            cash_amount: parseFloat(cashAmount) || 0,
            card_amount: parseFloat(cardAmount) || 0,
            upi_amount: parseFloat(upiAmount) || 0,
            credit_amount: balance
          })
        },
        timeout: 8000
      });

      // Server confirmed — now update UI
      setPaymentCompleted(true);
      setCompletedPaymentData({ received, balance, total, isCredit, paymentMethod: splitPayment ? 'split' : paymentMethod });

      // Dispatch event so OrdersPage removes it immediately
      const completedOrderData = { ...order, ...response.data, status: completionStatus, payment_received: received, balance_amount: balance, is_credit: isCredit, total };
      window.dispatchEvent(new CustomEvent('paymentCompleted', { detail: { orderId, orderData: completedOrderData } }));
      localStorage.setItem('paymentCompleted', JSON.stringify({ orderId, orderData: completedOrderData }));
      setTimeout(() => localStorage.removeItem('paymentCompleted'), 5000);

      toast.success(isCredit ? '💰 Partial payment!' : '✅ Payment done!');
      try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) {}

      billingCache.invalidateOrder(orderId);

    } catch (error) {
      console.error('Payment failed:', error);
      toast.error('Payment failed. Please try again.');
      try { if (navigator.vibrate) navigator.vibrate([300, 100, 300]); } catch (e) {}
    } finally {
      setLoading(false);
    }
  };

const handleWhatsappShare = async () => {
    if (!whatsappPhone.trim()) { toast.error('Enter phone number'); return; }
    try {
      await captureWhatsappConsent(whatsappPhone, order?.customer_name);
      const response = await apiWithRetry({
        method: 'post',
        url: `${API}/whatsapp/cloud/send-receipt/${orderId}`,
        data: { phone_number: whatsappPhone, customer_name: order?.customer_name },
        timeout: 10000
      });
      if (response.data?.success) {
        toast.success('WhatsApp invoice sent');
        pushNotification({
          title: 'WhatsApp Sent',
          message: `Receipt sent to ${whatsappPhone}`,
          type: 'success',
          icon: '📱'
        });
      } else {
        toast.error(response.data?.whatsapp_error || 'WhatsApp Cloud API not configured');
      }
      setShowWhatsappModal(false);
    } catch (error) {
      toast.error('Failed to send WhatsApp message');
    }
  };


  const downloadBillPDF = async () => {
    if (!order) return;
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      const restaurantName = businessSettings?.restaurant_name || 'Restaurant';
      const invoiceNo = order.invoice_number || order.id.slice(0, 8).toUpperCase();
      const subtotal = calculateSubtotal();
      const tax = calculateTax();
      const discount = calculateDiscountAmount();
      const total = calculateTotal();
      const taxRate = getEffectiveTaxRate();
      
      // Use "Rs." for PDF to avoid encoding issues
      const rs = 'Rs.';
      
      // ===== HEADER =====
      doc.setFillColor(124, 58, 237);
      doc.rect(0, 0, 210, 45, 'F');
      
      // Restaurant Name
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont(undefined, 'bold');
      doc.text(restaurantName, 20, 22);
      
      // Invoice label
      doc.setFontSize(12);
      doc.text('TAX INVOICE', 190, 15, { align: 'right' });
      doc.setFontSize(14);
      doc.text(`#${invoiceNo}`, 190, 28, { align: 'right' });
      
      // Table/Counter badge
      if (order.table_number) {
        doc.setFontSize(10);
        doc.text(`Table ${order.table_number}`, 190, 38, { align: 'right' });
      }
      
      // ===== BUSINESS & ORDER INFO =====
      let y = 58;
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      
      // Left side - Business info
      if (businessSettings?.address) {
        doc.text(businessSettings.address, 20, y);
        y += 5;
      }
      if (businessSettings?.phone) {
        doc.text(`Phone: ${businessSettings.phone}`, 20, y);
        y += 5;
      }
      if (businessSettings?.gstin) {
        doc.setFont(undefined, 'bold');
        doc.text(`GSTIN: ${businessSettings.gstin}`, 20, y);
        doc.setFont(undefined, 'normal');
      }
      
      // Right side - Date/Time
      doc.text(`Date: ${new Date(order.created_at).toLocaleDateString('en-IN')}`, 190, 58, { align: 'right' });
      doc.text(`Time: ${new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`, 190, 64, { align: 'right' });
      
      if (order.customer_name) {
        doc.text(`Customer: ${order.customer_name}`, 190, 70, { align: 'right' });
      }
      
      // ===== ITEMS TABLE =====
      y = 85;
      
      // Table Header
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y - 6, 180, 12, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.line(15, y + 6, 195, y + 6);
      
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text('ITEM', 20, y);
      doc.text('QTY', 115, y, { align: 'center' });
      doc.text('RATE', 145, y, { align: 'right' });
      doc.text('AMOUNT', 188, y, { align: 'right' });
      
      // Table Rows
      y += 14;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      
      orderItems.forEach((item, index) => {
        // Alternate row background
        if (index % 2 === 0) {
          doc.setFillColor(252, 252, 254);
          doc.rect(15, y - 5, 180, 10, 'F');
        }
        
        doc.setTextColor(40, 40, 40);
        doc.text(item.name.length > 35 ? item.name.substring(0, 35) + '...' : item.name, 20, y);
        doc.text(item.quantity.toString(), 115, y, { align: 'center' });
        doc.text(`${rs}${item.price.toFixed(2)}`, 145, y, { align: 'right' });
        doc.setFont(undefined, 'bold');
        doc.text(`${rs}${(item.quantity * item.price).toFixed(2)}`, 188, y, { align: 'right' });
        doc.setFont(undefined, 'normal');
        y += 10;
      });
      
      // ===== TOTALS SECTION =====
      y += 5;
      doc.setDrawColor(200, 200, 200);
      doc.line(120, y, 195, y);
      y += 10;
      
      // Subtotal
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text('Subtotal:', 140, y);
      doc.text(`${rs}${subtotal.toFixed(2)}`, 188, y, { align: 'right' });
      
      // Tax
      y += 8;
      doc.text(`Tax (${taxRate}%):`, 140, y);
      doc.text(`${rs}${tax.toFixed(2)}`, 188, y, { align: 'right' });
      
      // Discount (if any)
      if (discount > 0) {
        y += 8;
        doc.setTextColor(34, 197, 94);
        doc.text('Discount:', 140, y);
        doc.text(`-${rs}${discount.toFixed(2)}`, 188, y, { align: 'right' });
      }
      
      // Total Box
      y += 12;
      doc.setFillColor(124, 58, 237);
      doc.roundedRect(120, y - 6, 75, 14, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('TOTAL:', 125, y + 2);
      doc.text(`${rs}${total.toFixed(2)}`, 190, y + 2, { align: 'right' });
      
      // ===== PAYMENT INFO =====
      if (paymentCompleted || order.status === 'completed') {
        y += 20;
        doc.setFillColor(34, 197, 94);
        doc.roundedRect(15, y - 4, 50, 10, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.text('PAID', 40, y + 2, { align: 'center' });
        
        doc.setTextColor(80, 80, 80);
        doc.setFont(undefined, 'normal');
        doc.text(`Payment: ${(order.payment_method || paymentMethod || 'Cash').toUpperCase()}`, 70, y + 2);
      }
      
      // ===== FOOTER =====
      doc.setTextColor(120, 120, 120);
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text('Thank you for your business!', 105, 265, { align: 'center' });
      
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Generated by BillByteKOT', 105, 275, { align: 'center' });
      doc.text('www.billbytekot.in', 105, 280, { align: 'center' });
      
      // Save
      doc.save(`Invoice-${invoiceNo}.pdf`);
      toast.success('Invoice downloaded!');
    } catch (error) {
      console.error('PDF Error:', error);
      toast.error('Failed to download PDF');
    }
  };

  if (!order) {
    return (
      <Layout user={user}>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full"></div>
        </div>
      </Layout>
    );
  }

  const currency = getCurrencySymbol();
  const discountAmt = calculateDiscountAmount();
  const hasPriorPayment = priorPaid > 0;
  const remainingDue = Math.max(0, calculateTotal() - priorPaid);
  const basePaymentAmount = hasPriorPayment ? remainingDue : calculateTotal();
  const currentReceived = calculateCurrentReceivedAmount();
  const totalReceived = calculateReceivedAmount();
  const thisPaymentAmount = splitPayment ? getTotalSplitAmount() : showReceivedAmount ? currentReceived : basePaymentAmount;
  const orderData = { ...order, items: orderItems, subtotal: calculateSubtotal(), tax: calculateTax(), total: calculateTotal(), discount: discountAmt, discount_amount: discountAmt, tax_rate: getEffectiveTaxRate() };

  return (
    <Layout user={user}>
      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        
        @keyframes buttonPulse {
          0% {
            box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(139, 92, 246, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(139, 92, 246, 0);
          }
        }
        
        @keyframes successGlow {
          0% {
            box-shadow: 0 0 5px rgba(34, 197, 94, 0.5);
          }
          50% {
            box-shadow: 0 0 20px rgba(34, 197, 94, 0.8), 0 0 30px rgba(34, 197, 94, 0.6);
          }
          100% {
            box-shadow: 0 0 5px rgba(34, 197, 94, 0.5);
          }
        }
        
        .scrollbar-thin {
          scrollbar-width: thin;
        }
        
        .scrollbar-thumb-violet-300::-webkit-scrollbar-thumb {
          background-color: rgb(196 181 253);
          border-radius: 6px;
        }
        
        .scrollbar-track-gray-100::-webkit-scrollbar-track {
          background-color: rgb(243 244 246);
        }
        
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        
        .animate-fadeInUp {
          animation: fadeInUp 0.3s ease-out;
        }
        
        .animate-pulse-slow {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        .animate-button-pulse {
          animation: buttonPulse 2s infinite;
        }
        
        .animate-success-glow {
          animation: successGlow 2s ease-in-out infinite;
        }
        
        /* Enhanced mobile responsiveness */
        @media (max-width: 640px) {
          .mobile-search-container {
            padding: 0.5rem;
          }
          
          .mobile-search-input {
            font-size: 16px; /* Prevents zoom on iOS */
            min-height: 44px; /* iOS touch target minimum */
          }
          
          .mobile-dropdown {
            max-height: 50vh;
            border-radius: 12px;
          }
          
          .mobile-dropdown-item {
            min-height: 48px;
            padding: 12px;
          }
          
          .mobile-price-input {
            width: 48px;
            min-width: 48px;
          }
          
          .mobile-add-button {
            min-width: 44px;
            min-height: 44px;
          }
        }
        
        /* Prevent zoom on input focus (iOS) */
        @media screen and (max-width: 767px) {
          input[type="text"], 
          input[type="number"], 
          input[type="search"] {
            font-size: 16px !important;
          }
        }
        
        /* Enhanced touch targets */
        .touch-target {
          min-height: 44px;
          min-width: 44px;
        }
        
        /* Smooth keyboard handling */
        .keyboard-safe {
          padding-bottom: env(keyboard-inset-height, 0px);
        }
        
        /* Enhanced gradient animations */
        .gradient-animate {
          background-size: 200% 200%;
          animation: gradientShift 3s ease infinite;
        }
        
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        /* Enhanced button interactions */
        .pay-button-enhanced {
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .pay-button-enhanced:hover {
          transform: translateY(-2px);
        }
        
        .pay-button-enhanced:active {
          transform: translateY(0) scale(0.98);
        }
        
        .pay-button-enhanced::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.5s;
        }
        
        .pay-button-enhanced:hover::before {
          left: 100%;
        }
      `}</style>
      {/* ========== MOBILE LAYOUT ========== */}
      <div className="lg:hidden mobile-search-container keyboard-safe" style={{ paddingBottom: keyboardHeight > 0 ? '20px' : '16px' }}>
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white px-3 py-2 rounded-t-xl flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm sm:text-base">#{order.invoice_number || order.id.slice(0, 6)}</span>
            <span className="text-violet-200 text-xs sm:text-sm">{order.table_number ? `• T${order.table_number}` : '• Counter'}</span>
          </div>
          <span className="text-xs sm:text-sm">{new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
        <Card className="rounded-t-none border-0 shadow-lg" style={{ marginBottom: keyboardHeight > 0 ? '10px' : '0' }}>
          <CardContent className="p-2 sm:p-3">
            {/* Enhanced Smart Search Bar - Mobile Optimized */}
            <div className="relative mb-2" ref={dropdownRef}>
              <div className="flex gap-1 sm:gap-2">
                <div className="relative flex-1 min-w-0">
                  <Search className={`absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${searchFocused ? 'text-violet-500' : 'text-gray-400'}`} />
                  <Input 
                    placeholder={
                      menuError ? "Retry to reload" : 
                      menuItems.length === 0 ? "Add items in Menu" :
                      "Search items..."
                    } 
                    value={searchQuery} 
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className={`pl-8 pr-16 h-10 text-sm sm:text-base transition-all duration-200 ${
                      searchFocused ? 'ring-2 ring-violet-500 border-violet-300' : 'border-gray-300'
                    } ${menuError ? 'border-red-300 bg-red-50' : ''} ${
                      menuItems.length === 0 && !menuLoading ? 'border-yellow-300 bg-yellow-50' : ''
                    }`}
                    onFocus={() => {
                      setSearchFocused(true);
                      if (searchQuery.trim() && menuItems.length > 0) {
                        setShowMenuDropdown(true);
                      }
                    }}
                    onBlur={() => {
                      // Delay blur to allow for item selection
                      setTimeout(() => setSearchFocused(false), 200);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && hasMatches) {
                        e.preventDefault();
                        handleAddMenuItem(filteredMenuItems[0]);
                      }
                      if (e.key === 'Escape') {
                        setShowMenuDropdown(false);
                        setSearchQuery('');
                      }
                    }}
                    data-testid="menu-search-input"
                  />
                  
                  {/* Action buttons for different states - Mobile optimized */}
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {menuError && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => fetchMenuItems(true)}
                        className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Retry
                      </Button>
                    )}
                    
                    {menuItems.length === 0 && !menuLoading && !menuError && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate('/menu')}
                        className="h-7 px-2 text-xs text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                      >
                        Menu
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Custom item addition - Mobile responsive */}
                {!hasMatches && searchQuery.trim() && (
                  <>
                    <Input 
                      type="number" 
                      placeholder="₹" 
                      value={customPrice} 
                      onChange={(e) => setCustomPrice(e.target.value)} 
                      className="w-12 sm:w-16 h-10 text-sm sm:text-base transition-all duration-200 focus:ring-2 focus:ring-green-500" 
                      ref={priceInputRef} 
                    />
                    <Button 
                      size="sm" 
                      onClick={handleAddCustomItem} 
                      className="h-10 px-2 sm:px-3 bg-green-600 hover:bg-green-700 transition-all duration-200 transform hover:scale-105 active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
              
              {/* Menu Error Message */}
              {menuError && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700">
                    <span className="text-red-500">⚠️</span>
                    <span className="text-sm font-medium">Menu Loading Error</span>
                  </div>
                  <p className="text-red-600 text-xs mt-1">{menuError}</p>
                  <button 
                    onClick={() => fetchMenuItems(true)}
                    className="mt-2 text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded transition-colors"
                  >
                    Retry Loading Menu
                  </button>
                </div>
              )}
              
              {/* No Menu Items Warning */}
              {!menuLoading && !menuError && menuItems.length === 0 && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-700">
                    <span className="text-yellow-500">💡</span>
                    <span className="text-sm font-medium">No Menu Items Found</span>
                  </div>
                  <p className="text-yellow-600 text-xs mt-1">Add menu items in Settings to enable search suggestions</p>
                  <button 
                    onClick={() => navigate('/settings')}
                    className="mt-2 text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-2 py-1 rounded transition-colors"
                  >
                    Go to Settings
                  </button>
                </div>
              )}
              
              {/* Enhanced Suggested Items - Mobile Optimized */}
              {showMenuDropdown && searchQuery.trim() && hasMatches && (
                <div 
                  className={`absolute z-50 w-full bg-white border-2 border-violet-400 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 transform ${
                    isDropdownAnimating ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
                  } ${
                    dropdownPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
                  }`}
                  style={{
                    maxHeight: Math.min(280, screenHeight - keyboardHeight - 180),
                    animation: isDropdownAnimating ? 'none' : 'slideIn 0.2s ease-out'
                  }}
                >
                  <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold flex justify-between items-center">
                    <span className="flex items-center gap-1 sm:gap-2">
                      <span className="animate-pulse">👆</span>
                      <span>Tap to add ({filteredMenuItems.length})</span>
                    </span>
                    <button 
                      onClick={() => {
                        setShowMenuDropdown(false);
                        setSearchFocused(false);
                      }}
                      className="bg-white/20 hover:bg-white/30 rounded-full w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center transition-all duration-200 transform hover:scale-110 active:scale-95"
                    >
                      <X className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                  <div 
                    className="overflow-y-auto scrollbar-thin scrollbar-thumb-violet-300 scrollbar-track-gray-100" 
                    style={{ 
                      WebkitOverflowScrolling: 'touch',
                      maxHeight: Math.min(220, screenHeight - keyboardHeight - 240)
                    }}
                  >
                    {filteredMenuItems.slice(0, 6).map((item, idx) => (
                      <div 
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          isSelectingRef.current = true;
                          handleAddMenuItem(item);
                        }}
                        onTouchStart={() => { isSelectingRef.current = true; }}
                        onTouchEnd={(e) => {
                          e.preventDefault();
                          handleAddMenuItem(item);
                        }}
                        className={`w-full flex items-center justify-between px-3 sm:px-4 py-3 sm:py-4 border-b border-gray-100 cursor-pointer select-none transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99] ${
                          idx === 0 
                            ? 'bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200 shadow-sm' 
                            : 'bg-white hover:bg-gray-50'
                        }`}
                        style={{ 
                          touchAction: 'manipulation', 
                          WebkitTapHighlightColor: 'rgba(139, 92, 246, 0.1)', 
                          minHeight: '48px' 
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <span className={`font-semibold text-sm sm:text-base block truncate ${idx === 0 ? 'text-violet-700' : 'text-gray-800'}`}>
                            {idx === 0 && <span className="text-green-500 mr-1">⏎</span>}
                            {item.name}
                          </span>
                          {item.category && (
                            <span className="text-xs text-gray-500 mt-0.5 block truncate">{item.category}</span>
                          )}
                        </div>
                        <div className="ml-2 sm:ml-3 flex-shrink-0">
                          <span className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm text-white transition-all duration-200 ${
                            idx === 0 ? 'bg-gradient-to-r from-violet-600 to-purple-600 shadow-md' : 'bg-violet-500'
                          }`}>
                            {currency}{item.price}
                          </span>
                        </div>
                      </div>
                    ))}
                    
                    {filteredMenuItems.length > 6 && (
                      <div className="px-3 sm:px-4 py-2 sm:py-3 text-center text-xs sm:text-sm text-gray-500 bg-gray-50">
                        +{filteredMenuItems.length - 6} more items available
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Enhanced No match message */}
              {showMenuDropdown && searchQuery.trim() && !hasMatches && (
                <div className={`absolute z-40 w-full bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-xl p-4 shadow-lg transition-all duration-300 ${
                  dropdownPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <Plus className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-orange-700 font-medium text-sm">
                        Create new item: <span className="font-bold">"{searchQuery}"</span>
                      </p>
                      <p className="text-orange-600 text-xs mt-0.5">Enter price and click + to add</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Enhanced Order Items List */}
            <div 
              className="overflow-y-auto mb-3 space-y-2 scrollbar-thin scrollbar-thumb-violet-300 scrollbar-track-gray-100" 
              style={{ 
                maxHeight: `${Math.min(30, (screenHeight - keyboardHeight) * 0.35)}vh`,
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {orderItems.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                    <Search className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-sm font-medium">No items added yet</p>
                  <p className="text-xs mt-1">Search and add items to start billing</p>
                </div>
              ) : (
                orderItems.map((item, idx) => (
                  <div 
                    key={`${item.menu_item_id}-${idx}`} 
                    className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 shadow-sm transition-all duration-200 hover:shadow-md transform hover:scale-[1.01]"
                  >
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleItemQuantityChange(idx, -1)} 
                        className="w-8 h-8 bg-white border-2 border-red-200 rounded-lg text-red-600 font-bold transition-all duration-200 hover:bg-red-50 hover:border-red-300 active:scale-95 flex items-center justify-center"
                      >
                        −
                      </button>
                      <div className="w-10 h-8 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg flex items-center justify-center font-bold text-sm shadow-md">
                        {item.quantity}
                      </div>
                      <button 
                        onClick={() => handleItemQuantityChange(idx, 1)} 
                        className="w-8 h-8 bg-white border-2 border-green-200 rounded-lg text-green-600 font-bold transition-all duration-200 hover:bg-green-50 hover:border-green-300 active:scale-95 flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-sm text-gray-800 block truncate">{item.name}</span>
                      <span className="text-xs text-gray-500">₹{item.price} each</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-base text-violet-600 block">
                        {currency}{(item.price * item.quantity).toFixed(0)}
                      </span>
                      <button 
                        onClick={() => handleRemoveItem(idx)} 
                        className="text-red-400 hover:text-red-600 p-1 transition-all duration-200 transform hover:scale-110 active:scale-95"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="border-t pt-2 space-y-2 text-sm">
              {/* Subtotal Row */}
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">{currency}{calculateSubtotal().toFixed(0)}</span>
              </div>
              
              {/* Discount Row - Better Layout */}
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-gray-500">Discount</span>
                  <span className="text-green-600 font-medium">{discountAmt > 0 ? `-${currency}${discountAmt.toFixed(0)}` : '—'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <select value={discountType} onChange={(e) => { setDiscountType(e.target.value); setDiscountValue(''); }} className="h-8 px-2 text-sm border rounded-lg bg-white">
                    <option value="amount">₹</option>
                    <option value="percent">%</option>
                  </select>
                  <input 
                    type="number" 
                    value={discountValue} 
                    onChange={(e) => setDiscountValue(e.target.value)} 
                    placeholder="0"
                    className="w-16 h-8 px-2 text-sm border rounded-lg text-center" 
                    min="0"
                    max={discountType === 'percent' ? 100 : undefined}
                  />
                  <div className="flex gap-1 flex-1 justify-end">
                    {[5, 10, 15].map(p => (
                      <button 
                        key={p} 
                        onClick={() => { setDiscountType('percent'); setDiscountValue(p.toString()); }} 
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium ${discountType === 'percent' && discountValue === p.toString() ? 'bg-green-500 text-white' : 'bg-white border'}`}
                      >
                        {p}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Tax Row */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Tax</span>
                  <select 
                    value={customTaxRate !== null ? customTaxRate : getEffectiveTaxRate()} 
                    onChange={(e) => setCustomTaxRate(Number(e.target.value))} 
                    className="h-7 px-2 text-xs border rounded-lg bg-white"
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                  </select>
                </div>
                <span className="font-medium">{currency}{calculateTax().toFixed(0)}</span>
              </div>
              
              {/* Total Row */}
              <div className="flex justify-between text-xl font-bold pt-2 border-t">
                <span>Total</span>
                <span className="text-violet-600">{currency}{calculateTotal().toFixed(0)}</span>
              </div>
            </div>
            {/* Payment Method Selection */}
            <div className="bg-gray-50 p-2 sm:p-3 rounded-lg mt-2 sm:mt-3">
              <h4 className="font-semibold text-xs sm:text-sm mb-2">Payment Method</h4>
              <div className={`grid ${paymentGridCols} gap-2`}>
                {getAvailablePaymentMethods.map(m => (
                  <button 
                    key={m.id} 
                    onClick={() => {
                      setPaymentMethod(m.id);
                      setSplitPayment(false);
                      // For credit orders, don't show received amount input - it's automatically ₹0
                      if (m.id === 'credit') {
                        setShowReceivedAmount(false);
                        setReceivedAmount('');
                      } else {
                        // For other payment methods, reset to full payment
                        setShowReceivedAmount(false);
                        setReceivedAmount('');
                      }
                    }} 
                    className={`py-1.5 sm:py-2 rounded-lg flex flex-col items-center gap-1 border-2 transition-all ${paymentMethod === m.id && !splitPayment ? 'text-white border-transparent' : 'bg-white border-gray-200'}`} 
                    style={paymentMethod === m.id && !splitPayment ? { backgroundColor: m.color } : {}}
                    title={m.description}
                  >
                    <m.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-[11px] sm:text-xs font-medium">{m.label}</span>
                  </button>
                ))}
              </div>
              
              {/* Split Payment Option */}
              <div className="mt-3">
                <button 
                  onClick={() => {
                    setSplitPayment(!splitPayment);
                    if (!splitPayment) {
                      setShowReceivedAmount(false);
                      setReceivedAmount('');
                    }
                  }}
                  className={`w-full py-2 px-3 rounded-lg border-2 transition-all ${splitPayment ? 'bg-purple-600 text-white border-purple-600' : 'bg-white border-gray-200 hover:border-purple-300'}`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    <span className="text-sm font-medium">Split Payment</span>
                  </div>
                </button>
              </div>
            </div>
            
            {/* Payment Amount Options */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-3 sm:p-4 rounded-xl mt-2 sm:mt-3 border border-blue-200">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm sm:text-base text-gray-800 flex items-center gap-2">
                  💳 Payment Amount
                </h4>
                <span className="text-xl sm:text-2xl font-bold text-violet-600">{currency}{calculateTotal().toFixed(2)}</span>
              </div>

              <div className={`grid ${hasPriorPayment ? 'grid-cols-3' : 'grid-cols-2'} gap-2 mt-2`}>
                <div className="bg-white/80 border border-blue-100 rounded-lg p-2">
                  <p className="text-[10px] text-gray-500">Total</p>
                  <p className="text-sm font-semibold">{currency}{calculateTotal().toFixed(2)}</p>
                </div>
                {hasPriorPayment && (
                  <div className="bg-white/80 border border-blue-100 rounded-lg p-2">
                    <p className="text-[10px] text-gray-500">Paid</p>
                    <p className="text-sm font-semibold">{currency}{priorPaid.toFixed(2)}</p>
                  </div>
                )}
                <div className="bg-white/80 border border-blue-100 rounded-lg p-2">
                  <p className="text-[10px] text-gray-500">Due</p>
                  <p className="text-sm font-semibold text-red-600">{currency}{remainingDue.toFixed(2)}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSplitPayment(false);
                    setShowReceivedAmount(false);
                    setReceivedAmount('');
                  }}
                  className={`py-1.5 text-[11px] font-semibold rounded-lg border ${
                    !splitPayment && !showReceivedAmount ? 'bg-violet-600 text-white border-violet-600' : 'bg-white border-gray-200'
                  }`}
                >
                  Settle Due
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSplitPayment(false);
                    setShowReceivedAmount(true);
                  }}
                  className={`py-1.5 text-[11px] font-semibold rounded-lg border ${
                    !splitPayment && showReceivedAmount ? 'bg-violet-600 text-white border-violet-600' : 'bg-white border-gray-200'
                  }`}
                >
                  Add/Custom
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSplitPayment(true);
                    setShowReceivedAmount(false);
                    setReceivedAmount('');
                  }}
                  className={`py-1.5 text-[11px] font-semibold rounded-lg border ${
                    splitPayment ? 'bg-violet-600 text-white border-violet-600' : 'bg-white border-gray-200'
                  }`}
                >
                  Split
                </button>
              </div>

              {!splitPayment && !showReceivedAmount && (
                <div className="mt-2 bg-white/80 border border-blue-100 rounded-lg p-2 text-[11px] text-gray-600 flex justify-between">
                  <span>Collect now</span>
                  <span className="font-semibold">{currency}{basePaymentAmount.toFixed(2)}</span>
                </div>
              )}

              {!splitPayment && showReceivedAmount && (
                <div className="mt-2 bg-white border border-blue-100 rounded-lg p-2">
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-gray-600 min-w-[90px]">This payment</label>
                    <div className="flex-1 relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">
                        {currency}
                      </span>
                      <input
                        type="number"
                        value={receivedAmount}
                        onChange={(e) => setReceivedAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full h-9 pl-6 pr-2 text-sm font-semibold border border-gray-300 rounded-lg text-right focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setReceivedAmount((basePaymentAmount * 0.5).toFixed(2))}
                      className="py-1.5 text-[11px] rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-800 font-semibold"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => setReceivedAmount(basePaymentAmount.toFixed(2))}
                      className="py-1.5 text-[11px] rounded-lg border border-green-200 bg-green-50 text-green-800 font-semibold"
                    >
                      Due
                    </button>
                    <button
                      type="button"
                      onClick={() => setReceivedAmount(Math.ceil(basePaymentAmount).toString())}
                      className="py-1.5 text-[11px] rounded-lg border border-blue-200 bg-blue-50 text-blue-800 font-semibold"
                    >
                      Round
                    </button>
                  </div>
                </div>
              )}

              {splitPayment && (
                <div className="mt-2 bg-white border border-blue-100 rounded-lg p-2 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[11px] text-gray-600">Cash</label>
                      <input
                        type="number"
                        value={cashAmount}
                        onChange={(e) => setCashAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full h-8 px-2 text-xs border rounded-lg text-center"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-600">Card</label>
                      <input
                        type="number"
                        value={cardAmount}
                        onChange={(e) => setCardAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full h-8 px-2 text-xs border rounded-lg text-center"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-600">UPI</label>
                      <input
                        type="number"
                        value={upiAmount}
                        onChange={(e) => setUpiAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full h-8 px-2 text-xs border rounded-lg text-center"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div className="text-[11px] text-gray-600 flex justify-between">
                    <span>This split: {currency}{getTotalSplitAmount().toFixed(2)}</span>
                    <span>Due: {currency}{calculateBalanceAmount().toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="mt-2 bg-white/80 border border-blue-100 rounded-lg p-2 text-[11px] text-gray-600 flex flex-wrap gap-x-3 gap-y-1">
                <span>This payment: {currency}{thisPaymentAmount.toFixed(2)}</span>
                <span>After payment: {currency}{totalReceived.toFixed(2)}</span>
                {totalReceived < calculateTotal() ? (
                  <span className="text-red-600 font-semibold">Due {currency}{calculateBalanceAmount().toFixed(2)}</span>
                ) : totalReceived > calculateTotal() ? (
                  <span className="text-green-600 font-semibold">Change {currency}{calculateChangeAmount().toFixed(2)}</span>
                ) : (
                  <span className="text-green-600 font-semibold">Exact payment</span>
                )}
              </div>
            </div>
            {!paymentCompleted ? (
              <Button 
                onClick={handlePayment} 
                disabled={loading} 
                className={`w-full h-12 mt-3 text-lg font-bold rounded-lg transition-all duration-200 transform relative overflow-hidden ${
                  loading 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 scale-95 shadow-lg animate-pulse' 
                    : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 hover:scale-105 active:scale-95 shadow-xl hover:shadow-2xl'
                }`}
                style={{
                  boxShadow: loading 
                    ? '0 0 30px rgba(34, 197, 94, 0.5), inset 0 0 20px rgba(255, 255, 255, 0.2)' 
                    : '0 10px 25px rgba(139, 92, 246, 0.3)',
                  background: loading 
                    ? 'linear-gradient(135deg, #10b981, #059669, #047857)' 
                    : undefined
                }}
                onMouseDown={(e) => {
                  // Instant visual feedback on press
                  e.currentTarget.style.transform = 'scale(0.95)';
                  e.currentTarget.style.boxShadow = '0 5px 15px rgba(139, 92, 246, 0.4)';
                }}
                onMouseUp={(e) => {
                  // Reset on release
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 15px 30px rgba(139, 92, 246, 0.4)';
                }}
                onTouchStart={(e) => {
                  // Mobile touch feedback
                  e.currentTarget.style.transform = 'scale(0.95)';
                  e.currentTarget.style.boxShadow = '0 5px 15px rgba(139, 92, 246, 0.4)';
                }}
                onTouchEnd={(e) => {
                  // Mobile touch release
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {/* Animated background effect */}
                <div 
                  className={`absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transition-all duration-300 ${
                    loading ? 'animate-pulse' : 'opacity-0 hover:opacity-100'
                  }`}
                  style={{
                    background: loading 
                      ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)'
                      : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                    animation: loading ? 'shimmer 1.5s infinite' : undefined
                  }}
                />
                
                {loading ? (
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                    <span className="animate-pulse">✨ Processing Payment...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 relative z-10">
                    <span className="text-2xl animate-bounce">💳</span>
                    <span className="font-bold">
                      {splitPayment ? (
                        getTotalSplitAmount() === 0 ? 'Enter Split Payment Amounts' :
                        totalReceived < calculateTotal() ? `💰 Record Split Payment ${currency}${getTotalSplitAmount().toFixed(0)} (Due: ${currency}${calculateBalanceAmount().toFixed(0)})` :
                        totalReceived > calculateTotal() ? `💸 Pay Split ${currency}${getTotalSplitAmount().toFixed(0)} (Change: ${currency}${calculateChangeAmount().toFixed(0)})` :
                        `✅ Pay Split ${currency}${getTotalSplitAmount().toFixed(0)}`
                      ) : showReceivedAmount && receivedAmount ? (
                        isPartialPayment() ? `💰 Record Partial Payment ${currency}${currentReceived.toFixed(0)}` :
                        isOverPayment() ? `💸 Pay ${currency}${currentReceived.toFixed(0)} (Change: ${currency}${calculateChangeAmount().toFixed(0)})` :
                        `✅ Pay ${currency}${currentReceived.toFixed(0)}`
                      ) : `🚀 Pay ${currency}${(hasPriorPayment ? remainingDue : calculateTotal()).toFixed(0)}`}
                    </span>
                  </div>
                )}
              </Button>
            ) : (
              <div className="bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-300 rounded-lg p-3 mt-3 flex items-center gap-3 animate-success-glow">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center animate-bounce shadow-lg">
                  <Check className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-green-800 text-base flex items-center gap-2">
                    <span>🎉 Payment Completed!</span>
                    <span className="animate-pulse">✨</span>
                  </p>
                  <p className="text-sm text-green-700">
                    <span className="font-semibold">{currency}{(completedPaymentData?.received || calculateTotal()).toFixed(0)}</span> received via <span className="font-semibold">{completedPaymentData?.paymentMethod || paymentMethod}</span>
                    {completedPaymentData?.balance > 0 && (
                      <span className="block text-red-600 font-medium mt-1">
                        💰 Balance Due: <span className="font-bold">{currency}{completedPaymentData.balance.toFixed(0)}</span>
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={() => {
                // Always use manual print (shows dialog) when user clicks Print button
                const receiptData = { 
                  ...orderData, 
                  items: orderItems, 
                  subtotal: calculateSubtotal(), 
                  tax: calculateTax(), 
                  total: calculateTotal(), 
                  discount: calculateDiscountAmount(), 
                  discount_amount: calculateDiscountAmount(), 
                  tax_rate: getEffectiveTaxRate()
                };
                manualPrintReceipt(receiptData, businessSettings);
              }} className="h-9"><Printer className="w-4 h-4 mr-1" />Print</Button>
              <Button variant="outline" size="sm" onClick={downloadBillPDF} className="h-9"><Download className="w-4 h-4 mr-1" />PDF</Button>
              <Button variant="outline" size="sm" onClick={() => setShowWhatsappModal(true)} className="h-9 border-green-500 text-green-600"><MessageCircle className="w-4 h-4 mr-1" />Share</Button>
            </div>
            {paymentCompleted && <Button variant="ghost" size="sm" onClick={() => navigate('/orders')} className="w-full mt-2">← Back</Button>}
          </CardContent>
        </Card>
      </div>


      {/* ========== DESKTOP LAYOUT - ENHANCED ========== */}
      <div className="hidden lg:flex h-[calc(100vh-80px)] gap-4 p-4">
        {/* Left Panel - Items (65%) */}
        <div className="flex-[3] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
          <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white px-6 py-4 gradient-animate">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold">#{order.invoice_number || order.id.slice(0, 6)}</span>
                <span className="text-violet-200 bg-white/10 px-3 py-1 rounded-full text-sm font-medium">
                  {order.table_number ? `Table ${order.table_number}` : 'Counter Order'}
                </span>
              </div>
              <span className="text-violet-200 text-sm bg-white/10 px-3 py-1 rounded-full">
                {new Date(order.created_at).toLocaleString()}
              </span>
            </div>
          </div>
          
          <div className="p-6 border-b border-gray-100">
            {/* Enhanced Desktop Search Bar */}
            <div className="relative" ref={dropdownRef}>
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-200 ${searchFocused ? 'text-violet-500' : 'text-gray-400'}`} />
                  <Input 
                    placeholder="Search menu or type item name..." 
                    value={searchQuery} 
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={() => {
                      setSearchFocused(true);
                      if (searchQuery.trim()) {
                        setShowMenuDropdown(true);
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => setSearchFocused(false), 200);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && hasMatches) {
                        e.preventDefault();
                        handleAddMenuItem(filteredMenuItems[0]);
                      }
                      if (e.key === 'Escape') {
                        setShowMenuDropdown(false);
                        setSearchFocused(false);
                      }
                    }}
                    className={`pl-12 h-14 text-lg border-2 rounded-xl transition-all duration-200 ${
                      searchFocused 
                        ? 'ring-4 ring-violet-100 border-violet-300 shadow-lg' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  />
                </div>
                {!hasMatches && searchQuery.trim() && (
                  <>
                    <Input 
                      type="number" 
                      placeholder="₹ Price" 
                      value={customPrice} 
                      onChange={(e) => setCustomPrice(e.target.value)} 
                      className="w-40 h-14 text-lg border-2 rounded-xl transition-all duration-200 focus:ring-4 focus:ring-green-100 focus:border-green-300" 
                    />
                    <Button 
                      onClick={handleAddCustomItem} 
                      className="h-14 px-8 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-lg font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Add Item
                    </Button>
                  </>
                )}
              </div>
              
              {/* Enhanced Desktop Dropdown */}
              {showMenuDropdown && searchQuery.trim() && (
                <div 
                  className={`absolute z-50 w-full mt-2 bg-white border-2 border-violet-200 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 transform ${
                    isDropdownAnimating ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
                  }`}
                  style={{ maxHeight: '400px' }}
                >
                  {hasMatches ? (
                    <>
                      <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white px-6 py-3 flex justify-between items-center">
                        <span className="font-semibold flex items-center gap-2">
                          <span className="animate-pulse-slow">🔍</span>
                          Found {filteredMenuItems.length} items
                        </span>
                        <button 
                          onClick={() => {
                            setShowMenuDropdown(false);
                            setSearchFocused(false);
                          }}
                          className="bg-white/20 hover:bg-white/30 rounded-full w-8 h-8 flex items-center justify-center transition-all duration-200 transform hover:scale-110"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-violet-300 scrollbar-track-gray-100">
                        {filteredMenuItems.slice(0, 12).map((item, idx) => (
                          <div 
                            key={item.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              isSelectingRef.current = true;
                              handleAddMenuItem(item);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleAddMenuItem(item);
                              }
                            }}
                            className={`w-full px-6 py-4 text-left cursor-pointer select-none transition-all duration-200 transform hover:scale-[1.01] flex justify-between items-center border-b border-gray-100 last:border-0 ${
                              idx === 0 
                                ? 'bg-gradient-to-r from-violet-50 to-purple-50 hover:from-violet-100 hover:to-purple-100' 
                                : 'bg-white hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex-1">
                              <span className={`font-semibold text-lg block ${idx === 0 ? 'text-violet-700' : 'text-gray-800'}`}>
                                {idx === 0 && <span className="text-green-500 mr-2">⏎</span>}
                                {item.name}
                              </span>
                              {item.category && (
                                <span className="text-sm text-gray-500 mt-1 block">{item.category}</span>
                              )}
                            </div>
                            <span className={`px-4 py-2 rounded-xl font-bold text-lg text-white ml-4 transition-all duration-200 ${
                              idx === 0 
                                ? 'bg-gradient-to-r from-violet-600 to-purple-600 shadow-lg' 
                                : 'bg-violet-500 hover:bg-violet-600'
                            }`}>
                              {currency}{item.price}
                            </span>
                          </div>
                        ))}
                        
                        {filteredMenuItems.length > 12 && (
                          <div className="px-6 py-4 text-center text-gray-500 bg-gray-50 border-t">
                            <span className="text-sm">+{filteredMenuItems.length - 12} more items available</span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="p-6 bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                          <Plus className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-orange-700 font-semibold text-lg">
                            Create new item: "{searchQuery}"
                          </p>
                          <p className="text-orange-600 text-sm mt-1">Enter price and click "Add Item" to create</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-violet-300 scrollbar-track-gray-100">
            {orderItems.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center animate-fadeInUp">
                  <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                    <Search className="w-12 h-12 text-gray-300" />
                  </div>
                  <p className="text-xl font-medium mb-2">No items added yet</p>
                  <p className="text-sm">Search and add items to start creating the bill</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {orderItems.map((item, idx) => (
                  <div 
                    key={`${item.menu_item_id}-${idx}`} 
                    className="flex items-center gap-6 p-5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200 shadow-sm transition-all duration-200 hover:shadow-lg transform hover:scale-[1.01] animate-fadeInUp"
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => handleItemQuantityChange(idx, -1)} 
                        className="w-12 h-12 bg-white border-2 border-red-200 rounded-xl text-red-600 font-bold text-xl transition-all duration-200 hover:bg-red-50 hover:border-red-300 active:scale-95 flex items-center justify-center shadow-sm hover:shadow-md"
                      >
                        −
                      </button>
                      <div className="w-16 h-12 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl flex items-center justify-center font-bold text-xl shadow-lg">
                        {item.quantity}
                      </div>
                      <button 
                        onClick={() => handleItemQuantityChange(idx, 1)} 
                        className="w-12 h-12 bg-white border-2 border-green-200 rounded-xl text-green-600 font-bold text-xl transition-all duration-200 hover:bg-green-50 hover:border-green-300 active:scale-95 flex items-center justify-center shadow-sm hover:shadow-md"
                      >
                        +
                      </button>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-xl text-gray-800">{item.name}</p>
                      <p className="text-gray-500 mt-1">{currency}{item.price} each</p>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-bold text-violet-600 block">
                        {currency}{(item.price * item.quantity).toFixed(0)}
                      </span>
                      <button 
                        onClick={() => handleRemoveItem(idx)} 
                        className="text-red-400 hover:text-red-600 p-2 mt-2 transition-all duration-200 transform hover:scale-110 active:scale-95 rounded-lg hover:bg-red-50"
                      >
                        <Trash2 className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Payment (35%) */}
        <div className="flex-[2] flex flex-col bg-white rounded-xl shadow-xl overflow-hidden">
          <div className="p-4 border-b space-y-3">
            <div className="flex justify-between text-base"><span className="text-gray-500">Subtotal</span><span className="font-semibold">{currency}{calculateSubtotal().toFixed(0)}</span></div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm">Discount</span>
                <select value={discountType} onChange={(e) => { setDiscountType(e.target.value); setDiscountValue(''); }} className="px-2 py-1 border rounded text-sm">
                  <option value="amount">₹ Amount</option><option value="percent">% Percent</option>
                </select>
                <input type="number" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder="0" className="w-20 px-2 py-1 border rounded text-center text-sm" />
                <div className="flex gap-1">
                  {[5, 10, 15, 20].map(p => (
                    <button key={p} onClick={() => { setDiscountType('percent'); setDiscountValue(p.toString()); }} className={`px-2 py-1 rounded text-xs font-medium transition-all ${discountType === 'percent' && discountValue === p.toString() ? 'bg-green-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>{p}%</button>
                  ))}
                </div>
              </div>
              <span className="text-green-600 font-semibold">{discountAmt > 0 ? `-${currency}${discountAmt.toFixed(0)}` : '—'}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-gray-500">Tax</span>
                <select value={customTaxRate !== null ? customTaxRate : getEffectiveTaxRate()} onChange={(e) => setCustomTaxRate(Number(e.target.value))} className="px-3 py-2 border rounded-lg bg-white text-base">
                  <option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option>
                </select>
              </div>
              <span className="font-semibold text-lg">{currency}{calculateTax().toFixed(0)}</span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t-2 border-dashed">
              <span className="text-3xl font-bold">Total</span>
              <span className="text-4xl font-bold text-violet-600">{currency}{calculateTotal().toFixed(0)}</span>
            </div>
          </div>
          <div className="p-6 border-b">
            <p className="text-sm text-gray-500 mb-4 font-semibold uppercase tracking-wide">Payment Method</p>
            <div className="grid grid-cols-3 gap-4">
              {[{ id: 'cash', icon: Wallet, label: 'Cash', color: '#22c55e' }, { id: 'card', icon: CreditCard, label: 'Card', color: '#3b82f6' }, { id: 'upi', icon: Smartphone, label: 'UPI', color: '#8b5cf6' }].map(m => (
                <button key={m.id} onClick={() => { setPaymentMethod(m.id); setSplitPayment(false); }} className={`py-5 rounded-xl flex flex-col items-center gap-2 border-2 transition-all ${paymentMethod === m.id && !splitPayment ? 'text-white border-transparent shadow-lg scale-105' : 'bg-white border-gray-200 hover:border-gray-300'}`} style={paymentMethod === m.id && !splitPayment ? { backgroundColor: m.color } : {}}>
                  <m.icon className="w-8 h-8" /><span className="font-semibold text-lg">{m.label}</span>
                </button>
              ))}
            </div>
            
            {/* Payment Amount Options - Desktop */}
            <div className="mt-6 bg-blue-50 p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-base">Payment Amount</h4>
                <span className="text-2xl font-bold text-violet-600">{currency}{calculateTotal().toFixed(2)}</span>
              </div>

              <div className={`grid ${hasPriorPayment ? 'grid-cols-3' : 'grid-cols-2'} gap-3 mt-3`}>
                <div className="bg-white/80 border border-blue-100 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="text-lg font-semibold">{currency}{calculateTotal().toFixed(2)}</p>
                </div>
                {hasPriorPayment && (
                  <div className="bg-white/80 border border-blue-100 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Paid</p>
                    <p className="text-lg font-semibold">{currency}{priorPaid.toFixed(2)}</p>
                  </div>
                )}
                <div className="bg-white/80 border border-blue-100 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Due</p>
                  <p className="text-lg font-semibold text-red-600">{currency}{remainingDue.toFixed(2)}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setSplitPayment(false);
                    setShowReceivedAmount(false);
                    setReceivedAmount('');
                  }}
                  className={`py-2 text-sm font-semibold rounded-lg border ${
                    !splitPayment && !showReceivedAmount ? 'bg-violet-600 text-white border-violet-600' : 'bg-white border-gray-200'
                  }`}
                >
                  Settle Due
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSplitPayment(false);
                    setShowReceivedAmount(true);
                  }}
                  className={`py-2 text-sm font-semibold rounded-lg border ${
                    !splitPayment && showReceivedAmount ? 'bg-violet-600 text-white border-violet-600' : 'bg-white border-gray-200'
                  }`}
                >
                  Add/Custom
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSplitPayment(true);
                    setShowReceivedAmount(false);
                    setReceivedAmount('');
                  }}
                  className={`py-2 text-sm font-semibold rounded-lg border ${
                    splitPayment ? 'bg-violet-600 text-white border-violet-600' : 'bg-white border-gray-200'
                  }`}
                >
                  Split
                </button>
              </div>

              {!splitPayment && !showReceivedAmount && (
                <div className="mt-3 bg-white/80 border border-blue-100 rounded-lg p-3 text-sm flex justify-between">
                  <span>Collect now</span>
                  <span className="font-semibold">{currency}{basePaymentAmount.toFixed(2)}</span>
                </div>
              )}

              {!splitPayment && showReceivedAmount && (
                <div className="mt-3 bg-white border border-blue-100 rounded-lg p-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-600 min-w-[120px]">This payment</label>
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">
                        {currency}
                      </span>
                      <input
                        type="number"
                        value={receivedAmount}
                        onChange={(e) => setReceivedAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full h-11 pl-8 pr-3 text-base font-semibold border border-gray-300 rounded-lg text-right focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setReceivedAmount((basePaymentAmount * 0.5).toFixed(2))}
                      className="px-3 py-2 text-sm bg-yellow-100 border border-yellow-300 rounded-lg font-medium"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => setReceivedAmount(basePaymentAmount.toFixed(2))}
                      className="px-3 py-2 text-sm bg-green-100 border border-green-300 rounded-lg font-medium"
                    >
                      Due
                    </button>
                    <button
                      type="button"
                      onClick={() => setReceivedAmount(Math.ceil(basePaymentAmount).toString())}
                      className="px-3 py-2 text-sm bg-blue-100 border border-blue-300 rounded-lg font-medium"
                    >
                      Round Up
                    </button>
                  </div>
                </div>
              )}

              {splitPayment && (
                <div className="mt-3 bg-white border border-blue-100 rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-gray-600">Cash</label>
                      <input
                        type="number"
                        value={cashAmount}
                        onChange={(e) => setCashAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full h-9 px-2 text-sm border rounded-lg text-center"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Card</label>
                      <input
                        type="number"
                        value={cardAmount}
                        onChange={(e) => setCardAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full h-9 px-2 text-sm border rounded-lg text-center"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">UPI</label>
                      <input
                        type="number"
                        value={upiAmount}
                        onChange={(e) => setUpiAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full h-9 px-2 text-sm border rounded-lg text-center"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 flex justify-between">
                    <span>This split: {currency}{getTotalSplitAmount().toFixed(2)}</span>
                    <span>Due: {currency}{calculateBalanceAmount().toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="mt-3 bg-white/80 border border-blue-100 rounded-lg p-3 text-sm flex flex-wrap gap-x-4 gap-y-1">
                <span>This payment: {currency}{thisPaymentAmount.toFixed(2)}</span>
                <span>After payment: {currency}{totalReceived.toFixed(2)}</span>
                {totalReceived < calculateTotal() ? (
                  <span className="text-red-600 font-semibold">Due {currency}{calculateBalanceAmount().toFixed(2)}</span>
                ) : totalReceived > calculateTotal() ? (
                  <span className="text-green-600 font-semibold">Change {currency}{calculateChangeAmount().toFixed(2)}</span>
                ) : (
                  <span className="text-green-600 font-semibold">Exact payment</span>
                )}
              </div>
            </div>
          </div>
          <div className="p-4 flex-1 flex flex-col">
            {!paymentCompleted ? (
              <Button 
                onClick={handlePayment} 
                disabled={loading} 
                className={`w-full h-14 text-xl font-bold rounded-xl shadow-xl transition-all duration-200 transform relative overflow-hidden ${
                  loading 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 scale-95 animate-pulse' 
                    : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 hover:scale-105 active:scale-95'
                }`}
                style={{
                  boxShadow: loading 
                    ? '0 0 40px rgba(34, 197, 94, 0.6), inset 0 0 30px rgba(255, 255, 255, 0.2)' 
                    : '0 15px 35px rgba(139, 92, 246, 0.4)',
                  background: loading 
                    ? 'linear-gradient(135deg, #10b981, #059669, #047857)' 
                    : undefined
                }}
                onMouseDown={(e) => {
                  // Instant visual feedback on press
                  e.currentTarget.style.transform = 'scale(0.95)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(139, 92, 246, 0.5)';
                }}
                onMouseUp={(e) => {
                  // Reset on release
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(139, 92, 246, 0.5)';
                }}
                onMouseEnter={(e) => {
                  // Enhanced hover effect
                  if (!loading) {
                    e.currentTarget.style.boxShadow = '0 20px 40px rgba(139, 92, 246, 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  // Reset hover
                  if (!loading) {
                    e.currentTarget.style.boxShadow = '0 15px 35px rgba(139, 92, 246, 0.4)';
                  }
                }}
              >
                {/* Animated background effect */}
                <div 
                  className={`absolute inset-0 transition-all duration-300 ${
                    loading ? 'animate-pulse' : 'opacity-0 hover:opacity-100'
                  }`}
                  style={{
                    background: loading 
                      ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)'
                      : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                    animation: loading ? 'shimmer 1.5s infinite' : undefined
                  }}
                />
                
                {loading ? (
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="animate-spin w-6 h-6 border-3 border-white border-t-transparent rounded-full" />
                    <span className="animate-pulse text-xl">✨ Processing Payment...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3 relative z-10">
                    <span className="text-3xl animate-bounce">💳</span>
                    <span className="font-bold text-xl">
                      {showReceivedAmount ? 
                        `🚀 Pay ${currency}${currentReceived.toFixed(0)}` : 
                        `🚀 Pay ${currency}${(hasPriorPayment ? remainingDue : calculateTotal()).toFixed(0)}`
                      }
                    </span>
                  </div>
                )}
              </Button>
            ) : (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-4 flex items-center gap-3 animate-success-glow shadow-lg">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center animate-bounce shadow-lg">
                  <Check className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold text-green-800 flex items-center gap-2">
                    <span>🎉 Payment Successful!</span>
                    <span className="animate-pulse text-2xl">✨</span>
                  </p>
                  <p className="text-green-600 text-lg">
                    <span className="font-bold">{currency}{(completedPaymentData?.received || calculateTotal()).toFixed(0)}</span> received via <span className="font-semibold uppercase">{(completedPaymentData?.paymentMethod || paymentMethod)}</span>
                    {completedPaymentData?.balance > 0 && (
                      <span className="block text-red-600 text-base font-medium mt-1">
                        💰 Balance Due: <span className="font-bold">{currency}{completedPaymentData.balance.toFixed(0)}</span>
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <Button variant="outline" onClick={() => {
                // Always show preview modal when user clicks Preview & Print button
                const receiptData = { 
                  ...orderData, 
                  items: orderItems, 
                  subtotal: calculateSubtotal(), 
                  tax: calculateTax(), 
                  total: calculateTotal(), 
                  discount: calculateDiscountAmount(), 
                  discount_amount: calculateDiscountAmount(), 
                  tax_rate: getEffectiveTaxRate()
                };
                setPrintPreviewOrder(receiptData);
                setShowPrintPreview(true);
              }} className="h-12 text-base bg-cyan-500 hover:bg-cyan-600 text-white" data-testid="print-preview-btn"><Eye className="w-4 h-4 mr-1" />Preview & Print</Button>
              <Button variant="outline" onClick={downloadBillPDF} className="h-12 text-base" data-testid="download-pdf-btn"><Download className="w-4 h-4 mr-1" />PDF</Button>
              <Button variant="outline" onClick={() => setShowWhatsappModal(true)} className="h-12 text-base border-green-500 text-green-600 hover:bg-green-50" data-testid="share-whatsapp-btn"><MessageCircle className="w-4 h-4 mr-1" />Share</Button>
            </div>
            {paymentCompleted && <Button variant="ghost" onClick={() => navigate('/orders')} className="w-full mt-4 h-12 text-lg">← Back to Orders</Button>}
          </div>
        </div>
      </div>

      {/* Customer Info Modal for Partial Payments */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Customer Information</h3>
                <button 
                  onClick={() => setShowCustomerModal(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                For partial payments, please provide customer details:
              </p>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Customer Name *</Label>
                  <Input 
                    placeholder="Enter customer name" 
                    value={customerName} 
                    onChange={(e) => setCustomerName(e.target.value)} 
                    className="h-12 text-lg mt-1" 
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Mobile number (to receive your bill and order updates on WhatsApp).</Label>
                  <Input 
                    placeholder="+91 9876543210" 
                    value={customerPhone} 
                    onChange={(e) => setCustomerPhone(e.target.value)} 
  className="h-12 text-lg mt-1"
  />
  {matchedCustomer && (
  <p className="mt-2 text-sm text-green-700" role="status">
  Returning customer found: {matchedCustomer.name || 'Guest'} · {matchedCustomer.total_orders || 0} previous visits
  </p>
  )}
  </div>
  </div>
              <div className="flex gap-3 mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCustomerModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={async () => {
                    try {
                      if (!customerName.trim()) {
                        toast.error('Please enter customer name');
                        return;
                      }
                      if (!customerPhone.trim()) {
                        toast.error('Please enter phone number');
                        return;
                      }
                      await captureWhatsappConsent(customerPhone, customerName);
                      setShowCustomerModal(false);
                      processPayment();
                    } catch (error) {
                      toast.error('Error processing customer information');
                    }
                  }}
                  className="flex-1 bg-violet-600 hover:bg-violet-700"
                  disabled={!customerName.trim() || !customerPhone.trim()}
                >
                  Continue Payment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* WhatsApp Modal */}
      {showWhatsappModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Share via WhatsApp</h3>
                <button onClick={() => setShowWhatsappModal(false)}><X className="w-6 h-6" /></button>
              </div>
              <Input placeholder="+91 9876543210" value={whatsappPhone} onChange={(e) => setWhatsappPhone(e.target.value)} className="mb-4 h-12 text-lg" />
              <Button onClick={handleWhatsappShare} className="w-full h-12 bg-green-600 hover:bg-green-700 text-lg"><MessageCircle className="w-5 h-5 mr-2" />Send Receipt</Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Receipt Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col">
            <CardContent className="p-6 flex flex-col h-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Receipt Preview</h3>
                <button onClick={() => setShowPreview(false)}><X className="w-6 h-6" /></button>
              </div>
              <div className="flex-1 overflow-auto bg-gray-50 p-4 rounded-lg">
                <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                  {previewContent}
                </pre>
              </div>
              <div className="flex gap-3 mt-4">
                <Button 
                  onClick={() => {
                    setShowPreview(false);
                    const discountAmt = calculateDiscountAmount();
                    const receiptData = { 
                      ...order, 
                      items: orderItems, 
                      subtotal: calculateSubtotal(), 
                      tax: calculateTax(), 
                      total: calculateTotal(), 
                      discount: discountAmt, 
                      discount_amount: discountAmt, 
                      tax_rate: getEffectiveTaxRate(),
                      status: paymentCompleted ? 'completed' : 'pending',
                      payment_method: splitPayment ? 'split' : paymentMethod,
                      payment_received: (showReceivedAmount || splitPayment) ? calculateReceivedAmount() : calculateTotal(),
                      balance_amount: Math.max(0, calculateTotal() - ((showReceivedAmount || splitPayment) ? calculateReceivedAmount() : calculateTotal())),
                      is_credit: Math.max(0, calculateTotal() - ((showReceivedAmount || splitPayment) ? calculateReceivedAmount() : calculateTotal())) > 0,
                      customer_name: customerName || order.customer_name,
                      customer_phone: customerPhone || order.customer_phone
                    };
                    if (splitPayment) {
                      receiptData.cash_amount = parseFloat(cashAmount) || 0;
                      receiptData.card_amount = parseFloat(cardAmount) || 0;
                      receiptData.upi_amount = parseFloat(upiAmount) || 0;
                      receiptData.credit_amount = Math.max(0, calculateTotal() - calculateReceivedAmount());
                    }
                    manualPrintReceipt(receiptData, businessSettings);
                  }}
                  className="flex-1 bg-violet-600 hover:bg-violet-700"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print Now
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowPreview(false)}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Enhanced Print Preview Modal */}
      <PrintPreviewModal
        isOpen={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
        order={printPreviewOrder}
        businessSettings={businessSettings}
      />
    </Layout>
  );
};

export default BillingPage;
