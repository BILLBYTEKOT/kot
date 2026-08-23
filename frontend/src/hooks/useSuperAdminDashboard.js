import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { useToast } from './use-toast';

export const useSuperAdminDashboard = (token) => {
  const [summary, setSummary] = useState(null);
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const fetchDashboardSummary = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/super-admin/dashboard/summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSummary(response.data);
      setError(null);
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to fetch dashboard summary');
      toast.error('Failed to fetch dashboard summary');
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  const fetchMetrics = useCallback(async (metricType, days = 30) => {
    try {
      const response = await axios.get(`${API}/super-admin/dashboard/metrics`, {
        params: { metric_type: metricType, days },
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setMetrics(prev => ({
        ...prev,
        [metricType]: response.data
      }));
    } catch (error) {
      console.error('Failed to fetch metrics');
    }
  }, [token]);

  const fetchUserGrowth = useCallback(async () => {
    return fetchMetrics('user_growth', 90);
  }, [fetchMetrics]);

  const fetchSubscriptionAnalytics = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API}/super-admin/dashboard/subscriptions`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setMetrics(prev => ({
        ...prev,
        subscriptions: response.data
      }));
    } catch (error) {
      console.error('Failed to fetch subscription analytics');
    }
  }, [token]);

  const refreshDashboard = useCallback(async () => {
    try {
      setRefreshing(true);
      await fetchDashboardSummary();
      await fetchUserGrowth();
      await fetchSubscriptionAnalytics();
      toast.success('Dashboard updated');
    } finally {
      setRefreshing(false);
    }
  }, [fetchDashboardSummary, fetchUserGrowth, fetchSubscriptionAnalytics, toast]);

  useEffect(() => {
    if (token) {
      fetchDashboardSummary();
      fetchUserGrowth();
      fetchSubscriptionAnalytics();
    }
  }, [token, fetchDashboardSummary, fetchUserGrowth, fetchSubscriptionAnalytics]);

  return {
    summary,
    metrics,
    error,
    loading,
    refreshing,
    fetchDashboardSummary,
    fetchMetrics,
    fetchUserGrowth,
    fetchSubscriptionAnalytics,
    refreshDashboard
  };
};
