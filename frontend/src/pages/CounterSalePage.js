import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import TrialBanner from '../components/TrialBanner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  Minus,
  ShoppingCart,
  CreditCard,
  Wallet,
  Banknote,
  QrCode,
  Trash2,
  RotateCcw,
  SlidersHorizontal,
  Zap,
  Printer,
  Download
} from 'lucide-react';
import { API } from '../App';
import { apiWithRetry, apiSilent } from '../utils/apiClient';
import { fetchMenu, fetchBusinessSettings } from '../utils/sharedDataCache';
import { processPaymentFast } from '../utils/optimizedPayment';
import { computePaymentState, determineBillingCompletionStatus } from '../utils/orderWorkflowRules';
import { validatePayment } from '../utils/paymentValidator';
import { printReceipt, manualPrintReceipt } from '../utils/printUtils';

const getCurrencySymbol = (code) => {
  const symbols = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'AED', SAR: 'SAR', JPY: '¥', CNY: '¥', AUD: 'A$', CAD: 'C$' };
  return symbols[code] || '₹';
};

const getItemEmoji = (item) => {
  const category = (item?.category || '').toLowerCase();
  if (category.includes('beverage')) return '🥤';
  if (category.includes('snack')) return '🍟';
  if (category.includes('pizza')) return '🍕';
  if (category.includes('burger')) return '🍔';
  if (category.includes('rice')) return '🍚';
  if (category.includes('noodle')) return '🍜';
  if (category.includes('soup')) return '🍲';
  if (category.includes('dessert')) return '🍰';
  if (category.includes('ice')) return '🍨';
  if (category.includes('coffee')) return '☕';
  if (category.includes('tea')) return '🍵';
  if (category.includes('juice')) return '🧃';
  if (category.includes('salad')) return '🥗';
  if (category.includes('sandwich')) return '🥪';
  if (category.includes('chicken')) return '🍗';
  if (category.includes('fish')) return '🐟';
  if (category.includes('egg')) return '🍳';
  if (category.includes('bread')) return '🍞';
  return '🍽️';
};

