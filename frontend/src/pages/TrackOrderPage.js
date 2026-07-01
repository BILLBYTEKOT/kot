import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Clock, Phone, MessageCircle, RefreshCw, CheckCircle, ChefHat, Bell, Utensils } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const TrackOrderPage = () => {
  const { trackingToken } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 15000);
    return () => clearInterval(interval);
  }, [trackingToken]);

  const fetchOrder = async () => {
    try {
      setRefreshing(true);
      const response = await axios.get(`${BACKEND_URL}/api/public/track/${trackingToken}`);
      setOrder(response.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError('Order not found or tracking link expired');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusSteps = () => [
    { key: 'placed', icon: CheckCircle, label: 'Order Placed', desc: 'We received your order' },
    { key: 'preparing', icon: ChefHat, label: 'Preparing', desc: 'Chef is cooking your food' },
    { key: 'ready', icon: Bell, label: 'Ready', desc: 'Your order is ready!' },
    { key: 'completed', icon: Utensils, label: 'Served', desc: 'Enjoy your meal!' }
  ];

  const getCurrentStepIndex = (status) => {
    const statusMap = { placed: 0, pending: 0, preparing: 1, ready: 2, completed: 3, served: 3 };
    return statusMap[status] || 0;
  };

  const getCurrencySymbol = (currency) => {
    const symbols = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ' };
    return symbols[currency] || '₹';
  };

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const handleWhatsAppContact = () => {
    if (order?.restaurant_phone) {
      const message = encodeURIComponent(`Hi! I have a query about my order #${order.order_id}`);
      window.open(`https://wa.me/${order.restaurant_phone.replace(/\D/g, '')}?text=${message}`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardContent className="pt-6 text-center">
            <p className="text-6xl mb-4">😕</p>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Order Not Found</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchOrder} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" /> Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currency = getCurrencySymbol(order.currency);
  const steps = getStatusSteps();
  const currentStep = getCurrentStepIndex(order.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white p-6 rounded-b-3xl shadow-lg">
        <div className="max-w-lg mx-auto">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold">{order.restaurant_name}</h1>
              <p className="text-violet-200">Order #{order.order_id}</p>
            </div>
            <button 
              onClick={fetchOrder}
              disabled={refreshing}
              className="bg-white/20 p-2 rounded-xl"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {/* Current Status */}
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center">
                {(() => {
                  const StepIcon = steps[currentStep].icon;
                  return <StepIcon className="w-8 h-8 text-violet-600" />;
                })()}
              </div>
              <div>
                <p className="text-violet-200 text-sm">Current Status</p>
                <h2 className="text-2xl font-bold">{steps[currentStep].label}</h2>
                <p className="text-violet-200 text-sm">{steps[currentStep].desc}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-4 space-y-4">
        {/* Progress Steps */}
        <Card className="border-0 shadow-xl">
          <CardContent className="pt-6">
            <div className="relative">
              {steps.map((step, idx) => {
                const isCompleted = idx <= currentStep;
                const isCurrent = idx === currentStep;
                const StepIcon = step.icon;
                
                return (
                  <div key={step.key} className="flex items-start gap-4 mb-6 last:mb-0">
                    <div className="relative">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isCompleted 
                          ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white' 
                          : 'bg-gray-100 text-gray-400'
                      } ${isCurrent ? 'ring-4 ring-violet-200' : ''}`}>
                        <StepIcon className="w-5 h-5" />
                      </div>
                      {idx < steps.length - 1 && (
                        <div className={`absolute top-10 left-1/2 -translate-x-1/2 w-0.5 h-8 ${
                          idx < currentStep ? 'bg-violet-500' : 'bg-gray-200'
                        }`}></div>
                      )}
                    </div>
                    <div className="flex-1 pt-1">
                      <p className={`font-semibold ${isCompleted ? 'text-gray-800' : 'text-gray-400'}`}>
                        {step.label}
                      </p>
                      <p className="text-sm text-gray-500">{step.desc}</p>
                    </div>
                    {isCompleted && idx <= currentStep && (
                      <CheckCircle className="w-5 h-5 text-green-500 mt-2" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Order Details */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Utensils className="w-5 h-5 text-violet-600" />
              Order Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Table</span>
              <span className="font-medium">Table {order.table_number}</span>
            </div>
            {order.order_type && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Order Type</span>
                <span className="font-medium">
                  {order.order_type === 'dine_in' && '🍽️ Dine In'}
                  {order.order_type === 'takeaway' && '📦 Takeaway'}
                  {order.order_type === 'delivery' && '🚚 Delivery'}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Customer</span>
              <span className="font-medium">{order.customer_name || 'Guest'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Ordered</span>
              <span className="font-medium">{getTimeAgo(order.created_at)}</span>
            </div>
            
            <div className="border-t pt-3 mt-3">
              <p className="font-semibold mb-2">Items</p>
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-500">× {item.quantity}</p>
                  </div>
                  <p className="font-medium">{currency}{(item.price * item.quantity).toFixed(0)}</p>
                </div>
              ))}
            </div>
            
            <div className="pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{currency}{order.subtotal.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Tax</span>
                <span>{currency}{order.tax.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-violet-600 pt-2 border-t">
                <span>Total</span>
                <span>{currency}{order.total.toFixed(0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Options */}
        <Card className="border-0 shadow-xl">
          <CardContent className="py-4">
            <p className="text-sm text-gray-500 text-center mb-3">Need help with your order?</p>
            <div className="flex gap-3">
              {order.restaurant_phone && (
                <>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => window.open(`tel:${order.restaurant_phone}`, '_self')}
                  >
                    <Phone className="w-4 h-4 mr-2" /> Call
                  </Button>
                  <Button 
                    className="flex-1 bg-green-500 hover:bg-green-600"
                    onClick={handleWhatsAppContact}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Last Updated */}
        <div className="text-center text-sm text-gray-400 flex items-center justify-center gap-2">
          <Clock className="w-4 h-4" />
          Last updated: {lastUpdated.toLocaleTimeString()}
          <span className="text-xs">(Auto-refresh every 15s)</span>
        </div>
      </div>
    </div>
  );
};

export default TrackOrderPage;
