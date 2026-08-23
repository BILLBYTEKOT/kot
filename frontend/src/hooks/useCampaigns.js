import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { useToast } from './use-toast';

export const useCampaigns = (token) => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeCampaign, setActiveCampaign] = useState(null);
  const { toast } = useToast();

  const fetchCampaigns = useCallback(async (activeOnly = false) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/super-admin/campaigns`, {
        params: { active_only: activeOnly },
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setCampaigns(response.data);
    } catch (error) {
      toast.error('Failed to fetch campaigns');
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  const fetchActiveCampaign = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/super-admin/campaigns/active`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setActiveCampaign(response.data);
    } catch (error) {
      setActiveCampaign(null);
    }
  }, [token]);

  const createCampaign = useCallback(async (campaignData) => {
    try {
      setLoading(true);
      const response = await axios.post(
        `${API}/super-admin/campaigns`,
        campaignData,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setCampaigns([response.data, ...campaigns]);
      toast.success('Campaign created successfully');
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to create campaign';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [token, campaigns, toast]);

  const updateCampaign = useCallback(async (campaignId, updates) => {
    try {
      setLoading(true);
      const response = await axios.put(
        `${API}/super-admin/campaigns/${campaignId}`,
        updates,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setCampaigns(campaigns.map(c => c.id === campaignId ? response.data : c));
      toast.success('Campaign updated successfully');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to update campaign';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [token, campaigns, toast]);

  const deactivateCampaign = useCallback(async (campaignId) => {
    return updateCampaign(campaignId, { is_active: false });
  }, [updateCampaign]);

  useEffect(() => {
    if (token) {
      fetchCampaigns();
      fetchActiveCampaign();
    }
  }, [token, fetchCampaigns, fetchActiveCampaign]);

  return {
    campaigns,
    activeCampaign,
    loading,
    fetchCampaigns,
    fetchActiveCampaign,
    createCampaign,
    updateCampaign,
    deactivateCampaign
  };
};