const CounterSalePage = ({ user }) => {
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const customerNameRef = useRef(null);
  const customerPhoneRef = useRef(null);
  const receivedRef = useRef(null);
  const cashRef = useRef(null);
  const cardRef = useRef(null);
  const upiRef = useRef(null);
  const lastAddedItemIdRef = useRef(null);

  const [menuItems, setMenuItems] = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuSearch, setMenuSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedItems, setSelectedItems] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discountType, setDiscountType] = useState('amount');
  const [discountValue, setDiscountValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(() => localStorage.getItem('counterSale_lastPaymentMethod') || 'cash');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [cardAmount, setCardAmount] = useState('');
  const [upiAmount, setUpiAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [businessSettings, setBusinessSettings] = useState({});
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [pendingComplete, setPendingComplete] = useState(false);
  const [completedSaleOrder, setCompletedSaleOrder] = useState(null);
  const [showPrintReceipt, setShowPrintReceipt] = useState(false);
  const [customerFocusTarget, setCustomerFocusTarget] = useState('name');
  const [showViewItemsModal, setShowViewItemsModal] = useState(false);

  const currency = useMemo(() => getCurrencySymbol(businessSettings?.currency), [businessSettings?.currency]);
  const taxRate = businessSettings?.tax_rate ?? 5;

  const fetchData = useCallback(async ({ silent = false } = {}) => {
    // Show cached data instantly while fetching fresh data
    const cachedMenu = localStorage.getItem('counterSale_menuCache');
    const cachedSettings = localStorage.getItem('counterSale_settingsCache');
    const cacheAge = parseInt(localStorage.getItem('counterSale_cacheTime') || '0', 10);
    const cacheValid = Date.now() - cacheAge < 5 * 60 * 1000; // 5 min TTL

    if (cachedMenu && cachedSettings && cacheValid) {
      try {
        const items = JSON.parse(cachedMenu);
        const settings = JSON.parse(cachedSettings);
        setMenuItems(items);
        setBusinessSettings(settings);
        if (!silent) setMenuLoading(false); // Show cached data immediately
      } catch {
        // Ignore parse errors, fall through to fetch
      }
    }

    if (!silent) setMenuLoading(true);
    try {
      const [menuData, settingsData] = await Promise.all([
        fetchMenu(true),
        fetchBusinessSettings()
      ]);
      const items = Array.isArray(menuData) ? menuData.filter((item) => item && item.available !== false) : [];
      const settings = settingsData?.business_settings || settingsData || {};
      setMenuItems(items);
      setBusinessSettings(settings);
      // Cache for next load
      try {
        localStorage.setItem('counterSale_menuCache', JSON.stringify(items));
        localStorage.setItem('counterSale_settingsCache', JSON.stringify(settings));
        localStorage.setItem('counterSale_cacheTime', String(Date.now()));
      } catch { /* storage full — ignore */ }
    } catch (error) {
      if (!cachedMenu) {
        toast.error('Failed to load menu. Check your connection.');
      }
      // If we have cached data, silently fail — user already sees the menu
    } finally {
      setMenuLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      const response = await apiSilent({
        method: 'get',
        url: `${API}/subscription/status`,
        timeout: 8000
      });
      if (response?.data) {
        setSubscriptionStatus(response.data);
      }
    };
    fetchSubscriptionStatus();
  }, []);

  const categories = useMemo(() => {
    const unique = new Set(menuItems.map((item) => item.category).filter(Boolean));
    return ['all', ...Array.from(unique)];
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(menuSearch.toLowerCase());
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [menuItems, menuSearch, activeCategory]);

  const subtotal = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [selectedItems]
  );

  const discountAmount = useMemo(() => {
    const value = parseFloat(discountValue) || 0;
    if (value <= 0) return 0;
    if (discountType === 'percent') {
      const pct = Math.min(value, 100);
      return (subtotal * pct) / 100;
    }
    return Math.min(value, subtotal);
  }, [subtotal, discountValue, discountType]);

  const tax = useMemo(() => {
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    return (taxableAmount * taxRate) / 100;
  }, [subtotal, discountAmount, taxRate]);

  const total = useMemo(() => Math.max(0, subtotal - discountAmount + tax), [subtotal, discountAmount, tax]);
  const totalItems = useMemo(() => selectedItems.reduce((sum, item) => sum + item.quantity, 0), [selectedItems]);

  const parsedReceived = parseFloat(receivedAmount);
  const effectiveReceived = paymentMethod === 'credit'
    ? 0
    : (Number.isFinite(parsedReceived) ? parsedReceived : total);

  const cashValue = parseFloat(cashAmount) || 0;
  const cardValue = parseFloat(cardAmount) || 0;
  const upiValue = parseFloat(upiAmount) || 0;
  const splitPaid = cashValue + cardValue + upiValue;
  const splitCredit = Math.max(0, total - splitPaid);
  const changeAmount = Math.max(0, effectiveReceived - total);
  const balanceAmount = Math.max(0, total - effectiveReceived);

  const paymentOptions = useMemo(() => {
    const enabled = businessSettings?.payment_methods_enabled || {};
    const creditEnabled = businessSettings?.credit_payment_enabled !== false;
    const methods = [
      { id: 'cash', label: 'Cash', icon: Banknote, color: '#10b981' },
      { id: 'card', label: 'Card', icon: CreditCard, color: '#3b82f6' },
      { id: 'upi', label: 'UPI', icon: QrCode, color: '#7c3aed' },
      { id: 'credit', label: 'Credit', icon: Wallet, color: '#f59e0b', disabled: !creditEnabled },
      { id: 'split', label: 'Split', icon: SlidersHorizontal, color: '#0ea5e9' }
    ];

    return methods.filter((method) => {
      if (method.id === 'split') return true;
      if (method.id === 'credit' && !creditEnabled) return false;
      if (enabled[method.id] === undefined) return true;
      return enabled[method.id];
    });
  }, [businessSettings]);

  useEffect(() => {
    if (!paymentOptions.length) return;
    if (!paymentOptions.find((method) => method.id === paymentMethod)) {
      setPaymentMethod(paymentOptions[0].id);
    }
  }, [paymentOptions, paymentMethod]);

  useEffect(() => {
    localStorage.setItem('counterSale_lastPaymentMethod', paymentMethod);
  }, [paymentMethod]);

  const handleAddItem = useCallback((menuItem) => {
    setSelectedItems((prev) => {
      const id = String(menuItem.id);
      lastAddedItemIdRef.current = id;
      const existingIndex = prev.findIndex((item) => item.menu_item_id === id);
      if (existingIndex !== -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += 1;
        return updated;
      }
      return [
        ...prev,
        {
          menu_item_id: id,
          name: menuItem.name,
          price: parseFloat(menuItem.price) || 0,
          quantity: 1,
          notes: ''
        }
      ];
    });
  }, []);

  const adjustItemQuantity = useCallback((menuItemId, delta) => {
    setSelectedItems((prev) => {
      const index = prev.findIndex((item) => item.menu_item_id === menuItemId);
      if (index === -1) return prev;
      const updated = [...prev];
      const nextQty = updated[index].quantity + delta;
      if (nextQty <= 0) {
        updated.splice(index, 1);
        return updated;
      }
      updated[index].quantity = nextQty;
      return updated;
    });
  }, []);

  const resetSale = useCallback(() => {
    setSelectedItems([]);
    setCustomerName('');
    setCustomerPhone('');
    setDiscountValue('');
    setReceivedAmount('');
    setCashAmount('');
    setCardAmount('');
    setUpiAmount('');
    lastAddedItemIdRef.current = null;
  }, []);

  const adjustLastItem = useCallback((delta) => {
    const lastId = lastAddedItemIdRef.current || selectedItems[selectedItems.length - 1]?.menu_item_id;
    if (!lastId) return;
    adjustItemQuantity(lastId, delta);
  }, [adjustItemQuantity, selectedItems]);

  const openCustomerModal = useCallback((focusTarget = 'name') => {
    setCustomerFocusTarget(focusTarget);
    setCustomerModalOpen(true);
  }, []);

  useEffect(() => {
    if (!customerModalOpen) return;
    const focusField = customerFocusTarget === 'phone' ? customerPhoneRef : customerNameRef;
    requestAnimationFrame(() => focusField.current?.focus());
  }, [customerModalOpen, customerFocusTarget]);

  const completeSale = useCallback(async ({ skipCustomerCheck = false } = {}) => {
    if (selectedItems.length === 0) {
      toast.error('Add at least one item to continue');
      return;
    }

    if (processing) return;

    const billCount = subscriptionStatus?.bill_count ?? user?.bill_count ?? 0;
    const subscriptionActive = subscriptionStatus?.subscription_active ?? user?.subscription_active ?? false;
    const needsSubscription = subscriptionStatus?.needs_subscription ?? (!subscriptionActive && billCount >= 50);
    if (needsSubscription) {
      toast.error('Free plan limit reached (50 bills). Please subscribe to continue.');
      navigate('/subscription');
      return;
    }

    if (!skipCustomerCheck && paymentMethod === 'credit' && businessSettings?.credit_requires_customer_info) {
      if (!customerName.trim() || !customerPhone.trim()) {
        setPendingComplete(true);
        openCustomerModal('name');
        toast.error('Customer name and phone are required for credit sales');
        return;
      }
    }

    const orderDataForValidation = { id: 'counter-sale', total, items: selectedItems };
    const splitAmounts = paymentMethod === 'split'
      ? { cash_amount: cashValue, card_amount: cardValue, upi_amount: upiValue, credit_amount: splitCredit }
      : null;
    const paymentAmount = paymentMethod === 'split' ? total : effectiveReceived;

    const validation = validatePayment({
      orderData: orderDataForValidation,
      paymentMethod,
      paymentAmount,
      customerInfo: { name: customerName, phone: customerPhone },
      splitAmounts
    });

    if (!validation.isValid) {
      toast.error(validation.error || 'Payment validation failed');
      return;
    }

    setProcessing(true);

    // Show success immediately (instant feedback to user)
    const paymentStats = paymentMethod === 'split'
      ? { payment_received: splitPaid, balance_amount: splitCredit, is_credit: splitCredit > 0 }
      : computePaymentState(total, effectiveReceived);

    if (paymentMethod === 'credit') {
      paymentStats.payment_received = 0;
      paymentStats.balance_amount = total;
      paymentStats.is_credit = true;
    }

    // Create temporary order object for instant display (before API)
    const tempOrder = {
      id: `temp-${Date.now()}`,
      items: selectedItems,
      customer_name: customerName || 'Counter Sale',
      customer_phone: customerPhone || '',
      order_type: 'takeaway',
      subtotal: subtotal,
      tax: tax,
      tax_rate: taxRate,
      total: total,
      discount: discountAmount,
      discount_amount: discountAmount,
      discount_type: discountType,
      payment_method: paymentMethod === 'split' ? 'split' : paymentMethod,
      payment_received: paymentStats.payment_received,
      balance_amount: paymentStats.balance_amount,
      is_credit: paymentStats.is_credit
    };

    // Show receipt modal instantly (< 100ms)
    setCompletedSaleOrder(tempOrder);
    setShowPrintReceipt(true);
    toast.success(paymentStats.is_credit ? 'Partial payment recorded!' : 'Counter sale completed!');

    // Trigger instant thermal print immediately (fire and forget - non-blocking)
    setTimeout(() => {
      const shouldAutoPrint = businessSettings?.print_customization?.auto_print ?? true;
      if (shouldAutoPrint) {
        printReceipt(tempOrder, businessSettings)
          .then(() => {
            console.log('✅ Receipt printed successfully');
          })
          .catch(printError => {
            console.error('Print error:', printError);
          });
      }
    }, 0);

    // Reset sale UI instantly for next transaction (but keep processing=true to prevent double-click)
    setTimeout(() => {
      resetSale();
      setMenuSearch('');
      searchRef.current?.focus();
      // DON'T set processing=false here - wait for API to complete
    }, 300);

    // Process API calls and payments in background (non-blocking)
    try {
      let createdOrderId = null;

      // Create order with payment data in a single API call (no second PUT needed)
      const orderResponse = await apiWithRetry({
        method: 'post',
        url: `${API}/orders`,
        data: {
          table_id: 'counter',
          table_number: 0,
          items: selectedItems,
          customer_name: customerName || 'Counter Sale',
          customer_phone: customerPhone || '',
          order_type: 'takeaway',
          status: 'completed',
          frontend_origin: window.location.origin,
          quick_billing: true,
          // Payment fields — included here so no second PUT is needed
          payment_method: paymentMethod === 'split' ? 'split' : paymentMethod,
          payment_received: paymentStats.payment_received,
          balance_amount: paymentStats.balance_amount,
          is_credit: paymentStats.is_credit,
          discount: discountAmount,
          discount_type: discountType,
          discount_value: parseFloat(discountValue) || 0,
          discount_amount: discountAmount,
          tax_rate_override: taxRate,
          ...(paymentMethod === 'split' ? {
            cash_amount: cashValue,
            card_amount: cardValue,
            upi_amount: upiValue,
            credit_amount: splitCredit
          } : {})
        },
        timeout: 8000
      });

      const order = orderResponse.data;
      createdOrderId = order?.id;
      if (order?.whatsapp_mode === 'cloud' || order?.whatsapp_sent) {
        toast.success('WhatsApp message delivered');
      }

      setSubscriptionStatus((prev) => {
        if (!prev) return prev;
        const nextCount = (prev.bill_count || 0) + 1;
        const shouldRequire = !prev.subscription_active && nextCount >= 50;
        return {
          ...prev,
          bill_count: nextCount,
          needs_subscription: shouldRequire ? true : prev.needs_subscription
        };
      });

      const completionStatus = 'completed';

      // Payment was already included in the POST /orders call above — no second PUT needed.
      // Just build paymentData for the event dispatch below.
      const paymentData = {
        order_id: createdOrderId,
        status: completionStatus,
        payment_method: paymentMethod === 'split' ? 'split' : paymentMethod,
        payment_received: paymentStats.payment_received,
        balance_amount: paymentStats.balance_amount,
        is_credit: paymentStats.is_credit,
      };

      // Dispatch payment completed event
      const paymentEvent = new CustomEvent('paymentCompleted', {
        detail: {
          orderId: createdOrderId,
          orderData: {
            ...order,
            status: completionStatus,
            payment_method: paymentData.payment_method,
            payment_received: paymentStats.payment_received,
            balance_amount: paymentStats.balance_amount,
            is_credit: paymentStats.is_credit,
            total: total
          },
          removeFromActiveOrders: true
        }
      });
      window.dispatchEvent(paymentEvent);

      localStorage.setItem('paymentCompleted', JSON.stringify({
        orderId: createdOrderId,
        orderData: {
          ...order,
          status: completionStatus,
          payment_method: paymentData.payment_method,
          payment_received: paymentStats.payment_received,
          balance_amount: paymentStats.balance_amount,
          is_credit: paymentStats.is_credit,
          total: total
        },
        removeFromActiveOrders: true,
        timestamp: Date.now()
      }));

      setTimeout(() => {
        localStorage.removeItem('paymentCompleted');
      }, 5000);

      console.log('✅ Order completed in background:', createdOrderId);
      
      // Only now set processing=false after API completes successfully
      setProcessing(false);
    } catch (error) {
      console.error('Background error processing order:', error);
      
      // Set processing=false on error too
      setProcessing(false);
      
      if (error.response?.status === 402) {
        setSubscriptionStatus((prev) => (prev ? { ...prev, needs_subscription: true } : prev));
        const errorMsg = error.response?.data?.detail || 'Subscription required to continue.';
        toast.error(errorMsg);
        navigate('/subscription');
        return;
      }
      // User already saw success - order will retry via sync mechanism
    }
  }, [selectedItems, processing, paymentMethod, businessSettings, total, effectiveReceived, customerName, customerPhone, subtotal, tax, taxRate, discountAmount, discountValue, discountType, splitPaid, splitCredit, cashValue, cardValue, upiValue, user, subscriptionStatus, navigate, setProcessing, setShowPrintReceipt, setCompletedSaleOrder, resetSale, setMenuSearch, searchRef, openCustomerModal, setPendingComplete]);

  const handleCompleteSale = async () => {
    if (pendingComplete) {
      await completeSale({ skipCustomerCheck: true });
      setPendingComplete(false);
    } else {
      await completeSale();
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (event) => {
      const key = event.key.toLowerCase();
      const isCmd = event.ctrlKey || event.metaKey;
      const isAlt = event.altKey;
      const isShift = event.shiftKey;
      const isInput = ['input', 'textarea'].includes(event.target.tagName.toLowerCase()) || event.target.isContentEditable;

      // Global shortcuts (work even when typing)
      if (isCmd && key === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }

      // V key to open View Items modal
      if (key === 'v' && selectedItems.length > 0 && !isInput) {
        event.preventDefault();
        setShowViewItemsModal(true);
        return;
      }

      if (isCmd && key === 'enter') {
        event.preventDefault();
        handleCompleteSale();
        return;
      }

      if (isCmd && key === 'backspace') {
        event.preventDefault();
        resetSale();
        return;
      }

      if (isCmd && isShift && key === 'n') {
        event.preventDefault();
        resetSale();
        return;
      }

      // Payment method shortcuts (avoid when typing)
      if (!isInput && isAlt) {
        event.preventDefault();
        if (key === '1') setPaymentMethod('cash');
        if (key === '2') setPaymentMethod('card');
        if (key === '3') setPaymentMethod('upi');
        if (key === '4') setPaymentMethod('credit');
        if (key === '5') setPaymentMethod('split');
        return;
      }

      // Single-key shortcuts (avoid when typing)
      if (!isInput && !isCmd && !isAlt) {
        if (key === 'f') {
          event.preventDefault();
          searchRef.current?.focus();
          return;
        }
        if (key === 'n') {
          event.preventDefault();
          openCustomerModal('name');
          return;
        }
        if (key === 't') {
          event.preventDefault();
          openCustomerModal('phone');
          return;
        }
        if (key === 'a') {
          event.preventDefault();
          if (paymentMethod === 'split') {
            cashRef.current?.focus();
          } else {
            receivedRef.current?.focus();
          }
          return;
        }
        if (key === 'p') {
          event.preventDefault();
          handleCompleteSale();
          return;
        }
        if (key === 'c') {
          event.preventDefault();
          setPaymentMethod('cash');
          return;
        }
        if (key === 'd') {
          event.preventDefault();
          setPaymentMethod('card');
          return;
        }
        if (key === 'u') {
          event.preventDefault();
          setPaymentMethod('upi');
          return;
        }
        if (key === 'r') {
          event.preventDefault();
          setPaymentMethod('credit');
          return;
        }
        if (key === 's') {
          event.preventDefault();
          setPaymentMethod('split');
          return;
        }
        if (key === '+' || key === '=') {
          event.preventDefault();
          adjustLastItem(1);
          return;
        }
        if (key === '-' || key === '_') {
          event.preventDefault();
          adjustLastItem(-1);
          return;
        }
      }

      if (!isInput && key === '/') {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }

      if (key === 'escape' && menuSearch) {
        event.preventDefault();
        setMenuSearch('');
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [handleCompleteSale, resetSale, menuSearch, openCustomerModal, adjustLastItem, paymentMethod]);

  return (
    <Layout user={user}>
      <div className="space-y-6 h-[calc(100vh-160px)] flex flex-col overflow-hidden" data-testid="counter-sale-page">
        <TrialBanner user={user} />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Counter Sale
              </h1>
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                <Zap className="w-3 h-3" />
                Fast Billing
              </span>
            </div>
            <p className="text-gray-600 mt-1 text-xs sm:text-sm md:text-base hidden sm:block">
              Single-screen checkout built for speed and shortcuts.
            </p>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-start sm:justify-end">
            <Button variant="outline" onClick={fetchData} disabled={menuLoading} className="gap-1 sm:gap-2 h-9 sm:h-10 text-xs sm:text-sm px-2 sm:px-3">
              <RotateCcw className={`w-3.5 h-3.5 ${menuLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh Menu</span>
            </Button>
            <Button variant="outline" onClick={() => setShowShortcuts((prev) => !prev)} className="gap-1 sm:gap-2 h-9 sm:h-10 text-xs sm:text-sm px-2 sm:px-3">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Shortcuts</span>
            </Button>
            <Button variant="outline" onClick={() => navigate('/orders')} className="gap-1 sm:gap-2 h-9 sm:h-10 text-xs sm:text-sm px-2 sm:px-3">
              <ShoppingCart className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Orders</span>
            </Button>
          </div>
        </div>

        {showShortcuts && (
          <Card className="p-3 border-violet-200 bg-violet-50/60">
            <div className="flex flex-wrap gap-2 text-xs font-medium text-gray-700">
              <span className="bg-white px-2 py-1 rounded-full border">Ctrl + K or / Search</span>
              <span className="bg-white px-2 py-1 rounded-full border">F Search</span>
              <span className="bg-white px-2 py-1 rounded-full border">N Customer Name</span>
              <span className="bg-white px-2 py-1 rounded-full border">T Customer Phone</span>
              <span className="bg-white px-2 py-1 rounded-full border">A Amount Field</span>
              <span className="bg-white px-2 py-1 rounded-full border">P Complete Sale</span>
              <span className="bg-white px-2 py-1 rounded-full border">Ctrl + Enter Complete Sale</span>
              <span className="bg-white px-2 py-1 rounded-full border">Ctrl + Backspace Clear</span>
              <span className="bg-white px-2 py-1 rounded-full border">Ctrl + Shift + N New Sale</span>
              <span className="bg-white px-2 py-1 rounded-full border">C Cash</span>
              <span className="bg-white px-2 py-1 rounded-full border">D Card</span>
              <span className="bg-white px-2 py-1 rounded-full border">U UPI</span>
              <span className="bg-white px-2 py-1 rounded-full border">R Credit</span>
              <span className="bg-white px-2 py-1 rounded-full border">S Split</span>
              <span className="bg-white px-2 py-1 rounded-full border">Alt + 1 Cash</span>
              <span className="bg-white px-2 py-1 rounded-full border">Alt + 2 Card</span>
              <span className="bg-white px-2 py-1 rounded-full border">Alt + 3 UPI</span>
              <span className="bg-white px-2 py-1 rounded-full border">Alt + 4 Credit</span>
              <span className="bg-white px-2 py-1 rounded-full border">Alt + 5 Split</span>
              <span className="bg-white px-2 py-1 rounded-full border">+ / - Last Item Qty</span>
              <span className="bg-white px-2 py-1 rounded-full border font-bold bg-violet-100 text-violet-700 border-violet-300">V View Items</span>
              <span className="bg-white px-2 py-1 rounded-full border">Esc Clear Search</span>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] xl:grid-cols-[minmax(0,1fr)_360px] gap-3 sm:gap-4 flex-1 min-h-0">
          {/* Menu Section */}
          <div className="space-y-3 flex flex-col min-h-0 min-w-0">
            <Card className="p-2 sm:p-3">
              <div className="flex flex-col gap-2 sm:gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    ref={searchRef}
                    placeholder="Search..."
                    value={menuSearch}
                    onChange={(event) => setMenuSearch(event.target.value)}
                    className="pl-9 h-9 sm:h-10 text-xs sm:text-sm rounded-full border-gray-200 focus:border-violet-400 bg-gray-50 focus:bg-white"
                  />
                  {menuSearch && (
                    <button
                      onClick={() => setMenuSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center text-white hover:bg-gray-400 text-xs"
                    >
                      x
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Button variant="outline" onClick={resetSale} disabled={selectedItems.length === 0} className="h-9 sm:h-10 text-xs sm:text-sm px-2 sm:px-3">
                    <Trash2 className="w-3.5 h-3.5 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Clear</span>
                  </Button>
                </div>
              </div>
              <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 mt-2 sm:mt-3 scrollbar-hide -mx-2 sm:-mx-3 px-2 sm:px-3">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                      activeCategory === cat ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {cat === 'all' ? '🍽️ All' : cat}
                  </button>
                ))}
              </div>
            </Card>

            <Card className="p-2 sm:p-3 flex-1 min-h-0">
              {menuLoading ? (
                <div className="text-center py-12">
                  <div className="w-14 h-14 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <div className="w-7 h-7 border-2 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <p className="text-sm text-gray-600">Loading menu...</p>
                </div>
              ) : (
                <div className="h-full overflow-y-auto pr-1">
                  {filteredItems.length === 0 ? (
                    <div className="text-center py-10">
                      <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-gray-600">No items found</p>
                      <p className="text-xs text-gray-400 mt-1">Try a different search or category</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-6 gap-1.5 sm:gap-2">
                      {filteredItems.map((item) => {
                        const selectedItem = selectedItems.find((si) => si.menu_item_id === String(item.id));
                        const quantity = selectedItem?.quantity || 0;
                        const colors = ['bg-rose-50', 'bg-orange-50', 'bg-amber-50', 'bg-lime-50', 'bg-emerald-50', 'bg-cyan-50', 'bg-blue-50', 'bg-violet-50', 'bg-pink-50'];
                        const colorIndex = item.name.charCodeAt(0) % colors.length;
                        const bgColor = colors[colorIndex];

                        return (
                          <div key={item.id} className="flex flex-col items-center py-0.5 sm:py-1">
                            <div
                              onClick={() => handleAddItem(item)}
                              className={`relative w-16 sm:w-20 lg:w-24 h-16 sm:h-20 lg:h-24 rounded-full cursor-pointer select-none transition-transform duration-150 active:scale-90 touch-manipulation ${
                                quantity > 0 ? 'ring-2 ring-violet-500 ring-offset-1' : ''
                              }`}
                            >
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt={item.name}
                                  className="w-full h-full rounded-full object-cover border-3 border-white shadow-md"
                                  loading="lazy"
                                  decoding="async"
                                />
                              ) : (
                                <div className={`w-full h-full rounded-full border-2 sm:border-3 border-white shadow-md flex items-center justify-center ${bgColor}`}>
                                  <span className="text-xl sm:text-2xl lg:text-3xl">{getItemEmoji(item)}</span>
                                </div>
                              )}

                              {quantity > 0 && (
                                <div className="absolute -top-0.5 -right-0.5 w-5 h-5 sm:w-6 sm:h-6 bg-violet-600 text-white rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold shadow border-2 border-white">
                                  {quantity}
                                </div>
                              )}

                              {quantity === 0 && (
                                <div className="absolute bottom-0 right-0 w-4 h-4 sm:w-5 sm:h-5 bg-violet-600 rounded-full flex items-center justify-center shadow border border-white">
                                  <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                                </div>
                              )}
                            </div>

                            {quantity > 0 && (
                              <div className="flex items-center gap-0.5 mt-0.5 sm:mt-1 bg-white rounded-full shadow-sm border border-gray-100 px-0.5 py-0.5">
                                <button
                                  onClick={() => adjustItemQuantity(String(item.id), -1)}
                                  className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center bg-red-50 text-red-500 rounded-full text-xs sm:text-sm font-bold active:scale-95 transition-transform"
                                >
                                  −
                                </button>
                                <button
                                  onClick={() => adjustItemQuantity(String(item.id), 1)}
                                  className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center bg-violet-600 text-white rounded-full text-xs sm:text-sm font-bold active:scale-95 transition-transform"
                                >
                                  +
                                </button>
                              </div>
                            )}

                            <p className="text-xs sm:text-sm font-semibold text-gray-700 text-center mt-1 line-clamp-1 w-full leading-snug">
                              {item.name}
                            </p>
                            <p className="text-xs sm:text-sm font-bold text-violet-600">{currency}{item.price}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* Checkout Panel */}
          <div className="flex flex-col min-h-0 min-w-0 overflow-hidden">
            <div className="space-y-3 flex-1 min-h-0 overflow-y-auto pr-1">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-violet-100 rounded-lg flex items-center justify-center">
                    <Zap className="w-4 h-4 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Cart</p>
                    <p className="text-lg font-bold">{totalItems} items</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:gap-3 w-full">
                  {selectedItems.length > 0 && (
                    <Button 
                      onClick={() => setShowViewItemsModal(true)}
                      className="bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white font-bold h-9 px-4 shadow-lg hover:shadow-xl transition-all active:scale-95 flex-1 min-w-[140px]"
                      title="View and edit all items in cart"
                    >
                      <span className="text-lg mr-2">📋</span> View Items
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetSale}
                    disabled={selectedItems.length === 0}
                    className="flex-1 min-w-[110px] justify-center"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    New Sale
                  </Button>
                </div>
              </div>

              {selectedItems.length === 0 ? (
                <div className="text-center py-6 text-sm text-gray-500">
                  Tap menu items to add them here.
                </div>
              ) : (
                <div className="space-y-1.5 sm:space-y-2 max-h-48 sm:max-h-52 overflow-y-auto pr-1">
                  {selectedItems.map((item) => (
                    <div key={item.menu_item_id} className="flex items-center justify-between bg-gray-50 rounded-lg sm:rounded-xl p-1.5 sm:p-2">
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-violet-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {item.quantity}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-gray-800 truncate">{item.name}</p>
                          <p className="text-[10px] sm:text-xs text-gray-500">{currency}{item.price} each</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                        <button
                          onClick={() => adjustItemQuantity(item.menu_item_id, -1)}
                          className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center bg-red-50 text-red-500 rounded-full text-xs sm:text-sm font-bold active:scale-95"
                        >
                          <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        </button>
                        <button
                          onClick={() => adjustItemQuantity(item.menu_item_id, 1)}
                          className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center bg-violet-600 text-white rounded-full text-xs sm:text-sm font-bold active:scale-95"
                        >
                          <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </Card>

              <Card className="p-3 sm:p-4">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-semibold">{currency}{subtotal.toFixed(0)}</span>
                </div>

                <div className="mt-2 sm:mt-3 space-y-1.5 sm:space-y-2">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <select
                      value={discountType}
                      onChange={(event) => {
                        setDiscountType(event.target.value);
                        setDiscountValue('');
                      }}
                      className="h-8 px-2 text-xs border rounded-lg bg-white"
                    >
                      <option value="amount">₹</option>
                      <option value="percent">%</option>
                    </select>
                    <Input
                      type="number"
                      value={discountValue}
                      onChange={(event) => setDiscountValue(event.target.value)}
                      placeholder="Discount"
                      className="h-8 text-xs"
                    />
                    <div className="flex gap-1">
                      {[5, 10, 15].map((pct) => (
                        <button
                          key={pct}
                          onClick={() => {
                            setDiscountType('percent');
                            setDiscountValue(pct.toString());
                          }}
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            discountType === 'percent' && discountValue === pct.toString()
                              ? 'bg-emerald-500 text-white'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Tax ({taxRate}%)</span>
                    <span>{currency}{tax.toFixed(0)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Discount</span>
                    <span className="font-semibold text-rose-600">-{currency}{discountAmount.toFixed(0)}</span>
                  </div>
                  <div className="flex items-center justify-between text-base font-bold border-t pt-2">
                    <span>Total</span>
                    <span className="text-violet-600">{currency}{total.toFixed(0)}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold text-gray-700">Customer</div>
                  <Button variant="outline" size="sm" onClick={() => openCustomerModal('name')}>
                    {customerName || customerPhone ? 'Edit' : 'Add'}
                  </Button>
                </div>
                {(customerName || customerPhone) ? (
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>Name: <span className="font-medium text-gray-800">{customerName || '—'}</span></p>
                    <p>Phone: <span className="font-medium text-gray-800">{customerPhone || '—'}</span></p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Optional. Add details when needed for credit/receipts.</p>
                )}
              </Card>

              <Card className="p-3 sm:p-4">
                <div className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Payment Method</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                  {paymentOptions.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      disabled={method.disabled}
                      className={`py-2 rounded-lg flex flex-col items-center gap-0.5 sm:gap-1 border-2 transition-all text-[10px] sm:text-xs ${
                        paymentMethod === method.id
                          ? 'text-white border-transparent'
                          : 'bg-white border-gray-200 text-gray-700'
                      } ${method.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      style={paymentMethod === method.id ? { backgroundColor: method.color } : {}}
                    >
                      <method.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="text-center leading-tight">{method.label}</span>
                    </button>
                  ))}
                </div>

                {paymentMethod !== 'split' ? (
                  <div className="mt-2 sm:mt-3 space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Amount Received</span>
                      {paymentMethod === 'credit' && <span className="text-amber-600">Credit Sale</span>}
                    </div>
                    <Input
                      ref={receivedRef}
                      type="number"
                      value={paymentMethod === 'credit' ? '0' : receivedAmount}
                      onChange={(event) => setReceivedAmount(event.target.value)}
                      placeholder={total ? total.toFixed(0) : '0'}
                      className="text-xs sm:text-sm h-8 sm:h-9"
                      disabled={paymentMethod === 'credit'}
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-2">
                      <button
                        onClick={() => setReceivedAmount(total.toFixed(0))}
                        className="py-1 text-xs rounded-lg bg-gray-100 text-gray-600 active:scale-95 transition-transform"
                      >
                        Exact
                      </button>
                      <button
                        onClick={() => setReceivedAmount((total * 0.5).toFixed(0))}
                        className="py-1 text-xs rounded-lg bg-gray-100 text-gray-600 active:scale-95 transition-transform"
                      >
                        50%
                      </button>
                      <button
                        onClick={() => setReceivedAmount(Math.ceil(total).toString())}
                        className="py-1 text-xs rounded-lg bg-gray-100 text-gray-600 active:scale-95 transition-transform"
                      >
                        Round
                      </button>
                    </div>
                    {balanceAmount > 0 && paymentMethod !== 'credit' && (
                      <p className="text-xs text-amber-600">
                        Balance Due: {currency}{balanceAmount.toFixed(0)}
                      </p>
                    )}
                    {changeAmount > 0 && (
                      <p className="text-xs text-emerald-600">
                        Change: {currency}{changeAmount.toFixed(0)}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    <div className="grid grid-cols-3 gap-1 sm:gap-2 text-xs">
                      <Input
                        ref={cashRef}
                        type="number"
                        value={cashAmount}
                        onChange={(event) => setCashAmount(event.target.value)}
                        placeholder="Cash"
                        className="text-xs h-8 sm:h-9"
                      />
                      <Input
                        ref={cardRef}
                        type="number"
                        value={cardAmount}
                        onChange={(event) => setCardAmount(event.target.value)}
                        placeholder="Card"
                        className="text-xs h-8 sm:h-9"
                      />
                      <Input
                        ref={upiRef}
                        type="number"
                        value={upiAmount}
                        onChange={(event) => setUpiAmount(event.target.value)}
                        placeholder="UPI"
                        className="text-xs h-8 sm:h-9"
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>Paid: {currency}{splitPaid.toFixed(0)}</span>
                      <span>Credit: {currency}{splitCredit.toFixed(0)}</span>
                    </div>
                  </div>
                )}
              </Card>
            </div>

            <div className="pt-2 sm:pt-3">
              <Card className="p-2 sm:p-3 border-emerald-200 bg-white/95">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="hidden sm:inline">Paying by {paymentMethod.toUpperCase()}</span>
                  <span className="sm:hidden">{paymentMethod.toUpperCase()}</span>
                  <span>Total: {currency}{total.toFixed(0)}</span>
                </div>
                <Button
                  className="w-full mt-2 h-10 sm:h-11 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-sm sm:text-base"
                  onClick={handleCompleteSale}
                  disabled={processing || selectedItems.length === 0}
                >
                  {processing ? (
                    'Processing...'
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">
                        {paymentMethod === 'credit'
                          ? `Record Credit ${currency}${total.toFixed(0)}`
                          : `Complete Sale ${currency}${(paymentMethod === 'split' ? splitPaid || total : effectiveReceived || total).toFixed(0)}`}
                      </span>
                      <span className="inline sm:hidden">
                        {paymentMethod === 'credit' ? 'Record' : 'Complete'} {currency}{total.toFixed(0)}
                      </span>
                    </>
                  )}
                </Button>
                {paymentMethod === 'split' && Math.abs(splitPaid + splitCredit - total) > 0.01 && (
                  <p className="text-xs text-red-500 mt-1 sm:mt-2">
                    Split amounts must equal total to proceed.
                  </p>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={customerModalOpen} onOpenChange={setCustomerModalOpen}>
        <DialogContent className="max-w-sm sm:max-w-md w-[90vw] sm:w-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold">Customer Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Customer Name *</label>
              <Input
                ref={customerNameRef}
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Enter customer name"
                className="text-sm h-10 sm:h-11"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Phone number (to receive bill and order updates on WhatsApp).</label>
              <Input
                ref={customerPhoneRef}
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                placeholder="Enter phone number (optional)"
                className="text-sm h-10 sm:h-11"
              />
            </div>
            {paymentMethod === 'credit' && businessSettings?.credit_requires_customer_info && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm font-medium text-amber-800">
                  ⚠️ Credit sales require name and phone
                </p>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                className="flex-1 h-11 text-base font-semibold"
                onClick={() => setCustomerModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 h-11 text-base font-semibold bg-violet-600 hover:bg-violet-700"
                onClick={() => {
                  setCustomerModalOpen(false);
                  if (pendingComplete) {
                    setPendingComplete(false);
                    setTimeout(() => completeSale({ skipCustomerCheck: true }), 0);
                  }
                }}
              >
                Save & Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print Receipt Modal - Show after sale completion */}
      {showPrintReceipt && completedSaleOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-white">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 justify-center text-green-600">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  ✓
                </div>
                <div>
                  <div className="font-bold text-lg text-gray-800">Sale Completed!</div>
                  <div className="text-sm text-gray-600">{currency}{completedSaleOrder.total.toFixed(0)}</div>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span>Items:</span>
                  <span className="font-medium">{completedSaleOrder.items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Method:</span>
                  <span className="font-medium">{completedSaleOrder.payment_method.toUpperCase()}</span>
                </div>
                {completedSaleOrder.is_credit && (
                  <div className="flex justify-between text-amber-600">
                    <span>Balance Due:</span>
                    <span className="font-medium">{currency}{completedSaleOrder.balance_amount.toFixed(0)}</span>
                  </div>
                )}
              </div>

              <div className="border-t pt-4 space-y-2">
                <Button
                  className="w-full bg-violet-600 hover:bg-violet-700"
                  onClick={() => {
                    manualPrintReceipt(completedSaleOrder, businessSettings);
                    setShowPrintReceipt(false);
                  }}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print Receipt
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowPrintReceipt(false)}
                >
                  Done
                </Button>
              </div>

              <p className="text-xs text-gray-500 text-center">
                {businessSettings?.print_customization?.auto_print 
                  ? '🖨️ Receipt will print automatically if printer is connected'
                  : '💡 Click Print Receipt to print (printer must be connected)'}
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* View/Edit Items Modal - Simple */}
      <Dialog open={showViewItemsModal} onOpenChange={setShowViewItemsModal}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-[90%] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              📋 Added Items <span className="text-violet-600 text-xl">({selectedItems.length})</span>
            </DialogTitle>
            <p className="text-sm text-gray-500 mt-1">Click +/- to adjust quantities</p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-3 space-y-2">
            {selectedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <div className="text-4xl mb-2">📭</div>
                <p className="text-base font-medium">No items added yet</p>
                <p className="text-sm">Add items from the menu to get started</p>
              </div>
            ) : (
              selectedItems.map((item) => (
                <div
                  key={item.menu_item_id}
                  className="border-2 border-gray-200 rounded-xl p-4 bg-white hover:border-violet-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between gap-4">
                    {/* Item Details */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-lg text-gray-900">{item.name}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm font-medium text-gray-600">
                          {currency}{item.price}
                        </span>
                        <span className="text-xs text-gray-400">each</span>
                      </div>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2">
                      {/* Minus Button */}
                      <button
                        onClick={() => {
                          if (item.quantity > 1) {
                            adjustItemQuantity(item.menu_item_id, -1);
                          }
                        }}
                        className="w-10 h-10 flex items-center justify-center bg-red-100 hover:bg-red-200 text-red-600 font-bold text-lg rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={item.quantity <= 1}
                        title="Decrease quantity"
                      >
                        −
                      </button>

                      {/* Quantity Display */}
                      <div className="w-14 h-10 flex items-center justify-center bg-violet-100 text-violet-600 font-bold text-lg rounded-lg border-2 border-violet-200">
                        {item.quantity}
                      </div>

                      {/* Plus Button */}
                      <button
                        onClick={() => adjustItemQuantity(item.menu_item_id, 1)}
                        className="w-10 h-10 flex items-center justify-center bg-green-100 hover:bg-green-200 text-green-600 font-bold text-lg rounded-lg transition-colors"
                        title="Increase quantity"
                      >
                        +
                      </button>

                      {/* Remove Button */}
                      <button
                        onClick={() => adjustItemQuantity(item.menu_item_id, -item.quantity)}
                        className="w-10 h-10 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-600 font-bold text-lg rounded-lg transition-colors ml-1"
                        title="Remove item"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Total for this item */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      Total: <span className="font-bold text-green-600">{currency}{(item.price * item.quantity).toFixed(0)}</span>
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Summary Section */}
          {selectedItems.length > 0 && (
            <div className="border-t-2 pt-4 mt-4 space-y-3 bg-gradient-to-br from-violet-50 to-blue-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Total Items</p>
                  <p className="text-2xl font-bold text-violet-600 mt-1">{totalItems}</p>
                  <p className="text-xs text-gray-500">{selectedItems.length} SKUs</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Total Amount</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{currency}{subtotal.toFixed(0)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Close Button */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              className="flex-1 h-11 bg-violet-600 hover:bg-violet-700 text-white font-semibold"
              onClick={() => {
                setShowViewItemsModal(false);
              }}
            >
              Close & Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default CounterSalePage;
