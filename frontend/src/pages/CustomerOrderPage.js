import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast, Toaster } from 'sonner';
import { ShoppingCart, Plus, Minus, X, CreditCard, Banknote, Smartphone, ChefHat, Search } from 'lucide-react';
import ValidationAlert from '../components/ValidationAlert';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const CustomerOrderPage = () => {
  const { orgId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tableNumber = searchParams.get('table');
  
  const [menu, setMenu] = useState(null);
  const [tables, setTables] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    selectedTable: tableNumber || '',
    specialInstructions: '',
    orderType: 'dine-in' // 'dine-in' or 'takeaway'
  });
  const [showCart, setShowCart] = useState(false);
  const [showCustomerInfoPopup, setShowCustomerInfoPopup] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [step, setStep] = useState(1); // 1: Menu, 2: Cart, 3: Payment
  const [validationErrors, setValidationErrors] = useState([]);

  useEffect(() => {
    fetchMenu();
    fetchTables();
  }, [orgId]);

  const fetchMenu = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/public/menu/${orgId}`);
      setMenu(response.data);
      
      // Check if KOT mode is enabled for this restaurant
      const kotEnabled = response.data.business_settings?.kot_mode_enabled !== false;
      
      // If KOT mode is disabled, set order type to takeaway by default
      if (!kotEnabled) {
        setCustomerInfo(prev => ({ ...prev, orderType: 'takeaway' }));
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  const fetchTables = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/public/tables/${orgId}`);
      setTables(response.data.tables || []);
    } catch (err) {
      console.error('Failed to fetch tables');
    }
  };

  const addToCart = (item) => {
    const existing = cart.find(c => c.menu_item_id === item.id);
    if (existing) {
      setCart(cart.map(c => 
        c.menu_item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c
      ));
    } else {
      setCart([...cart, {
        menu_item_id: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        notes: ''
      }]);
    }
    toast.success(`Added ${item.name}`);
  };

  const updateQuantity = (itemId, delta) => {
    setCart(cart.map(item => {
      if (item.menu_item_id === itemId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const updateItemNotes = (itemId, notes) => {
    setCart(cart.map(item => 
      item.menu_item_id === itemId ? { ...item, notes } : item
    ));
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item.menu_item_id !== itemId));
  };

  const getCartTotal = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const taxRate = (menu?.tax_rate || 5) / 100;
    const tax = subtotal * taxRate;
    return { subtotal, tax, total: subtotal + tax };
  };

  const validateAndShowPopup = () => {
    const errors = [];
    
    // Check cart
    if (cart.length === 0) {
      errors.push('Your cart is empty. Please add items before placing order.');
      setValidationErrors(errors);
      setTimeout(() => setValidationErrors([]), 5000);
      return;
    }
    
    // Check customer info
    if (!customerInfo.name) {
      errors.push('Customer Name is required');
    }
    if (!customerInfo.phone) {
      errors.push('Phone Number is required');
    }
    
    // Check if KOT mode is enabled
    const kotEnabled = menu?.business_settings?.kot_mode_enabled !== false;
    
    // For dine-in with KOT mode enabled, table is required
    if (kotEnabled && customerInfo.orderType === 'dine-in' && !customerInfo.selectedTable) {
      errors.push('Table selection is required for dine-in orders');
    }
    
    // If there are errors, show popup and validation alert
    if (errors.length > 0) {
      setValidationErrors(errors);
      setShowCustomerInfoPopup(true);
      setTimeout(() => setValidationErrors([]), 5000);
      return;
    }
    
    // If all info is present, proceed to place order
    handleSubmitOrder();
  };

  const handleSubmitOrder = async () => {
    // Final validation with detailed errors
    const errors = [];
    
    if (!customerInfo.name) {
      errors.push('Customer Name is required');
    }
    if (!customerInfo.phone) {
      errors.push('Phone Number is required');
    }
    
    const kotEnabled = menu?.business_settings?.kot_mode_enabled !== false;
    if (kotEnabled && customerInfo.orderType === 'dine-in' && !customerInfo.selectedTable) {
      errors.push('Table selection is required for dine-in orders');
    }
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      setShowCustomerInfoPopup(true);
      setTimeout(() => setValidationErrors([]), 5000);
      return;
    }

    let selectedTable = null;
    if (customerInfo.orderType === 'dine-in') {
      selectedTable = tables.find(t => t.table_number === parseInt(customerInfo.selectedTable));
      if (!selectedTable) {
        toast.error('Invalid table selected');
        return;
      }
    }

    setSubmitting(true);
    setShowCustomerInfoPopup(false);
    
    try {
      const orderData = {
        items: cart.map(item => ({
          ...item,
          notes: item.notes || undefined
        })),
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        special_instructions: customerInfo.specialInstructions,
        payment_method: paymentMethod,
        org_id: orgId,
        order_type: customerInfo.orderType,
        frontend_origin: window.location.origin
      };

      // Add table info only for dine-in
      if (customerInfo.orderType === 'dine-in' && selectedTable) {
        orderData.table_id = selectedTable.id;
        orderData.table_number = parseInt(customerInfo.selectedTable);
      }

      const response = await axios.post(`${BACKEND_URL}/api/public/order`, orderData);

      toast.success(`${customerInfo.orderType === 'takeaway' ? 'Takeaway' : 'Dine-in'} order placed successfully!`);
      
      if (response.data.tracking_token) {
        setTimeout(() => {
          navigate(`/track/${response.data.tracking_token}`);
        }, 1500);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  const getCurrencySymbol = () => {
    const symbols = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ' };
    return symbols[menu?.currency] || '₹';
  };

  const getFilteredMenu = () => {
    if (!menu?.categories) return {};
    let filtered = { ...menu.categories };
    
    if (selectedCategory !== 'all') {
      filtered = { [selectedCategory]: filtered[selectedCategory] || [] };
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      Object.keys(filtered).forEach(cat => {
        filtered[cat] = filtered[cat].filter(item => 
          item.name.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
        );
      });
    }
    
    return filtered;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading menu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-6xl mb-4">😕</p>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Menu Not Available</h2>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currency = getCurrencySymbol();
  const totals = getCartTotal();
  const filteredMenu = getFilteredMenu();
  const categories = Object.keys(menu?.categories || {});
  const cartItemCount = cart.reduce((sum, i) => sum + i.quantity, 0);


  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 pb-24">
      <Toaster position="top-center" richColors />
      <ValidationAlert errors={validationErrors} onClose={() => setValidationErrors([])} />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-4 sticky top-0 z-40 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{menu.restaurant_name}</h1>
              <p className="text-orange-100 text-sm">
                {tableNumber ? `Table ${tableNumber}` : 'Self Order'}
              </p>
            </div>
          </div>
          {cartItemCount > 0 && (
            <button 
              onClick={() => setShowCart(true)}
              className="relative bg-white/20 p-2 rounded-xl"
            >
              <ShoppingCart className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {cartItemCount}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Customer Info Bar */}
      <div className="bg-white border-b p-3 sticky top-16 z-30 shadow-sm">
        <div className="flex gap-2">
          <Input
            placeholder="Your Name"
            value={customerInfo.name}
            onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
            className="flex-1 h-9 text-sm"
          />
          <Input
            placeholder="Phone"
            value={customerInfo.phone}
            onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
            className="flex-1 h-9 text-sm"
          />
          {!tableNumber && (
            <select
              className="px-2 py-1 border rounded-md text-sm"
              value={customerInfo.selectedTable}
              onChange={(e) => setCustomerInfo({ ...customerInfo, selectedTable: e.target.value })}
            >
              <option value="">Table</option>
              {tables.filter(t => t.status === 'available').map(t => (
                <option key={t.id} value={t.table_number}>T{t.table_number}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Search & Categories */}
      <div className="p-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search dishes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all ${
              selectedCategory === 'all' 
                ? 'bg-orange-500 text-white' 
                : 'bg-white text-gray-600 border'
            }`}
          >
            All Items
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all ${
                selectedCategory === cat 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-white text-gray-600 border'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items */}
      <div className="px-3 pb-4">
        {Object.entries(filteredMenu).map(([category, items]) => (
          items.length > 0 && (
            <div key={category} className="mb-6">
              <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-1 h-6 bg-orange-500 rounded-full"></span>
                {category}
              </h2>
              <div className="grid gap-3">
                {items.map((item) => {
                  const cartItem = cart.find(c => c.menu_item_id === item.id);
                  return (
                    <Card key={item.id} className="border-0 shadow-md overflow-hidden">
                      <CardContent className="p-0">
                        <div className="flex">
                          {item.image_data && (
                            <img 
                              src={item.image_data} 
                              alt={item.name}
                              className="w-24 h-24 object-cover"
                            />
                          )}
                          <div className="flex-1 p-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-800">{item.name}</h3>
                                {item.description && (
                                  <p className="text-xs text-gray-500 line-clamp-2 mt-1">{item.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex justify-between items-center mt-2">
                              <span className="font-bold text-orange-600 text-lg">
                                {currency}{item.price.toFixed(0)}
                              </span>
                              {cartItem ? (
                                <div className="flex items-center gap-2 bg-orange-100 rounded-full px-2 py-1">
                                  <button
                                    onClick={() => updateQuantity(item.id, -1)}
                                    className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-sm"
                                  >
                                    <Minus className="w-4 h-4" />
                                  </button>
                                  <span className="font-bold w-6 text-center">{cartItem.quantity}</span>
                                  <button
                                    onClick={() => updateQuantity(item.id, 1)}
                                    className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => addToCart(item)}
                                  className="bg-orange-500 hover:bg-orange-600 h-8"
                                >
                                  <Plus className="w-4 h-4 mr-1" /> Add
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )
        ))}
      </div>

      {/* Cart Button */}
      {cartItemCount > 0 && !showCart && (
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur border-t shadow-lg z-50">
          <Button
            onClick={() => setShowCart(true)}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 h-14 text-lg rounded-xl"
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            View Cart ({cartItemCount}) • {currency}{totals.total.toFixed(0)}
          </Button>
        </div>
      )}


      {/* Cart & Payment Modal */}
      {showCart && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
          <div className="bg-white w-full max-h-[90vh] rounded-t-3xl overflow-hidden animate-slide-up">
            {/* Modal Header */}
            <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-orange-500 to-amber-500 text-white">
              <h2 className="text-xl font-bold">
                {step === 1 ? 'Your Order' : step === 2 ? 'Payment Method' : 'Confirm Order'}
              </h2>
              <button onClick={() => { setShowCart(false); setStep(1); }} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Step 1: Cart Items */}
            {step === 1 && (
              <>
                <div className="p-4 overflow-y-auto max-h-[50vh]">
                  {cart.map((item) => (
                    <div key={item.menu_item_id} className="py-3 border-b last:border-0">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-semibold">{item.name}</p>
                          <p className="text-sm text-gray-500">{currency}{item.price.toFixed(0)} × {item.quantity}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.menu_item_id, -1)}
                            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-bold w-6 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.menu_item_id, 1)}
                            className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.menu_item_id)}
                            className="w-8 h-8 rounded-full bg-red-100 text-red-500 flex items-center justify-center ml-2"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <Input
                        placeholder="Add note (e.g., less spicy)"
                        value={item.notes}
                        onChange={(e) => updateItemNotes(item.menu_item_id, e.target.value)}
                        className="mt-2 text-sm h-8"
                      />
                    </div>
                  ))}
                  
                  {/* Special Instructions */}
                  <div className="mt-4">
                    <Label className="text-sm font-medium">Special Instructions</Label>
                    <Input
                      placeholder="Any allergies or special requests?"
                      value={customerInfo.specialInstructions}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, specialInstructions: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="p-4 border-t bg-gray-50">
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>{currency}{totals.subtotal.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Tax ({menu?.tax_rate || 5}%)</span>
                      <span>{currency}{totals.tax.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold pt-2 border-t">
                      <span>Total</span>
                      <span className="text-orange-600">{currency}{totals.total.toFixed(0)}</span>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => setStep(2)}
                    disabled={cart.length === 0}
                    className="w-full bg-gradient-to-r from-orange-500 to-amber-500 h-12 text-lg rounded-xl"
                  >
                    Continue to Payment
                  </Button>
                </div>
              </>
            )}

            {/* Step 2: Payment Method */}
            {step === 2 && (
              <>
                <div className="p-4 overflow-y-auto max-h-[60vh]">
                  <p className="text-gray-600 mb-4">How would you like to pay?</p>
                  
                  <div className="space-y-3">
                    {[
                      { id: 'cash', icon: Banknote, label: 'Pay at Counter', desc: 'Cash or Card at billing', color: 'green' },
                      { id: 'upi', icon: Smartphone, label: 'UPI / QR Code', desc: 'GPay, PhonePe, Paytm', color: 'purple' },
                      { id: 'card', icon: CreditCard, label: 'Card Payment', desc: 'Credit/Debit Card', color: 'blue' },
                    ].map(method => (
                      <button
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id)}
                        className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${
                          paymentMethod === method.id 
                            ? `border-${method.color}-500 bg-${method.color}-50` 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-xl bg-${method.color}-100 flex items-center justify-center`}>
                          <method.icon className={`w-6 h-6 text-${method.color}-600`} />
                        </div>
                        <div className="text-left flex-1">
                          <p className="font-semibold">{method.label}</p>
                          <p className="text-sm text-gray-500">{method.desc}</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          paymentMethod === method.id ? `border-${method.color}-500 bg-${method.color}-500` : 'border-gray-300'
                        }`}>
                          {paymentMethod === method.id && <div className="w-2 h-2 bg-white rounded-full"></div>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 border-t bg-gray-50 flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-12">
                    Back
                  </Button>
                  <Button
                    onClick={validateAndShowPopup}
                    disabled={submitting}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 h-12 text-lg"
                  >
                    {submitting ? 'Placing...' : `Place Order ${currency}${totals.total.toFixed(0)}`}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Customer Info Popup */}
      {showCustomerInfoPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full max-h-[90vh] overflow-y-auto">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">Complete Your Order</h3>
                <button
                  onClick={() => setShowCustomerInfoPopup(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Order Type Selection */}
                {(() => {
                  const kotEnabled = menu?.business_settings?.kot_mode_enabled !== false;
                  
                  // If KOT mode is disabled, show only takeaway option
                  if (!kotEnabled) {
                    return (
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-3">
                          <ShoppingCart className="w-6 h-6 text-blue-600" />
                          <div>
                            <div className="font-medium text-gray-900">Takeaway Order</div>
                            <div className="text-sm text-gray-600">Counter service - No table required</div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  // If KOT mode is enabled, show both options
                  return (
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        Order Type *
                      </Label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setCustomerInfo({ ...customerInfo, orderType: 'dine-in' })}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            customerInfo.orderType === 'dine-in'
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <ChefHat className={`w-6 h-6 mx-auto mb-2 ${
                            customerInfo.orderType === 'dine-in' ? 'text-orange-600' : 'text-gray-400'
                          }`} />
                          <div className="text-sm font-medium">Dine In</div>
                        </button>
                        <button
                          onClick={() => setCustomerInfo({ ...customerInfo, orderType: 'takeaway' })}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            customerInfo.orderType === 'takeaway'
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <ShoppingCart className={`w-6 h-6 mx-auto mb-2 ${
                            customerInfo.orderType === 'takeaway' ? 'text-orange-600' : 'text-gray-400'
                          }`} />
                          <div className="text-sm font-medium">Takeaway</div>
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Name Input */}
                <div>
                  <Label htmlFor="popup-name" className="text-sm font-medium text-gray-700">
                    Your Name *
                  </Label>
                  <Input
                    id="popup-name"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                    placeholder="Enter your name"
                    className="mt-1"
                  />
                </div>

                {/* Phone Input */}
                <div>
                  <Label htmlFor="popup-phone" className="text-sm font-medium text-gray-700">
                    Phone Number *
                  </Label>
                  <Input
                    id="popup-phone"
                    type="tel"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                    placeholder="Enter your phone number"
                    className="mt-1"
                  />
                </div>

                {/* Table Selection (only for dine-in with KOT mode) */}
                {(() => {
                  const kotEnabled = menu?.business_settings?.kot_mode_enabled !== false;
                  
                  if (kotEnabled && customerInfo.orderType === 'dine-in') {
                    return (
                      <div>
                        <Label htmlFor="popup-table" className="text-sm font-medium text-gray-700">
                          Select Table *
                        </Label>
                        <select
                          id="popup-table"
                          value={customerInfo.selectedTable}
                          onChange={(e) => setCustomerInfo({ ...customerInfo, selectedTable: e.target.value })}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="">Choose a table</option>
                          {tables.map(table => (
                            <option key={table.id} value={table.table_number}>
                              Table {table.table_number} ({table.capacity} seats)
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Special Instructions */}
                <div>
                  <Label htmlFor="popup-instructions" className="text-sm font-medium text-gray-700">
                    Special Instructions (Optional)
                  </Label>
                  <textarea
                    id="popup-instructions"
                    value={customerInfo.specialInstructions}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, specialInstructions: e.target.value })}
                    placeholder="Any special requests?"
                    rows={3}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handleSubmitOrder}
                  disabled={
                    submitting ||
                    !customerInfo.name ||
                    !customerInfo.phone ||
                    (customerInfo.orderType === 'dine-in' && !customerInfo.selectedTable)
                  }
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 h-12 text-lg"
                >
                  {submitting ? 'Placing Order...' : 'Confirm & Place Order'}
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  * Required fields
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CustomerOrderPage;
