import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { fetchBusinessSettings as fetchBusinessSettingsShared } from '../utils/sharedDataCache';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { 
  DollarSign, ShoppingCart, TrendingUp, MessageSquare, Sparkles, 
  Clock, Users, ChefHat, ArrowUpRight, ArrowDownRight, Utensils,
  Calendar, Zap, Target, Award, RefreshCw, Bell
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import TrialBanner from '../components/TrialBanner';

const Dashboard = ({ user }) => {
  const navigate = useNavigate();

  // TEMPORARY: Use direct API calls instead of offline hooks to debug dashboard issue
  const [dashboardStats, setDashboardStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [todaysBills, setTodaysBills] = useState([]);
  const [businessSettingsData, setBusinessSettingsData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Direct API calls for debugging
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No token found in localStorage');
          setLoading(false);
          return;
        }

        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        console.log('🔍 Dashboard: Fetching data directly from API...');
        
        // Fetch all data in parallel
        const [dashboardRes, ordersRes, billsRes] = await Promise.all([
          fetch(`${API}/dashboard`, { headers }),
          fetch(`${API}/orders`, { headers }),
          fetch(`${API}/orders/today-bills`, { headers })
        ]);

        if (dashboardRes.ok) {
          const data = await dashboardRes.json();
          setDashboardStats(data);
          console.log('✅ Dashboard: Dashboard data loaded:', data);
        }

        if (ordersRes.ok) {
          const data = await ordersRes.json();
          setOrders(data);
          console.log('✅ Dashboard: Orders data loaded:', data.length, 'orders');
        }

        if (billsRes.ok) {
          const data = await billsRes.json();
          setTodaysBills(data);
          console.log('✅ Dashboard: Today\'s bills loaded:', data.length, 'bills');
        }

        // Use shared cache for business settings
        try {
          const settingsData = await fetchBusinessSettingsShared();
          setBusinessSettingsData({ business_settings: settingsData?.business_settings || settingsData });
          console.log('✅ Dashboard: Business settings loaded');
        } catch (e) {
          console.error('Dashboard: Failed to load business settings', e);
        }

      } catch (error) {
        console.error('❌ Dashboard: Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    // Set up polling for real-time updates - increased to 30 seconds to prevent multiple refreshes
    const interval = setInterval(fetchDashboardData, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const [recentOrders, setRecentOrders] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [chatMessage, setChatMessage] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Derived state from hooks
  const restaurantName = businessSettingsData?.business_settings?.restaurant_name || user?.username || '';
  const isOffline = !navigator.onLine;

  // Calculate stats from dashboard data, orders, and today's bills
  const stats = React.useMemo(() => {
    const activeOrders = orders ? orders.filter(o => ['pending', 'preparing', 'ready'].includes(o.status)) : [];
    const completedOrders = todaysBills ? todaysBills.filter(o => o.status === 'completed') : [];
    
    // Use dashboard stats if available (already includes all today's orders), otherwise count from bills
    const todayOrdersCount = dashboardStats?.todaysOrders || completedOrders.length;
    
    // Use dashboard stats if available (already includes all today's revenue), otherwise sum from bills
    const todaySalesAmount = dashboardStats?.todaysRevenue || 
      completedOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    
    const avgValue = todayOrdersCount > 0 ? todaySalesAmount / todayOrdersCount : 0;
    
    return {
      todayOrders: todayOrdersCount,
      todaySales: todaySalesAmount,
      activeOrders: activeOrders.length,
      avgOrderValue: avgValue,
      pendingOrders: activeOrders.filter(o => o.status === 'pending').length,
      preparingOrders: activeOrders.filter(o => o.status === 'preparing').length,
      readyOrders: activeOrders.filter(o => o.status === 'ready').length
    };
  }, [dashboardStats, orders, todaysBills]);

  useEffect(() => {
    fetchRecommendations();

    // Process recent orders from both active orders and today's bills
    const allOrders = [
      ...(orders || []),
      ...(todaysBills || [])
    ];

    if (allOrders.length > 0) {
      const recent = allOrders
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);
      setRecentOrders(recent);
    }

    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    
    return () => {
      clearInterval(clockInterval);
    };
  }, [orders, todaysBills]);

  const fetchTopItems = async () => {
    try {
      const response = await axios.get(`${API}/reports/top-items`);
      setTopItems(response.data.slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch top items', error);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const response = await axios.post(`${API}/ai/recommendations`);
      setRecommendations(response.data.recommendations);
    } catch (error) {
      console.error('Failed to fetch recommendations', error);
    }
  };

  const handleChat = async () => {
    if (!chatMessage.trim()) return;
    setLoading(true);
    try {
      const response = await axios.post(`${API}/ai/chat`, { message: chatMessage });
      setChatResponse(response.data.response);
      setChatMessage('');
    } catch (error) {
      toast.error('Failed to get AI response');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);

    try {
      // Force refresh all data
      await Promise.all([
        // refreshStats(), // Removed - function no longer exists
        fetchTopItems(),
        // offlineDataManager.preloadCriticalData() // Removed - using direct API calls now
      ]);

      toast.success('Dashboard refreshed!');
    } catch (error) {
      console.error('Refresh failed:', error);
      toast.error('Refresh failed - showing cached data');
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return '☀️ Good Morning';
    if (hour < 17) return '🌤️ Good Afternoon';
    return '🌙 Good Evening';
  };

  const formatCurrency = (value) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-amber-100 text-amber-700',
      preparing: 'bg-blue-100 text-blue-700',
      ready: 'bg-green-100 text-green-700',
      completed: 'bg-gray-100 text-gray-700'
    };
    return colors[status] || colors.completed;
  };


  return (
    <Layout user={user}>
      <div className="dashboard-shell" data-testid="dashboard-page">
        {/* Trial Banner */}
        <TrialBanner user={user} />

        {/* Header Section */}
        <div className="dashboard-hero flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <p className="text-gray-500 text-sm font-medium">{getGreeting()}</p>
              {/* <OfflineIndicator /> */}
              {/* <SyncStatusBadge /> */}
            </div>
            <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {restaurantName || user?.username}
            </h1>
            <p className="text-gray-500 mt-1 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {currentTime.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              <span className="text-violet-600 font-mono font-bold">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {/* <DataFreshnessIndicator lastUpdated={statsLastUpdated} /> */}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="self-start sm:self-auto"
            data-testid="dashboard-refresh-btn"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Main Stats Cards */}
        <div className="dashboard-stats grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Today's Sales */}
          <Card className="dashboard-stat-card border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-green-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-xs font-medium uppercase tracking-wide">Today's Sales</p>
                  <p className="text-3xl sm:text-4xl font-black mt-2">{formatCurrency(stats.todaySales)}</p>
                  <p className="text-emerald-200 text-xs mt-1 flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" /> vs yesterday
                  </p>
                </div>
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                  <DollarSign className="w-7 h-7" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Today's Orders */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-cyan-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-xs font-medium uppercase tracking-wide">Today's Orders</p>
                  <p className="text-3xl sm:text-4xl font-black mt-2">{stats.todayOrders}</p>
                  <p className="text-blue-200 text-xs mt-1">orders completed</p>
                </div>
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                  <ShoppingCart className="w-7 h-7" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Orders */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-amber-500 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-xs font-medium uppercase tracking-wide">Active Orders</p>
                  <p className="text-3xl sm:text-4xl font-black mt-2">{stats.activeOrders}</p>
                  <div className="flex gap-2 mt-1">
                    <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">{stats.pendingOrders} pending</span>
                    <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">{stats.preparingOrders} cooking</span>
                  </div>
                </div>
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                  <ChefHat className="w-7 h-7" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Avg Order Value */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-violet-100 text-xs font-medium uppercase tracking-wide">Avg Order Value</p>
                  <p className="text-3xl sm:text-4xl font-black mt-2">{formatCurrency(stats.avgOrderValue)}</p>
                  <p className="text-violet-200 text-xs mt-1">per order</p>
                </div>
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Target className="w-7 h-7" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Button 
            onClick={() => navigate('/orders')} 
            className="h-auto py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 flex flex-col items-center gap-2"
          >
            <ShoppingCart className="w-6 h-6" />
            <span className="text-sm font-semibold">New Order</span>
          </Button>
          <Button 
            onClick={() => navigate('/kitchen')} 
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2 border-2 hover:bg-orange-50 hover:border-orange-300"
          >
            <ChefHat className="w-6 h-6 text-orange-600" />
            <span className="text-sm font-semibold">Kitchen</span>
            {stats.pendingOrders > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {stats.pendingOrders}
              </span>
            )}
          </Button>
          <Button 
            onClick={() => navigate('/menu')} 
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2 border-2 hover:bg-blue-50 hover:border-blue-300"
          >
            <Utensils className="w-6 h-6 text-blue-600" />
            <span className="text-sm font-semibold">Menu</span>
          </Button>
          <Button 
            onClick={() => navigate('/reports')} 
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2 border-2 hover:bg-green-50 hover:border-green-300"
          >
            <TrendingUp className="w-6 h-6 text-green-600" />
            <span className="text-sm font-semibold">Reports</span>
          </Button>
        </div>

        {/* Middle Section - Recent Orders & Top Items */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <Card className="dashboard-panel border-0 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="w-5 h-5 text-violet-600" />
                  Recent Orders
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/orders')} className="text-violet-600 text-xs">
                  View All →
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentOrders.length > 0 ? recentOrders.map((order, idx) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => navigate(`/billing/${order.id}`)}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                      <span className="text-violet-600 font-bold text-sm">#{idx + 1}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{order.table_number ? `Table ${order.table_number}` : 'Counter'}</p>
                      <p className="text-gray-500 text-xs">{order.items?.length || 0} items • {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-violet-600">{formatCurrency(order.total || 0)}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-gray-400">
                  <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No recent orders</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Selling Items */}
          <Card className="dashboard-panel border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Award className="w-5 h-5 text-amber-500" />
                Top Selling Items
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {topItems.length > 0 ? topItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white ${idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-amber-700' : 'bg-gray-300'}`}>
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{item.name}</p>
                      <p className="text-gray-500 text-xs">{item.quantity} sold</p>
                    </div>
                  </div>
                  <p className="font-bold text-green-600">{formatCurrency(item.revenue || 0)}</p>
                </div>
              )) : (
                <div className="text-center py-8 text-gray-400">
                  <Utensils className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No sales data yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* AI Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-0 shadow-lg" data-testid="ai-chat-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="w-5 h-5 text-violet-600" />
                AI Assistant
                <span className="text-[10px] bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full font-medium">BETA</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Ask about menu, orders, sales..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleChat()}
                  className="h-11"
                  data-testid="chat-input"
                />
                <Button onClick={handleChat} disabled={loading} className="h-11 px-6 bg-gradient-to-r from-violet-600 to-purple-600" data-testid="chat-send-button">
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                </Button>
              </div>
              {chatResponse && (
                <div className="p-4 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-200" data-testid="chat-response">
                  <p className="text-sm text-gray-700 whitespace-pre-line">{chatResponse}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {['Today\'s sales?', 'Top items?', 'Busy hours?'].map(q => (
                  <button key={q} onClick={() => { setChatMessage(q); }} className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-violet-100 rounded-full text-gray-600 hover:text-violet-600 transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg" data-testid="recommendations-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="w-5 h-5 text-amber-500" />
                AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recommendations ? (
                <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                  <p className="text-sm text-gray-700 whitespace-pre-line">{recommendations}</p>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-gray-400">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                  Loading insights...
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
