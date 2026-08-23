import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { 
  BarChart3, Users, TrendingUp, Settings, LogOut, Menu, X,
  DollarSign, Target, Activity, Shield, Database, LineChart
} from 'lucide-react';
import SuperAdminLogin from '../components/super-admin/SuperAdminLogin';
import PricingManagement from '../components/super-admin/PricingManagement';
import { useSuperAdminAuth } from '../hooks/useSuperAdminAuth';
import { useSuperAdminDashboard } from '../hooks/useSuperAdminDashboard';

const SuperAdminDashboard = () => {
  const { authenticated, user, token, login, logout, loading: authLoading } = useSuperAdminAuth();
  const {
    summary: dashboardData,
    metrics,
    loading: dashboardLoading,
    refreshing,
    refreshDashboard,
  } = useSuperAdminDashboard(token);
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading authentication...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <SuperAdminLogin onLoginSuccess={login} />;
  }

  const tabs = [
    { id: 'overview', label: 'Dashboard', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'pricing', label: 'Pricing', icon: DollarSign },
    { id: 'campaigns', label: 'Campaigns', icon: Target },
    { id: 'analytics', label: 'Analytics', icon: LineChart },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const stats = [
    { label: 'Total Users', value: dashboardData?.overview?.total_users || 0, icon: Users, color: 'blue' },
    { label: 'Active Subscriptions', value: dashboardData?.overview?.active_subscriptions || 0, icon: TrendingUp, color: 'green' },
    { label: 'Orders · 30 days', value: dashboardData?.overview?.total_orders_30d || 0, icon: Activity, color: 'purple' },
    { label: 'Open Tickets', value: dashboardData?.overview?.open_tickets || 0, icon: Shield, color: 'red' }
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 text-white transition-all duration-300 flex flex-col`}>
        <div className="p-6 flex items-center justify-between">
          {sidebarOpen && <h1 className="text-xl font-bold">BillByteKOT</h1>}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-slate-800 rounded"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon size={20} />
                {sidebarOpen && <span>{tab.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2 text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{tabs.find(t => t.id === activeTab)?.label}</h2>
            <p className="text-slate-500 text-sm">Welcome back, {user?.name || 'Admin'}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              {user?.name?.charAt(0) || 'A'}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-8">
          {dashboardLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4"></div>
                <p className="text-slate-600">Loading data...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {stats.map((stat, idx) => {
                      const Icon = stat.icon;
                      const colorMap = {
                        blue: 'bg-blue-50 text-blue-600',
                        green: 'bg-green-50 text-green-600',
                        purple: 'bg-purple-50 text-purple-600',
                        red: 'bg-red-50 text-red-600'
                      };
                      return (
                        <Card key={idx}>
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-slate-600 text-sm font-medium">{stat.label}</p>
                                <p className="text-3xl font-bold text-slate-900 mt-2">{typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}</p>
                              </div>
                              <div className={`p-3 rounded-lg ${colorMap[stat.color]}`}>
                                <Icon size={24} />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Charts Placeholder */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Revenue Trend</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64 bg-slate-100 rounded-lg flex items-center justify-center">
                          <p className="text-slate-500">Chart visualization coming soon</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>User Growth</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64 bg-slate-100 rounded-lg flex items-center justify-center">
                          <p className="text-slate-500">Chart visualization coming soon</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* Pricing Tab */}
              {activeTab === 'pricing' && <PricingManagement />}

              {/* Users Tab */}
              {activeTab === 'users' && (
                <Card>
                  <CardHeader>
                    <CardTitle>User Management</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-500">User management interface coming soon</p>
                  </CardContent>
                </Card>
              )}

              {/* Campaigns Tab */}
              {activeTab === 'campaigns' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Campaign Management</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-500">Campaign management interface coming soon</p>
                  </CardContent>
                </Card>
              )}

              {/* Analytics Tab */}
              {activeTab === 'analytics' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Analytics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-500">Advanced analytics coming soon</p>
                  </CardContent>
                </Card>
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Settings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-500">System settings coming soon</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
