import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { invalidateShared } from '../utils/sharedDataCache';
import Layout from '../components/Layout';
import TrialBanner from '../components/TrialBanner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Settings as SettingsIcon, CreditCard, Shield, Info, Printer, Building2, MessageCircle, Megaphone, Plus, Trash2, Calendar, Eye, EyeOff, Sparkles, Upload, Image, X } from 'lucide-react';
import PrintCustomization from '../components/PrintCustomization';
import BluetoothPrinterSettings from '../components/BluetoothPrinterSettings';
import WhatsAppDesktop from '../components/WhatsAppDesktop';
import ValidationAlert from '../components/ValidationAlert';

const SettingsPage = ({ user }) => {
  const [activeTab, setActiveTab] = useState('business');
  
  // Helper function to generate slug from restaurant name
  const generateSlugFromName = (name) => {
    if (!name) return '';
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '') // Remove spaces
      .substring(0, 20); // Limit length
  };
  
  // Helper function to get menu URL (cool URL if slug exists, otherwise fallback)
  const getMenuUrl = () => {
    if (businessSettings.restaurant_slug) {
      return `${window.location.origin}/r/${businessSettings.restaurant_slug}/menu`;
    }
    return `${window.location.origin}/menu/${user?.organization_id || user?.id}`;
  };
  
  const [razorpaySettings, setRazorpaySettings] = useState({
    razorpay_key_id: '',
    razorpay_key_secret: ''
  });
  const [businessSettings, setBusinessSettings] = useState({
    restaurant_name: '',
    restaurant_slug: '', // Cool URL slug
    address: '',
    phone: '',
    email: '',
    gstin: '',
    fssai: '',
    currency: 'INR',
    tax_rate: 5.0,
    receipt_theme: 'classic',
    logo_url: '',
    website: '',
    tagline: '',
    footer_message: 'Thank you for dining with us!',
    kot_mode_enabled: true, // KOT mode for restaurants with tables
    business_type: 'restaurant' // restaurant, stall, food-truck, takeaway-only
  });
  const [whatsappSettings, setWhatsappSettings] = useState({
    whatsapp_enabled: false,
    whatsapp_business_number: '',
    whatsapp_message_template: 'Thank you for dining at {restaurant_name}! Your bill of {currency}{total} has been paid. Order #{order_id}',
    whatsapp_auto_notify: false,
    whatsapp_notify_on_placed: true,
    whatsapp_notify_on_preparing: true,
    whatsapp_notify_on_ready: true,
    whatsapp_notify_on_completed: true,
    customer_self_order_enabled: false,
    menu_display_enabled: false
  });
  const [themes, setThemes] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true); // Changed to true for initial load
  const [businessLoading, setBusinessLoading] = useState(false);
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [razorpayConfigured, setRazorpayConfigured] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [logoUploading, setLogoUploading] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  
  // Campaign Management State
  const [campaigns, setCampaigns] = useState([]);
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [campaignForm, setCampaignForm] = useState({
    title: '',
    description: '',
    discount_type: 'percentage', // percentage or fixed
    discount_value: 10,
    min_order_amount: 0,
    max_discount: 0,
    coupon_code: '',
    start_date: '',
    end_date: '',
    is_active: true,
    banner_text: '',
    banner_color: 'violet',
    show_on_landing: true,
    usage_limit: 0, // 0 = unlimited
    used_count: 0
  });

  useEffect(() => {
    // Load all settings data in parallel for better performance
    loadAllSettingsData();
  }, []);

  const loadAllSettingsData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      // Use the new combined settings endpoint for faster loading
      const response = await axios.get(`${API}/settings/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = response.data;
      
      // Process Business settings
      if (data.business_settings) {
        setBusinessSettings(prevSettings => ({
          ...prevSettings,
          ...data.business_settings
        }));
      }
      
      // Process Razorpay settings
      if (data.razorpay) {
        if (data.razorpay.razorpay_key_id) {
          setRazorpaySettings({
            razorpay_key_id: data.razorpay.razorpay_key_id,
            razorpay_key_secret: '••••••••••••••••'
          });
        }
        setRazorpayConfigured(data.razorpay.razorpay_configured);
      }
      
      // Process WhatsApp settings
      if (data.whatsapp) {
        setWhatsappSettings(data.whatsapp);
      }
      
      // Process Campaigns
      if (data.campaigns) {
        setCampaigns(data.campaigns);
      }
      
      // Process Themes
      if (data.themes) {
        setThemes(data.themes);
      }
      
      // Process Currencies
      if (data.currencies) {
        setCurrencies(data.currencies);
      }
      
      setInitialDataLoaded(true);
      
    } catch (error) {
      console.error('Failed to load settings data:', error);
      
      // Fallback to individual API calls if combined endpoint fails
      console.log('Falling back to individual API calls...');
      await loadSettingsDataFallback();
    } finally {
      setLoading(false);
    }
  };

  // Fallback method using individual API calls
  const loadSettingsDataFallback = async () => {
    const token = localStorage.getItem('token');
    
    try {
      // Execute all API calls in parallel for faster loading
      const [
        razorpayResponse,
        businessResponse,
        themesResponse,
        currenciesResponse,
        whatsappResponse,
        campaignsResponse
      ] = await Promise.allSettled([
        axios.get(`${API}/settings/razorpay`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => ({ error: err })),
        
        axios.get(`${API}/business/settings`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => ({ error: err })),
        
        axios.get(`${API}/receipt-themes`).catch(err => ({ error: err })),
        
        axios.get(`${API}/currencies`).catch(err => ({ error: err })),
        
        axios.get(`${API}/whatsapp/settings`).catch(err => ({ error: err })),
        
        axios.get(`${API}/campaigns`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => ({ error: err }))
      ]);

      // Process responses (same logic as before)
      if (razorpayResponse.status === 'fulfilled' && razorpayResponse.value?.data) {
        const data = razorpayResponse.value.data;
        if (data.razorpay_key_id) {
          setRazorpaySettings({
            razorpay_key_id: data.razorpay_key_id,
            razorpay_key_secret: '••••••••••••••••'
          });
        }
        setRazorpayConfigured(data.razorpay_configured);
      }

      if (businessResponse.status === 'fulfilled' && businessResponse.value?.data?.business_settings) {
        setBusinessSettings(prevSettings => ({
          ...prevSettings,
          ...businessResponse.value.data.business_settings
        }));
      }

      if (themesResponse.status === 'fulfilled' && themesResponse.value?.data) {
        setThemes(themesResponse.value.data);
      }

      if (currenciesResponse.status === 'fulfilled' && currenciesResponse.value?.data) {
        setCurrencies(currenciesResponse.value.data);
      }

      if (whatsappResponse.status === 'fulfilled' && whatsappResponse.value?.data) {
        const data = whatsappResponse.value.data;
        setWhatsappSettings({
          whatsapp_enabled: data.whatsapp_enabled || false,
          whatsapp_business_number: data.whatsapp_business_number || '',
          whatsapp_message_template: data.whatsapp_message_template || 'Thank you for dining at {restaurant_name}! Your bill of {currency}{total} has been paid. Order #{order_id}',
          whatsapp_auto_notify: data.whatsapp_auto_notify || false,
          whatsapp_notify_on_placed: data.whatsapp_notify_on_placed !== false,
          whatsapp_notify_on_preparing: data.whatsapp_notify_on_preparing !== false,
          whatsapp_notify_on_ready: data.whatsapp_notify_on_ready !== false,
          whatsapp_notify_on_completed: data.whatsapp_notify_on_completed !== false,
          customer_self_order_enabled: data.customer_self_order_enabled || false,
          menu_display_enabled: data.menu_display_enabled || false
        });
      }

      if (campaignsResponse.status === 'fulfilled' && campaignsResponse.value?.data) {
        setCampaigns(campaignsResponse.value.data || []);
      }

      setInitialDataLoaded(true);
      
    } catch (error) {
      console.error('Fallback loading also failed:', error);
      toast.error('Failed to load settings. Please refresh the page.');
    }
  };

  // Individual fetch functions for updates only (not initial load)
  const fetchRazorpaySettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/settings/razorpay`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.razorpay_key_id) {
        setRazorpaySettings({
          razorpay_key_id: response.data.razorpay_key_id,
          razorpay_key_secret: '••••••••••••••••'
        });
      }
      setRazorpayConfigured(response.data.razorpay_configured);
    } catch (error) {
      console.error('Failed to fetch Razorpay settings', error);
      if (error.response?.status === 403) {
        toast.error('Access denied. Please login again.');
      }
    }
  };

  const fetchCampaigns = async () => {
    setCampaignLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/campaigns`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCampaigns(response.data || []);
    } catch (error) {
      console.error('Failed to fetch campaigns', error);
      // Initialize with empty array if endpoint doesn't exist yet
      setCampaigns([]);
      toast.error('Failed to load campaigns');
    } finally {
      setCampaignLoading(false);
    }
  };

  const handleSaveCampaign = async () => {
    if (!campaignForm.title) {
      toast.error('Campaign title is required');
      return;
    }
    if (!campaignForm.coupon_code) {
      toast.error('Coupon code is required');
      return;
    }

    setCampaignLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (editingCampaign) {
        await axios.put(`${API}/campaigns/${editingCampaign.id}`, campaignForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Campaign updated successfully!');
      } else {
        await axios.post(`${API}/campaigns`, campaignForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Campaign created successfully!');
      }
      fetchCampaigns();
      resetCampaignForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save campaign');
    } finally {
      setCampaignLoading(false);
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/campaigns/${campaignId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Campaign deleted!');
      fetchCampaigns();
    } catch (error) {
      toast.error('Failed to delete campaign');
    }
  };

  const handleToggleCampaign = async (campaign) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/campaigns/${campaign.id}`, {
        ...campaign,
        is_active: !campaign.is_active
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Campaign ${campaign.is_active ? 'deactivated' : 'activated'}!`);
      fetchCampaigns();
    } catch (error) {
      toast.error('Failed to update campaign');
    }
  };

  const editCampaign = (campaign) => {
    setEditingCampaign(campaign);
    setCampaignForm({
      title: campaign.title || '',
      description: campaign.description || '',
      discount_type: campaign.discount_type || 'percentage',
      discount_value: campaign.discount_value || 10,
      min_order_amount: campaign.min_order_amount || 0,
      max_discount: campaign.max_discount || 0,
      coupon_code: campaign.coupon_code || '',
      start_date: campaign.start_date || '',
      end_date: campaign.end_date || '',
      is_active: campaign.is_active !== false,
      banner_text: campaign.banner_text || '',
      banner_color: campaign.banner_color || 'violet',
      show_on_landing: campaign.show_on_landing !== false,
      usage_limit: campaign.usage_limit || 0,
      used_count: campaign.used_count || 0
    });
    setShowCampaignForm(true);
  };

  const resetCampaignForm = () => {
    setEditingCampaign(null);
    setCampaignForm({
      title: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 10,
      min_order_amount: 0,
      max_discount: 0,
      coupon_code: '',
      start_date: '',
      end_date: '',
      is_active: true,
      banner_text: '',
      banner_color: 'violet',
      show_on_landing: true,
      usage_limit: 0,
      used_count: 0
    });
    setShowCampaignForm(false);
  };

  const generateCouponCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCampaignForm({ ...campaignForm, coupon_code: code });
  };

  const handleSaveWhatsappSettings = async () => {
    setWhatsappLoading(true);
    try {
      await axios.put(`${API}/whatsapp/settings`, whatsappSettings);
      toast.success('WhatsApp settings updated successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update WhatsApp settings');
    } finally {
      setWhatsappLoading(false);
    }
  };

  // Logo upload handler - converts to base64 data URL
  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid image (PNG, JPG, WEBP, or GIF)');
      return;
    }

    // Validate file size (max 500KB for base64 storage)
    if (file.size > 500 * 1024) {
      toast.error('Image size should be less than 500KB');
      return;
    }

    setLogoUploading(true);
    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result;
        if (base64) {
          setBusinessSettings({ ...businessSettings, logo_url: base64 });
          toast.success('Logo uploaded! Click Save to apply.');
        }
        setLogoUploading(false);
      };
      reader.onerror = () => {
        toast.error('Failed to read image file');
        setLogoUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Logo upload error:', error);
      toast.error('Failed to upload logo');
      setLogoUploading(false);
    }
  };

  // Remove logo
  const handleRemoveLogo = () => {
    setBusinessSettings({ ...businessSettings, logo_url: '' });
    toast.success('Logo removed! Click Save to apply.');
  };

  const handleSaveBusinessSettings = async () => {
    const errors = [];
    
    if (!businessSettings.restaurant_name) {
      errors.push('Restaurant Name is required');
    }
    if (!businessSettings.phone) {
      errors.push('Phone Number is required');
    }
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      setTimeout(() => setValidationErrors([]), 5000);
      return;
    }
    
    setBusinessLoading(true);
    try {
      const token = localStorage.getItem('token');
      console.log('Saving business settings:', {
        business_type: businessSettings.business_type,
        kot_mode_enabled: businessSettings.kot_mode_enabled
      });
      
      const response = await axios.put(`${API}/business/settings`, businessSettings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Save response:', response.data);
      toast.success(`Settings saved! Type: ${businessSettings.business_type}, KOT: ${businessSettings.kot_mode_enabled ? 'ON' : 'OFF'}`);
      
      // Bust the shared cache so other pages pick up the new settings
      invalidateShared('business/settings');
      
      // Update local storage user data
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      user.business_settings = businessSettings;
      localStorage.setItem('user', JSON.stringify(user));
      // DON'T refetch - keep the current state to prevent reverting changes
    } catch (error) {
      console.error('Save error:', error);
      toast.error(error.response?.data?.detail || 'Failed to update settings');
    } finally {
      setBusinessLoading(false);
    }
  };

  const handleSaveRazorpay = async () => {
    if (!razorpaySettings.razorpay_key_id || !razorpaySettings.razorpay_key_secret) {
      toast.error('Please fill all fields');
      return;
    }
    if (razorpaySettings.razorpay_key_secret === '••••••••••••••••') {
      toast.error('Please enter actual secret key');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/settings/razorpay`, razorpaySettings);
      toast.success('Razorpay settings saved successfully!');
      fetchRazorpaySettings();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <Layout user={user}>
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-500">Only admin can access settings</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user}>
      <ValidationAlert errors={validationErrors} onClose={() => setValidationErrors([])} />
      
      {/* Loading Skeleton */}
      {loading && !initialDataLoaded && (
        <div className="space-y-6" data-testid="settings-loading">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
            
            {/* Tab skeleton */}
            <div className="flex space-x-4 mb-6">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-10 bg-gray-200 rounded w-24"></div>
              ))}
            </div>
            
            {/* Content skeleton */}
            <div className="bg-white rounded-lg border p-6">
              <div className="space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                <div className="space-y-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-10 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
                <div className="h-10 bg-gray-200 rounded w-32"></div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Main Content - Only show when data is loaded */}
      {(!loading || initialDataLoaded) && (
        <div className="space-y-6" data-testid="settings-page">
        <TrialBanner user={user} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Settings</h1>
            <p className="text-gray-600 mt-2">Configure your restaurant billing system</p>
          </div>
          {window.electronAPI?.getVersion && (
            <div className="text-left sm:text-right">
              <p className="text-sm text-gray-500">Desktop App</p>
              <p className="text-lg font-bold text-violet-600">v{window.electronAPI.getVersion()}</p>
            </div>
          )}
        </div>

        {/* Settings Tabs */}
        <div className="bg-gray-100 rounded-lg p-1 w-full overflow-x-auto">
          <div className="flex gap-2 w-max min-w-full">
            <button
              onClick={() => setActiveTab('business')}
              className={`px-3 sm:px-4 py-2 rounded-md font-medium transition-all flex items-center gap-2 text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'business' ? 'bg-white shadow text-violet-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Business Details
            </button>
            <button
              onClick={() => setActiveTab('print')}
              className={`px-3 sm:px-4 py-2 rounded-md font-medium transition-all flex items-center gap-2 text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'print' ? 'bg-white shadow text-violet-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Printer className="w-4 h-4" />
              Print Customization
            </button>
            <button
              onClick={() => setActiveTab('whatsapp')}
              className={`px-3 sm:px-4 py-2 rounded-md font-medium transition-all flex items-center gap-2 text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'whatsapp' ? 'bg-white shadow text-green-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </button>

          {/* WhatsApp Pro tab - Only show in desktop app */}
          {(window.__ELECTRON__ || window.electronAPI) && (
            <button
              onClick={() => setActiveTab('whatsapp-desktop')}
              className={`px-3 sm:px-4 py-2 rounded-md font-medium transition-all flex items-center gap-2 text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'whatsapp-desktop' ? 'bg-white shadow text-green-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp Pro
            </button>
          )}
          </div>
        </div>

        {/* Print Customization Tab */}
        {activeTab === 'print' && (
          <div className="space-y-6">
            {/* Bluetooth Printer - Direct Print */}
            <BluetoothPrinterSettings />
            
            {/* Print Themes */}
            <PrintCustomization 
              businessSettings={businessSettings} 
              onUpdate={(updated) => setBusinessSettings(updated)}
            />
          </div>
        )}

        {/* WhatsApp Tab */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-6">
            {/* Basic WhatsApp Settings */}
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-green-600" />
                  WhatsApp Integration
                </CardTitle>
                <CardDescription>
                  Send receipts and live order updates to customers via WhatsApp
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Enable WhatsApp Sharing</p>
                    <p className="text-sm text-gray-500">Allow manual sharing of receipts via WhatsApp</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={whatsappSettings.whatsapp_enabled}
                      onChange={(e) => setWhatsappSettings({ ...whatsappSettings, whatsapp_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>

                <div>
                  <Label>Your WhatsApp Business Number</Label>
                  <Input
                    placeholder="+91 9876543210"
                    value={whatsappSettings.whatsapp_business_number}
                    onChange={(e) => setWhatsappSettings({ ...whatsappSettings, whatsapp_business_number: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Auto Notifications */}
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🔔 Auto Notifications
                </CardTitle>
                <CardDescription>
                  Automatically send WhatsApp updates when order status changes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div>
                    <p className="font-medium text-green-800">Enable Auto Notifications</p>
                    <p className="text-sm text-green-600">Send automatic WhatsApp messages on order updates</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={whatsappSettings.whatsapp_auto_notify}
                      onChange={(e) => setWhatsappSettings({ ...whatsappSettings, whatsapp_auto_notify: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>

                {whatsappSettings.whatsapp_auto_notify && (
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                      <input
                        type="checkbox"
                        checked={whatsappSettings.whatsapp_notify_on_placed}
                        onChange={(e) => setWhatsappSettings({ ...whatsappSettings, whatsapp_notify_on_placed: e.target.checked })}
                        className="w-4 h-4 text-green-600 rounded"
                      />
                      <div>
                        <p className="font-medium text-sm">✅ Order Placed</p>
                        <p className="text-xs text-gray-500">Confirmation message</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                      <input
                        type="checkbox"
                        checked={whatsappSettings.whatsapp_notify_on_preparing}
                        onChange={(e) => setWhatsappSettings({ ...whatsappSettings, whatsapp_notify_on_preparing: e.target.checked })}
                        className="w-4 h-4 text-green-600 rounded"
                      />
                      <div>
                        <p className="font-medium text-sm">👨‍🍳 Preparing</p>
                        <p className="text-xs text-gray-500">Chef started cooking</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                      <input
                        type="checkbox"
                        checked={whatsappSettings.whatsapp_notify_on_ready}
                        onChange={(e) => setWhatsappSettings({ ...whatsappSettings, whatsapp_notify_on_ready: e.target.checked })}
                        className="w-4 h-4 text-green-600 rounded"
                      />
                      <div>
                        <p className="font-medium text-sm">🔔 Ready</p>
                        <p className="text-xs text-gray-500">Food is ready to serve</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                      <input
                        type="checkbox"
                        checked={whatsappSettings.whatsapp_notify_on_completed}
                        onChange={(e) => setWhatsappSettings({ ...whatsappSettings, whatsapp_notify_on_completed: e.target.checked })}
                        className="w-4 h-4 text-green-600 rounded"
                      />
                      <div>
                        <p className="font-medium text-sm">💳 Completed</p>
                        <p className="text-xs text-gray-500">Payment receipt</p>
                      </div>
                    </label>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Self-Order & QR */}
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📱 Customer Self-Order & Live Tracking
                </CardTitle>
                <CardDescription>
                  Let customers scan QR to order and track their order live
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Menu Display Only Option */}
                <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div>
                    <p className="font-medium text-orange-800">Enable QR Menu Display</p>
                    <p className="text-sm text-orange-600">Customers can scan QR code to view menu only (no ordering)</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={whatsappSettings.menu_display_enabled}
                      onChange={(e) => setWhatsappSettings({ ...whatsappSettings, menu_display_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                  </label>
                </div>

                {whatsappSettings.menu_display_enabled && !whatsappSettings.customer_self_order_enabled && (
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <p className="text-sm font-medium text-orange-800 mb-3">📱 Menu QR Code:</p>
                    
                    {/* QR Code Display */}
                    <div className="flex flex-col md:flex-row gap-4 items-start">
                      <div className="bg-white p-4 rounded-lg border shadow-sm" id="menu-qr-container">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getMenuUrl())}`}
                          alt="Menu QR Code"
                          className="w-48 h-48"
                        />
                        <p className="text-center text-sm font-medium mt-2 text-gray-700">Scan to View Menu</p>
                      </div>
                      
                      <div className="flex-1 space-y-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Menu Link:</p>
                          <code className="block p-2 bg-white rounded text-xs break-all border">
                            {getMenuUrl()}
                          </code>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const link = getMenuUrl();
                              navigator.clipboard.writeText(link);
                              toast.success('Link copied to clipboard!');
                            }}
                            className="text-orange-600 border-orange-300 hover:bg-orange-50"
                          >
                            📋 Copy Link
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const printWindow = window.open('about:blank', '_blank');
                              const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(getMenuUrl())}`;
                              const restaurantName = businessSettings.restaurant_name || 'Restaurant';
                              printWindow.document.write(`
                                <html>
                                <head>
                                  <title>Menu QR Code - ${restaurantName}</title>
                                  <style>
                                    body { font-family: Arial, sans-serif; text-align: center; padding: 40px; }
                                    .qr-container { display: inline-block; padding: 30px; border: 3px solid #f97316; border-radius: 16px; }
                                    h1 { color: #ea580c; margin-bottom: 10px; }
                                    h2 { color: #333; font-size: 24px; margin: 20px 0 10px; }
                                    p { color: #666; margin: 5px 0; }
                                    img { margin: 20px 0; }
                                    .scan-text { font-size: 18px; font-weight: bold; color: #333; margin-top: 15px; }
                                    @media print { body { padding: 20px; } }
                                  </style>
                                </head>
                                <body>
                                  <div class="qr-container">
                                    <h1>🍽️ ${restaurantName}</h1>
                                    <img src="${qrUrl}" alt="Menu QR Code" />
                                    <p class="scan-text">📱 Scan to View Our Menu</p>
                                    <p style="font-size: 12px; color: #999; margin-top: 20px;">Powered by BillByteKOT</p>
                                  </div>
                                  <script>setTimeout(() => { window.print(); }, 500);</script>
                                </body>
                                </html>
                              `);
                              printWindow.document.close();
                            }}
                            className="text-orange-600 border-orange-300 hover:bg-orange-50"
                          >
                            🖨️ Print QR Code
                          </Button>
                        </div>
                        
                        {/* Download Options */}
                        <div className="pt-2 border-t">
                          <p className="text-xs text-gray-500 mb-2">Download Designs:</p>
                          <div className="flex flex-wrap gap-2">
                            {/* Classic Design */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const restaurantName = businessSettings.restaurant_name || 'Restaurant';
                                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(getMenuUrl())}`;
                                
                                const canvas = document.createElement('canvas');
                                canvas.width = 600;
                                canvas.height = 750;
                                const ctx = canvas.getContext('2d');
                                
                                // Background
                                ctx.fillStyle = '#ffffff';
                                ctx.fillRect(0, 0, 600, 750);
                                
                                // Orange border
                                ctx.strokeStyle = '#f97316';
                                ctx.lineWidth = 8;
                                ctx.roundRect(20, 20, 560, 710, 20);
                                ctx.stroke();
                                
                                // Header
                                ctx.fillStyle = '#ea580c';
                                ctx.font = 'bold 36px Arial';
                                ctx.textAlign = 'center';
                                ctx.fillText('🍽️ ' + restaurantName, 300, 80);
                                
                                // Load QR and draw
                                const img = new Image();
                                img.crossOrigin = 'anonymous';
                                img.onload = () => {
                                  ctx.drawImage(img, 100, 120, 400, 400);
                                  
                                  // Scan text
                                  ctx.fillStyle = '#333333';
                                  ctx.font = 'bold 28px Arial';
                                  ctx.fillText('📱 Scan to View Menu', 300, 580);
                                  
                                  // Footer
                                  ctx.fillStyle = '#999999';
                                  ctx.font = '16px Arial';
                                  ctx.fillText('Powered by BillByteKOT', 300, 700);
                                  
                                  // Download
                                  const link = document.createElement('a');
                                  link.download = `${restaurantName.replace(/[^a-z0-9]/gi, '_')}_menu_qr_classic.png`;
                                  link.href = canvas.toDataURL('image/png');
                                  link.click();
                                  toast.success('Classic design downloaded!');
                                };
                                img.src = qrUrl;
                              }}
                              className="text-orange-600 border-orange-300 hover:bg-orange-50"
                            >
                              🎨 Classic
                            </Button>
                            
                            {/* Modern Design */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const restaurantName = businessSettings.restaurant_name || 'Restaurant';
                                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(getMenuUrl())}`;
                                
                                const canvas = document.createElement('canvas');
                                canvas.width = 600;
                                canvas.height = 800;
                                const ctx = canvas.getContext('2d');
                                
                                // Gradient background
                                const gradient = ctx.createLinearGradient(0, 0, 600, 800);
                                gradient.addColorStop(0, '#7c3aed');
                                gradient.addColorStop(1, '#a855f7');
                                ctx.fillStyle = gradient;
                                ctx.fillRect(0, 0, 600, 800);
                                
                                // White card
                                ctx.fillStyle = '#ffffff';
                                ctx.roundRect(40, 40, 520, 720, 30);
                                ctx.fill();
                                
                                // Restaurant name
                                ctx.fillStyle = '#7c3aed';
                                ctx.font = 'bold 32px Arial';
                                ctx.textAlign = 'center';
                                ctx.fillText(restaurantName, 300, 100);
                                
                                // Tagline
                                ctx.fillStyle = '#666666';
                                ctx.font = '18px Arial';
                                ctx.fillText('Digital Menu', 300, 135);
                                
                                // Load QR
                                const img = new Image();
                                img.crossOrigin = 'anonymous';
                                img.onload = () => {
                                  // QR with rounded corners effect
                                  ctx.save();
                                  ctx.roundRect(100, 160, 400, 400, 20);
                                  ctx.clip();
                                  ctx.drawImage(img, 100, 160, 400, 400);
                                  ctx.restore();
                                  
                                  // Scan instruction
                                  ctx.fillStyle = '#333333';
                                  ctx.font = 'bold 24px Arial';
                                  ctx.fillText('📱 Scan for Menu', 300, 620);
                                  
                                  // Decorative line
                                  ctx.strokeStyle = '#e5e7eb';
                                  ctx.lineWidth = 2;
                                  ctx.beginPath();
                                  ctx.moveTo(150, 660);
                                  ctx.lineTo(450, 660);
                                  ctx.stroke();
                                  
                                  // Footer
                                  ctx.fillStyle = '#9ca3af';
                                  ctx.font = '14px Arial';
                                  ctx.fillText('Powered by BillByteKOT', 300, 720);
                                  
                                  const link = document.createElement('a');
                                  link.download = `${restaurantName.replace(/[^a-z0-9]/gi, '_')}_menu_qr_modern.png`;
                                  link.href = canvas.toDataURL('image/png');
                                  link.click();
                                  toast.success('Modern design downloaded!');
                                };
                                img.src = qrUrl;
                              }}
                              className="text-violet-600 border-violet-300 hover:bg-violet-50"
                            >
                              ✨ Modern
                            </Button>
                            
                            {/* Minimal Design */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const restaurantName = businessSettings.restaurant_name || 'Restaurant';
                                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(getMenuUrl())}`;
                                
                                const canvas = document.createElement('canvas');
                                canvas.width = 500;
                                canvas.height = 600;
                                const ctx = canvas.getContext('2d');
                                
                                // White background
                                ctx.fillStyle = '#ffffff';
                                ctx.fillRect(0, 0, 500, 600);
                                
                                // Restaurant name
                                ctx.fillStyle = '#111827';
                                ctx.font = 'bold 28px Arial';
                                ctx.textAlign = 'center';
                                ctx.fillText(restaurantName, 250, 50);
                                
                                // Load QR
                                const img = new Image();
                                img.crossOrigin = 'anonymous';
                                img.onload = () => {
                                  ctx.drawImage(img, 50, 80, 400, 400);
                                  
                                  // Simple text
                                  ctx.fillStyle = '#374151';
                                  ctx.font = '20px Arial';
                                  ctx.fillText('Scan for Menu', 250, 530);
                                  
                                  ctx.fillStyle = '#9ca3af';
                                  ctx.font = '12px Arial';
                                  ctx.fillText('billbytekot.in', 250, 570);
                                  
                                  const link = document.createElement('a');
                                  link.download = `${restaurantName.replace(/[^a-z0-9]/gi, '_')}_menu_qr_minimal.png`;
                                  link.href = canvas.toDataURL('image/png');
                                  link.click();
                                  toast.success('Minimal design downloaded!');
                                };
                                img.src = qrUrl;
                              }}
                              className="text-gray-600 border-gray-300 hover:bg-gray-50"
                            >
                              ⬜ Minimal
                            </Button>
                            
                            {/* Table Tent Design */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const restaurantName = businessSettings.restaurant_name || 'Restaurant';
                                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(getMenuUrl())}`;
                                
                                const canvas = document.createElement('canvas');
                                canvas.width = 400;
                                canvas.height = 550;
                                const ctx = canvas.getContext('2d');
                                
                                // Warm gradient
                                const gradient = ctx.createLinearGradient(0, 0, 0, 550);
                                gradient.addColorStop(0, '#fef3c7');
                                gradient.addColorStop(1, '#fde68a');
                                ctx.fillStyle = gradient;
                                ctx.fillRect(0, 0, 400, 550);
                                
                                // Decorative top
                                ctx.fillStyle = '#f59e0b';
                                ctx.fillRect(0, 0, 400, 60);
                                
                                // Restaurant name on top
                                ctx.fillStyle = '#ffffff';
                                ctx.font = 'bold 22px Arial';
                                ctx.textAlign = 'center';
                                ctx.fillText(restaurantName, 200, 40);
                                
                                // White QR area
                                ctx.fillStyle = '#ffffff';
                                ctx.roundRect(40, 80, 320, 360, 15);
                                ctx.fill();
                                
                                // Load QR
                                const img = new Image();
                                img.crossOrigin = 'anonymous';
                                img.onload = () => {
                                  ctx.drawImage(img, 50, 90, 300, 300);
                                  
                                  // Scan text inside white area
                                  ctx.fillStyle = '#92400e';
                                  ctx.font = 'bold 18px Arial';
                                  ctx.fillText('📱 Scan for Menu', 200, 420);
                                  
                                  // Bottom text
                                  ctx.fillStyle = '#b45309';
                                  ctx.font = '14px Arial';
                                  ctx.fillText('View our full menu', 200, 480);
                                  ctx.fillText('on your phone!', 200, 500);
                                  
                                  ctx.fillStyle = '#d97706';
                                  ctx.font = '11px Arial';
                                  ctx.fillText('Powered by BillByteKOT', 200, 535);
                                  
                                  const link = document.createElement('a');
                                  link.download = `${restaurantName.replace(/[^a-z0-9]/gi, '_')}_menu_qr_table_tent.png`;
                                  link.href = canvas.toDataURL('image/png');
                                  link.click();
                                  toast.success('Table tent design downloaded!');
                                };
                                img.src = qrUrl;
                              }}
                              className="text-amber-600 border-amber-300 hover:bg-amber-50"
                            >
                              🏷️ Table Tent
                            </Button>
                          </div>
                        </div>
                        
                        <p className="text-xs text-orange-600">Print or download these QR codes and display in your restaurant for customers to scan and view your menu.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Self-Ordering Option */}
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <p className="font-medium text-blue-800">Enable Customer Self-Ordering</p>
                    <p className="text-sm text-blue-600">Customers can scan QR code to view menu and place orders</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={whatsappSettings.customer_self_order_enabled}
                      onChange={(e) => setWhatsappSettings({ ...whatsappSettings, customer_self_order_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {whatsappSettings.customer_self_order_enabled && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium mb-2">📍 Customer Features:</p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Scan table QR → View menu → Place order</li>
                      <li>• Get WhatsApp updates on order status</li>
                      <li>• Track order live via tracking link</li>
                    </ul>
                    <p className="text-xs text-green-600 mt-3 font-medium">✓ QR codes auto-generated using your current URL</p>
                    <p className="text-xs text-gray-500">Go to Tables page to generate & print QR codes for each table</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Message Template */}
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle>Receipt Message Template</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <textarea
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[100px] font-mono text-sm"
                  value={whatsappSettings.whatsapp_message_template}
                  onChange={(e) => setWhatsappSettings({ ...whatsappSettings, whatsapp_message_template: e.target.value })}
                  placeholder="Thank you for dining at {restaurant_name}!"
                />
                <div className="flex flex-wrap gap-2">
                  {['{restaurant_name}', '{currency}', '{total}', '{order_id}', '{customer_name}', '{table_number}'].map((v) => (
                    <code key={v} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">{v}</code>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleSaveWhatsappSettings}
              disabled={whatsappLoading}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
            >
              {whatsappLoading ? 'Saving...' : 'Save All WhatsApp Settings'}
            </Button>
          </div>
        )}

        {/* Business Tab */}
        {activeTab === 'business' && (
        <>
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-violet-600" />
              Business Details
            </CardTitle>
            <CardDescription>
              Update your restaurant information and receipt settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Business Type & KOT Mode Toggle */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Business Type & KOT Mode</h3>
                  <p className="text-sm text-gray-600">
                    Configure how your business operates. KOT mode is for restaurants with table service.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Business Type Selection */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Business Type</Label>
                  <select
                    value={businessSettings.business_type || 'restaurant'}
                    onChange={(e) => {
                      const newType = e.target.value;
                      console.log('Business type changed to:', newType);
                      const newSettings = { 
                        ...businessSettings, 
                        business_type: newType,
                        // Auto-disable KOT for non-restaurant types
                        kot_mode_enabled: newType === 'restaurant' || newType === 'cafe' ? businessSettings.kot_mode_enabled : false
                      };
                      console.log('New settings:', newSettings);
                      setBusinessSettings(newSettings);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="restaurant">🍽️ Restaurant (Dine-in with tables)</option>
                    <option value="stall">🏪 Food Stall (Counter service)</option>
                    <option value="food-truck">🚚 Food Truck (Mobile service)</option>
                    <option value="takeaway-only">📦 Takeaway Only (No dine-in)</option>
                    <option value="cafe">☕ Cafe (Mixed service)</option>
                    <option value="cloud-kitchen">🏠 Cloud Kitchen (Delivery only)</option>
                  </select>
                </div>

                {/* KOT Mode Toggle */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">KOT Mode</Label>
                  <div className="flex items-center gap-3 p-3 bg-white rounded-md border border-gray-200">
                    <button
                      onClick={() => setBusinessSettings({ ...businessSettings, kot_mode_enabled: !businessSettings.kot_mode_enabled })}
                      disabled={businessSettings.business_type !== 'restaurant' && businessSettings.business_type !== 'cafe'}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        businessSettings.kot_mode_enabled 
                          ? 'bg-blue-600' 
                          : 'bg-gray-300'
                      } ${
                        (businessSettings.business_type !== 'restaurant' && businessSettings.business_type !== 'cafe')
                          ? 'opacity-50 cursor-not-allowed'
                          : 'cursor-pointer'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          businessSettings.kot_mode_enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {businessSettings.kot_mode_enabled ? 'Enabled' : 'Disabled'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {businessSettings.kot_mode_enabled 
                          ? 'Table & KOT management active'
                          : 'Simple billing only'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info Message */}
              <div className="mt-3 p-3 bg-blue-50 rounded-md border border-blue-100">
                <div className="flex gap-2">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-800">
                    {businessSettings.kot_mode_enabled ? (
                      <>
                        <strong>KOT Mode Enabled:</strong> Customers must select a table when ordering. 
                        Orders are sent to kitchen displays. Best for dine-in restaurants.
                      </>
                    ) : (
                      <>
                        <strong>Simple Billing Mode:</strong> No table selection required. 
                        Direct billing without KOT. Perfect for stalls, food trucks, and takeaway-only businesses.
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Customer Prompt Setting - Only show when KOT is disabled */}
              {!businessSettings.kot_mode_enabled && (
                <div className="mt-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Ask for Customer Name</p>
                      <p className="text-xs text-gray-500">Show customer name prompt when creating new orders</p>
                    </div>
                    <button
                      onClick={() => {
                        const currentSetting = localStorage.getItem('skipCustomerPrompt') === 'true';
                        localStorage.setItem('skipCustomerPrompt', currentSetting ? 'false' : 'true');
                        toast.success(currentSetting ? 'Customer prompt enabled' : 'Customer prompt disabled');
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        localStorage.getItem('skipCustomerPrompt') !== 'true' ? 'bg-green-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          localStorage.getItem('skipCustomerPrompt') !== 'true' ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">
                    When disabled, orders will be created as "Cash Sale" without asking for customer details.
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Restaurant Name *</Label>
                <Input
                  value={businessSettings.restaurant_name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setBusinessSettings({ 
                      ...businessSettings, 
                      restaurant_name: name,
                      // Auto-generate slug if not manually set
                      restaurant_slug: businessSettings.restaurant_slug || generateSlugFromName(name)
                    });
                  }}
                  placeholder="Your Restaurant Name"
                />
              </div>

              <div>
                <Label>Cool Menu URL</Label>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-l-md border border-r-0">
                      {window.location.origin}/r/
                    </span>
                    <Input
                      value={businessSettings.restaurant_slug}
                      onChange={(e) => {
                        const slug = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
                        setBusinessSettings({ ...businessSettings, restaurant_slug: slug });
                      }}
                      placeholder="myrestaurant"
                      className="rounded-l-none"
                    />
                    <span className="text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-r-md border border-l-0">
                      /menu
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Create a cool URL for your menu like: <strong>{window.location.origin}/r/{businessSettings.restaurant_slug || 'myrestaurant'}/menu</strong>
                  </p>
                </div>
              </div>

              <div>
                <Label>Phone Number *</Label>
                <Input
                  value={businessSettings.phone}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, phone: e.target.value })}
                  placeholder="+91 1234567890"
                />
              </div>

              {/* Logo URL for Bills */}
              <div className="md:col-span-2">
                <Label>Restaurant Logo (for Bills)</Label>
                <div className="mt-2 space-y-3">
                  {/* Logo Preview */}
                  {businessSettings.logo_url && (
                    <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden flex items-center justify-center bg-white">
                        <img 
                          src={businessSettings.logo_url} 
                          alt="Logo preview" 
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML = '<span class="text-xs text-red-500">Invalid image</span>';
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700">Current Logo</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {businessSettings.logo_url.startsWith('data:') ? 'Uploaded image' : 'External URL'}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveLogo}
                          className="mt-2 text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Upload Options */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* File Upload Button */}
                    <div className="flex-1">
                      <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-violet-300 rounded-lg cursor-pointer hover:bg-violet-50 hover:border-violet-400 transition-all">
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                          onChange={handleLogoUpload}
                          className="hidden"
                          disabled={logoUploading}
                        />
                        {logoUploading ? (
                          <>
                            <div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm text-violet-600">Uploading...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-5 h-5 text-violet-600" />
                            <span className="text-sm text-violet-600 font-medium">Upload Logo</span>
                          </>
                        )}
                      </label>
                      <p className="text-xs text-gray-500 mt-1 text-center">PNG, JPG, WEBP (max 500KB)</p>
                    </div>
                    
                    {/* OR Divider */}
                    <div className="flex items-center justify-center">
                      <span className="text-xs text-gray-400 px-2">OR</span>
                    </div>
                    
                    {/* URL Input */}
                    <div className="flex-1">
                      <Input
                        value={businessSettings.logo_url?.startsWith('data:') ? '' : (businessSettings.logo_url || '')}
                        onChange={(e) => setBusinessSettings({ ...businessSettings, logo_url: e.target.value })}
                        placeholder="https://example.com/logo.png"
                        className="h-[50px]"
                      />
                      <p className="text-xs text-gray-500 mt-1 text-center">Enter direct image URL</p>
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500">
                    💡 Tip: For best results, use a square logo (200x200px). You can also host your logo on 
                    <a href="https://imgur.com" target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline ml-1">Imgur</a> or 
                    <a href="https://imgbb.com" target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline ml-1">ImgBB</a> for free.
                  </p>
                </div>
              </div>

              <div className="md:col-span-2">
                <Label>Address</Label>
                <Input
                  value={businessSettings.address}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, address: e.target.value })}
                  placeholder="Street, City, State, PIN"
                />
              </div>

              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={businessSettings.email}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, email: e.target.value })}
                  placeholder="restaurant@example.com"
                />
              </div>

              <div>
                <Label>Website</Label>
                <Input
                  value={businessSettings.website}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, website: e.target.value })}
                  placeholder="www.yourrestaurant.com"
                />
              </div>

              <div>
                <Label>GSTIN</Label>
                <Input
                  value={businessSettings.gstin}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, gstin: e.target.value })}
                  placeholder="22AAAAA0000A1Z5"
                />
              </div>

              <div>
                <Label>FSSAI License</Label>
                <Input
                  value={businessSettings.fssai}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, fssai: e.target.value })}
                  placeholder="12345678901234"
                />
              </div>

              <div>
                <Label>UPI ID (for QR Payments)</Label>
                <Input
                  value={businessSettings.upi_id || ''}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, upi_id: e.target.value })}
                  placeholder="yourname@upi or 9876543210@paytm"
                />
                <p className="text-xs text-gray-500 mt-1">Used for generating payment QR codes</p>
              </div>

              <div className="md:col-span-2">
                <Label>Tagline</Label>
                <Input
                  value={businessSettings.tagline}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, tagline: e.target.value })}
                  placeholder="Delicious food, memorable moments"
                />
              </div>

              <div className="md:col-span-2">
                <Label>Receipt Footer Message</Label>
                <Input
                  value={businessSettings.footer_message}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, footer_message: e.target.value })}
                  placeholder="Thank you for dining with us!"
                />
              </div>

              <div>
                <Label>Currency</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={businessSettings.currency}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, currency: e.target.value })}
                >
                  {currencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.symbol} {currency.code}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Tax Rate (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={businessSettings.tax_rate}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, tax_rate: parseFloat(e.target.value) || 0 })}
                  placeholder="0 for no tax, 5 for 5%"
                />
                <p className="text-xs text-gray-500 mt-1">Set to 0 for no tax</p>
              </div>
            </div>

            <div>
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <Label className="block text-base">Invoice design</Label>
                  <p className="mt-1 text-sm text-gray-500">Choose the design customers see when you share an invoice link on WhatsApp.</p>
                </div>
                <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">Shared invoice links</span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {themes.length > 0 ? themes.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setBusinessSettings({ ...businessSettings, receipt_theme: theme.id })}
                    data-testid={`invoice-design-${theme.id}`}
                    aria-pressed={businessSettings.receipt_theme === theme.id}
                    className={`group flex min-h-48 flex-col p-4 border-2 rounded-xl text-left transition-all focus:outline-none focus:ring-2 focus:ring-violet-400 ${
                      businessSettings.receipt_theme === theme.id
                        ? 'border-violet-600 bg-violet-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`mb-3 h-16 rounded-md border border-gray-200 bg-white p-2 shadow-sm ${businessSettings.receipt_theme === theme.id ? 'ring-2 ring-violet-200' : ''}`}>
                      <div className={`h-2 w-2/5 rounded ${theme.id === 'modern' ? 'bg-indigo-500' : theme.id === 'elegant' ? 'bg-amber-800' : theme.id === 'minimal' ? 'bg-gray-300' : theme.id === 'compact' ? 'bg-emerald-600' : theme.id === 'detailed' ? 'bg-violet-600' : 'bg-gray-800'}`}></div>
                      <div className="mt-2 h-1.5 w-full rounded bg-gray-100"></div><div className="mt-1.5 h-1.5 w-4/5 rounded bg-gray-100"></div>
                      <div className="mt-2 flex justify-between"><span className="h-1.5 w-1/4 rounded bg-gray-200"></span><span className="h-1.5 w-1/5 rounded bg-gray-300"></span></div>
                    </div>
                    <p className="font-medium text-sm">{theme.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{theme.description}</p>
                    <p className="text-xs text-violet-600 mt-1 font-medium">{theme.recommended_width || '80mm'}</p>
                  </button>
                )) : (
                  // Fallback themes if API fails
                  [
                    { id: 'classic', name: 'Classic', description: 'Timeless dark header with strong totals', recommended_width: '80mm' },
                    { id: 'modern', name: 'Modern', description: 'Teal hospitality style with clear sections', recommended_width: 'A4 / 80mm' },
                    { id: 'minimal', name: 'Minimal', description: 'Clean typography for a calm, modern bill', recommended_width: '80mm' },
                    { id: 'elegant', name: 'Elegant', description: 'Professional and elegant', recommended_width: '80mm' },
                    { id: 'compact', name: 'Compact', description: 'Space-saving 58mm format', recommended_width: '58mm' },
                    { id: 'detailed', name: 'Detailed', description: 'Comprehensive invoice format', recommended_width: '80mm' }
                  ].map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setBusinessSettings({ ...businessSettings, receipt_theme: theme.id })}
                      className={`group flex min-h-48 flex-col p-4 border-2 rounded-xl text-left transition-all focus:outline-none focus:ring-2 focus:ring-violet-400 ${
                        businessSettings.receipt_theme === theme.id
                          ? 'border-violet-600 bg-violet-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-medium text-sm">{theme.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{theme.description}</p>
                      <p className="text-xs text-violet-600 mt-1 font-medium">{theme.recommended_width}</p>
                    </button>
                  ))
                )}
              </div>
            </div>

            <Button
              onClick={handleSaveBusinessSettings}
              disabled={businessLoading}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600"
            >
              {businessLoading ? 'Saving...' : 'Save Business Settings'}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="min-w-0">
                <p className="text-sm text-gray-500">Admin Email</p>
                <p className="font-medium truncate" title={user?.email}>{user?.email}</p>
              </div>
              <div className="min-w-0">
                <p className="text-sm text-gray-500">Username</p>
                <p className="font-medium truncate" title={user?.username}>{user?.username}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Role</p>
                <p className="font-medium capitalize">{user?.role}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Bill Count</p>
                <p className="font-medium">{user?.bill_count || 0} / 50</p>
              </div>
            </div>
          </CardContent>
        </Card>
        </>
        )}



        {/* WhatsApp Desktop Tab */}
        {activeTab === 'whatsapp-desktop' && (
          <WhatsAppDesktop isElectron={!!window.electronAPI?.isElectron} />
        )}
        </div>
      )}
    </Layout>
  );
};

export default SettingsPage;
