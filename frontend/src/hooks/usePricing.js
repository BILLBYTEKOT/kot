import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { useToast } from './useToast';

export const usePricing = (token) => {
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const { toast } = useToast();

  const fetchPricing = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/super-admin/pricing`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setPricing(response.data);
    } catch (error) {
      toast.error('Failed to fetch pricing');
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  const fetchHistory = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/super-admin/pricing/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setHistory(response.data);
    } catch (error) {
      toast.error('Failed to fetch pricing history');
    }
  }, [token, toast]);

  const updatePricing = useCallback(async (updates, reason) => {
    try {
      setLoading(true);
      const response = await axios.put(
        `${API}/super-admin/pricing`,
        { ...updates, change_reason: reason },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setPricing(response.data);
      await fetchHistory();
      toast.success('Pricing updated successfully');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to update pricing';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [token, toast, fetchHistory]);

  useEffect(() => {
    if (token) {
      fetchPricing();
      fetchHistory();
    }
  }, [token, fetchPricing, fetchHistory]);

  return {
    pricing,
    history,
    loading,
    fetchPricing,
    fetchHistory,
    updatePricing
  };
};
