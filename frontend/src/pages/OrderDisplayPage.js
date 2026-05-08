import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import axios from 'axios';
import { API } from '../App';
import { 
  Search, Filter, Calendar, Clock, User, Phone, 
  MapPin, DollarSign, ChefHat, Printer, Eye,
  CheckCircle, XCircle, AlertCircle, Package,
  TrendingUp, ArrowLeft, RefreshCw, Loader
} from 'lucide-react';
import { toast } from 'sonner';
import { manualPrintReceipt } from '../utils/printUtils';

const OrderDisplayPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('today');
  const [printingOrderId, setPrintingOrderId] = useState(null);
  const [businessSettings, setBusinessSettings] = useState({});

  useEffect(() => {
    fetchOrders();
    // Load business settings
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setBusinessSettings(user.business_settings || {});
    } catch (e) {
      console.debug('[v0] Could not load business settings');
    }
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/orders`);
      setOrders(response.data);
    } catch (error) {
      toast.error('Failed to fetch orders');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      preparing: 'bg-blue-100 text-blue-800 border-blue-300',
      ready: 'bg-green-100 text-green-800 border-green-300',
      completed: 'bg-gray-100 text-gray-800 border-gray-300',
      cancelled: 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[status] || colors.pending;
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: <Clock className="w-4 h-4" />,
      preparing: <ChefHat className="w-4 h-4" />,
      ready: <CheckCircle className="w-4 h-4" />,
      completed: <Package className="w-4 h-4" />,
      cancelled: <XCircle className="w-4 h-4" />
    };
    return icons[status] || icons.pending;
  };

  const handlePrintReceipt = async (order) => {
    if (!order || !order.id) {
      toast.error('Invalid order - cannot print');
      return;
    }

    setPrintingOrderId(order.id);
    try {
      console.log('[v0] OrderDisplayPage: Printing receipt for order', order.id);
      const result = await manualPrintReceipt(order, businessSettings);
      
      if (result?.success) {
        toast.success('Receipt sent to printer', { duration: 2000 });
      } else {
        toast.error(result?.message || 'Print failed', { duration: 3000 });
      }
    } catch (error) {
      console.error('[v0] Print error:', error);
      toast.error('Print failed - ' + (error.message || 'please try again'));
    } finally {
      setPrintingOrderId(null);
    }
  };

  const filteredOrders = orders.filter(order => {
    // Search filter
    const matchesSearch = 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.table_number?.toString().includes(searchQuery);

    // Status filter
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    // Date filter
    const orderDate = new Date(order.created_at);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let matchesDate = true;
    if (dateFilter === 'today') {
      matchesDate = orderDate >= today;
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      matchesDate = orderDate >= weekAgo;
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      matchesDate = orderDate >= monthAgo;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const stats = {
    total: filteredOrders.length,
    pending: filteredOrders.filter(o => o.status === 'pending').length,
    preparing: filteredOrders.filter(o => o.status === 'preparing').length,
    ready: filteredOrders.filter(o => o.status === 'ready').length,
    completed: filteredOrders.filter(o => o.status === 'completed').length,
    totalRevenue: filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0)
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Order Display</h1>
                <p className="text-sm text-gray-600">View and manage all orders</p>
              </div>
            </div>
            <Button onClick={fetchOrders} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Package className="w-8 h-8 opacity-80" />
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="text-3xl font-bold">{stats.total}</div>
              <div className="text-sm opacity-90">Total Orders</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 opacity-80" />
              </div>
              <div className="text-3xl font-bold">{stats.pending}</div>
              <div className="text-sm opacity-90">Pending</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-400 to-blue-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <ChefHat className="w-8 h-8 opacity-80" />
              </div>
              <div className="text-3xl font-bold">{stats.preparing}</div>
              <div className="text-sm opacity-90">Preparing</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-400 to-green-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-8 h-8 opacity-80" />
              </div>
              <div className="text-3xl font-bold">{stats.ready}</div>
              <div className="text-sm opacity-90">Ready</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-400 to-gray-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Package className="w-8 h-8 opacity-80" />
              </div>
              <div className="text-3xl font-bold">{stats.completed}</div>
              <div className="text-sm opacity-90">Completed</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-400 to-teal-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 opacity-80" />
              </div>
              <div className="text-3xl font-bold">₹{stats.totalRevenue.toFixed(0)}</div>
              <div className="text-sm opacity-90">Revenue</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search by order ID, customer, table..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 border rounded-md bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="preparing">Preparing</option>
                  <option value="ready">Ready</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Date Filter */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 border rounded-md bg-white"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders Grid */}
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-12 h-12 animate-spin mx-auto text-violet-600 mb-4" />
            <p className="text-gray-600">Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Orders Found</h3>
              <p className="text-gray-500">Try adjusting your filters or create a new order</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="hover:shadow-xl transition-shadow overflow-hidden">
                {/* Order Header */}
                <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      <span className="font-bold">#{order.id.substring(0, 8)}</span>
                    </div>
                    <Badge className={`${getStatusColor(order.status)} flex items-center gap-1`}>
                      {getStatusIcon(order.status)}
                      {order.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm opacity-90">
                    <Clock className="w-4 h-4" />
                    {new Date(order.created_at).toLocaleString()}
                  </div>
                </div>

                <CardContent className="p-4 space-y-3">
                  {/* Customer Info */}
                  {order.customer_name && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{order.customer_name}</span>
                    </div>
                  )}

                  {order.customer_phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{order.customer_phone}</span>
                    </div>
                  )}

                  {/* Table Info */}
                  {order.table_number && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">Table {order.table_number}</span>
                    </div>
                  )}

                  {/* Order Type */}
                  {order.order_type && (
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      order.order_type === 'dine_in' ? 'bg-blue-100 text-blue-800' :
                      order.order_type === 'takeaway' ? 'bg-green-100 text-green-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {order.order_type === 'dine_in' && '🍽️ Dine In'}
                      {order.order_type === 'takeaway' && '📦 Takeaway'}
                      {order.order_type === 'delivery' && '🚚 Delivery'}
                    </div>
                  )}

                  {/* Items */}
                  <div className="border-t pt-3">
                    <div className="text-sm font-semibold text-gray-700 mb-2">
                      Items ({order.items?.length || 0})
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {item.quantity}x {item.name}
                          </span>
                          <span className="font-medium text-gray-800">
                            ₹{(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Total */}
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">₹{order.subtotal?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-gray-600">
                      <span>Tax:</span>
                      <span>₹{order.tax?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-lg font-bold text-violet-600 mt-2">
                      <span>Total:</span>
                      <span>₹{order.total?.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-3 border-t">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => navigate(`/billing/${order.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={printingOrderId === order.id}
                      onClick={() => handlePrintReceipt(order)}
                      className={printingOrderId === order.id ? 'opacity-60' : ''}
                    >
                      {printingOrderId === order.id ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <Printer className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDisplayPage;
