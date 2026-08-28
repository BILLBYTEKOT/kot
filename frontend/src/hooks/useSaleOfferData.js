/**
 * Custom hook for centralized sale offer data fetching
 * 
 * This hook centralizes the fetching of sale offer and pricing data,
 * ensuring all banner components receive the same data object.
 * 
 * Requirements: 8.1, 8.2 - Banner Data Consistency
 */

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API } from '../App';
import { detectMarket } from '../utils/marketPricing';

/**
 * useSaleOfferData - Centralized hook for promotional data
 * 
 * Returns:
 * - saleOffer: The active sale offer data (or null if none)
 * - pricing: The pricing configuration
 * - campaign: Active campaign data (if any)
 * - activePromotion: The prioritized promotion (sale offer takes priority over campaign)
 * - loading: Whether data is still being fetched
 * - error: Any error that occurred during fetching
 * - refetch: Function to manually refetch data
 */
const useSaleOfferData = (marketCountry) => {
  const [saleOffer, setSaleOffer] = useState(null);
  const [pricing, setPricing] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPromotionalData = useCallback(async () => {
    setLoading(true);
    const market = detectMarket();
    setError(null);

    try {
      // Fetch all promotional data in parallel
      const [saleRes, pricingRes, campaignRes] = await Promise.allSettled([
        axios.get(`${API}/public/sale-offer`),
        axios.get(`${API}/public/pricing`, { params: { country: market } }),
        axios.get(`${API}/public/active-campaigns`)
      ]);

      // Process sale offer response
      if (saleRes.status === 'fulfilled' && saleRes.value.data?.enabled) {
        setSaleOffer(saleRes.value.data);
      } else {
        setSaleOffer(null);
      }

      // Process pricing response
      if (pricingRes.status === 'fulfilled') {
        setPricing(pricingRes.value.data);
      } else {
        // Use default pricing if API fails
        setPricing({
          regular_price: 1999,
          regular_price_display: '₹1999',
          campaign_price: 1799,
          campaign_price_display: '₹1799',
          campaign_active: false,
          campaign_discount_percent: 10,
          trial_days: 7
        });
      }

      // Process campaign response
      if (campaignRes.status === 'fulfilled' && campaignRes.value.data?.active) {
        setCampaign(campaignRes.value.data);
      } else {
        setCampaign(null);
      }

    } catch (err) {
      console.error('Failed to fetch promotional data:', err);
      setError(err);
      // Set defaults on error
      setSaleOffer(null);
      setPricing({
        regular_price: 1999,
        regular_price_display: '₹1999',
        campaign_price: 1799,
        campaign_price_display: '₹1799',
        campaign_active: false,
        campaign_discount_percent: 10,
        trial_days: 7
      });
      setCampaign(null);
    } finally {
      setLoading(false);
    }
  }, [marketCountry]);

  useEffect(() => {
    fetchPromotionalData();
  }, [fetchPromotionalData]);

  /**
   * Determine the active promotion based on priority logic
   * Priority: Sale Offer > Campaign > None
   * 
   * Requirements: 8.5, 8.6 - Promotional Priority
   */
  const getActivePromotion = useCallback(() => {
    // Sale offer takes priority when both exist
    if (saleOffer && saleOffer.enabled) {
      return {
        type: 'sale_offer',
        data: saleOffer,
        discount_percent: saleOffer.discount_percent,
        original_price: saleOffer.original_price,
        sale_price: saleOffer.sale_price,
        end_date: saleOffer.valid_until || saleOffer.end_date,
        title: saleOffer.title,
        subtitle: saleOffer.subtitle,
        theme: saleOffer.theme || 'default',
        badge_text: saleOffer.badge_text,
        cta_text: saleOffer.cta_text
      };
    }

    // Fall back to campaign if no sale offer
    if (campaign && campaign.active) {
      return {
        type: 'campaign',
        data: campaign,
        discount_percent: campaign.discount_percent || pricing?.campaign_discount_percent,
        original_price: pricing?.regular_price,
        sale_price: campaign.campaign_price || pricing?.campaign_price,
        end_date: campaign.end_date,
        title: campaign.name || campaign.title,
        subtitle: campaign.description || campaign.subtitle,
        theme: campaign.theme || 'default',
        badge_text: campaign.badge_text || 'SPECIAL OFFER',
        cta_text: campaign.cta_text || 'Get Deal'
      };
    }

    // Fall back to pricing campaign if active
    if (pricing?.campaign_active) {
      return {
        type: 'pricing_campaign',
        data: pricing,
        discount_percent: pricing.campaign_discount_percent,
        original_price: pricing.regular_price,
        sale_price: pricing.campaign_price,
        end_date: pricing.campaign_end_date,
        title: pricing.campaign_name || 'Special Offer',
        subtitle: `${pricing.campaign_discount_percent}% OFF`,
        theme: 'default',
        badge_text: 'SPECIAL OFFER',
        cta_text: 'Get Deal'
      };
    }

    return null;
  }, [saleOffer, campaign, pricing]);

  const activePromotion = getActivePromotion();

  /**
   * Check if any promotion is currently active
   */
  const hasActivePromotion = Boolean(activePromotion);

  /**
   * Get consistent end date for countdown timers
   * All banners should use the same end_date
   */
  const getPromotionEndDate = useCallback(() => {
    if (!activePromotion) return null;
    return activePromotion.end_date;
  }, [activePromotion]);

  return {
    // Raw data
    saleOffer,
    pricing,
    campaign,
    
    // Computed values
    activePromotion,
    hasActivePromotion,
    promotionEndDate: getPromotionEndDate(),
    
    // State
    loading,
    error,
    
    // Actions
    refetch: fetchPromotionalData
  };
};

export default useSaleOfferData;
