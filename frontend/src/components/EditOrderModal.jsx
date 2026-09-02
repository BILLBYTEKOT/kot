import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { Plus, Trash2, X, ChevronDown, Search } from 'lucide-react';
import { buildEditPaymentFields } from '../utils/orderWorkflowRules';

/**
 * EditOrderModal Component - Compact, Responsive UI/UX
 * 
 * Features:
 * - Mobile-first responsive design (mobile < 640px, tablet 640px-1024px, desktop > 1024px)
 * - Compact field layout that minimizes scrolling
 * - All order editing features: items, payment methods, discounts, tax
 * - Split payment support with real-time total calculation
 * - Optimized for touch (larger tap targets on mobile)
 * - Fast performance with optimized re-renders
 * 
 * Props:
 * - open: boolean - Modal visibility
 * - order: object - Order to edit
 * - onClose: function - Close handler
 * - onUpdate: function - Update handler
 * - menuItems: array - Available menu items
 * - businessSettings: object - Business tax settings
 */

const EditOrderModal = ({ 
  open, 
  order, 
  onClose, 
  onUpdate, 
  menuItems = [],
  businessSettings = {}
}) => {
  // State management - minimal for performance
  const [editItems, setEditItems] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // Payment state
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isCredit, setIsCredit] = useState(false);
  const [useSplitPayment, setUseSplitPayment] = useState(false);
  const [cashAmount, setCashAmount] = useState(0);
  const [cardAmount, setCardAmount] = useState(0);
  const [upiAmount, setUpiAmount] = useState(0);
  const [creditAmount, setCreditAmount] = useState(0);
  
  // Discount & Tax
  const [discountType, setDiscountType] = useState('amount'); // 'amount' or 'percent'
  const [discountValue, setDiscountValue] = useState(0);
  const [taxRate, setTaxRate] = useState(businessSettings?.tax_rate || 5);
  
  // Manual item entry
  const [manualItemName, setManualItemName] = useState('');
  const [manualItemPrice, setManualItemPrice] = useState('');
  
  // Searchable dropdown state
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);
  
  // UI state
  const [showAdvancedPayment, setShowAdvancedPayment] = useState(false);
  const [expandedSection, setExpandedSection] = useState('items'); // 'items', 'payment', 'totals'

  // Initialize state when order changes
  useEffect(() => {
    if (!open || !order) return;
    
    setEditItems(order.items || []);
    setCustomerName(order.customer_name || '');
    setCustomerPhone(order.customer_phone || '');
    setPaymentMethod(order.payment_method || 'cash');
    setIsCredit(order.is_credit || false);
    setTaxRate(order.tax_rate || businessSettings?.tax_rate || 5);
    setCashAmount(order.cash_amount || 0);
    setCardAmount(order.card_amount || 0);
    setUpiAmount(order.upi_amount || 0);
    setCreditAmount(order.credit_amount || 0);
    setDiscountValue(order.discount_value || 0);
    setDiscountType(order.discount_type || 'amount');
    setUseSplitPayment(order.payment_method === 'split');
    setShowAdvancedPayment(false);
    setExpandedSection('items');
    
    // Reset search state
    setSearchTerm('');
    setShowDropdown(false);
    setSelectedIndex(-1);
  }, [open, order, businessSettings]);

  // Filter menu items based on search term
  const filteredMenuItems = menuItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle keyboard navigation in dropdown
  const handleKeyDown = (e) => {
    if (!showDropdown || filteredMenuItems.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredMenuItems.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredMenuItems.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredMenuItems.length) {
          handleAddItem(filteredMenuItems[selectedIndex]);
          setSearchTerm('');
          setShowDropdown(false);
          setSelectedIndex(-1);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowDropdown(value.length > 0);
    setSelectedIndex(-1);
  };

  // Handle clicking outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate totals
  const subtotal = editItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = discountType === 'percent' 
    ? (subtotal * discountValue) / 100 
    : discountValue;
  const subtotalAfterDiscount = Math.max(0, subtotal - discountAmount);
  const tax = subtotalAfterDiscount * (taxRate / 100);
  const total = subtotalAfterDiscount + tax;

  // Payment calculations
  const paidAmount = cashAmount + cardAmount + upiAmount;
  const totalPayment = paidAmount + creditAmount;
  const balance = Math.max(0, total - totalPayment);
  const isPaymentValid = Math.abs(totalPayment - total) < 0.01;

  // Handlers
  const handleAddItem = (menuItem) => {
    const existing = editItems.find(item => item.menu_item_id === menuItem.id);
    if (existing) {
      setEditItems(editItems.map(item => 
        item.menu_item_id === menuItem.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
      toast.success(`${menuItem.name} quantity increased`);
    } else {
      setEditItems([...editItems, {
        menu_item_id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: 1,
        notes: ''
      }]);
      toast.success(`${menuItem.name} added to order`);
    }
  };

  const handleRemoveItem = (index) => {
    setEditItems(editItems.filter((_, i) => i !== index));
  };

  const handleQuantityChange = (index, quantity) => {
    if (quantity < 1) return;
    setEditItems(editItems.map((item, i) => 
      i === index ? { ...item, quantity } : item
    ));
  };

  const handleAddManualItem = () => {
    if (!manualItemName.trim() || manualItemPrice === '') {
      toast.error('Please enter item name and price');
      return;
    }
    const price = parseFloat(manualItemPrice);
    if (isNaN(price) || price < 0) {
      toast.error('Please enter valid price');
      return;
    }
    setEditItems([...editItems, {
      menu_item_id: `manual_${Date.now()}`,
      name: manualItemName.trim(),
      price,
      quantity: 1,
      notes: 'Manual item'
    }]);
    setManualItemName('');
    setManualItemPrice('');
  };

  const handleUpdateOrder = async () => {
    if (editItems.length === 0) {
      toast.error('Order must have at least one item');
      return;
    }

    if (isCredit && !customerName.trim()) {
      toast.error('Customer name is required for credit orders');
      return;
    }

    if (useSplitPayment && !isPaymentValid) {
      toast.error(`Payment mismatch: Total ₹${total.toFixed(0)}, Payment ₹${totalPayment.toFixed(0)}`);
      return;
    }

    const paymentFields = buildEditPaymentFields({
      orderPaymentReceived: order?.payment_received || 0,
      paymentMethod,
      useSplitPayment,
      paidAmount,
      creditAmount,
      cashAmount,
      cardAmount,
      upiAmount,
      total
    });

    const payload = {
      items: editItems,
      subtotal: subtotalAfterDiscount,
      tax,
      tax_rate: taxRate,
      total,
      customer_name: customerName,
      customer_phone: customerPhone,
      discount: discountAmount,
      discount_type: discountType,
      discount_value: discountValue,
      discount_amount: discountAmount,
      ...paymentFields
    };

    const updated = await onUpdate(payload);
    if (updated !== false) {
      onClose();
    }
  };

  const fillRemainingCash = () => {
    if (balance > 0) {
      setCashAmount(cashAmount + balance);
    }
  };

  const fillRemainingCredit = () => {
    if (balance > 0) {
      setCreditAmount(creditAmount + balance);
    }
  };

  if (!open || !order) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <Card className="w-full sm:max-w-2xl max-h-[90vh] sm:rounded-xl rounded-t-3xl rounded-b-none sm:rounded-b-xl overflow-hidden flex flex-col bg-white shadow-2xl">
        
        {/* Header - Sticky */}
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 sm:p-4 flex-shrink-0 flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <span>✏️ Edit Order #{order.id?.slice(0, 8)}</span>
          </CardTitle>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </CardHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          
          {/* Customer Section - Compact */}
          <div className="p-3 sm:p-4 border-b border-gray-200 bg-gray-50 space-y-2">
            <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Customer Details</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-gray-600">Name {isCredit && <span className="text-red-500">*</span>}</Label>
                <Input 
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer name"
                  className={`h-8 text-sm mt-1 ${isCredit && !customerName.trim() ? 'border-red-400 bg-red-50' : ''}`}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Phone</Label>
                <Input 
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="h-8 text-sm mt-1"
                />
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="border-b border-gray-200">
            {/* Section Header */}
            <button 
              onClick={() => setExpandedSection(expandedSection === 'items' ? null : 'items')}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors border-b border-gray-100"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-bold">📦 Items</span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                  {editItems.length}
                </span>
                <span className="text-xs text-gray-500">({editItems.reduce((sum, item) => sum + item.quantity, 0)} qty)</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedSection === 'items' ? 'rotate-180' : ''}`} />
            </button>

            {/* Items Content */}
            {expandedSection === 'items' && (
              <div className="p-2 sm:p-3 space-y-3">
                
                {/* Searchable Dropdown for Adding Items */}
                <div className="relative">
                  <Label className="text-xs text-gray-600 font-bold">🔍 Search & Add Items</Label>
                  <div className="relative mt-1">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                      <Input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Type to search menu items..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        onKeyDown={handleKeyDown}
                        onFocus={() => searchTerm && setShowDropdown(true)}
                        className="h-8 pl-7 pr-3 text-sm border-2 border-blue-200 focus:border-blue-400 bg-white"
                      />
                    </div>
                    
                    {/* Dropdown Results */}
                    {showDropdown && filteredMenuItems.length > 0 && (
                      <div 
                        ref={dropdownRef}
                        className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                      >
                        {filteredMenuItems.slice(0, 10).map((item, index) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              handleAddItem(item);
                              setSearchTerm('');
                              setShowDropdown(false);
                              setSelectedIndex(-1);
                            }}
                            className={`w-full px-3 py-2 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                              index === selectedIndex ? 'bg-blue-100 border-blue-200' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                                {item.category && (
                                  <p className="text-xs text-gray-500">{item.category}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 ml-2">
                                <span className="text-sm font-bold text-green-600">₹{item.price}</span>
                                {editItems.find(editItem => editItem.menu_item_id === item.id) && (
                                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                                    {editItems.find(editItem => editItem.menu_item_id === item.id)?.quantity}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                        
                        {filteredMenuItems.length > 10 && (
                          <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 border-t">
                            Showing 10 of {filteredMenuItems.length} items. Keep typing to narrow down...
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* No Results */}
                    {showDropdown && searchTerm && filteredMenuItems.length === 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                        <div className="text-center text-gray-500 text-sm">
                          <p>No items found for "{searchTerm}"</p>
                          <p className="text-xs mt-1">Try a different search term</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Add Buttons - Popular Items */}
                <div>
                  <Label className="text-xs text-gray-600 font-bold">⚡ Quick Add</Label>
                  <div className="flex gap-1 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide mt-1">
                    {menuItems.slice(0, 8).map(item => (
                      <button 
                        key={item.id}
                        onClick={() => handleAddItem(item)}
                        className="flex-shrink-0 px-2 py-1.5 bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg text-xs font-medium hover:from-green-100 hover:to-green-200 transition-colors whitespace-nowrap"
                      >
                        <div className="text-center">
                          <div className="font-bold">{item.name.split(' ')[0]}</div>
                          <div className="text-green-600">₹{item.price}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Manual Item Entry */}
                <div>
                  <Label className="text-xs text-gray-600 font-bold">➕ Add Custom Item</Label>
                  <div className="flex gap-1 text-xs mt-1">
                    <Input 
                      placeholder="Custom item name"
                      value={manualItemName}
                      onChange={(e) => setManualItemName(e.target.value)}
                      className="h-8 flex-1 text-xs"
                    />
                    <Input 
                      type="number"
                      placeholder="Price"
                      value={manualItemPrice}
                      onChange={(e) => setManualItemPrice(e.target.value)}
                      className="h-8 w-20 text-xs"
                      min="0"
                      step="0.01"
                    />
                    <button 
                      onClick={handleAddManualItem}
                      className="h-8 px-3 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center transition-colors font-bold"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Items List */}
                <div>
                  <Label className="text-xs text-gray-600 font-bold">📦 Order Items ({editItems.length})</Label>
                  <div className="space-y-1 max-h-48 overflow-y-auto mt-1 border border-gray-200 rounded-lg">
                    {editItems.length === 0 ? (
                      <div className="text-center py-6 text-gray-400 text-sm">
                        <div className="text-2xl mb-2">🛒</div>
                        <p>No items added yet</p>
                        <p className="text-xs">Search and add items above</p>
                      </div>
                    ) : (
                      editItems.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 hover:bg-gray-100 transition-colors border-b border-gray-200 last:border-b-0">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-gray-500">₹{item.price} each</span>
                              {item.notes && (
                                <span className="text-xs text-blue-600 bg-blue-50 px-1 rounded">{item.notes}</span>
                              )}
                            </div>
                          </div>
                          
                          {/* Quantity Controls */}
                          <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-300 shadow-sm">
                            <button 
                              onClick={() => handleQuantityChange(idx, item.quantity - 1)}
                              className="w-7 h-7 flex items-center justify-center text-sm font-bold text-red-500 hover:bg-red-50 rounded-l-lg transition-colors"
                            >
                              −
                            </button>
                            <span className="w-8 text-center text-sm font-bold bg-gray-50 py-1">{item.quantity}</span>
                            <button 
                              onClick={() => handleQuantityChange(idx, item.quantity + 1)}
                              className="w-7 h-7 flex items-center justify-center text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-r-lg transition-colors"
                            >
                              +
                            </button>
                          </div>
                          
                          {/* Item Total */}
                          <span className="text-sm font-bold text-gray-700 w-16 text-right">₹{(item.price * item.quantity).toFixed(0)}</span>
                          
                          {/* Remove Button */}
                          <button 
                            onClick={() => handleRemoveItem(idx)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Payment Section */}
          <div className="border-b border-gray-200">
            {/* Section Header */}
            <button 
              onClick={() => setExpandedSection(expandedSection === 'payment' ? null : 'payment')}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors border-b border-gray-100"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-bold">💳 Payment</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  useSplitPayment ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                }`}>
                  {useSplitPayment ? 'Split' : paymentMethod}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedSection === 'payment' ? 'rotate-180' : ''}`} />
            </button>

            {/* Payment Content */}
            {expandedSection === 'payment' && (
              <div className="p-2 sm:p-3 space-y-2">
                
                {/* Payment Method Toggle */}
                <div className="flex gap-1">
                  <button 
                    onClick={() => setUseSplitPayment(false)}
                    className={`flex-1 px-2 py-2 rounded-lg text-xs font-bold transition-all ${
                      useSplitPayment 
                        ? 'bg-gray-100 text-gray-600' 
                        : 'bg-green-600 text-white'
                    }`}
                  >
                    Single
                  </button>
                  <button 
                    onClick={() => setUseSplitPayment(true)}
                    className={`flex-1 px-2 py-2 rounded-lg text-xs font-bold transition-all ${
                      useSplitPayment 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    Split Payment
                  </button>
                </div>

                {!useSplitPayment ? (
                  // Single Payment Mode
                  <div className="space-y-1.5 bg-gray-50 p-2 rounded-lg">
                    <div className="grid grid-cols-2 gap-1">
                      {['💵 Cash', '💳 Card', '📱 UPI', '⚠️ Credit'].map((method, idx) => {
                        const methodKey = ['cash', 'card', 'upi', 'credit'][idx];
                        const isSelected = paymentMethod === methodKey;
                        return (
                          <button 
                            key={methodKey}
                            onClick={() => setPaymentMethod(methodKey)}
                            className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              isSelected 
                                ? methodKey === 'credit' 
                                  ? 'bg-orange-500 text-white' 
                                  : 'bg-green-600 text-white'
                                : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400'
                            }`}
                          >
                            {method}
                          </button>
                        );
                      })}
                    </div>
                    {paymentMethod === 'credit' && !customerName.trim() && (
                      <p className="text-[10px] text-red-500 font-medium">⚠️ Name required</p>
                    )}
                  </div>
                ) : (
                  // Split Payment Mode
                  <div className="space-y-1.5 bg-purple-50 p-2 rounded-lg border border-purple-200">
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { key: 'cash', label: '💵', value: cashAmount, setter: setCashAmount },
                        { key: 'card', label: '💳', value: cardAmount, setter: setCardAmount },
                        { key: 'upi', label: '📱', value: upiAmount, setter: setUpiAmount },
                        { key: 'credit', label: '⚠️', value: creditAmount, setter: setCreditAmount }
                      ].map(({ key, label, value, setter }) => (
                        <div key={key}>
                          <Label className="text-[9px] text-gray-600 block text-center font-bold">{label}</Label>
                          <Input 
                            type="number"
                            value={value || ''}
                            onChange={(e) => setter(parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            className={`h-7 text-xs text-center px-1 ${key === 'credit' ? 'border-orange-300 bg-orange-50' : ''}`}
                            min="0"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Payment Summary */}
                    <div className="grid grid-cols-2 gap-1 text-[10px] bg-white rounded p-1.5 border border-purple-200">
                      <div><span className="text-gray-600">Bill:</span> <span className="font-bold">₹{total.toFixed(0)}</span></div>
                      <div><span className="text-gray-600">Paid:</span> <span className="font-bold text-green-600">₹{paidAmount.toFixed(0)}</span></div>
                      <div><span className="text-gray-600">Credit:</span> <span className="font-bold text-orange-600">₹{creditAmount.toFixed(0)}</span></div>
                      <div>
                        <span className="text-gray-600">Due:</span> 
                        <span className={`font-bold block ${balance > 0.5 ? 'text-red-600' : 'text-green-600'}`}>
                          {balance > 0.5 ? `⚠️₹${balance.toFixed(0)}` : '✓'}
                        </span>
                      </div>
                    </div>

                    {/* Fill Buttons */}
                    <div className="flex gap-1">
                      <button 
                        onClick={fillRemainingCash}
                        disabled={balance <= 0.5}
                        className="flex-1 h-6 text-[10px] bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 font-medium"
                      >
                        Fill Cash
                      </button>
                      <button 
                        onClick={fillRemainingCredit}
                        disabled={balance <= 0.5}
                        className="flex-1 h-6 text-[10px] bg-orange-100 border border-orange-300 text-orange-700 rounded hover:bg-orange-200 disabled:opacity-50 font-medium"
                      >
                        Fill Credit
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Discount & Tax Section */}
          <div className="border-b border-gray-200">
            {/* Section Header */}
            <button 
              onClick={() => setExpandedSection(expandedSection === 'totals' ? null : 'totals')}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors border-b border-gray-100"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-bold">🧮 Discount & Tax</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedSection === 'totals' ? 'rotate-180' : ''}`} />
            </button>

            {/* Discount & Tax Content */}
            {expandedSection === 'totals' && (
              <div className="p-2 sm:p-3 space-y-2">
                
                {/* Discount */}
                <div className="flex gap-1 items-end">
                  <div className="flex-1">
                    <Label className="text-xs text-gray-600">Discount</Label>
                    <div className="flex gap-1 mt-1">
                      <select 
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value)}
                        className="w-12 h-7 px-1 text-xs border border-gray-300 rounded bg-gray-50"
                      >
                        <option value="amount">₹</option>
                        <option value="percent">%</option>
                      </select>
                      <Input 
                        type="number"
                        value={discountValue || ''}
                        onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="h-7 text-xs flex-1"
                        min="0"
                      />
                    </div>
                  </div>
                  {discountAmount > 0 && (
                    <div className="text-right pb-1">
                      <p className="text-[10px] text-gray-500">Discount</p>
                      <p className="text-xs font-bold text-green-600">-₹{discountAmount.toFixed(0)}</p>
                    </div>
                  )}
                </div>

                {/* Tax Rate */}
                <div>
                  <Label className="text-xs text-gray-600">Tax Rate</Label>
                  <select 
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="w-full h-7 px-2 text-xs border border-gray-300 rounded bg-gray-50 mt-1"
                  >
                    <option value="0">No Tax (0%)</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>

                {/* Breakdown */}
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-2 space-y-1 border border-blue-200">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-bold">₹{subtotal.toFixed(0)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-xs text-green-600">
                      <span>Discount:</span>
                      <span className="font-bold">-₹{discountAmount.toFixed(0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-gray-600 border-t pt-1">
                    <span>Tax ({taxRate}%):</span>
                    <span className="font-bold">₹{tax.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-blue-700 bg-white rounded p-1 mt-1">
                    <span>Total:</span>
                    <span>₹{total.toFixed(0)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer - Sticky */}
        <div className="border-t border-gray-200 bg-white p-3 sm:p-4 flex gap-2 flex-shrink-0">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="flex-1 h-10 text-sm font-medium"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateOrder}
            disabled={editItems.length === 0 || (isCredit && !customerName.trim()) || (useSplitPayment && !isPaymentValid)}
            className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm"
          >
            Update Order
          </Button>
        </div>

        {/* Validation Errors */}
        {(isCredit && !customerName.trim()) && (
          <div className="px-3 sm:px-4 py-2 bg-red-50 border-t border-red-200 text-xs text-red-700 font-medium">
            ⚠️ Customer name required for credit orders
          </div>
        )}
        {useSplitPayment && !isPaymentValid && (
          <div className="px-3 sm:px-4 py-2 bg-yellow-50 border-t border-yellow-200 text-xs text-yellow-700 font-medium">
            ⚠️ Payment mismatch: Total ₹{total.toFixed(0)}, Payment ₹{totalPayment.toFixed(0)}
          </div>
        )}
      </Card>
    </div>
  );
};

export default EditOrderModal;
