import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import {
  MessageCircle,
  Send,
  Users,
  Zap,
  QrCode,
  Loader2,
  Smartphone,
  LogOut,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  X,
  Maximize2
} from 'lucide-react';
import { API } from '../App';

const WhatsAppDesktop = ({ isElectron: isElectronProp }) => {
  // Auto-detect Electron environment - check multiple ways
  const isElectron = isElectronProp !== undefined 
    ? isElectronProp 
    : (typeof window !== 'undefined' && (
        window.__ELECTRON__ === true ||
        window.electronAPI?.isElectron === true || 
        window.electronAPI !== undefined ||
        navigator.userAgent.toLowerCase().includes('electron')
      ));
  
  // Debug log
  useEffect(() => {
    console.log('WhatsApp Desktop - isElectron:', isElectron);
    console.log('WhatsApp Desktop - window.__ELECTRON__:', window.__ELECTRON__);
    console.log('WhatsApp Desktop - window.electronAPI:', window.electronAPI);
    console.log('WhatsApp Desktop - electronAPI functions:', window.electronAPI ? Object.keys(window.electronAPI) : 'N/A');
  }, [isElectron]);
  const [phone, setPhone] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('order_ready');
  const [customerName, setCustomerName] = useState('');
  const [orderId, setOrderId] = useState('');
  const [amount, setAmount] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [bulkContacts, setBulkContacts] = useState('');
  const [bulkMessage, setBulkMessage] = useState('');
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [whatsappViewVisible, setWhatsappViewVisible] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [sending, setSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(null);
  const [activeTab, setActiveTab] = useState('single');

  const quickMessages = [
    {
      title: 'Order Ready',
      templateName: 'order_ready',
      description: 'Approved utility template for ready orders.',
      buildParams: ({ restaurantName: name, orderId, amount }) => [name || 'Restaurant', orderId || 'ORDER001', amount || 'INR 0.00']
    },
    {
      title: 'Order Confirmation',
      templateName: 'order',
      description: 'Approved utility template for order confirmation.',
      buildParams: ({ customerName: name, orderId, amount }) => [name || 'Customer', orderId || 'ORDER001', amount || 'INR 0.00']
    },
    {
      title: 'Order Preparing',
      templateName: 'order_preparing',
      description: 'Approved utility template for preparing status.',
      buildParams: ({ restaurantName: name, orderId, amount }) => [name || 'Restaurant', orderId || 'ORDER001', amount || 'INR 0.00']
    },
    {
      title: 'Payment Receipt',
      templateName: 'payment_receipt_with_invoice_link',
      description: 'Approved utility template for completed or paid orders.',
      buildParams: ({ restaurantName: name, orderId, amount }) => [name || 'Restaurant', orderId || 'ORDER001', amount || 'INR 0.00']
    },
    {
      title: 'Purchase Receipt',
      templateName: 'purchase_receipt_3',
      description: 'Approved utility template for purchase receipt messaging.',
      buildParams: ({ customerName: name, orderId, amount }) => [name || 'Customer', orderId || 'ORDER001', amount || 'INR 0.00']
    }
  ];
  const selectedTemplateConfig = quickMessages.find((template) => template.templateName === selectedTemplate) || quickMessages[0];

  // Check WhatsApp status on mount and listen for updates
  const checkWhatsAppStatus = useCallback(async () => {
    if (isElectron && window.electronAPI?.getWhatsAppStatus) {
      try {
        const status = await window.electronAPI.getWhatsAppStatus();
        setWhatsappConnected(status.connected);
        setWhatsappViewVisible(status.viewVisible || false);
      } catch (err) {
        console.error('Failed to get WhatsApp status:', err);
      }
    }
  }, [isElectron]);

  useEffect(() => {
    checkWhatsAppStatus();

    // Listen for WhatsApp status updates from Electron
    if (isElectron && window.electronAPI?.onWhatsAppStatus) {
      window.electronAPI.onWhatsAppStatus((data) => {
        setWhatsappConnected(data.connected);
        if (data.status === 'connected') {
          toast.success('WhatsApp connected! You can now send messages.');
          setConnecting(false);
        } else if (data.status === 'qr_visible') {
          setConnecting(false);
        } else if (data.status === 'logged_out') {
          toast.info('WhatsApp logged out');
        }
      });
    }

    // Listen for view state changes
    if (isElectron && window.electronAPI?.onWhatsAppViewState) {
      window.electronAPI.onWhatsAppViewState((data) => {
        setWhatsappViewVisible(data.visible);
      });
    }

    // Listen for bulk message progress
    if (isElectron && window.electronAPI?.onWhatsAppBulkProgress) {
      window.electronAPI.onWhatsAppBulkProgress((data) => {
        setBulkProgress(data);
        if (data.current === data.total) {
          setTimeout(() => setBulkProgress(null), 2000);
        }
      });
    }

    // Poll status every 5 seconds
    const interval = setInterval(checkWhatsAppStatus, 5000);
    return () => clearInterval(interval);
  }, [isElectron, checkWhatsAppStatus]);

  const handleConnectWhatsApp = async () => {
    setConnecting(true);

    // Debug logging
    console.log('handleConnectWhatsApp called');
    console.log('isElectron:', isElectron);
    console.log('window.electronAPI:', window.electronAPI);
    console.log('openWhatsAppWeb available:', !!window.electronAPI?.openWhatsAppWeb);

    if (isElectron && window.electronAPI?.openWhatsAppWeb) {
      console.log('Opening WhatsApp Web via Electron API');
      window.electronAPI.openWhatsAppWeb();
      toast.info('WhatsApp Web opened inside app. Scan QR code to login.');
    } else {
      console.log('Fallback: Opening WhatsApp Web in browser');
      console.log('Reason - isElectron:', isElectron, 'electronAPI:', !!window.electronAPI);
      window.open('https://web.whatsapp.com', '_blank');
      toast.warning('Opening in browser. For embedded WhatsApp, use desktop app.');
      setConnecting(false);
    }
  };

  const handleCloseWhatsAppView = () => {
    if (isElectron && window.electronAPI?.closeWhatsAppWeb) {
      window.electronAPI.closeWhatsAppWeb();
      setWhatsappViewVisible(false);
    }
  };

  const handleDisconnect = async () => {
    if (isElectron && window.electronAPI?.logoutWhatsApp) {
      const result = await window.electronAPI.logoutWhatsApp();
      if (result.success) {
        setWhatsappConnected(false);
        setWhatsappViewVisible(false);
        toast.success('WhatsApp disconnected and logged out');
      } else {
        toast.error('Failed to disconnect: ' + result.error);
      }
    } else {
      setWhatsappConnected(false);
      toast.info('WhatsApp disconnected');
    }
  };

  const sendSingleMessage = async () => {
    if (!phone) {
      toast.error('Please enter phone number');
      return;
    }

    if (!selectedTemplate) {
      toast.error('Please select an approved template');
      return;
    }

    setSending(true);

    try {
      const bodyParams = selectedTemplateConfig.buildParams({
        customerName,
        orderId,
        amount,
        restaurantName
      });

      const response = await axios.post(`${API}/whatsapp/cloud/send-template`, {
        phone_number: phone,
        template_name: selectedTemplate,
        body_params: bodyParams,
        customer_name: customerName || undefined
      });

      if (response.data?.success) {
        toast.success('Approved utility template sent via WhatsApp Cloud API');
      } else {
        toast.error('Template send failed');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error sending template');
    } finally {
      setSending(false);
    }
  };

  const sendBulkMessages = async () => {
    if (!bulkContacts || !bulkMessage) {
      toast.error('Please enter contacts and message');
      return;
    }

    try {
      const contacts = bulkContacts
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => {
          const parts = line.split(':').map((s) => s.trim());
          return {
            name: parts[0] || 'Customer',
            phone: parts[1] || parts[0]
          };
        })
        .filter((contact) => contact.phone);

      if (contacts.length === 0) {
        toast.error('No valid contacts found. Use format: Name:Phone');
        return;
      }

      setSending(true);
      setBulkProgress({ current: 0, total: contacts.length });

      if (isElectron && window.electronAPI?.sendWhatsAppBulkDirect) {
        const result = await window.electronAPI.sendWhatsAppBulkDirect(contacts, bulkMessage);
        if (result.success) {
          toast.success(`Opened ${result.sent} chats! Click Send in each WhatsApp chat.`);
          setBulkContacts('');
          setBulkMessage('');
        } else {
          toast.error('Failed to send bulk messages: ' + result.error);
        }
      } else if (isElectron && window.electronAPI?.sendBulkWhatsApp) {
        window.electronAPI.sendBulkWhatsApp(contacts, bulkMessage);
        toast.success(`Sending ${contacts.length} WhatsApp messages...`);
        setBulkContacts('');
        setBulkMessage('');
      } else {
        contacts.forEach((contact, index) => {
          setTimeout(() => {
            const personalizedMsg = bulkMessage.replace(/{name}/g, contact.name);
            const whatsappUrl = `https://wa.me/${contact.phone.replace(/\D/g, '')}?text=${encodeURIComponent(personalizedMsg)}`;
            window.open(whatsappUrl, '_blank');
          }, index * 2000);
        });
        toast.success(`Opening ${contacts.length} WhatsApp chats...`);
        setBulkContacts('');
        setBulkMessage('');
      }
    } catch (error) {
      toast.error('Error parsing contacts. Use format: Name:Phone');
    } finally {
      setSending(false);
      setBulkProgress(null);
    }
  };

  // Show info banner if not in Electron
  const showElectronBanner = !isElectron;


  // Show message when WhatsApp view is visible (fullscreen overlay)
  if (whatsappViewVisible) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
        <Card className="w-96 border-0 shadow-2xl">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-bold text-xl mb-2">WhatsApp Web is Open</h3>
            <p className="text-gray-600 mb-4">
              {whatsappConnected 
                ? 'You are logged in! Send your messages in the WhatsApp window.'
                : 'Scan the QR code with your phone to login. Your session will be saved.'}
            </p>
            <div className="space-y-2">
              <Button
                onClick={handleCloseWhatsAppView}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <X className="w-4 h-4 mr-2" />
                Close WhatsApp View
              </Button>
              {whatsappConnected && (
                <Button
                  variant="outline"
                  onClick={handleDisconnect}
                  className="w-full border-red-200 text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout from WhatsApp
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Desktop App Banner */}
      {showElectronBanner && (
        <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-blue-900">Enhanced WhatsApp Features</p>
                  <p className="text-sm text-blue-700">Download desktop app for persistent WhatsApp login & direct messaging</p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => (window.location.href = '/download')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Download App
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Connection Status Card */}
      <Card className={`border-0 shadow-xl ${whatsappConnected ? 'bg-gradient-to-r from-green-50 to-emerald-50' : 'bg-gradient-to-r from-gray-50 to-slate-50'}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${whatsappConnected ? 'bg-green-500' : 'bg-gray-400'}`}>
                <MessageCircle className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg">WhatsApp Web</h3>
                <div className="flex items-center gap-2">
                  {whatsappConnected ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-600 font-medium">Connected & Ready to Send</span>
                    </>
                  ) : connecting ? (
                    <>
                      <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
                      <span className="text-sm text-orange-600">Opening WhatsApp...</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-500">Not Connected - Login Required</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {whatsappConnected ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.electronAPI?.openWhatsAppWeb && window.electronAPI.openWhatsAppWeb()}
                  >
                    <Maximize2 className="w-4 h-4 mr-1" />
                    Open WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnect}
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4 mr-1" />
                    Logout
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleConnectWhatsApp}
                  disabled={connecting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {connecting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Opening...</>
                  ) : (
                    <><QrCode className="w-4 h-4 mr-2" /> Login to WhatsApp</>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Connection Instructions */}
          {!whatsappConnected && !connecting && (
            <div className="mt-4 p-4 bg-white rounded-xl border border-gray-200">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Smartphone className="w-4 h-4" /> How to Connect (One-time Setup)
              </h4>
              <ol className="text-sm text-gray-600 space-y-1">
                <li>1. Click "Login to WhatsApp" button above</li>
                <li>2. WhatsApp Web will open inside the app</li>
                <li>3. Open WhatsApp on your phone → Settings → Linked Devices</li>
                <li>4. Scan the QR code - <strong>you'll stay logged in!</strong></li>
              </ol>
            </div>
          )}

          {/* Bulk Progress */}
          {bulkProgress && (
            <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700">Sending messages...</span>
                <span className="text-sm text-blue-600">{bulkProgress.current} / {bulkProgress.total}</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                ></div>
              </div>
              {bulkProgress.contact && (
                <p className="text-xs text-blue-600 mt-1">Current: {bulkProgress.contact}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
        {[
          { id: 'single', label: 'Single Message', icon: Send },
          { id: 'bulk', label: 'Bulk Messages', icon: Users },
          { id: 'templates', label: 'Templates', icon: Zap }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-all ${
              activeTab === tab.id ? 'bg-white shadow text-green-600' : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Single Message Tab */}
      {activeTab === 'single' && (
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              Send WhatsApp Message
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Phone Number (with country code)</Label>
              <Input
                placeholder="+91 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">Include country code (e.g., +91 for India)</p>
            </div>
            <div>
              <Label>Approved Utility Template</Label>
              <select
                className="w-full px-3 py-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
              >
                {quickMessages.map((template) => (
                  <option key={`${template.templateName}-${template.title}`} value={template.templateName}>
                    {template.title}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">{selectedTemplateConfig.description}</p>
            </div>
            <div>
              <Label>Customer Name</Label>
              <Input
                placeholder="Customer"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div>
              <Label>Restaurant Name</Label>
              <Input
                placeholder="Restaurant"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
              />
            </div>
            <div>
              <Label>Order ID</Label>
              <Input
                placeholder="ORDER001"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
              />
            </div>
            <div>
              <Label>Amount</Label>
              <Input
                placeholder="INR 450.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            {/* Quick Templates */}
            <div>
              <Label className="mb-2 block">Quick Templates</Label>
              <div className="grid grid-cols-3 gap-2">
                {quickMessages.map((template, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedTemplate(template.templateName)}
                    className="p-2 text-left border rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors text-xs"
                  >
                    <p className="font-medium truncate">{template.title}</p>
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={sendSingleMessage}
              disabled={sending || !phone || !selectedTemplate}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
            >
              {sending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
              ) : (
                <><Send className="w-4 h-4 mr-2" /> Send Template</>
              )}
            </Button>

            <p className="text-xs text-center text-orange-600">
              Business-initiated WhatsApp sends must use approved utility templates outside the 24-hour window.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Bulk Messages Tab */}
      {activeTab === 'bulk' && (
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Bulk WhatsApp Messages
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Contacts (Name:Phone, one per line)</Label>
              <textarea
                className="w-full px-3 py-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                rows={6}
                placeholder={`John Doe:+919876543210\nJane Smith:+919876543211\nRaj Kumar:+919876543212`}
                value={bulkContacts}
                onChange={(e) => setBulkContacts(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Format: Name:Phone (one per line). Use {'{name}'} in message for personalization.
              </p>
            </div>
            <div>
              <Label>Bulk Message</Label>
              <textarea
                className="w-full px-3 py-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Hi {name}! We have a special offer for you..."
                value={bulkMessage}
                onChange={(e) => setBulkMessage(e.target.value)}
              />
            </div>

            <Button
              onClick={sendBulkMessages}
              disabled={sending || !bulkContacts || !bulkMessage}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
            >
              {sending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
              ) : (
                <><Users className="w-4 h-4 mr-2" /> Send Bulk Messages</>
              )}
            </Button>
            <p className="text-xs text-gray-500 text-center">
              Messages will be sent with 4-second intervals
            </p>
          </CardContent>
        </Card>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-600" />
              Message Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quickMessages.map((template, index) => (
                <div
                  key={index}
                  className="p-4 border rounded-xl hover:bg-purple-50 hover:border-purple-300 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedTemplate(template.templateName);
                    setActiveTab('single');
                    toast.success(`Template "${template.title}" loaded`);
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">{template.title}</h4>
                    <Button size="sm" variant="outline" className="text-xs">Use</Button>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-3">{template.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
              <h4 className="font-medium mb-2">Template Parameters</h4>
              <p className="text-xs text-gray-600 mb-3">These values are sent as template body parameters:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <code className="bg-white px-2 py-1 rounded border">customer_name</code>
                <code className="bg-white px-2 py-1 rounded border">restaurant_name</code>
                <code className="bg-white px-2 py-1 rounded border">order_id</code>
                <code className="bg-white px-2 py-1 rounded border">amount</code>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WhatsAppDesktop;
