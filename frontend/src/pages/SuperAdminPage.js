import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { 
  Users, Ticket, TrendingUp, Shield, 
  CheckCircle, Clock, XCircle, UserPlus, Calendar, CreditCard,
  Mail, FileText, Upload, RefreshCw, Lock, Download, Eye, X, Save,
  Smartphone, Monitor, Package, Plus, Trash2, Edit, ExternalLink,
  Database, HardDrive, Tag, Gift, Percent, DollarSign, Bell, Send, MessageSquare,
  Activity, Server, Zap, Globe, BarChart3, Settings, AlertTriangle, CheckSquare,
  Filter, Search, SortAsc, SortDesc, Copy, Share2, Star, Heart, Target,
  Layers, Code, Terminal, Wifi, WifiOff, CloudOff, Cloud, Cpu, MemoryStick,
  PieChart, LineChart, AreaChart, TrendingDown, ArrowUp, ArrowDown, Minus,
  PlayCircle, PauseCircle, StopCircle, SkipForward, Rewind, Volume2, VolumeX,
  Bookmark, BookOpen, Lightbulb, Sparkles, Flame, Rocket, Crown, Award,
  UserCheck, ChevronLeft, ChevronRight
} from 'lucide-react';

const SuperAdminPage = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [userType, setUserType] = useState(null); // 'super-admin' or 'team'
  const [teamUser, setTeamUser] = useState(null);
  const [teamToken, setTeamToken] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [leads, setLeads] = useState([]);
  const [leadsStats, setLeadsStats] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamStats, setTeamStats] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  // Blog management state
  const [blogPosts, setBlogPosts] = useState([]);
  const [showBlogForm, setShowBlogForm] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [blogForm, setBlogForm] = useState({
    title: '', slug: '', metaTitle: '', metaDescription: '', excerpt: '',
    category: 'Software Guide', content: '', readTime: '5 min read',
    image: '', imageAlt: '', primaryKeyword: '', targetMarket: 'India',
    status: 'published', contentType: 'standard', featured: false,
    leadMagnet: false, appPromo: false,
  });
  const [showCreateLead, setShowCreateLead] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [subscriptionMonths, setSubscriptionMonths] = useState(12);
  const [subscriptionAmount, setSubscriptionAmount] = useState(999);
  const [promoTarget, setPromoTarget] = useState(null);
  const [promoForm, setPromoForm] = useState({
    subject: '',
    html_body: '',
    text_body: '',
    cc_support: true
  });
  const [sendingPromo, setSendingPromo] = useState(false);
  const [selectedPromoTemplate, setSelectedPromoTemplate] = useState('custom');

  const promoTemplates = [
    {
      id: 'custom',
      name: 'Custom',
      subject: '',
      html: '',
      text: ''
    },
    {
      id: 'trial-ends',
      name: 'Trial Ending Soon',
      subject: 'Your BillByteKOT trial is ending soon',
      html: `
        <div style="margin:0;padding:0;background:#f3f6ff;">
          <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5edff;">
            <div style="background:linear-gradient(135deg,#2563eb,#60a5fa);padding:28px 28px 22px;color:#fff;">
              <div style="font-size:14px;letter-spacing:.14em;text-transform:uppercase;opacity:.85;">BillByteKOT</div>
              <div style="font-size:28px;font-weight:800;margin:6px 0 2px;">Your trial ends soon</div>
              <div style="font-size:14px;opacity:.9;">Keep billing active without interruption</div>
            </div>
            <div style="padding:24px 28px 6px;">
              <div style="font-size:16px;color:#0f172a;">Hi {{name}},</div>
              <div style="font-size:15px;color:#334155;line-height:1.7;margin-top:8px;">
                Your BillByteKOT free trial is about to end. Upgrade now to keep unlimited bills, KOT workflow, reports, and WhatsApp sharing running smoothly.
              </div>
              <div style="font-size:14px;color:#475569;line-height:1.7;margin-top:10px;">
                Most restaurants upgrade before the trial ends to avoid billing interruptions during rush hours.
              </div>
            </div>
            <div style="padding:14px 28px 24px;">
              <a href="https://billbytekot.in/subscription" style="display:inline-block;background:#1d4ed8;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700;margin-right:8px;">Upgrade Now</a>
              <a href="https://shorturl.at/CLDN3" style="display:inline-block;background:#0f172a;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700;">Get App</a>
            </div>
            <div style="padding:14px 28px 26px;background:#f8fafc;border-top:1px solid #e2e8f0;">
              <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;justify-content:space-between;">
                <div style="font-size:12px;color:#64748b;">?? <a href="https://shorturl.at/CLDN3" style="color:#2563eb;text-decoration:none;">Play Store</a> &nbsp;?&nbsp; ?? <a href="https://wa.me/919353685739" style="color:#2563eb;text-decoration:none;">WhatsApp</a> &nbsp;?&nbsp; ?? <a href="tel:+919353685739" style="color:#2563eb;text-decoration:none;">Call +91 93536 85739</a></div>
                <div style="font-size:12px;color:#94a3b8;">Reply to this email for help.</div>
              </div>
            </div>
          </div>
        </div>
`.trim(),
      text: 'Hi {{name}}, your BillByteKOT trial is about to end. Upgrade now to keep unlimited billing. https://billbytekot.in/subscription'
    },
    {
      id: 'last-day',
      name: 'Last Day Urgency',
      subject: 'Last day to keep your billing active',
      html: `
        <div style="margin:0;padding:0;background:#fff7ed;">
          <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #fed7aa;">
            <div style="background:linear-gradient(135deg,#f97316,#fb923c);padding:28px;color:#fff;">
              <div style="font-size:14px;letter-spacing:.14em;text-transform:uppercase;opacity:.9;">Final Reminder</div>
              <div style="font-size:28px;font-weight:800;margin:6px 0 2px;">Your trial ends today</div>
              <div style="font-size:14px;opacity:.9;">Keep billing live without delay</div>
            </div>
            <div style="padding:24px 28px 6px;">
              <div style="font-size:16px;color:#0f172a;">Hi {{name}},</div>
              <div style="font-size:16px;font-weight:700;margin:8px 0;color:#0f172a;">Continue unlimited bills, reports, and WhatsApp sharing</div>
              <div style="font-size:14px;color:#475569;line-height:1.7;">Upgrade now to avoid interruptions during peak hours. Most users upgrade on the final day to keep the flow smooth.</div>
            </div>
            <div style="padding:14px 28px 24px;">
              <a href="https://billbytekot.in/subscription" style="display:inline-block;background:#ea580c;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700;margin-right:8px;">Upgrade Today</a>
              <a href="https://shorturl.at/CLDN3" style="display:inline-block;background:#0f172a;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700;">Get App</a>
            </div>
            <div style="padding:14px 28px 26px;background:#fff7ed;border-top:1px solid #fde68a;">
              <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;justify-content:space-between;">
                <div style="font-size:12px;color:#7c2d12;">?? <a href="https://shorturl.at/CLDN3" style="color:#ea580c;text-decoration:none;">Play Store</a> &nbsp;?&nbsp; ?? <a href="https://wa.me/919353685739" style="color:#ea580c;text-decoration:none;">WhatsApp</a> &nbsp;?&nbsp; ?? <a href="tel:+919353685739" style="color:#ea580c;text-decoration:none;">Call +91 93536 85739</a></div>
                <div style="font-size:12px;color:#9a3412;">Reply to this email for help.</div>
              </div>
            </div>
          </div>
        </div>
`.trim(),
      text: 'Hi {{name}}, your trial ends today. Upgrade now: https://billbytekot.in/subscription'
    },
    {
      id: 'offer',
      name: 'Poster Offer + Play Store',
      subject: 'Limited-time offer on BillByteKOT',
      html: `
        <div style="margin:0;padding:0;background:#f2f6ff;">
          <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e6eefc;">
            <div style="background:linear-gradient(135deg,#2563eb,#60a5fa);padding:28px;color:#fff;text-align:left;">
              <div style="font-size:14px;letter-spacing:.14em;text-transform:uppercase;opacity:.9;">BillByteKOT</div>
              <div style="font-size:30px;font-weight:800;margin:6px 0 2px;">Upgrade & Save</div>
              <div style="font-size:14px;opacity:.9;">Limited-time promotional offer</div>
            </div>
            <div style="padding:24px 28px 6px;">
              <div style="font-size:16px;color:#0f172a;">Hi {{name}},</div>
              <div style="font-size:20px;font-weight:700;margin:8px 0;color:#0f172a;">Unlock Unlimited Bills & Premium Features</div>
              <div style="font-size:14px;color:#475569;line-height:1.7;">Keep your billing, KOT, reports and WhatsApp bill sharing running without limits. Upgrade now and get priority support.</div>
            </div>
            <div style="padding:14px 28px 18px;">
              <a href="https://billbytekot.in/subscription" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700;margin-right:8px;">Get Offer</a>
              <a href="https://shorturl.at/CLDN3" style="display:inline-block;background:#0f172a;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700;">Download App</a>
            </div>
            <div style="padding:14px 28px 26px;background:#f8fafc;border-top:1px solid #e2e8f0;">
              <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;justify-content:space-between;">
                <div style="font-size:12px;color:#64748b;">?? <a href="https://shorturl.at/CLDN3" style="color:#2563eb;text-decoration:none;">Play Store</a> &nbsp;?&nbsp; ?? <a href="https://wa.me/919353685739" style="color:#2563eb;text-decoration:none;">WhatsApp</a> &nbsp;?&nbsp; ?? <a href="tel:+919353685739" style="color:#2563eb;text-decoration:none;">Call +91 93536 85739</a></div>
                <div style="font-size:12px;color:#94a3b8;">Reply to this email for help.</div>
              </div>
            </div>
          </div>
        </div>
`.trim(),
      text: 'Hi {{name}}, limited-time offer on BillByteKOT. Upgrade: https://billbytekot.in/subscription Download app: https://shorturl.at/CLDN3'
    },
    {
      id: 'social-proof',
      name: 'Social Proof',
      subject: 'Join 10,000+ restaurants on BillByteKOT',
      html: `
        <div style="margin:0;padding:0;background:#f8fafc;">
          <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e2e8f0;">
            <div style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:26px;color:#fff;">
              <div style="font-size:14px;letter-spacing:.14em;text-transform:uppercase;opacity:.8;">Trusted by 10,000+</div>
              <div style="font-size:28px;font-weight:800;margin:6px 0 2px;">Restaurants choose BillByteKOT</div>
              <div style="font-size:14px;opacity:.9;">Faster billing ? Fewer errors ? Higher sales</div>
            </div>
            <div style="padding:24px 28px 6px;">
              <div style="font-size:16px;color:#0f172a;">Hi {{name}},</div>
              <div style="font-size:14px;color:#475569;line-height:1.7;margin-top:8px;">Teams report faster billing and better customer experience after switching to BillByteKOT. Try premium features now and scale your operations.</div>
            </div>
            <div style="padding:14px 28px 24px;">
              <a href="https://billbytekot.in/subscription" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700;margin-right:8px;">Upgrade Now</a>
              <a href="https://shorturl.at/CLDN3" style="display:inline-block;background:#0f172a;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700;">Get App</a>
            </div>
            <div style="padding:14px 28px 26px;background:#f1f5f9;border-top:1px solid #e2e8f0;">
              <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;justify-content:space-between;">
                <div style="font-size:12px;color:#64748b;">?? <a href="https://shorturl.at/CLDN3" style="color:#2563eb;text-decoration:none;">Play Store</a> &nbsp;?&nbsp; ?? <a href="https://wa.me/919353685739" style="color:#2563eb;text-decoration:none;">WhatsApp</a> &nbsp;?&nbsp; ?? <a href="tel:+919353685739" style="color:#2563eb;text-decoration:none;">Call +91 93536 85739</a></div>
                <div style="font-size:12px;color:#94a3b8;">Reply to this email for help.</div>
              </div>
            </div>
          </div>
        </div>
`.trim(),
      text: 'Hi {{name}}, join 10,000+ restaurants on BillByteKOT. Upgrade: https://billbytekot.in/subscription'
    },
    {
      id: 'feature',
      name: 'New Feature Update',
      subject: 'New features are live in BillByteKOT',
      html: `
        <div style="margin:0;padding:0;background:#f0fdf4;">
          <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #bbf7d0;">
            <div style="background:linear-gradient(135deg,#16a34a,#22c55e);padding:26px;color:#fff;">
              <div style="font-size:14px;letter-spacing:.14em;text-transform:uppercase;opacity:.85;">Product Update</div>
              <div style="font-size:28px;font-weight:800;margin:6px 0 2px;">New features are live</div>
              <div style="font-size:14px;opacity:.9;">Faster workflows for your team</div>
            </div>
            <div style="padding:24px 28px 6px;">
              <div style="font-size:16px;color:#0f172a;">Hi {{name}},</div>
              <div style="font-size:14px;color:#475569;line-height:1.7;margin-top:8px;">We just shipped improvements across billing, reports, and performance. Log in to explore the latest updates and get more done in less time.</div>
            </div>
            <div style="padding:14px 28px 24px;">
              <a href="https://billbytekot.in/login" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700;margin-right:8px;">Open Dashboard</a>
              <a href="https://shorturl.at/CLDN3" style="display:inline-block;background:#0f172a;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700;">Get App</a>
            </div>
            <div style="padding:14px 28px 26px;background:#f0fdf4;border-top:1px solid #bbf7d0;">
              <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;justify-content:space-between;">
                <div style="font-size:12px;color:#15803d;">?? <a href="https://shorturl.at/CLDN3" style="color:#16a34a;text-decoration:none;">Play Store</a> &nbsp;?&nbsp; ?? <a href="https://wa.me/919353685739" style="color:#16a34a;text-decoration:none;">WhatsApp</a> &nbsp;?&nbsp; ?? <a href="tel:+919353685739" style="color:#16a34a;text-decoration:none;">Call +91 93536 85739</a></div>
                <div style="font-size:12px;color:#86efac;">Reply to this email for help.</div>
              </div>
            </div>
          </div>
        </div>
`.trim(),
      text: 'Hi {{name}}, new features are live in BillByteKOT. Log in: https://billbytekot.in/login'
    },
    {
      id: 'app-install',
      name: 'App Install Focus',
      subject: 'Get BillByteKOT on your phone',
      html: `
        <div style="margin:0;padding:0;background:#ecfeff;">
          <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #bae6fd;">
            <div style="background:linear-gradient(135deg,#06b6d4,#22d3ee);padding:26px;color:#fff;">
              <div style="font-size:14px;letter-spacing:.14em;text-transform:uppercase;opacity:.85;">Get the App</div>
              <div style="font-size:28px;font-weight:800;margin:6px 0 2px;">Install BillByteKOT</div>
              <div style="font-size:14px;opacity:.9;">Fast billing ? Quick KOT ? Live reports</div>
            </div>
            <div style="padding:24px 28px 6px;">
              <div style="font-size:16px;color:#0f172a;">Hi {{name}},</div>
              <div style="font-size:14px;color:#475569;line-height:1.7;margin-top:8px;">Keep billing smooth even during rush hours. Use the app for faster order entry and billing on the go.</div>
            </div>
            <div style="padding:14px 28px 24px;">
              <a href="https://shorturl.at/CLDN3" style="display:inline-block;background:#0f172a;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700;margin-right:8px;">Download on Play Store</a>
              <a href="https://billbytekot.in/login" style="display:inline-block;background:#06b6d4;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700;">Open Web</a>
            </div>
            <div style="padding:14px 28px 26px;background:#ecfeff;border-top:1px solid #bae6fd;">
              <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;justify-content:space-between;">
                <div style="font-size:12px;color:#0e7490;">?? <a href="https://shorturl.at/CLDN3" style="color:#0ea5e9;text-decoration:none;">Play Store</a> &nbsp;?&nbsp; ?? <a href="https://wa.me/919353685739" style="color:#0ea5e9;text-decoration:none;">WhatsApp</a> &nbsp;?&nbsp; ?? <a href="tel:+919353685739" style="color:#0ea5e9;text-decoration:none;">Call +91 93536 85739</a></div>
                <div style="font-size:12px;color:#7dd3fc;">Reply to this email for help.</div>
              </div>
            </div>
          </div>
        </div>
`.trim(),
      text: 'Hi {{name}}, download BillByteKOT app: https://shorturl.at/CLDN3'
    }
  ];

  // Auto-calculate subscription amount based on months
  useEffect(() => {
    const calculateAmount = (months) => {
      const pricing = {
        1: 199,    // 1 month
        3: 499,    // 3 months  
        6: 899,    // 6 months
        12: 1599,  // 12 months (1 year)
        24: 2999   // 24 months (2 years)
      };
      return pricing[months] || 999;
    };
    
    setSubscriptionAmount(calculateAmount(subscriptionMonths));
  }, [subscriptionMonths]);
  const [paymentId, setPaymentId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('manual');
  const [paymentProofUrl, setPaymentProofUrl] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [sendInvoice, setSendInvoice] = useState(true);
  const [newLead, setNewLead] = useState({ name: '', email: '', phone: '', businessName: '', notes: '' });
  const [newTeamMember, setNewTeamMember] = useState({ 
    username: '', email: '', password: '', role: 'sales', permissions: [], full_name: '', phone: '' 
  });
  const [editingTeamMember, setEditingTeamMember] = useState(null);

  // Enhanced state for new features
  const [systemHealth, setSystemHealth] = useState(null);
  const [realTimeStats, setRealTimeStats] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [showSystemLogs, setShowSystemLogs] = useState(false);
  const [systemLogs, setSystemLogs] = useState([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [exportFormat, setExportFormat] = useState('json');
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [recentActivities, setRecentActivities] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState(null);
  const [alertsConfig, setAlertsConfig] = useState({
    lowDiskSpace: true,
    highCpuUsage: true,
    failedLogins: true,
    systemErrors: true
  });
  const [customDashboard, setCustomDashboard] = useState({
    widgets: ['users', 'revenue', 'tickets', 'performance'],
    layout: 'grid'
  });

  // Additional state variables
  const [showEditTeamModal, setShowEditTeamModal] = useState(false);
  const [appVersions, setAppVersions] = useState([]);
  const [showAppVersionModal, setShowAppVersionModal] = useState(false);
  const [editingVersion, setEditingVersion] = useState(null);
  const [newAppVersion, setNewAppVersion] = useState({
    platform: 'android',
    version: '',
    version_code: 1,
    download_url: '',
    release_notes: '',
    min_supported_version: '',
    is_mandatory: false,
    file_size: ''
  });
  const [appFile, setAppFile] = useState(null);
  const [uploadingApp, setUploadingApp] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const appFileRef = useRef(null);

  // Sale/Offer Day Feature
  const [saleOffer, setSaleOffer] = useState({
    enabled: false,
    title: '',
    subtitle: '',
    discount_text: '',
    badge_text: '',
    bg_color: 'from-red-500 to-orange-500',
    end_date: '',
    valid_until: '', // Exact datetime when offer expires
    theme: 'default', // Theme: default, diwali, christmas, newyear, flash, blackfriday, summer, republic, holi
    banner_design: 'gradient-wave', // Top banner design
    discount_percent: 20,
    original_price: 1999,
    sale_price: 1599,
    cta_text: 'Grab This Deal Now!',
    urgency_text: 'âš¡ Limited slots available. Offer ends soon!'
  });
  const [showSaleOfferModal, setShowSaleOfferModal] = useState(false);
  const [savingSaleOffer, setSavingSaleOffer] = useState(false);

  // Pricing Management
  const [pricing, setPricing] = useState({
    regular_price: 1999,
    regular_price_display: 'â‚¹1999',
    campaign_price: 1799,
    campaign_price_display: 'â‚¹1799',
    campaign_active: false,
    campaign_name: '',
    campaign_discount_percent: 10,
    campaign_start_date: '',
    campaign_end_date: '',
    trial_expired_discount: 10,
    trial_days: 7,
    subscription_months: 12,
    referral_discount: 200,
    referral_reward: 300
  });
  const [savingPricing, setSavingPricing] = useState(false);
  const [showBusinessDetails, setShowBusinessDetails] = useState(false);
  const [businessDetails, setBusinessDetails] = useState(null);
  const [businessDetailsLoading, setBusinessDetailsLoading] = useState(false);
  // User navigation state for Previous/Next buttons (Requirements 10.5)
  const [userNavigation, setUserNavigation] = useState({
    previousUserId: null,
    nextUserId: null,
    currentPosition: 0,
    totalUsers: 0
  });
  const [exportingData, setExportingData] = useState(null);
  const [exportingDb, setExportingDb] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importUserId, setImportUserId] = useState(null);
  const [importUsername, setImportUsername] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [importReplaceMode, setImportReplaceMode] = useState(false);
  const [importing, setImporting] = useState(false);
  const importFileRef = useRef(null);
  const invoiceRef = useRef(null);

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [notificationTemplates, setNotificationTemplates] = useState([]);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  // Referrals Tab State (Requirements 7.1, 7.2, 7.3, 7.4, 7.5)
  const [referrals, setReferrals] = useState([]);
  const [referralAnalytics, setReferralAnalytics] = useState(null);
  const [referralStatusFilter, setReferralStatusFilter] = useState('all');
  const [referralPage, setReferralPage] = useState(0);
  const [referralTotal, setReferralTotal] = useState(0);
  const [referralHasMore, setReferralHasMore] = useState(false);
  const [exportingReferrals, setExportingReferrals] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  
  // Campaign Management State (Requirements 9.1, 9.2, 9.3)
  const [showCreateCampaignModal, setShowCreateCampaignModal] = useState(false);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [campaignError, setCampaignError] = useState('');
  const [newCampaign, setNewCampaign] = useState({
    title: '',
    description: '',
    discount_percentage: 10,
    discount_amount: null,
    start_date: '',
    end_date: '',
    theme: 'default',
    banner_text: '',
    banner_color: '#FF6B35'
  });
  
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    type: 'info',
    target: 'all',
    target_users: [],
    action_url: '',
    action_label: '',
    priority: 'normal',
    expires_at: ''
  });
  const [sendingNotification, setSendingNotification] = useState(false);
  const [pushStats, setPushStats] = useState({ 
    active_subscriptions: 0, total_subscriptions: 0, recent_subscriptions: [] 
  });

  // Auto-refresh effect
  useEffect(() => {
    let interval;
    if (authenticated && autoRefresh) {
      interval = setInterval(() => {
        fetchRealTimeStats();
        fetchSystemHealth();
      }, refreshInterval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [authenticated, autoRefresh, refreshInterval]);

  // Load dashboard data when authenticated
  useEffect(() => {
    if (authenticated && activeTab === 'dashboard') {
      fetchDashboard();
    }
  }, [authenticated]);

  // Fetch real-time statistics
  const fetchRealTimeStats = async () => {
    try {
      const response = await axios.get(`${API}/super-admin/real-time-stats`, {
        params: credentials
      });
      setRealTimeStats(response.data);
    } catch (error) {
      console.error('Failed to fetch real-time stats:', error);
    }
  };

  // Fetch system health
  const fetchSystemHealth = async () => {
    try {
      const response = await axios.get(`${API}/super-admin/system/health`, {
        params: credentials
      });
      setSystemHealth(response.data);
    } catch (error) {
      console.error('Failed to fetch system health:', error);
    }
  };

  // Fetch recent activities
  const fetchRecentActivities = async () => {
    try {
      const response = await axios.get(`${API}/super-admin/activities`, {
        params: { ...credentials, limit: 20 }
      });
      setRecentActivities(response.data.activities || []);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    }
  };

  // Fetch performance metrics
  const fetchPerformanceMetrics = async () => {
    try {
      const response = await axios.get(`${API}/super-admin/performance`, {
        params: credentials
      });
      setPerformanceMetrics(response.data);
    } catch (error) {
      console.error('Failed to fetch performance metrics:', error);
    }
  };

  // Fetch system logs
  const fetchSystemLogs = async () => {
    try {
      const response = await axios.get(`${API}/super-admin/system/logs`, {
        params: { ...credentials, limit: 100 }
      });
      setSystemLogs(response.data.logs || []);
      setShowSystemLogs(true);
    } catch (error) {
      toast.error('Failed to fetch system logs');
    }
  };

  // Bulk actions for users
  const handleBulkAction = async () => {
    if (!bulkAction || selectedUsers.length === 0) {
      toast.error('Please select users and an action');
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${API}/super-admin/bulk-action`, {
        action: bulkAction,
        user_ids: selectedUsers
      }, { params: credentials });
      
      toast.success(`Bulk action "${bulkAction}" completed for ${selectedUsers.length} users`);
      setSelectedUsers([]);
      setBulkAction('');
      setShowBulkModal(false);
      fetchUsers(); // Only refresh users after bulk action
    } catch (error) {
      toast.error('Bulk action failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Export data in different formats
  const exportData = async (type, format = 'json') => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/super-admin/export/${type}`, {
        params: { ...credentials, format, ...dateRange },
        responseType: format === 'csv' ? 'blob' : 'json'
      });

      if (format === 'csv') {
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${type}_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const dataStr = JSON.stringify(response.data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${type}_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      toast.success(`${type} data exported successfully`);
    } catch (error) {
      toast.error('Export failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Quick action shortcuts
  const quickActions = [
    {
      id: 'backup',
      label: 'Create Backup',
      icon: Database,
      color: 'bg-blue-500',
      action: () => exportData('full-backup', 'json')
    },
    {
      id: 'system-logs',
      label: 'View System Logs',
      icon: Terminal,
      color: 'bg-gray-500',
      action: fetchSystemLogs
    },
    {
      id: 'system-check',
      label: 'System Check',
      icon: Activity,
      color: 'bg-green-500',
      action: fetchSystemHealth
    },
    {
      id: 'user-stats',
      label: 'User Analytics',
      icon: BarChart3,
      color: 'bg-orange-500',
      action: () => handleTabSwitch('analytics')
    }
  ];

  // Filter and sort functions (Requirements 3.5, 3.6, 3.7)
  const getFilteredUsers = () => {
    let filtered = users.filter(user => {
      // Search filter (Requirements 3.6)
      const matchesSearch = !searchQuery || 
        (user.username && user.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Status filter (Requirements 3.5)
      let matchesStatus = true;
      if (filterStatus === 'active') {
        matchesStatus = user.subscription_active === true;
      } else if (filterStatus === 'trial') {
        // Trial users: not active subscription and either no expiry or expiry in future
        matchesStatus = !user.subscription_active && 
          (!user.subscription_expires_at || new Date(user.subscription_expires_at) >= new Date());
      } else if (filterStatus === 'expired') {
        // Expired users: subscription has expired (expiry date in the past)
        matchesStatus = user.subscription_expires_at && 
          new Date(user.subscription_expires_at) < new Date();
      }
      // 'all' shows everything
      
      return matchesSearch && matchesStatus;
    });

    // Sort users (Requirements 3.7)
    filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      // Handle date fields
      if (sortBy === 'created_at' || sortBy === 'subscription_expires_at') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }
      
      // Handle string fields (case-insensitive)
      if (sortBy === 'username' || sortBy === 'email') {
        aVal = (aVal || '').toLowerCase();
        bVal = (bVal || '').toLowerCase();
      }
      
      // Handle numeric fields
      if (sortBy === 'bill_count') {
        aVal = aVal || 0;
        bVal = bVal || 0;
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    return filtered;
  };

  // Generate invoice number with format: BBK/2025-26/INV/0001
  const generateInvoiceNumber = (existingInvoiceNo = null) => {
    if (existingInvoiceNo) return existingInvoiceNo;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const fiscalYear = month >= 4 ? `${year}-${(year + 1).toString().slice(-2)}` : `${year - 1}-${year.toString().slice(-2)}`;
    const timestamp = Date.now().toString().slice(-6);
    return `BBK/${fiscalYear}/INV/${timestamp}`;
  };

  // Convert number to words for Indian currency
  const numberToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if (num === 0) return 'Zero';
    
    const convertLessThanThousand = (n) => {
      if (n === 0) return '';
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
      return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertLessThanThousand(n % 100) : '');
    };
    
    const intPart = Math.floor(num);
    const decPart = Math.round((num - intPart) * 100);
    let result = '';
    
    if (intPart >= 10000000) {
      result += convertLessThanThousand(Math.floor(intPart / 10000000)) + ' Crore ';
      num = intPart % 10000000;
    }
    if (intPart >= 100000) {
      result += convertLessThanThousand(Math.floor((intPart % 10000000) / 100000)) + ' Lakh ';
    }
    if (intPart >= 1000) {
      result += convertLessThanThousand(Math.floor((intPart % 100000) / 1000)) + ' Thousand ';
    }
    result += convertLessThanThousand(intPart % 1000);
    result = result.trim() + ' Rupees';
    
    if (decPart > 0) {
      result += ' and ' + convertLessThanThousand(decPart) + ' Paise';
    }
    return result + ' Only';
  };

  // Check if team member has specific permission
  const hasPermission = (permission) => {
    if (userType === 'super-admin') return true;
    if (!teamUser) return false;
    return teamUser.permissions?.includes(permission) || false;
  };

  // Get available tabs based on user type and permissions
  const getAvailableTabs = () => {
    if (userType === 'super-admin') {
      return ['dashboard', 'users', 'leads', 'team', 'tickets', 'analytics', 'app-versions', 'promotions', 'pricing', 'referrals', 'notifications', 'blog'];
    }
    const tabs = [];
    if (hasPermission('analytics')) tabs.push('dashboard');
    if (hasPermission('users')) tabs.push('users');
    if (hasPermission('leads')) tabs.push('leads');
    if (hasPermission('tickets')) tabs.push('tickets');
    return tabs.length > 0 ? tabs : ['tickets']; // Default to tickets if no permissions
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Use super admin login endpoint
      const response = await axios.get(`${API}/super-admin/login`, {
        params: credentials
      });
      
      if (response.data.success) {
        setUserType('super-admin');
        setAuthenticated(true);
        toast.success('Super Admin access granted');
        // Only fetch dashboard data initially
        fetchDashboard();
      } else {
        toast.error('Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Invalid credentials or server error');
    } finally {
      setLoading(false);
    }
  };

  const getAvailableTabsForUser = (user) => {
    const tabs = [];
    if (user.permissions?.includes('analytics')) tabs.push('dashboard');
    if (user.permissions?.includes('users')) tabs.push('users');
    if (user.permissions?.includes('leads')) tabs.push('leads');
    if (user.permissions?.includes('tickets')) tabs.push('tickets');
    return tabs.length > 0 ? tabs : ['tickets'];
  };

  // Individual fetch functions for each tab
  const fetchDashboard = async () => {
    try {
      const dashboardRes = await axios.get(`${API}/super-admin/stats/basic`, {
        params: credentials
      });
      setDashboard({
        overview: {
          total_users: dashboardRes.data.total_users,
          total_orders: dashboardRes.data.total_orders,
          active_users: dashboardRes.data.active_users,
          recent_orders: dashboardRes.data.recent_orders
        }
      });
    } catch (e) {
      console.error('Failed to fetch dashboard data', e);
    }
  };

  // State for user fetch error and retry (Requirements 3.4)
  const [usersFetchError, setUsersFetchError] = useState(null);
  const [usersLoading, setUsersLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      setUsersFetchError(null);
      const usersRes = await axios.get(`${API}/super-admin/users/list`, {
        params: credentials
      });
      setUsers(usersRes.data.users || []);
    } catch (e) {
      console.error('Failed to fetch users', e);
      setUsers([]);
      setUsersFetchError(e.response?.data?.detail || e.message || 'Failed to fetch users');
      toast.error('Failed to fetch users. Click retry to try again.');
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchLeads = async () => {
    try {
      const leadsRes = await axios.get(`${API}/super-admin/leads`, {
        params: credentials
      });
      setLeads(leadsRes.data.leads || []);
      setLeadsStats(leadsRes.data.stats || null);
    } catch (e) {
      console.error('Failed to fetch leads', e);
      setLeads([]);
      setLeadsStats(null);
    }
  };

  const fetchTeam = async () => {
    try {
      const teamRes = await axios.get(`${API}/super-admin/team`, {
        params: credentials
      });
      setTeamMembers(teamRes.data.team_members || []);
      setTeamStats(teamRes.data.stats || null);
    } catch (e) {
      console.error('Failed to fetch team members', e);
      setTeamMembers([]);
      setTeamStats(null);
    }
  };

  const fetchTickets = async () => {
    try {
      const ticketsRes = await axios.get(`${API}/super-admin/tickets`, {
        params: credentials
      });
      setTickets(ticketsRes.data.tickets || []);
    } catch (e) {
      console.error('Failed to fetch tickets', e);
      setTickets([]);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const analyticsRes = await axios.get(`${API}/super-admin/stats/revenue`, {
        params: { ...credentials, days: 30 }
      });
      setAnalytics(analyticsRes.data);
    } catch (e) {
      console.error('Failed to fetch analytics', e);
    }
  };

  const fetchAppVersions = async () => {
    try {
      const appVersionsRes = await axios.get(`${API}/super-admin/app-versions`, {
        params: credentials
      });
      setAppVersions(appVersionsRes.data.versions || []);
    } catch (e) {
      console.error('Failed to fetch app versions', e);
      setAppVersions([]);
    }
  };

  const fetchPricing = async () => {
    try {
      const pricingRes = await axios.get(`${API}/super-admin/pricing`, {
        params: credentials
      });
      if (pricingRes.data) {
        setPricing(pricingRes.data);
      }
    } catch (e) {
      console.log('Pricing endpoint not available');
    }
  };

  const fetchPromotions = async () => {
    try {
      const campaignsRes = await axios.get(`${API}/super-admin/campaigns`, {
        params: credentials
      });
      // Set campaigns data (you may need to add state for this)
      setCampaigns(campaignsRes.data.campaigns || []);
      
      // Also fetch sale offer
      const saleOfferRes = await axios.get(`${API}/super-admin/sale-offer`, {
        params: credentials
      });
      setSaleOffer(prev => ({
        ...prev, ...saleOfferRes.data
      }));
    } catch (e) {
      console.error('Failed to fetch promotions', e);
      setCampaigns([]);
    }
  };

  const getPlatformKey = (platform) =>
    (platform || '')
      .toString()
      .trim()
      .toLowerCase();

  // Create new campaign (Requirements 9.2, 9.3)
  const createCampaign = async () => {
    try {
      setCampaignError('');
      
      // Validate required fields
      if (!newCampaign.title.trim()) {
        setCampaignError('Campaign title is required');
        return;
      }
      if (!newCampaign.start_date || !newCampaign.end_date) {
        setCampaignError('Start and end dates are required');
        return;
      }
      
      // Validate date range
      const startDate = new Date(newCampaign.start_date);
      const endDate = new Date(newCampaign.end_date);
      if (endDate <= startDate) {
        setCampaignError('End date must be after start date');
        return;
      }
      
      setSavingCampaign(true);
      
      const campaignData = {
        title: newCampaign.title.trim(),
        description: newCampaign.description?.trim() || null,
        discount_percentage: parseFloat(newCampaign.discount_percentage) || 0,
        discount_amount: newCampaign.discount_amount ? parseFloat(newCampaign.discount_amount) : null,
        start_date: new Date(newCampaign.start_date).toISOString(),
        end_date: new Date(newCampaign.end_date).toISOString(),
        theme: newCampaign.theme || 'default',
        banner_text: newCampaign.banner_text?.trim() || null,
        banner_color: newCampaign.banner_color || '#FF6B35'
      };
      
      const response = await axios.post(`${API}/super-admin/campaigns`, campaignData, {
        params: credentials
      });
      
      if (response.data.success) {
        toast.success('Campaign created successfully');
        setShowCreateCampaignModal(false);
        resetNewCampaign();
        fetchPromotions();
      } else {
        setCampaignError(response.data.detail || 'Failed to create campaign');
      }
    } catch (error) {
      console.error('Failed to create campaign:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to create campaign';
      setCampaignError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSavingCampaign(false);
    }
  };

  // Reset new campaign form
  const resetNewCampaign = () => {
    setNewCampaign({
      title: '',
      description: '',
      discount_percentage: 10,
      discount_amount: null,
      start_date: '',
      end_date: '',
      theme: 'default',
      banner_text: '',
      banner_color: '#FF6B35'
    });
    setCampaignError('');
  };

  // Delete campaign
  const deleteCampaign = async (campaignId) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) return;
    
    try {
      await axios.delete(`${API}/super-admin/campaigns/${campaignId}`, {
        params: credentials
      });
      toast.success('Campaign deleted successfully');
      fetchPromotions();
    } catch (error) {
      toast.error('Failed to delete campaign');
    }
  };

  // Toggle campaign active status
  const toggleCampaignStatus = async (campaignId, currentStatus) => {
    try {
      await axios.put(`${API}/super-admin/campaigns/${campaignId}`, 
        { is_active: !currentStatus },
        { params: credentials }
      );
      toast.success(`Campaign ${!currentStatus ? 'activated' : 'deactivated'}`);
      fetchPromotions();
    } catch (error) {
      toast.error('Failed to update campaign status');
    }
  };

  // Get campaign status based on dates
  const getCampaignStatus = (campaign) => {
    const now = new Date();
    const startDate = new Date(campaign.start_date);
    const endDate = new Date(campaign.end_date);
    
    if (!campaign.is_active) return 'inactive';
    if (now < startDate) return 'scheduled';
    if (now > endDate) return 'ended';
    return 'active';
  };

  const fetchNotifications = async () => {
    try {
      const notificationsRes = await axios.get(`${API}/super-admin/notifications`, {
        params: credentials
      });
      setNotifications(notificationsRes.data.notifications || []);
    } catch (e) {
      console.log('Notifications endpoint not available');
      setNotifications([]);
    }
  };

  // Fetch referrals with pagination and filtering (Requirements 7.1, 7.2, 7.3)
  const fetchReferrals = async (status = referralStatusFilter, page = referralPage) => {
    try {
      const params = {
        ...credentials,
        skip: page * 20,
        limit: 20
      };
      if (status && status !== 'all') {
        params.status = status;
      }
      
      const response = await axios.get(`${API}/super-admin/referrals`, { params });
      setReferrals(response.data.referrals || []);
      setReferralTotal(response.data.total || 0);
      setReferralHasMore(response.data.has_more || false);
    } catch (e) {
      console.error('Failed to fetch referrals', e);
      setReferrals([]);
      setReferralTotal(0);
    }
  };

  // Fetch referral analytics (Requirements 7.4)
  const fetchReferralAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/super-admin/referrals/analytics`, {
        params: credentials
      });
      setReferralAnalytics(response.data);
    } catch (e) {
      console.error('Failed to fetch referral analytics', e);
      setReferralAnalytics(null);
    }
  };

  // Export referrals to CSV (Requirements 7.5)
  const exportReferralsToCSV = async () => {
    try {
      setExportingReferrals(true);
      const response = await axios.get(`${API}/super-admin/referrals/export`, {
        params: { ...credentials, format: 'csv' },
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `referrals_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Referrals exported successfully');
    } catch (e) {
      console.error('Failed to export referrals', e);
      toast.error('Failed to export referrals');
    } finally {
      setExportingReferrals(false);
    }
  };

  // Handle referral status filter change
  const handleReferralStatusFilter = (status) => {
    setReferralStatusFilter(status);
    setReferralPage(0);
    fetchReferrals(status, 0);
  };

  // Handle referral pagination
  const handleReferralPageChange = (newPage) => {
    setReferralPage(newPage);
    fetchReferrals(referralStatusFilter, newPage);
  };

  // Function to fetch data based on active tab
  const fetchTabData = async (tab) => {
    setLoading(true);
    try {
      switch (tab) {
        case 'dashboard':
          await fetchDashboard();
          break;
        case 'users':
          await fetchUsers();
          break;
        case 'leads':
          await fetchLeads();
          break;
        case 'team':
          await fetchTeam();
          break;
        case 'tickets':
          await fetchTickets();
          break;
        case 'analytics':
          await fetchAnalytics();
          break;
        case 'app-versions':
          await fetchAppVersions();
          break;
        case 'pricing':
          await fetchPricing();
          break;
        case 'promotions':
          await fetchPromotions();
          break;
        case 'notifications':
          await fetchNotifications();
          break;
        case 'referrals':
          await fetchReferrals();
          await fetchReferralAnalytics();
          break;
        default:
          break;
      }
    } catch (error) {
      console.error(`Failed to fetch ${tab} data:`, error);
    } finally {
      setLoading(false);
    }
  };

  // Handle tab switching with data fetching
  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    fetchTabData(tab);
  };

  const fetchTeamData = async (token, user) => {
    const headers = { Authorization: `Bearer ${token}` };
    try {
      // Fetch tickets if has permission
      if (user.permissions?.includes('tickets')) {
        try {
          const ticketsRes = await axios.get(`${API}/support/tickets`, { headers });
          setTickets(ticketsRes.data.tickets || []);
        } catch (e) {
          console.error('Failed to fetch tickets', e);
        }
      }

      // Fetch leads if has permission (need to add team endpoint)
      if (user.permissions?.includes('leads')) {
        try {
          const leadsRes = await axios.get(`${API}/super-admin/leads`, {
            params: credentials
          });
          setLeads(leadsRes.data.leads || []);
          setLeadsStats(leadsRes.data.stats);
        } catch (e) {
          console.error('Failed to fetch leads', e);
        }
      }
    } catch (error) {
      console.error('Failed to fetch team data', error);
    }
  };

  const generatePaymentId = async () => {
    try {
      const response = await axios.post(`${API}/super-admin/generate-payment-id`, 
        {}, 
        { params: credentials }
      );
      setPaymentId(response.data.payment_id);
      toast.success('Payment ID generated');
    } catch (error) {
      toast.error('Failed to generate payment ID');
    }
  };

  const activateSubscription = async () => {
    if (!selectedUser) return;
    if (!paymentId) {
      toast.error('Payment ID is required');
      return;
    }

    try {
      const response = await axios.post(`${API}/super-admin/users/${selectedUser.id}/manual-subscription`, {
        payment_id: paymentId,
        payment_method: paymentMethod,
        payment_proof_url: paymentProofUrl || null,
        payment_notes: paymentNotes || null,
        amount: subscriptionAmount,
        months: subscriptionMonths,
        send_invoice: sendInvoice
      }, { params: credentials });

      toast.success(`Subscription activated! Invoice #${response.data.invoice_number}`);
      if (sendInvoice && response.data.invoice_sent) {
        toast.success('Invoice email sent to user');
      }
      resetSubscriptionModal();
      // Refresh current tab data
      fetchTabData(activeTab);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to activate subscription');
    }
  };

  const resetSubscriptionModal = () => {
    setShowSubscriptionModal(false);
    setSelectedUser(null);
    setSubscriptionMonths(12);
    setSubscriptionAmount(999);
    setPaymentId('');
    setPaymentMethod('manual');
    setPaymentProofUrl('');
    setPaymentNotes('');
    setSendInvoice(true);
  };

  const openSubscriptionModal = (user) => {
    setSelectedUser(user);
    resetSubscriptionModal();
    setSelectedUser(user);
    setShowSubscriptionModal(true);
  };

  const resetPromoModal = () => {
    setShowPromoModal(false);
    setPromoTarget(null);
    setPromoForm({
      subject: '',
      html_body: '',
      text_body: '',
      cc_support: true
    });
    setSendingPromo(false);
  };

  const openPromoModal = (user) => {
    setPromoTarget(user);
    setPromoForm({
      subject: '',
      html_body: '',
      text_body: '',
      cc_support: true
    });
    setSelectedPromoTemplate('custom');
    setShowPromoModal(true);
  };

  const sendPromoEmail = async () => {
    if (!promoTarget?.email) {
      toast.error('User email not found');
      return;
    }
    if (!promoForm.subject.trim() || !promoForm.html_body.trim()) {
      toast.error('Subject and HTML content are required');
      return;
    }
    setSendingPromo(true);
    try {
      const response = await axios.post(
        `${API}/super-admin/users/${promoTarget.id}/send-promo-email`,
        promoForm,
        { params: credentials }
      );
      if (response.data?.success) {
        toast.success('Promotional email sent');
        resetPromoModal();
      } else {
        toast.error(response.data?.message || 'Failed to send email');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send promotional email');
    } finally {
      setSendingPromo(false);
    }
  };

  const applyPromoTemplate = (templateId) => {
    const template = promoTemplates.find((t) => t.id === templateId);
    if (!template) return;
    const name = promoTarget?.username || promoTarget?.email || 'there';
    const html = (template.html || '').replaceAll('{{name}}', name);
    const text = (template.text || '').replaceAll('{{name}}', name);
    setPromoForm((prev) => ({
      ...prev,
      subject: template.subject || prev.subject,
      html_body: html || prev.html_body,
      text_body: text || prev.text_body
    }));
  };

  const updateTicketStatus = async (ticketId, status) => {
    try {
      await axios.put(`${API}/super-admin/tickets/${ticketId}`, 
        { status }, 
        { params: credentials }
      );
      toast.success('Ticket updated');
      fetchTickets(); // Only refresh tickets
    } catch (error) {
      toast.error('Failed to update ticket');
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure? This will delete all user data!')) return;
    try {
      await axios.delete(`${API}/super-admin/users/${userId}`, {
        params: credentials
      });
      toast.success('User deleted');
      fetchUsers(); // Only refresh users
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const extendTrial = async (userId, days) => {
    if (!days || days <= 0) {
      toast.error('Please enter valid number of days');
      return;
    }
    try {
      const response = await axios.put(`${API}/super-admin/users/${userId}/extend-trial`, 
        { days: parseInt(days) }, 
        { params: credentials }
      );
      toast.success(`Trial extended by ${days} days! Total trial: ${response.data.total_trial_days} days`);
      fetchUsers(); // Only refresh users
    } catch (error) {
      toast.error('Failed to extend trial');
    }
  };

  // Additional missing functions
  const viewBusinessDetails = async (userId) => {
    try {
      setBusinessDetailsLoading(true);
      
      // Fetch business details and navigation data in parallel (Requirements 2.1, 2.5, 2.6)
      const [detailsResponse, navResponse] = await Promise.all([
        axios.get(`${API}/super-admin/users/${userId}/business-details`, {
          params: credentials
        }),
        axios.get(`${API}/super-admin/users/navigation`, {
          params: { ...credentials, current_user_id: userId }
        }).catch(() => ({ data: { previous_user_id: null, next_user_id: null, current_position: 0, total_users: 0 } }))
      ]);
      
      // Ensure all business fields are present (Requirements 2.2)
      const details = detailsResponse.data;
      setBusinessDetails({
        ...details,
        // Ensure required fields have fallback values
        restaurant_name: details.restaurant_name || null,
        business_type: details.business_type || null,
        phone: details.phone || null,
        email: details.email || null,
        address: details.address || null,
        gstin: details.gstin || null,
        fssai: details.fssai || null
      });
      
      // Set navigation data (Requirements 2.5, 2.6)
      setUserNavigation({
        previousUserId: navResponse.data.previous_user_id,
        nextUserId: navResponse.data.next_user_id,
        currentPosition: navResponse.data.current_position || 0,
        totalUsers: navResponse.data.total_users || 0
      });
      setShowBusinessDetails(true);
    } catch (error) {
      console.error('Failed to fetch business details:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to fetch business details';
      toast.error(errorMessage);
    } finally {
      setBusinessDetailsLoading(false);
    }
  };

  // Navigate to previous/next user in business details modal (Requirements 10.5)
  const navigateToUser = async (userId) => {
    if (!userId) return;
    await viewBusinessDetails(userId);
  };

  const previewInvoice = async (user) => {
    try {
      const response = await axios.get(`${API}/super-admin/users/${user.id}/invoice-preview`, {
        params: credentials
      });
      setInvoiceData(response.data);
      setShowInvoicePreview(true);
    } catch (error) {
      toast.error('Failed to generate invoice preview');
    }
  };

  const deactivateSubscription = async (userId) => {
    if (!window.confirm('Are you sure you want to deactivate this subscription?')) return;
    
    try {
      await axios.put(`${API}/super-admin/users/${userId}/deactivate-subscription`, {}, {
        params: credentials
      });
      toast.success('Subscription deactivated');
      fetchUsers(); // Only refresh users
    } catch (error) {
      toast.error('Failed to deactivate subscription');
    }
  };

  const sendInvoiceEmail = async (userId) => {
    try {
      await axios.post(`${API}/super-admin/users/${userId}/send-invoice`, {}, {
        params: credentials
      });
      toast.success('Invoice email sent successfully');
    } catch (error) {
      toast.error('Failed to send invoice email');
    }
  };

  const exportUserData = async (userId, username) => {
    try {
      setExportingData(userId);
      const response = await axios.get(`${API}/super-admin/users/${userId}/export`, {
        params: credentials,
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${username}_data_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('User data exported successfully');
    } catch (error) {
      toast.error('Failed to export user data');
    } finally {
      setExportingData(null);
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-purple-500/20 bg-gray-900/50 backdrop-blur">
          <CardHeader>
            <div className="flex items-center gap-2 justify-center">
              <Shield className="w-8 h-8 text-purple-400" />
              <CardTitle className="text-2xl text-white">Ops Controls</CardTitle>
            </div>
            <p className="text-center text-gray-400 text-sm">Site Owner & Team Access</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label className="text-white">Username</Label>
                <Input
                  type="text"
                  value={credentials.username}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="Enter username"
                  required
                />
              </div>
              <div>
                <Label className="text-white">Password</Label>
                <Input
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="Enter password"
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-purple-600 hover:bg-purple-700"
                disabled={loading}
              >
                {loading ? 'Authenticating...' : 'Login'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
  <div className="min-h-screen w-full overflow-x-hidden bg-gray-50 px-3 py-4 sm:px-5 sm:py-6 lg:px-8">
  <div className="mx-auto w-full max-w-[1600px]">
  {/* Header */}
  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 sm:text-3xl">
              <Shield className="w-8 h-8 text-purple-600" />
              {userType === 'super-admin' ? 'Ops Controls' : 'Team Panel'}
            </h1>
            <p className="text-gray-600">
              {userType === 'super-admin' ? (
                'Site Owner Dashboard'
              ) : (
                <span className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    teamUser?.role === 'sales' ? 'bg-blue-100 text-blue-800' :
                    teamUser?.role === 'support' ? 'bg-green-100 text-green-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {teamUser?.role?.toUpperCase()}
                  </span>
                  {teamUser?.full_name || teamUser?.username}
                  {teamUser?.permissions?.length > 0 && (
                    <span className="text-xs text-gray-500">
                      ({teamUser.permissions.join(', ')})
                    </span>
                  )}
                </span>
              )}
            </p>
          </div>
          <Button 
            className="self-start sm:self-auto"
            onClick={() => {
              setAuthenticated(false);
              setUserType(null);
              setTeamUser(null);
              setTeamToken(null);
              setCredentials({ username: '', password: '' });
            }}
            variant="outline"
          >
            Logout
          </Button>
        </div>

        {/* Tabs - Show based on permissions */}
        <div className="mb-6 flex gap-1 overflow-x-auto border-b sm:gap-2">
          {getAvailableTabs().map(tab => (
            <button
              key={tab}
              onClick={() => handleTabSwitch(tab)}
              className={`px-4 py-2 font-medium capitalize whitespace-nowrap ${
                activeTab === tab
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && hasPermission('analytics') && (
          <div className="space-y-6">
            {/* Enhanced Dashboard Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">System Overview</h2>
                <p className="text-gray-600">Real-time monitoring and analytics</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Auto-refresh toggle */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className={`p-2 rounded-lg transition-colors ${
                      autoRefresh ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                    }`}
                    title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
                  >
                    {autoRefresh ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
                  </button>
                  <span className="text-xs text-gray-500">
                    {autoRefresh ? `${refreshInterval/1000}s` : 'Manual'}
                  </span>
                </div>
                
                {/* Quick Actions */}
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowQuickActions(!showQuickActions)}
                    className="flex items-center gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    Quick Actions
                  </Button>
                  
                  {showQuickActions && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border z-50">
                      {quickActions.map(action => (
                        <button
                          key={action.id}
                          onClick={() => {
                            action.action();
                            setShowQuickActions(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                        >
                          <div className={`w-8 h-8 rounded-lg ${action.color} flex items-center justify-center`}>
                            <action.icon className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-sm font-medium">{action.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    fetchTabData(activeTab); // Refresh current tab
                    fetchRealTimeStats();
                    fetchSystemHealth();
                    fetchPerformanceMetrics();
                  }}
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

            {dashboard ? (
              <>
                {/* Enhanced Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total Users Card */}
                  <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-blue-600/20 rounded-bl-full"></div>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Users className="w-4 h-4 text-blue-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-gray-900">{dashboard.overview.total_users}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm text-green-600 flex items-center gap-1">
                          <ArrowUp className="w-3 h-3" />
                          {dashboard.overview.active_subscriptions}
                        </span>
                        <span className="text-xs text-gray-500">active subscriptions</span>
                      </div>
                      {realTimeStats?.user_growth && (
                        <div className="mt-2 text-xs text-gray-500">
                          +{realTimeStats.user_growth.today} today
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Revenue Card */}
                  <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-500/10 to-green-600/20 rounded-bl-full"></div>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">Revenue (30d)</CardTitle>
                      <div className="p-2 bg-green-100 rounded-lg">
                        <DollarSign className="w-4 h-4 text-green-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-gray-900">
                        â‚¹{(dashboard.overview.total_revenue || 0).toLocaleString()}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm text-green-600 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          12.5%
                        </span>
                        <span className="text-xs text-gray-500">vs last month</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Support Tickets Card */}
                  <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-orange-500/10 to-orange-600/20 rounded-bl-full"></div>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">Support Tickets</CardTitle>
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Ticket className="w-4 h-4 text-orange-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-gray-900">{dashboard.overview.open_tickets}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm text-orange-600">{dashboard.overview.pending_tickets} pending</span>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        Avg response: 2.3h
                      </div>
                    </CardContent>
                  </Card>

                  {/* System Health Card */}
                  <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-500/10 to-purple-600/20 rounded-bl-full"></div>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">System Health</CardTitle>
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Activity className="w-4 h-4 text-purple-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-lg font-bold text-gray-900">Healthy</span>
                      </div>
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">CPU</span>
                          <span className="text-gray-900">{systemHealth?.cpu_usage || '45'}%</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Memory</span>
                          <span className="text-gray-900">{systemHealth?.memory_usage || '62'}%</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Uptime</span>
                          <span className="text-gray-900">{systemHealth?.uptime || '99.9'}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts and Analytics Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* User Growth Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <LineChart className="w-5 h-5 text-blue-600" />
                        User Growth (7 days)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-48 flex items-end justify-between gap-2">
                        {[12, 19, 15, 27, 23, 31, 28].map((value, index) => (
                          <div key={index} className="flex flex-col items-center gap-2">
                            <div 
                              className="w-8 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t"
                              style={{ height: `${(value / 31) * 100}%` }}
                            ></div>
                            <span className="text-xs text-gray-500">
                              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Activities */}
                  <Card>
                    <CardHeader className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-green-600" />
                        Recent Activities
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={fetchRecentActivities}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-48 overflow-y-auto">
                        {recentActivities.length > 0 ? recentActivities.map((activity, index) => (
                          <div key={index} className="flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-2 ${
                              activity.type === 'user' ? 'bg-blue-500' :
                              activity.type === 'payment' ? 'bg-green-500' :
                              activity.type === 'ticket' ? 'bg-orange-500' :
                              'bg-gray-500'
                            }`}></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900">{activity.message}</p>
                              <p className="text-xs text-gray-500">{activity.timestamp}</p>
                            </div>
                          </div>
                        )) : (
                          <div className="text-center py-8 text-gray-500">
                            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No recent activities</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Performance Metrics */}
                {performanceMetrics && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-purple-600" />
                        Performance Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900">
                            {performanceMetrics.avg_response_time || '120'}ms
                          </div>
                          <div className="text-sm text-gray-500">Avg Response Time</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900">
                            {performanceMetrics.requests_per_minute || '45'}
                          </div>
                          <div className="text-sm text-gray-500">Requests/min</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900">
                            {performanceMetrics.error_rate || '0.1'}%
                          </div>
                          <div className="text-sm text-gray-500">Error Rate</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900">
                            {performanceMetrics.active_connections || '234'}
                          </div>
                          <div className="text-sm text-gray-500">Active Connections</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  <Lock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Dashboard data not available for your access level</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && hasPermission('users') && (
          <div className="space-y-6">
            {/* Enhanced Users Header with Search and Filters */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      User Management
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      {getFilteredUsers().length} of {users.length} users
                    </p>
                  </div>
                  
                  {/* Bulk Actions */}
                  {selectedUsers.length > 0 && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">
                        {selectedUsers.length} selected
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowBulkModal(true)}
                        className="flex items-center gap-2"
                      >
                        <CheckSquare className="w-4 h-4" />
                        Bulk Actions
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                {/* Search and Filter Bar */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  {/* Search */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search users by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  {/* Status Filter */}
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border rounded-lg bg-white min-w-[140px]"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="trial">Trial</option>
                    <option value="expired">Expired</option>
                  </select>
                  
                  {/* Sort Options */}
                  <div className="flex items-center gap-2">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="px-3 py-2 border rounded-lg bg-white min-w-[120px]"
                    >
                      <option value="created_at">Created</option>
                      <option value="username">Username</option>
                      <option value="subscription_expires_at">Expires</option>
                      <option value="bill_count">Bills</option>
                    </select>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="p-2"
                    >
                      {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                    </Button>
                  </div>
                  
                  {/* Advanced Filters Toggle */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className="flex items-center gap-2"
                  >
                    <Filter className="w-4 h-4" />
                    Filters
                  </Button>

                  {/* Refresh Bill Counts Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const response = await axios.post(`${API}/super-admin/users/refresh-bill-counts`, {}, {
                          params: credentials
                        });
                        toast.success(`âœ… ${response.data.message}`);
                        await fetchUsers(); // Refresh the user list
                      } catch (error) {
                        toast.error('Failed to refresh bill counts');
                      }
                    }}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                    title="Recalculate bill counts from orders"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh Counts
                  </Button>
                  
                  {/* Export Button */}
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportData('users', exportFormat)}
                      className="flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export
                    </Button>
                  </div>
                </div>
                
                {/* Advanced Filters Panel */}
                {showAdvancedFilters && (
                  <div className="bg-gray-50 p-4 rounded-lg mb-6 space-y-4">
                    <h4 className="font-medium text-gray-900">Advanced Filters</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm">Date Range</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                            className="text-sm"
                          />
                          <Input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                            className="text-sm"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm">Export Format</Label>
                        <select
                          value={exportFormat}
                          onChange={(e) => setExportFormat(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg bg-white mt-1"
                        >
                          <option value="json">JSON</option>
                          <option value="csv">CSV</option>
                        </select>
                      </div>
                      
                      <div className="flex items-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearchQuery('');
                            setFilterStatus('all');
                            setSortBy('created_at');
                            setSortOrder('desc');
                            setDateRange({ start: '', end: '' });
                          }}
                          className="w-full"
                        >
                          Clear Filters
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Error State with Retry Option (Requirements 3.4) */}
            {usersFetchError && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-6 h-6 text-red-500" />
                      <div>
                        <h4 className="font-medium text-red-800">Failed to load users</h4>
                        <p className="text-sm text-red-600">{usersFetchError}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={fetchUsers}
                      disabled={usersLoading}
                      className="border-red-300 text-red-700 hover:bg-red-100"
                    >
                      {usersLoading ? (
                        <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Retrying...</>
                      ) : (
                        <><RefreshCw className="w-4 h-4 mr-2" /> Retry</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Loading State */}
            {usersLoading && !usersFetchError && (
              <Card>
                <CardContent className="p-12">
                  <div className="flex flex-col items-center justify-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-4" />
                    <p className="text-gray-500">Loading users...</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Enhanced Users Table */}
            {!usersLoading && !usersFetchError && (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3">
                          <input
                            type="checkbox"
                            checked={selectedUsers.length === getFilteredUsers().length && getFilteredUsers().length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUsers(getFilteredUsers().map(u => u.id));
                              } else {
                                setSelectedUsers([]);
                              }
                            }}
                            className="rounded"
                          />
                        </th>
                        <th className="text-left p-3 font-medium">User</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Subscription</th>
                        <th className="text-left p-3 font-medium">Activity</th>
                        <th className="text-left p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredUsers().map(user => (
                        <tr key={user.id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={selectedUsers.includes(user.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedUsers([...selectedUsers, user.id]);
                                } else {
                                  setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                                }
                              }}
                              className="rounded"
                            />
                          </td>
                          
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                                {user.username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{user.username}</div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                                    {user.role}
                                  </span>
                                  {user.business_settings?.restaurant_name && (
                                    <span className="text-xs text-gray-500">
                                      {user.business_settings.restaurant_name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          
                          <td className="p-3">
                            <div className="space-y-1">
                              {user.subscription_active ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                  <CheckCircle className="w-3 h-3" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                                  <Clock className="w-3 h-3" />
                                  Trial
                                </span>
                              )}
                              
                              {user.subscription_expires_at && (
                                <div className="text-xs text-gray-500">
                                  Expires: {new Date(user.subscription_expires_at).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </td>
                          
                          <td className="p-3">
                            <div className="space-y-1">
                              <div className="text-sm font-medium">
                                â‚¹{(user.subscription_amount || 0).toLocaleString()}
                              </div>
                              <div className="text-xs text-gray-500">
                                {user.subscription_months || 12} months
                              </div>
                              {user.trial_extension_days > 0 && (
                                <div className="text-xs text-green-600">
                                  +{user.trial_extension_days} trial days
                                </div>
                              )}
                            </div>
                          </td>
                          
                          <td className="p-3">
                            <div className="space-y-1">
                              <div className="text-sm font-medium">
                                {user.bill_count || 0} bills
                              </div>
                              {!user.subscription_active && (user.bill_count || 0) >= 50 && (
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[11px] font-medium">
                                  <AlertTriangle className="w-3 h-3" />
                                  Limit exceeded
                                </div>
                              )}
                              <div className="text-xs text-gray-500">
                                Last seen: {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                              </div>
                            </div>
                          </td>
                          
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              {/* Quick Actions */}
                              {hasPermission('view_details') && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => viewBusinessDetails(user.id)}
                                  className="text-xs h-7 px-2"
                                  title="View Details"
                                >
                                  <Eye className="w-3 h-3" />
                                </Button>
                              )}

                              {hasPermission('users') && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openPromoModal(user)}
                                  className="text-xs h-7 px-2 text-blue-600 border-blue-200"
                                  title="Send Promotional Email"
                                >
                                  <Send className="w-3 h-3" />
                                </Button>
                              )}
                              
                              {user.subscription_active ? (
                                <>
                                  {hasPermission('send_invoice') && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => previewInvoice(user)}
                                      className="text-xs h-7 px-2 text-purple-600 border-purple-200"
                                      title="Invoice"
                                    >
                                      <FileText className="w-3 h-3" />
                                    </Button>
                                  )}
                                  
                                  {hasPermission('deactivate_license') && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => deactivateSubscription(user.id)}
                                      className="text-xs h-7 px-2 text-red-600 border-red-200"
                                      title="Deactivate"
                                    >
                                      <XCircle className="w-3 h-3" />
                                    </Button>
                                  )}
                                </>
                              ) : (
                                hasPermission('activate_license') && (
                                  <Button
                                    size="sm"
                                    onClick={() => openSubscriptionModal(user)}
                                    className="text-xs h-7 px-2 bg-green-600 hover:bg-green-700"
                                    title="Activate Subscription"
                                  >
                                    <CreditCard className="w-3 h-3" />
                                  </Button>
                                )
                              )}
                              
                              {/* More Actions Dropdown */}
                              <div className="relative group">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-7 px-2"
                                  title="More Actions"
                                >
                                  <Settings className="w-3 h-3" />
                                </Button>
                                
                                {/* Dropdown Menu */}
                                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                  <div className="py-1">
                                    {hasPermission('export_data') && (
                                      <button
                                        onClick={() => exportUserData(user.id, user.username)}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                                      >
                                        <Download className="w-3 h-3" />
                                        Export Data
                                      </button>
                                    )}
                                    
                                    {hasPermission('extend_trial') && (
                                      <button
                                        onClick={() => {
                                          const days = prompt('Enter number of days to extend trial:');
                                          if (days) extendTrial(user.id, days);
                                        }}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                                      >
                                        <Calendar className="w-3 h-3" />
                                        Extend Trial
                                      </button>
                                    )}
                                    
                                    {hasPermission('send_invoice') && (
                                      <button
                                        onClick={() => sendInvoiceEmail(user.id)}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                                      >
                                        <Mail className="w-3 h-3" />
                                        Send Invoice
                                      </button>
                                    )}
                                    
                                    <div className="border-t my-1"></div>
                                    
                                    {hasPermission('delete_user') && (
                                      <button
                                        onClick={() => deleteUser(user.id)}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        Delete User
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {getFilteredUsers().length === 0 && (
                    <div className="text-center py-12">
                      <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500">No users found matching your criteria</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchQuery('');
                          setFilterStatus('all');
                        }}
                        className="mt-2"
                      >
                        Clear Filters
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            )}
          </div>
        )}

        {/* Tickets Tab */}
        {activeTab === 'tickets' && hasPermission('tickets') && (
          <Card>
            <CardHeader>
              <CardTitle>Support Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tickets.map(ticket => (
                  <div key={ticket.id} className="border rounded-lg p-4 bg-white shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{ticket.subject}</h3>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            ticket.request_type === 'demo' ? 'bg-purple-100 text-purple-800' :
                            ticket.request_type === 'inquiry' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {ticket.request_type || 'support'}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            ticket.priority === 'high' ? 'bg-red-100 text-red-800' :
                            ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {ticket.priority} priority
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">Ticket ID: #{ticket.id}</p>
                      </div>
                      <select
                        value={ticket.status}
                        onChange={(e) => updateTicketStatus(ticket.id, e.target.value)}
                        className={`px-3 py-1 border rounded font-medium ${
                          ticket.status === 'open' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          ticket.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                          ticket.status === 'resolved' ? 'bg-green-50 text-green-700 border-green-200' :
                          'bg-gray-50 text-gray-700 border-gray-200'
                        }`}
                      >
                        <option value="open">Open</option>
                        <option value="pending">Pending</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>

                    {/* Contact Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 p-3 bg-gray-50 rounded">
                      <div>
                        <span className="text-xs text-gray-500 block">Name</span>
                        <span className="font-medium">{ticket.name}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block">Email</span>
                        <a href={`mailto:${ticket.email}`} className="text-blue-600 hover:underline">
                          {ticket.email}
                        </a>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block">Phone</span>
                        {ticket.phone ? (
                          <a href={`tel:${ticket.phone}`} className="text-blue-600 hover:underline">
                            {ticket.phone}
                          </a>
                        ) : (
                          <span className="text-gray-400">Not provided</span>
                        )}
                      </div>
                    </div>

                    {/* Message */}
                    <div className="mb-3">
                      <span className="text-xs text-gray-500 block mb-1">Message</span>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap bg-white p-3 border rounded">
                        {ticket.message}
                      </p>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                      <span>Created: {new Date(ticket.created_at).toLocaleString()}</span>
                      {ticket.updated_at && ticket.updated_at !== ticket.created_at && (
                        <span>Updated: {new Date(ticket.updated_at).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                ))}
                {tickets.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No support tickets yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        {/* Leads Tab */}
        {activeTab === 'leads' && hasPermission('leads') && (
          <div className="space-y-6">
            {/* Leads Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Leads Management</h2>
                <p className="text-gray-500">Track and manage potential customers</p>
              </div>
              <Button
                onClick={() => setShowCreateLead(true)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Lead
              </Button>
            </div>

            {/* Leads Stats */}
            {leadsStats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Total Leads</p>
                        <p className="text-2xl font-bold">{(leadsStats.new || 0) + (leadsStats.contacted || 0) + (leadsStats.converted || 0)}</p>
                      </div>
                      <UserPlus className="w-8 h-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">New</p>
                        <p className="text-2xl font-bold text-blue-600">{leadsStats.new || 0}</p>
                      </div>
                      <Clock className="w-8 h-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Contacted</p>
                        <p className="text-2xl font-bold text-yellow-600">{leadsStats.contacted || 0}</p>
                      </div>
                      <Mail className="w-8 h-8 text-yellow-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Converted</p>
                        <p className="text-2xl font-bold text-green-600">{leadsStats.converted || 0}</p>
                      </div>
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Leads Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-purple-600" />
                  All Leads
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 font-medium">Name</th>
                        <th className="text-left p-3 font-medium">Contact</th>
                        <th className="text-left p-3 font-medium">Business</th>
                        <th className="text-left p-3 font-medium">Source</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Date</th>
                        <th className="text-left p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((lead, index) => (
                        <tr key={lead.timestamp || index} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            <div className="font-medium">{lead.name}</div>
                          </td>
                          <td className="p-3">
                            <div className="text-sm">
                              <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline block">{lead.email}</a>
                              {lead.phone && <a href={`tel:${lead.phone}`} className="text-gray-500 hover:text-blue-600">{lead.phone}</a>}
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="text-sm text-gray-600">{lead.businessName || '-'}</span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              lead.source === 'landing' ? 'bg-blue-100 text-blue-800' :
                              lead.source === 'demo' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {lead.source || 'manual'}
                            </span>
                          </td>
                          <td className="p-3">
                            <select
                              value={lead.status || 'new'}
                              onChange={async (e) => {
                                try {
                                  await axios.put(`${API}/super-admin/leads/${lead.timestamp}`, 
                                    { status: e.target.value },
                                    { params: credentials }
                                  );
                                  toast.success('Lead status updated');
                                  fetchLeads();
                                } catch (error) {
                                  toast.error('Failed to update lead');
                                }
                              }}
                              className={`px-2 py-1 border rounded text-xs ${
                                lead.status === 'new' ? 'bg-blue-50 text-blue-700' :
                                lead.status === 'contacted' ? 'bg-yellow-50 text-yellow-700' :
                                lead.status === 'converted' ? 'bg-green-50 text-green-700' :
                                'bg-gray-50 text-gray-700'
                              }`}
                            >
                              <option value="new">New</option>
                              <option value="contacted">Contacted</option>
                              <option value="converted">Converted</option>
                              <option value="lost">Lost</option>
                            </select>
                          </td>
                          <td className="p-3">
                            <span className="text-sm text-gray-500">
                              {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : 'N/A'}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  if (window.confirm('Delete this lead?')) {
                                    try {
                                      await axios.delete(`${API}/super-admin/leads/${lead.timestamp}`, {
                                        params: credentials
                                      });
                                      toast.success('Lead deleted');
                                      fetchLeads();
                                    } catch (error) {
                                      toast.error('Failed to delete lead');
                                    }
                                  }
                                }}
                                className="text-red-600 border-red-200 h-7 px-2"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {leads.length === 0 && (
                    <div className="text-center py-12">
                      <UserPlus className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500">No leads yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Team Tab */}
        {activeTab === 'team' && hasPermission('team') && (
          <div className="space-y-6">
            {/* Team Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Team Management</h2>
                <p className="text-gray-500">Manage your team members and permissions</p>
              </div>
              <Button
                onClick={() => setShowCreateTeam(true)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Team Member
              </Button>
            </div>

            {/* Team Stats */}
            {teamStats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Total Members</p>
                        <p className="text-2xl font-bold">{teamStats.total || teamMembers.length}</p>
                      </div>
                      <Users className="w-8 h-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Active</p>
                        <p className="text-2xl font-bold text-green-600">{teamStats.active || teamMembers.length}</p>
                      </div>
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Roles</p>
                        <p className="text-2xl font-bold text-blue-600">{teamStats.roles || 3}</p>
                      </div>
                      <Shield className="w-8 h-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Team Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  Team Members
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 font-medium">Name</th>
                        <th className="text-left p-3 font-medium">Email</th>
                        <th className="text-left p-3 font-medium">Role</th>
                        <th className="text-left p-3 font-medium">Permissions</th>
                        <th className="text-left p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamMembers.map((member, index) => (
                        <tr key={member.id || index} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                {(member.full_name || member.username || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium">{member.full_name || member.username}</div>
                                <div className="text-xs text-gray-500">@{member.username}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <a href={`mailto:${member.email}`} className="text-blue-600 hover:underline text-sm">
                              {member.email}
                            </a>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              member.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                              member.role === 'sales' ? 'bg-blue-100 text-blue-800' :
                              member.role === 'support' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {member.role}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              {(member.permissions || []).slice(0, 3).map((perm, i) => (
                                <span key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                  {perm}
                                </span>
                              ))}
                              {(member.permissions || []).length > 3 && (
                                <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                  +{member.permissions.length - 3}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingTeamMember(member);
                                  setNewTeamMember({
                                    username: member.username,
                                    email: member.email,
                                    password: '',
                                    role: member.role,
                                    permissions: member.permissions || [],
                                    full_name: member.full_name || '',
                                    phone: member.phone || ''
                                  });
                                  setShowEditTeamModal(true);
                                }}
                                className="h-7 px-2"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  if (window.confirm('Delete this team member?')) {
                                    try {
                                      await axios.delete(`${API}/super-admin/team/${member.id}`, {
                                        params: credentials
                                      });
                                      toast.success('Team member deleted');
                                      fetchTeam();
                                    } catch (error) {
                                      toast.error('Failed to delete team member');
                                    }
                                  }
                                }}
                                className="text-red-600 border-red-200 h-7 px-2"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {teamMembers.length === 0 && (
                    <div className="text-center py-12">
                      <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500">No team members yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Create Lead Modal */}
        {showCreateLead && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-purple-600" />
                  Add New Lead
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowCreateLead(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Name *</Label>
                  <Input
                    value={newLead.name}
                    onChange={(e) => setNewLead({...newLead, name: e.target.value})}
                    placeholder="Contact name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={newLead.email}
                    onChange={(e) => setNewLead({...newLead, email: e.target.value})}
                    placeholder="email@example.com"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={newLead.phone}
                    onChange={(e) => setNewLead({...newLead, phone: e.target.value})}
                    placeholder="+91 9876543210"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Business Name</Label>
                  <Input
                    value={newLead.businessName}
                    onChange={(e) => setNewLead({...newLead, businessName: e.target.value})}
                    placeholder="Restaurant name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Notes</Label>
                  <textarea
                    value={newLead.notes}
                    onChange={(e) => setNewLead({...newLead, notes: e.target.value})}
                    placeholder="Additional notes..."
                    className="w-full px-3 py-2 border rounded mt-1 min-h-[80px]"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={async () => {
                      if (!newLead.name || !newLead.email) {
                        toast.error('Name and email are required');
                        return;
                      }
                      try {
                        await axios.post(`${API}/super-admin/leads`, {
                          name: newLead.name,
                          email: newLead.email,
                          phone: newLead.phone || '',
                          businessName: newLead.businessName || null,
                          notes: newLead.notes || null,
                          source: 'manual'
                        }, { params: credentials });
                        toast.success('Lead created successfully');
                        setShowCreateLead(false);
                        setNewLead({ name: '', email: '', phone: '', businessName: '', notes: '' });
                        fetchLeads();
                      } catch (error) {
                        toast.error(error.response?.data?.detail || 'Failed to create lead');
                      }
                    }}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Lead
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateLead(false);
                      setNewLead({ name: '', email: '', phone: '', businessName: '', notes: '' });
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Create Team Member Modal */}
        {showCreateTeam && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  Add Team Member
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowCreateTeam(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Full Name *</Label>
                  <Input
                    value={newTeamMember.full_name}
                    onChange={(e) => setNewTeamMember({...newTeamMember, full_name: e.target.value})}
                    placeholder="John Doe"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Username *</Label>
                  <Input
                    value={newTeamMember.username}
                    onChange={(e) => setNewTeamMember({...newTeamMember, username: e.target.value})}
                    placeholder="johndoe"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={newTeamMember.email}
                    onChange={(e) => setNewTeamMember({...newTeamMember, email: e.target.value})}
                    placeholder="john@example.com"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Password *</Label>
                  <Input
                    type="password"
                    value={newTeamMember.password}
                    onChange={(e) => setNewTeamMember({...newTeamMember, password: e.target.value})}
                    placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={newTeamMember.phone}
                    onChange={(e) => setNewTeamMember({...newTeamMember, phone: e.target.value})}
                    placeholder="+91 9876543210"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Role *</Label>
                  <select
                    value={newTeamMember.role}
                    onChange={(e) => setNewTeamMember({...newTeamMember, role: e.target.value})}
                    className="w-full px-3 py-2 border rounded mt-1"
                  >
                    <option value="sales">Sales</option>
                    <option value="support">Support</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <Label>Permissions</Label>
                  <div className="mt-2 space-y-2">
                    {['analytics', 'users', 'leads', 'tickets', 'team'].map(perm => (
                      <label key={perm} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newTeamMember.permissions.includes(perm)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewTeamMember({...newTeamMember, permissions: [...newTeamMember.permissions, perm]});
                            } else {
                              setNewTeamMember({...newTeamMember, permissions: newTeamMember.permissions.filter(p => p !== perm)});
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <span className="capitalize">{perm}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={async () => {
                      if (!newTeamMember.full_name || !newTeamMember.username || !newTeamMember.email || !newTeamMember.password) {
                        toast.error('Please fill all required fields');
                        return;
                      }
                      try {
                        await axios.post(`${API}/super-admin/team`, newTeamMember, { params: credentials });
                        toast.success('Team member created successfully');
                        setShowCreateTeam(false);
                        setNewTeamMember({ username: '', email: '', password: '', role: 'sales', permissions: [], full_name: '', phone: '' });
                        fetchTeam();
                      } catch (error) {
                        toast.error(error.response?.data?.detail || 'Failed to create team member');
                      }
                    }}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Member
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateTeam(false);
                      setNewTeamMember({ username: '', email: '', password: '', role: 'sales', permissions: [], full_name: '', phone: '' });
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Subscription Management Modal */}
        {showSubscriptionModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
            <Card className="w-full max-w-lg my-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-green-600" />
                  Manual Subscription Activation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* User Info */}
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">User</p>
                    <p className="font-medium">{selectedUser.username}</p>
                    <p className="text-sm text-gray-500">{selectedUser.email}</p>
                  </div>

                  {/* Payment ID - Required */}
                  <div>
                    <Label className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Payment ID *
                    </Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={paymentId}
                        onChange={(e) => setPaymentId(e.target.value)}
                        placeholder="Enter or generate payment ID"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={generatePaymentId}
                        className="flex items-center gap-1"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Generate
                      </Button>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <Label>Payment Method</Label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 border rounded mt-1"
                    >
                      <option value="manual">Manual / Cash</option>
                      <option value="upi">UPI</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="card">Card</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </div>

                  {/* Duration & Amount */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Duration
                      </Label>
                      <select
                        value={subscriptionMonths}
                        onChange={(e) => setSubscriptionMonths(parseInt(e.target.value))}
                        className="w-full px-3 py-2 border rounded mt-1"
                      >
                        <option value={1}>1 Month</option>
                        <option value={3}>3 Months</option>
                        <option value={6}>6 Months</option>
                        <option value={12}>12 Months</option>
                        <option value={24}>24 Months</option>
                      </select>
                    </div>
                    <div>
                      <Label>Amount (â‚¹)</Label>
                      <Input
                        type="number"
                        value={subscriptionAmount}
                        onChange={(e) => setSubscriptionAmount(parseFloat(e.target.value))}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Send Invoice Checkbox */}
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="sendInvoice"
                      checked={sendInvoice}
                      onChange={(e) => setSendInvoice(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <label htmlFor="sendInvoice" className="flex items-center gap-2 cursor-pointer">
                      <Mail className="w-4 h-4 text-blue-600" />
                      <span className="text-sm">Send invoice email to user</span>
                    </label>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button 
                      onClick={activateSubscription} 
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      disabled={!paymentId}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Activate Subscription
                    </Button>
                    <Button 
                      onClick={resetSubscriptionModal}
                      variant="outline" 
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Promotional Email Modal */}
        {showPromoModal && promoTarget && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
            <Card className="w-full max-w-2xl my-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-blue-600" />
                  Send Promotional Email
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">To</p>
                    <p className="font-medium">{promoTarget.username || 'User'}</p>
                    <p className="text-sm text-gray-500">{promoTarget.email}</p>
                    <p className="text-xs text-gray-500 mt-1">From: hello@billbytekot.in â€¢ Reply-To: support@billbytekot.in</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 items-end">
                    <div className="col-span-2">
                      <Label>Template</Label>
                      <select
                        value={selectedPromoTemplate}
                        onChange={(e) => setSelectedPromoTemplate(e.target.value)}
                        className="w-full px-3 py-2 border rounded mt-1"
                      >
                        {promoTemplates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => applyPromoTemplate(selectedPromoTemplate)}
                      className="h-10"
                    >
                      Apply Template
                    </Button>
                  </div>

                  <div>
                    <Label>Subject *</Label>
                    <Input
                      value={promoForm.subject}
                      onChange={(e) => setPromoForm({ ...promoForm, subject: e.target.value })}
                      placeholder="Enter subject"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>HTML Content *</Label>
                    <textarea
                      value={promoForm.html_body}
                      onChange={(e) => setPromoForm({ ...promoForm, html_body: e.target.value })}
                      placeholder="Paste HTML email content"
                      rows={8}
                      className="w-full px-3 py-2 border rounded mt-1 text-sm"
                    />
                  </div>

                  <div>
                    <Label>Text Content (optional)</Label>
                    <textarea
                      value={promoForm.text_body}
                      onChange={(e) => setPromoForm({ ...promoForm, text_body: e.target.value })}
                      placeholder="Plain text fallback"
                      rows={4}
                      className="w-full px-3 py-2 border rounded mt-1 text-sm"
                    />
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="ccSupport"
                      checked={promoForm.cc_support}
                      onChange={(e) => setPromoForm({ ...promoForm, cc_support: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label htmlFor="ccSupport" className="flex items-center gap-2 cursor-pointer">
                      <Mail className="w-4 h-4 text-blue-600" />
                      <span className="text-sm">CC support@billbytekot.in</span>
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={sendPromoEmail}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      disabled={sendingPromo}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {sendingPromo ? 'Sending...' : 'Send Email'}
                    </Button>
                    <Button
                      onClick={resetPromoModal}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Bulk Actions Modal */}
        {showBulkModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-blue-600" />
                  Bulk Actions
                </CardTitle>
                <p className="text-sm text-gray-600">
                  {selectedUsers.length} users selected
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Select Action</Label>
                    <select
                      value={bulkAction}
                      onChange={(e) => setBulkAction(e.target.value)}
                      className="w-full px-3 py-2 border rounded mt-1"
                    >
                      <option value="">Choose an action...</option>
                      <option value="send_notification">Send Notification</option>
                      <option value="extend_trial">Extend Trial (7 days)</option>
                      <option value="export_data">Export Data</option>
                      <option value="deactivate">Deactivate Subscriptions</option>
                      <option value="send_invoice">Send Invoices</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={handleBulkAction}
                      disabled={!bulkAction || loading}
                      className="flex-1"
                    >
                      {loading ? 'Processing...' : 'Execute Action'}
                    </Button>
                    <Button 
                      onClick={() => {
                        setShowBulkModal(false);
                        setBulkAction('');
                      }}
                      variant="outline" 
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* System Logs Modal */}
        {showSystemLogs && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-green-600" />
                  System Logs
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSystemLogs(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="overflow-y-auto">
                <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm space-y-1 max-h-96 overflow-y-auto">
                  {systemLogs.length > 0 ? systemLogs.map((log, index) => (
                    <div key={index} className="flex gap-2">
                      <span className="text-gray-500">[{log.timestamp}]</span>
                      <span className={`${
                        log.level === 'ERROR' ? 'text-red-400' :
                        log.level === 'WARN' ? 'text-yellow-400' :
                        log.level === 'INFO' ? 'text-blue-400' :
                        'text-green-400'
                      }`}>
                        {log.level}
                      </span>
                      <span>{log.message}</span>
                    </div>
                  )) : (
                    <div className="text-center text-gray-500 py-8">
                      No logs available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Pricing Tab (Requirements 8.1, 8.2, 8.3) */}
        {activeTab === 'pricing' && (
          <div className="space-y-6">
            {/* Pricing Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <DollarSign className="w-6 h-6 text-green-600" />
                  Pricing Configuration
                </h2>
                <p className="text-gray-600">Manage subscription pricing and referral rewards</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchPricing()}
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Pricing Configuration Form (Requirements 8.2) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  Subscription Pricing
                </CardTitle>
                <p className="text-sm text-gray-500">Configure regular and campaign pricing for subscriptions</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Regular Price */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-500" />
                      Regular Price (â‚¹)
                    </Label>
                    <Input
                      type="number"
                      value={pricing.regular_price || 1999}
                      onChange={(e) => setPricing({ ...pricing, regular_price: parseFloat(e.target.value) || 0 })}
                      placeholder="1999"
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">Standard subscription price</p>
                  </div>

                  {/* Campaign Price */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-gray-500" />
                      Campaign Price (â‚¹)
                    </Label>
                    <Input
                      type="number"
                      value={pricing.campaign_price || 1799}
                      onChange={(e) => setPricing({ ...pricing, campaign_price: parseFloat(e.target.value) || 0 })}
                      placeholder="1799"
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">Promotional campaign price</p>
                  </div>

                  {/* Trial Days */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      Trial Days
                    </Label>
                    <Input
                      type="number"
                      value={pricing.trial_days || 7}
                      onChange={(e) => setPricing({ ...pricing, trial_days: parseInt(e.target.value) || 0 })}
                      placeholder="7"
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">Number of free trial days for new users</p>
                  </div>

                  {/* Subscription Months */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      Subscription Duration (Months)
                    </Label>
                    <Input
                      type="number"
                      value={pricing.subscription_months || 12}
                      onChange={(e) => setPricing({ ...pricing, subscription_months: parseInt(e.target.value) || 0 })}
                      placeholder="12"
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">Default subscription duration</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Referral Rewards Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-purple-600" />
                  Referral Rewards
                </CardTitle>
                <p className="text-sm text-gray-500">Configure referral program rewards and discounts</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Referral Discount */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Percent className="w-4 h-4 text-gray-500" />
                      Referral Discount (â‚¹)
                    </Label>
                    <Input
                      type="number"
                      value={pricing.referral_discount || 200}
                      onChange={(e) => setPricing({ ...pricing, referral_discount: parseFloat(e.target.value) || 0 })}
                      placeholder="200"
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">Discount for new users using a referral code</p>
                  </div>

                  {/* Referral Reward */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-gray-500" />
                      Referral Reward (â‚¹)
                    </Label>
                    <Input
                      type="number"
                      value={pricing.referral_reward || 300}
                      onChange={(e) => setPricing({ ...pricing, referral_reward: parseFloat(e.target.value) || 0 })}
                      placeholder="300"
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">Reward for referrer when referee completes payment</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Campaign Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-orange-600" />
                  Campaign Settings
                </CardTitle>
                <p className="text-sm text-gray-500">Configure promotional campaign pricing</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Campaign Active Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <Label className="font-medium">Campaign Active</Label>
                      <p className="text-sm text-gray-500">Enable promotional campaign pricing</p>
                    </div>
                    <button
                      onClick={() => setPricing({ ...pricing, campaign_active: !pricing.campaign_active })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        pricing.campaign_active ? 'bg-green-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          pricing.campaign_active ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Campaign Name */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-gray-500" />
                        Campaign Name
                      </Label>
                      <Input
                        type="text"
                        value={pricing.campaign_name || ''}
                        onChange={(e) => setPricing({ ...pricing, campaign_name: e.target.value })}
                        placeholder="Summer Sale"
                        className="w-full"
                      />
                    </div>

                    {/* Campaign Discount Percent */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Percent className="w-4 h-4 text-gray-500" />
                        Campaign Discount (%)
                      </Label>
                      <Input
                        type="number"
                        value={pricing.campaign_discount_percent || 10}
                        onChange={(e) => setPricing({ ...pricing, campaign_discount_percent: parseFloat(e.target.value) || 0 })}
                        placeholder="10"
                        className="w-full"
                      />
                    </div>

                    {/* Campaign Start Date */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        Campaign Start Date
                      </Label>
                      <Input
                        type="datetime-local"
                        value={pricing.campaign_start_date ? pricing.campaign_start_date.slice(0, 16) : ''}
                        onChange={(e) => setPricing({ ...pricing, campaign_start_date: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                        className="w-full"
                      />
                    </div>

                    {/* Campaign End Date */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        Campaign End Date
                      </Label>
                      <Input
                        type="datetime-local"
                        value={pricing.campaign_end_date ? pricing.campaign_end_date.slice(0, 16) : ''}
                        onChange={(e) => setPricing({ ...pricing, campaign_end_date: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Button (Requirements 8.3) */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => fetchPricing()}
                disabled={savingPricing}
              >
                Reset Changes
              </Button>
              <Button
                onClick={async () => {
                  try {
                    setSavingPricing(true);
                    const response = await axios.put(`${API}/super-admin/pricing`, pricing, {
                      params: credentials
                    });
                    if (response.data.success) {
                      toast.success('Pricing configuration saved successfully');
                    } else {
                      toast.error('Failed to save pricing configuration');
                    }
                  } catch (error) {
                    console.error('Failed to save pricing:', error);
                    toast.error(error.response?.data?.detail || 'Failed to save pricing configuration');
                  } finally {
                    setSavingPricing(false);
                  }
                }}
                disabled={savingPricing}
                className="bg-green-600 hover:bg-green-700"
              >
                {savingPricing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Save Pricing Configuration
                  </>
                )}
              </Button>
            </div>

            {/* Pricing Summary Card */}
            <Card className="bg-gradient-to-br from-green-50 to-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                  Current Pricing Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                    <div className="text-2xl font-bold text-gray-900">â‚¹{pricing.regular_price || 1999}</div>
                    <div className="text-sm text-gray-500">Regular Price</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                    <div className="text-2xl font-bold text-green-600">â‚¹{pricing.campaign_price || 1799}</div>
                    <div className="text-sm text-gray-500">Campaign Price</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                    <div className="text-2xl font-bold text-purple-600">â‚¹{pricing.referral_discount || 200}</div>
                    <div className="text-sm text-gray-500">Referral Discount</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                    <div className="text-2xl font-bold text-blue-600">â‚¹{pricing.referral_reward || 300}</div>
                    <div className="text-sm text-gray-500">Referral Reward</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Referrals Tab (Requirements 7.1, 7.2, 7.3, 7.4, 7.5) */}
        {activeTab === 'referrals' && (
          <div className="space-y-6">
            {/* Referrals Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <UserCheck className="w-6 h-6 text-purple-600" />
                  Referral Management
                </h2>
                <p className="text-gray-600">Track and manage referral program performance</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    fetchReferrals();
                    fetchReferralAnalytics();
                  }}
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportReferralsToCSV}
                  disabled={exportingReferrals}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {exportingReferrals ? 'Exporting...' : 'Export CSV'}
                </Button>
              </div>
            </div>

            {/* Analytics Cards (Requirements 7.4) */}
            {referralAnalytics && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Referrals Card */}
                <Card className="relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-500/10 to-purple-600/20 rounded-bl-full"></div>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Total Referrals</CardTitle>
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Users className="w-4 h-4 text-purple-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-900">{referralAnalytics.total_referrals || 0}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm text-purple-600">
                        {referralAnalytics.recent_referrals_30_days || 0} in last 30 days
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Conversion Rate Card */}
                <Card className="relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-500/10 to-green-600/20 rounded-bl-full"></div>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Conversion Rate</CardTitle>
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-900">
                      {(referralAnalytics.conversion_rate || 0).toFixed(1)}%
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm text-green-600">
                        {referralAnalytics.status_breakdown?.rewarded || 0} rewarded
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Total Rewards Paid Card */}
                <Card className="relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-blue-600/20 rounded-bl-full"></div>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Rewards Paid</CardTitle>
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <DollarSign className="w-4 h-4 text-blue-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-900">
                      â‚¹{(referralAnalytics.total_rewards_paid || 0).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm text-blue-600">
                        â‚¹{(referralAnalytics.total_discounts_given || 0).toLocaleString()} discounts given
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Status Breakdown Card */}
                <Card className="relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-orange-500/10 to-orange-600/20 rounded-bl-full"></div>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Status Breakdown</CardTitle>
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <PieChart className="w-4 h-4 text-orange-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-yellow-600">Pending</span>
                        <span className="font-medium">{referralAnalytics.status_breakdown?.pending || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-600">Completed</span>
                        <span className="font-medium">{referralAnalytics.status_breakdown?.completed || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600">Rewarded</span>
                        <span className="font-medium">{referralAnalytics.status_breakdown?.rewarded || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-red-600">Reversed</span>
                        <span className="font-medium">{referralAnalytics.status_breakdown?.reversed || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Referrals List Card (Requirements 7.1, 7.2, 7.3) */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Gift className="w-5 h-5 text-purple-600" />
                      Referral Records
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      Showing {referrals.length} of {referralTotal} referrals
                    </p>
                  </div>
                  
                  {/* Status Filter Dropdown (Requirements 7.3) */}
                  <div className="flex items-center gap-3">
                    <Label className="text-sm text-gray-600">Filter by Status:</Label>
                    <select
                      value={referralStatusFilter}
                      onChange={(e) => handleReferralStatusFilter(e.target.value)}
                      className="px-3 py-2 border rounded-lg bg-white min-w-[140px]"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="rewarded">Rewarded</option>
                      <option value="reversed">Reversed</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 font-medium">Referrer</th>
                        <th className="text-left p-3 font-medium">Referee</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Reward</th>
                        <th className="text-left p-3 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referrals.map((referral, index) => (
                        <tr key={referral.id || index} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                {(referral.referrer_name || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{referral.referrer_name || 'Unknown'}</div>
                                <div className="text-xs text-gray-500">{referral.referrer_email || ''}</div>
                              </div>
                            </div>
                          </td>
                          
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                {(referral.referee_name || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{referral.referee_name || 'Unknown'}</div>
                                <div className="text-xs text-gray-500">{referral.referee_email || ''}</div>
                              </div>
                            </div>
                          </td>
                          
                          <td className="p-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              referral.status === 'REWARDED' ? 'bg-green-100 text-green-800' :
                              referral.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                              referral.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                              referral.status === 'REVERSED' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {referral.status === 'REWARDED' && <CheckCircle className="w-3 h-3" />}
                              {referral.status === 'COMPLETED' && <CheckCircle className="w-3 h-3" />}
                              {referral.status === 'PENDING' && <Clock className="w-3 h-3" />}
                              {referral.status === 'REVERSED' && <XCircle className="w-3 h-3" />}
                              {referral.status || 'Unknown'}
                            </span>
                          </td>
                          
                          <td className="p-3">
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-green-600">
                                â‚¹{referral.referrer_reward || 0}
                              </div>
                              <div className="text-xs text-gray-500">
                                Discount: â‚¹{referral.referee_discount || 0}
                              </div>
                            </div>
                          </td>
                          
                          <td className="p-3">
                            <div className="space-y-1">
                              <div className="text-sm text-gray-900">
                                {referral.created_at ? new Date(referral.created_at).toLocaleDateString() : 'N/A'}
                              </div>
                              {referral.rewarded_at && (
                                <div className="text-xs text-green-600">
                                  Rewarded: {new Date(referral.rewarded_at).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {referrals.length === 0 && (
                    <div className="text-center py-12">
                      <Gift className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500">No referrals found</p>
                      {referralStatusFilter !== 'all' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReferralStatusFilter('all')}
                          className="mt-2"
                        >
                          Clear Filter
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Pagination Controls (Requirements 7.2) */}
                {referralTotal > 0 && (
                  <div className="flex items-center justify-between p-4 border-t">
                    <div className="text-sm text-gray-600">
                      Page {referralPage + 1} of {Math.ceil(referralTotal / 20)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReferralPageChange(referralPage - 1)}
                        disabled={referralPage === 0}
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReferralPageChange(referralPage + 1)}
                        disabled={!referralHasMore}
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Referrers Section */}
            {referralAnalytics?.top_referrers && referralAnalytics.top_referrers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    Top Referrers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {referralAnalytics.top_referrers.map((referrer, index) => (
                      <div key={referrer.user_id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                            index === 0 ? 'bg-yellow-500' :
                            index === 1 ? 'bg-gray-400' :
                            index === 2 ? 'bg-orange-400' :
                            'bg-purple-500'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{referrer.username || 'Unknown'}</div>
                            <div className="text-xs text-gray-500">{referrer.email || ''}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-purple-600">{referrer.referral_count || 0} referrals</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* App Versions Tab */}
        {activeTab === 'app-versions' && (
          <div className="space-y-6">
            {/* App Versions Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Download className="w-6 h-6 text-blue-600" />
                  App Version Management
                </h2>
                <p className="text-gray-600">Upload and manage Android APK and Windows EXE files</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchAppVersions()}
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button
                  onClick={() => {
                    setEditingVersion(null);
                    setNewAppVersion({
                      platform: 'android',
                      version: '',
                      version_code: 1,
                      download_url: '',
                      release_notes: '',
                      min_supported_version: '',
                      is_mandatory: false,
                      file_size: ''
                    });
                    setAppFile(null);
                    setShowAppVersionModal(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Version
                </Button>
              </div>
            </div>

            {/* Platform Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-500/10 to-green-600/20 rounded-bl-full"></div>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Android Versions</CardTitle>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Smartphone className="w-4 h-4 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">
                    {appVersions.filter(v => getPlatformKey(v.platform) === 'android').length}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Active: {appVersions.filter(v => getPlatformKey(v.platform) === 'android' && v.is_active).length}
                  </p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-blue-600/20 rounded-bl-full"></div>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Windows Versions</CardTitle>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Monitor className="w-4 h-4 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">
                    {appVersions.filter(v => getPlatformKey(v.platform) === 'windows').length}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Active: {appVersions.filter(v => getPlatformKey(v.platform) === 'windows' && v.is_active).length}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* App Versions List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  All Versions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 font-medium">Platform</th>
                        <th className="text-left p-3 font-medium">Version</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Downloads</th>
                        <th className="text-left p-3 font-medium">Size</th>
                        <th className="text-left p-3 font-medium">Created</th>
                        <th className="text-left p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appVersions.map((version, index) => (
                        <tr key={version.id || index} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {getPlatformKey(version.platform) === 'android' ? (
                                <Smartphone className="w-5 h-5 text-green-600" />
                              ) : (
                                <Monitor className="w-5 h-5 text-blue-600" />
                              )}
                              <span className="font-medium capitalize">{getPlatformKey(version.platform) || 'unknown'}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <div>
                              <span className="font-mono font-medium">v{version.version}</span>
                              <span className="text-xs text-gray-500 ml-2">(Code: {version.version_code})</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              version.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {version.is_active ? (
                                <>
                                  <CheckCircle className="w-3 h-3" />
                                  Active
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3 h-3" />
                                  Inactive
                                </>
                              )}
                            </span>
                            {version.is_mandatory && (
                              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Mandatory
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="font-medium">{version.download_count || 0}</span>
                          </td>
                          <td className="p-3">
                            <span className="text-gray-600">{version.file_size || 'N/A'}</span>
                          </td>
                          <td className="p-3">
                            <span className="text-gray-600">
                              {version.created_at ? new Date(version.created_at).toLocaleDateString() : 'N/A'}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    await axios.put(`${API}/super-admin/app-versions/${version.id}`, 
                                      { is_active: !version.is_active },
                                      { params: credentials }
                                    );
                                    toast.success(`Version ${version.is_active ? 'deactivated' : 'activated'}`);
                                    fetchAppVersions();
                                  } catch (error) {
                                    toast.error('Failed to update version status');
                                  }
                                }}
                                className={version.is_active ? 'text-orange-600 hover:text-orange-700' : 'text-green-600 hover:text-green-700'}
                              >
                                {version.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingVersion(version);
                                  setNewAppVersion({
                                    platform: version.platform,
                                    version: version.version,
                                    version_code: version.version_code,
                                    download_url: version.download_url || '',
                                    release_notes: version.release_notes || '',
                                    min_supported_version: version.min_supported_version || '',
                                    is_mandatory: version.is_mandatory || false,
                                    file_size: version.file_size || ''
                                  });
                                  setShowAppVersionModal(true);
                                }}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  if (!window.confirm('Are you sure you want to delete this version?')) return;
                                  try {
                                    await axios.delete(`${API}/super-admin/app-versions/${version.id}`, {
                                      params: credentials
                                    });
                                    toast.success('Version deleted');
                                    fetchAppVersions();
                                  } catch (error) {
                                    toast.error('Failed to delete version');
                                  }
                                }}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {appVersions.length === 0 && (
                    <div className="text-center py-12">
                      <Download className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500">No app versions found</p>
                      <p className="text-sm text-gray-400 mt-1">Click "Add Version" to upload your first app</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* App Version Modal */}
        {showAppVersionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-600" />
                  {editingVersion ? 'Edit App Version' : 'Add New App Version'}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAppVersionModal(false);
                    setEditingVersion(null);
                    setAppFile(null);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Platform Selection */}
                <div>
                  <Label>Platform *</Label>
                  <select
                    value={newAppVersion.platform}
                    onChange={(e) => setNewAppVersion({...newAppVersion, platform: e.target.value})}
                    className="w-full px-3 py-2 border rounded mt-1"
                    disabled={editingVersion}
                  >
                    <option value="android">Android (APK)</option>
                    <option value="windows">Windows (EXE/MSI)</option>
                  </select>
                </div>

                {/* Version */}
                <div>
                  <Label>Version Number *</Label>
                  <Input
                    value={newAppVersion.version}
                    onChange={(e) => setNewAppVersion({...newAppVersion, version: e.target.value})}
                    placeholder="e.g., 2.0.1"
                    className="mt-1"
                  />
                </div>

                {/* Version Code */}
                <div>
                  <Label>Version Code *</Label>
                  <Input
                    type="number"
                    value={newAppVersion.version_code}
                    onChange={(e) => setNewAppVersion({...newAppVersion, version_code: parseInt(e.target.value) || 1})}
                    placeholder="e.g., 201"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Integer version code for update comparison</p>
                </div>

                {/* File Upload */}
                {!editingVersion && (
                  <div>
                    <Label>Upload File *</Label>
                    <div className="mt-1 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-500 transition-colors">
                      <input
                        type="file"
                        ref={appFileRef}
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setAppFile(file);
                            // Auto-set file size
                            const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
                            setNewAppVersion({...newAppVersion, file_size: `${sizeMB} MB`});
                          }
                        }}
                        accept={newAppVersion.platform === 'android' ? '.apk' : '.exe,.msi,.zip'}
                        className="hidden"
                      />
                      {appFile ? (
                        <div className="flex items-center justify-center gap-2">
                          <FileText className="w-8 h-8 text-blue-600" />
                          <div className="text-left">
                            <p className="font-medium text-gray-900">{appFile.name}</p>
                            <p className="text-sm text-gray-500">{(appFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setAppFile(null);
                              if (appFileRef.current) appFileRef.current.value = '';
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          onClick={() => appFileRef.current?.click()}
                          className="cursor-pointer"
                        >
                          <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                          <p className="text-gray-600">Click to upload {newAppVersion.platform === 'android' ? 'APK' : 'EXE/MSI'} file</p>
                          <p className="text-xs text-gray-400 mt-1">Max size: 200MB</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Release Notes */}
                <div>
                  <Label>Release Notes</Label>
                  <textarea
                    value={newAppVersion.release_notes}
                    onChange={(e) => setNewAppVersion({...newAppVersion, release_notes: e.target.value})}
                    placeholder="What's new in this version..."
                    className="w-full px-3 py-2 border rounded mt-1 min-h-[80px]"
                  />
                </div>

                {/* Min Supported Version */}
                <div>
                  <Label>Minimum Supported Version</Label>
                  <Input
                    value={newAppVersion.min_supported_version}
                    onChange={(e) => setNewAppVersion({...newAppVersion, min_supported_version: e.target.value})}
                    placeholder="e.g., 1.0.0"
                    className="mt-1"
                  />
                </div>

                {/* Mandatory Update */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_mandatory"
                    checked={newAppVersion.is_mandatory}
                    onChange={(e) => setNewAppVersion({...newAppVersion, is_mandatory: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="is_mandatory" className="cursor-pointer">
                    Mandatory Update (force users to update)
                  </Label>
                </div>

                {/* Upload Progress */}
                {uploadingApp && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={async () => {
                      try {
                        if (!newAppVersion.version.trim()) {
                          toast.error('Version number is required');
                          return;
                        }

                        setUploadingApp(true);
                        setUploadProgress(0);

                        if (editingVersion) {
                          // Update existing version
                          await axios.put(`${API}/super-admin/app-versions/${editingVersion.id}`, {
                            version: newAppVersion.version,
                            version_code: newAppVersion.version_code,
                            release_notes: newAppVersion.release_notes,
                            min_supported_version: newAppVersion.min_supported_version,
                            is_mandatory: newAppVersion.is_mandatory,
                            file_size: newAppVersion.file_size
                          }, { params: credentials });
                          
                          toast.success('Version updated successfully');
                        } else {
                          // Create new version with file upload
                          if (!appFile) {
                            toast.error('Please select a file to upload');
                            setUploadingApp(false);
                            return;
                          }

                          const formData = new FormData();
                          formData.append('file', appFile);
                          formData.append('platform', newAppVersion.platform);
                          formData.append('version', newAppVersion.version);

                          // Upload file first
                          const uploadRes = await axios.post(
                            `${API}/super-admin/app-versions/upload?username=${credentials.username}&password=${credentials.password}`,
                            formData,
                            {
                              headers: { 'Content-Type': 'multipart/form-data' },
                              onUploadProgress: (progressEvent) => {
                                const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                                setUploadProgress(progress);
                              }
                            }
                          );

                          // Create version record
                          await axios.post(`${API}/super-admin/app-versions`, {
                            platform: newAppVersion.platform,
                            version: newAppVersion.version,
                            version_code: newAppVersion.version_code,
                            download_url: uploadRes.data.download_url,
                            release_notes: newAppVersion.release_notes,
                            min_supported_version: newAppVersion.min_supported_version,
                            is_mandatory: newAppVersion.is_mandatory,
                            file_size: uploadRes.data.size_mb ? `${uploadRes.data.size_mb} MB` : newAppVersion.file_size
                          }, { params: credentials });

                          toast.success('App version uploaded successfully');
                        }

                        setShowAppVersionModal(false);
                        setEditingVersion(null);
                        setAppFile(null);
                        fetchAppVersions();
                      } catch (error) {
                        console.error('Failed to save app version:', error);
                        toast.error(error.response?.data?.detail || 'Failed to save app version');
                      } finally {
                        setUploadingApp(false);
                        setUploadProgress(0);
                      }
                    }}
                    disabled={uploadingApp}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {uploadingApp ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        {editingVersion ? 'Saving...' : 'Uploading...'}
                      </>
                    ) : (
                      <>
                        {editingVersion ? <Save className="w-4 h-4 mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                        {editingVersion ? 'Save Changes' : 'Upload & Create'}
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAppVersionModal(false);
                      setEditingVersion(null);
                      setAppFile(null);
                    }}
                    disabled={uploadingApp}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Promotions Tab (Requirements 9.1, 9.2, 9.3, 9.4) */}
        {activeTab === 'promotions' && (
          <div className="space-y-6">
            {/* Promotions Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-orange-600" />
                  Promotional Campaigns
                </h2>
                <p className="text-gray-600">Create and manage promotional campaigns</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchPromotions()}
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button
                  onClick={() => {
                    resetNewCampaign();
                    setShowCreateCampaignModal(true);
                  }}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Campaign
                </Button>
              </div>
            </div>

            {/* Campaign Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Campaigns */}
              <Card className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-orange-500/10 to-orange-600/20 rounded-bl-full"></div>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Campaigns</CardTitle>
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Tag className="w-4 h-4 text-orange-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">{campaigns.length}</div>
                </CardContent>
              </Card>

              {/* Active Campaigns */}
              <Card className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-500/10 to-green-600/20 rounded-bl-full"></div>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Active Now</CardTitle>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <PlayCircle className="w-4 h-4 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {campaigns.filter(c => getCampaignStatus(c) === 'active').length}
                  </div>
                </CardContent>
              </Card>

              {/* Scheduled Campaigns */}
              <Card className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-blue-600/20 rounded-bl-full"></div>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Scheduled</CardTitle>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {campaigns.filter(c => getCampaignStatus(c) === 'scheduled').length}
                  </div>
                </CardContent>
              </Card>

              {/* Ended Campaigns */}
              <Card className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-gray-500/10 to-gray-600/20 rounded-bl-full"></div>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Ended</CardTitle>
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <StopCircle className="w-4 h-4 text-gray-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-600">
                    {campaigns.filter(c => getCampaignStatus(c) === 'ended').length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Campaign List (Requirements 9.1, 9.2) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-600" />
                  All Campaigns
                </CardTitle>
                <p className="text-sm text-gray-500">View and manage all promotional campaigns</p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 font-medium">Campaign</th>
                        <th className="text-left p-3 font-medium">Discount</th>
                        <th className="text-left p-3 font-medium">Duration</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map((campaign, index) => {
                        const status = getCampaignStatus(campaign);
                        return (
                          <tr key={campaign.id || index} className="border-b hover:bg-gray-50 transition-colors">
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                  status === 'active' ? 'bg-green-100' :
                                  status === 'scheduled' ? 'bg-blue-100' :
                                  status === 'ended' ? 'bg-gray-100' :
                                  'bg-red-100'
                                }`}>
                                  {status === 'active' ? <PlayCircle className="w-5 h-5 text-green-600" /> :
                                   status === 'scheduled' ? <Clock className="w-5 h-5 text-blue-600" /> :
                                   status === 'ended' ? <StopCircle className="w-5 h-5 text-gray-600" /> :
                                   <PauseCircle className="w-5 h-5 text-red-600" />}
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900">{campaign.title}</div>
                                  {campaign.description && (
                                    <div className="text-xs text-gray-500 truncate max-w-xs">{campaign.description}</div>
                                  )}
                                  {campaign.theme && campaign.theme !== 'default' && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-800 mt-1">
                                      {campaign.theme}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            
                            <td className="p-3">
                              <div className="space-y-1">
                                {campaign.discount_percentage > 0 && (
                                  <div className="text-sm font-medium text-green-600">
                                    {campaign.discount_percentage}% off
                                  </div>
                                )}
                                {campaign.discount_amount > 0 && (
                                  <div className="text-sm font-medium text-green-600">
                                    â‚¹{campaign.discount_amount} off
                                  </div>
                                )}
                                {!campaign.discount_percentage && !campaign.discount_amount && (
                                  <div className="text-sm text-gray-500">No discount</div>
                                )}
                              </div>
                            </td>
                            
                            <td className="p-3">
                              <div className="space-y-1">
                                <div className="text-sm text-gray-900">
                                  {new Date(campaign.start_date).toLocaleDateString()}
                                </div>
                                <div className="text-xs text-gray-500">
                                  to {new Date(campaign.end_date).toLocaleDateString()}
                                </div>
                              </div>
                            </td>
                            
                            <td className="p-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                status === 'active' ? 'bg-green-100 text-green-800' :
                                status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                                status === 'ended' ? 'bg-gray-100 text-gray-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {status === 'active' && <CheckCircle className="w-3 h-3" />}
                                {status === 'scheduled' && <Clock className="w-3 h-3" />}
                                {status === 'ended' && <StopCircle className="w-3 h-3" />}
                                {status === 'inactive' && <PauseCircle className="w-3 h-3" />}
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </span>
                            </td>
                            
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => toggleCampaignStatus(campaign.id, campaign.is_active)}
                                  className={`text-xs h-7 px-2 ${
                                    campaign.is_active ? 'text-red-600 border-red-200' : 'text-green-600 border-green-200'
                                  }`}
                                  title={campaign.is_active ? 'Deactivate' : 'Activate'}
                                >
                                  {campaign.is_active ? <PauseCircle className="w-3 h-3" /> : <PlayCircle className="w-3 h-3" />}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => deleteCampaign(campaign.id)}
                                  className="text-xs h-7 px-2 text-red-600 border-red-200"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  
                  {campaigns.length === 0 && (
                    <div className="text-center py-12">
                      <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500">No campaigns found</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          resetNewCampaign();
                          setShowCreateCampaignModal(true);
                        }}
                        className="mt-4"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Your First Campaign
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Sale Offer Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-red-600" />
                  Sale Offer Banner
                </CardTitle>
                <p className="text-sm text-gray-500">Configure the promotional sale banner displayed to users</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Sale Offer Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <Label className="font-medium">Sale Banner Active</Label>
                      <p className="text-sm text-gray-500">Show promotional banner to users</p>
                    </div>
                    <button
                      onClick={() => setSaleOffer({ ...saleOffer, enabled: !saleOffer.enabled })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        saleOffer.enabled ? 'bg-green-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          saleOffer.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {saleOffer.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Sale Title</Label>
                        <Input
                          value={saleOffer.title || ''}
                          onChange={(e) => setSaleOffer({ ...saleOffer, title: e.target.value })}
                          placeholder="e.g., New Year Sale!"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Discount Text</Label>
                        <Input
                          value={saleOffer.discount_text || ''}
                          onChange={(e) => setSaleOffer({ ...saleOffer, discount_text: e.target.value })}
                          placeholder="e.g., 20% OFF"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Sale Price (â‚¹)</Label>
                        <Input
                          type="number"
                          value={saleOffer.sale_price || ''}
                          onChange={(e) => setSaleOffer({ ...saleOffer, sale_price: parseFloat(e.target.value) || 0 })}
                          placeholder="1599"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End Date</Label>
                        <Input
                          type="datetime-local"
                          value={saleOffer.end_date ? saleOffer.end_date.slice(0, 16) : ''}
                          onChange={(e) => setSaleOffer({ ...saleOffer, end_date: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                        />
                      </div>
                      
                      {/* Theme Selector (Requirements 7.2) */}
                      <div className="space-y-2 md:col-span-2">
                        <Label className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-purple-500" />
                          Banner Theme
                        </Label>
                        <select
                          value={saleOffer.theme || 'default'}
                          onChange={(e) => setSaleOffer({ ...saleOffer, theme: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        >
                          <option value="default">ðŸŽ Default - Purple/Violet gradient with sparkles</option>
                          <option value="early_adopter">ðŸš€ Early Adopter - Emerald/Teal/Cyan gradient with rocket</option>
                          <option value="diwali">ðŸª” Diwali - Orange/Red/Pink festive gradient</option>
                          <option value="christmas">ðŸŽ„ Christmas - Red/Green holiday gradient</option>
                          <option value="newyear">ðŸŽ‰ New Year - Indigo/Purple/Pink celebration</option>
                          <option value="flash">âš¡ Flash Sale - Red/Orange/Yellow urgent gradient</option>
                          <option value="blackfriday">ðŸ”¥ Black Friday - Dark/Black premium gradient</option>
                          <option value="summer">â˜€ï¸ Summer - Cyan/Yellow/Orange bright gradient</option>
                          <option value="republic">ðŸ‡®ðŸ‡³ Republic Day - Orange/White/Green tricolor</option>
                          <option value="holi">ðŸŽ¨ Holi - Pink/Purple/Blue colorful gradient</option>
                        </select>
                        
                        {/* Theme Preview */}
                        <div className="mt-2 p-3 rounded-lg border">
                          <p className="text-xs text-gray-500 mb-2">Theme Preview:</p>
                          <div className={`p-3 rounded-lg text-white text-center text-sm font-medium ${
                            saleOffer.theme === 'default' ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600' :
                            saleOffer.theme === 'early_adopter' ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500' :
                            saleOffer.theme === 'diwali' ? 'bg-gradient-to-r from-orange-500 via-red-500 to-pink-500' :
                            saleOffer.theme === 'christmas' ? 'bg-gradient-to-r from-red-600 via-red-500 to-green-600' :
                            saleOffer.theme === 'newyear' ? 'bg-gradient-to-r from-indigo-900 via-purple-900 to-pink-900' :
                            saleOffer.theme === 'flash' ? 'bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500' :
                            saleOffer.theme === 'blackfriday' ? 'bg-gradient-to-r from-gray-900 via-black to-gray-900' :
                            saleOffer.theme === 'summer' ? 'bg-gradient-to-r from-cyan-400 via-yellow-400 to-orange-400 text-gray-900' :
                            saleOffer.theme === 'republic' ? 'bg-gradient-to-r from-orange-500 via-white to-green-600 text-gray-900' :
                            saleOffer.theme === 'holi' ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500' :
                            'bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600'
                          }`}>
                            <span className="flex items-center justify-center gap-2">
                              {saleOffer.theme === 'early_adopter' && <Rocket className="w-4 h-4" />}
                              {saleOffer.theme === 'default' && <Sparkles className="w-4 h-4" />}
                              {saleOffer.theme === 'diwali' && <span>ðŸª”</span>}
                              {saleOffer.theme === 'christmas' && <Gift className="w-4 h-4" />}
                              {saleOffer.theme === 'newyear' && <span>ðŸŽ‰</span>}
                              {saleOffer.theme === 'flash' && <Zap className="w-4 h-4" />}
                              {saleOffer.theme === 'blackfriday' && <Flame className="w-4 h-4" />}
                              {saleOffer.theme === 'summer' && <Star className="w-4 h-4" />}
                              {saleOffer.theme === 'republic' && <span>ðŸ‡®ðŸ‡³</span>}
                              {saleOffer.theme === 'holi' && <span>ðŸŽ¨</span>}
                              {saleOffer.title || 'Sale Banner Preview'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button
                      onClick={async () => {
                        try {
                          setSavingSaleOffer(true);
                          await axios.put(`${API}/super-admin/sale-offer`, saleOffer, {
                            params: credentials
                          });
                          toast.success('Sale offer updated successfully');
                        } catch (error) {
                          toast.error('Failed to update sale offer');
                        } finally {
                          setSavingSaleOffer(false);
                        }
                      }}
                      disabled={savingSaleOffer}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {savingSaleOffer ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Save Sale Offer
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Create Campaign Modal (Requirements 9.2, 9.3) */}
        {showCreateCampaignModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-lg max-h-[90vh] overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-orange-600" />
                  Create New Campaign
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCreateCampaignModal(false);
                    resetNewCampaign();
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="overflow-y-auto">
                <div className="space-y-4">
                  {/* Error Message */}
                  {campaignError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      {campaignError}
                    </div>
                  )}

                  {/* Campaign Title */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-gray-500" />
                      Campaign Title *
                    </Label>
                    <Input
                      value={newCampaign.title}
                      onChange={(e) => setNewCampaign({ ...newCampaign, title: e.target.value })}
                      placeholder="e.g., New Year Sale 2026"
                      className="w-full"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-500" />
                      Description
                    </Label>
                    <textarea
                      value={newCampaign.description}
                      onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                      placeholder="Campaign description..."
                      className="w-full px-3 py-2 border rounded-lg resize-none h-20"
                    />
                  </div>

                  {/* Discount Settings */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Percent className="w-4 h-4 text-gray-500" />
                        Discount (%)
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={newCampaign.discount_percentage}
                        onChange={(e) => setNewCampaign({ ...newCampaign, discount_percentage: parseFloat(e.target.value) || 0 })}
                        placeholder="10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-500" />
                        Fixed Amount (â‚¹)
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={newCampaign.discount_amount || ''}
                        onChange={(e) => setNewCampaign({ ...newCampaign, discount_amount: e.target.value ? parseFloat(e.target.value) : null })}
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  {/* Date Range */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        Start Date *
                      </Label>
                      <Input
                        type="datetime-local"
                        value={newCampaign.start_date}
                        onChange={(e) => setNewCampaign({ ...newCampaign, start_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        End Date *
                      </Label>
                      <Input
                        type="datetime-local"
                        value={newCampaign.end_date}
                        onChange={(e) => setNewCampaign({ ...newCampaign, end_date: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Theme Selection */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-gray-500" />
                      Campaign Theme
                    </Label>
                    <select
                      value={newCampaign.theme}
                      onChange={(e) => setNewCampaign({ ...newCampaign, theme: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-white"
                    >
                      <option value="default">Default</option>
                      <option value="new_year">New Year</option>
                      <option value="diwali">Diwali</option>
                      <option value="christmas">Christmas</option>
                      <option value="summer">Summer Sale</option>
                      <option value="flash">Flash Sale</option>
                      <option value="black_friday">Black Friday</option>
                      <option value="republic_day">Republic Day</option>
                      <option value="holi">Holi</option>
                    </select>
                  </div>

                  {/* Banner Settings */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-gray-500" />
                        Banner Text
                      </Label>
                      <Input
                        value={newCampaign.banner_text}
                        onChange={(e) => setNewCampaign({ ...newCampaign, banner_text: e.target.value })}
                        placeholder="e.g., Limited Time Offer!"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        Banner Color
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="color"
                          value={newCampaign.banner_color}
                          onChange={(e) => setNewCampaign({ ...newCampaign, banner_color: e.target.value })}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={newCampaign.banner_color}
                          onChange={(e) => setNewCampaign({ ...newCampaign, banner_color: e.target.value })}
                          placeholder="#FF6B35"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={createCampaign}
                      disabled={savingCampaign}
                      className="flex-1 bg-orange-600 hover:bg-orange-700"
                    >
                      {savingCampaign ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Create Campaign
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCreateCampaignModal(false);
                        resetNewCampaign();
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Business Details Modal - Enhanced (Requirements 10.2, 10.3, 10.4, 10.5) */}
        {showBusinessDetails && businessDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-3xl max-h-[90vh] overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                <div className="flex items-center gap-3">
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-blue-600" />
                    Business Details
                  </CardTitle>
                  {userNavigation.totalUsers > 0 && (
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {userNavigation.currentPosition} of {userNavigation.totalUsers}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* Previous/Next Navigation Buttons (Requirements 10.5) */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateToUser(userNavigation.previousUserId)}
                    disabled={!userNavigation.previousUserId || businessDetailsLoading}
                    className="h-8 px-2"
                    title="Previous User"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateToUser(userNavigation.nextUserId)}
                    disabled={!userNavigation.nextUserId || businessDetailsLoading}
                    className="h-8 px-2"
                    title="Next User"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowBusinessDetails(false);
                      setBusinessDetails(null);
                      setUserNavigation({ previousUserId: null, nextUserId: null, currentPosition: 0, totalUsers: 0 });
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="overflow-y-auto max-h-[calc(90vh-100px)] p-6">
                {businessDetailsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-500">Loading...</span>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* User Info Header */}
                    <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                      <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {(businessDetails.username || businessDetails.email || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{businessDetails.username || 'Unknown User'}</h3>
                        <p className="text-sm text-gray-600">{businessDetails.email}</p>
                        <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${
                          businessDetails.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {businessDetails.role || 'user'}
                        </span>
                      </div>
                    </div>

                    {/* Business Information Section (Requirements 10.2) */}
                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Package className="w-4 h-4 text-blue-600" />
                        Business Information
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm text-gray-500">Restaurant Name</Label>
                          <p className="font-medium">{businessDetails.restaurant_name || 'Not set'}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-500">Business Type</Label>
                          <p className="font-medium">{businessDetails.business_type || 'Not set'}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-500">Phone</Label>
                          <p className="font-medium">{businessDetails.phone || 'Not set'}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-500">Email</Label>
                          <p className="font-medium">{businessDetails.email || 'Not set'}</p>
                        </div>
                        <div className="col-span-2">
                          <Label className="text-sm text-gray-500">Address</Label>
                          <p className="font-medium">{businessDetails.address || 'Not set'}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-500">GSTIN</Label>
                          <p className="font-medium font-mono">{businessDetails.gstin || 'Not set'}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-500">FSSAI License</Label>
                          <p className="font-medium font-mono">{businessDetails.fssai || 'Not set'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Subscription Status Section (Requirements 10.3) */}
                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-green-600" />
                        Subscription Status
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm text-gray-500">Status</Label>
                          <p className={`font-medium flex items-center gap-1 ${
                            businessDetails.subscription_active ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {businessDetails.subscription_active ? (
                              <><CheckCircle className="w-4 h-4" /> Active</>
                            ) : (
                              <><XCircle className="w-4 h-4" /> Inactive</>
                            )}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-500">Expires At</Label>
                          <p className="font-medium">
                            {businessDetails.subscription_expires_at 
                              ? new Date(businessDetails.subscription_expires_at).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })
                              : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-500">Payment ID</Label>
                          <p className="font-medium font-mono text-sm">
                            {businessDetails.subscription_payment_id || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-500">Account Created</Label>
                          <p className="font-medium">
                            {businessDetails.created_at 
                              ? new Date(businessDetails.created_at).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Payment History */}
                      {businessDetails.payment_history && businessDetails.payment_history.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <Label className="text-sm text-gray-500 mb-2 block">Payment History</Label>
                          <div className="space-y-2">
                            {businessDetails.payment_history.map((payment, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                                <span className="font-mono">{payment.payment_id}</span>
                                <span className="text-gray-500">
                                  {payment.verified_at 
                                    ? new Date(payment.verified_at).toLocaleDateString('en-IN')
                                    : 'Pending'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Usage Statistics Section (Requirements 10.4) */}
                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-purple-600" />
                        Usage Statistics
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {businessDetails.menu_items_count || 0}
                          </div>
                          <div className="text-sm text-gray-500">Menu Items</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {businessDetails.orders_count || 0}
                          </div>
                          <div className="text-sm text-gray-500">Total Orders</div>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">
                            â‚¹{(businessDetails.total_revenue || 0).toLocaleString('en-IN')}
                          </div>
                          <div className="text-sm text-gray-500">Revenue</div>
                        </div>
                        <div className="text-center p-3 bg-orange-50 rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">
                            {businessDetails.tables_count || 0}
                          </div>
                          <div className="text-sm text-gray-500">Tables</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-xl font-bold text-gray-700">
                            {businessDetails.staff_count || 0}
                          </div>
                          <div className="text-sm text-gray-500">Staff Members</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-xl font-bold text-gray-700">
                            {businessDetails.bill_count || 0}
                          </div>
                          <div className="text-sm text-gray-500">Bills Generated</div>
                        </div>
                      </div>
                    </div>

                    {/* Referral Information */}
                    {(businessDetails.referral_code || businessDetails.wallet_balance > 0 || businessDetails.total_referrals > 0) && (
                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                          <Gift className="w-4 h-4 text-pink-600" />
                          Referral Information
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <Label className="text-sm text-gray-500">Referral Code</Label>
                            <p className="font-medium font-mono">{businessDetails.referral_code || 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="text-sm text-gray-500">Wallet Balance</Label>
                            <p className="font-medium text-green-600">â‚¹{(businessDetails.wallet_balance || 0).toLocaleString('en-IN')}</p>
                          </div>
                          <div>
                            <Label className="text-sm text-gray-500">Total Referrals</Label>
                            <p className="font-medium">{businessDetails.total_referrals || 0}</p>
                          </div>
                          <div>
                            <Label className="text-sm text-gray-500">Referral Earnings</Label>
                            <p className="font-medium text-green-600">â‚¹{(businessDetails.total_referral_earnings || 0).toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Blog Management Tab */}
        {activeTab === 'blog' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-purple-600" />
                  Blog Management
                </h2>
                <p className="text-gray-500 text-sm mt-1">Create and manage blog posts for SEO and lead generation</p>
              </div>
              <Button
                onClick={() => {
                  setEditingPost(null);
                  setBlogForm({
                    title: '', slug: '', metaTitle: '', metaDescription: '', excerpt: '',
                    category: 'Software Guide', content: '', readTime: '5 min read',
                    image: '', imageAlt: '', primaryKeyword: '', targetMarket: 'India',
                    status: 'published', contentType: 'standard', featured: false,
                    leadMagnet: false, appPromo: false,
                  });
                  setShowBlogForm(true);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Blog Post
              </Button>
            </div>

            {/* Blog Form Modal */}
            {showBlogForm && (
              <Card className="border-2 border-purple-200">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{editingPost ? 'Edit Blog Post' : 'Create New Blog Post'}</span>
                    <button onClick={() => setShowBlogForm(false)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-5 h-5" />
                    </button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label>Title *</Label>
                      <Input
                        value={blogForm.title}
                        onChange={e => {
                          const title = e.target.value;
                          const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                          setBlogForm(f => ({ ...f, title, slug, metaTitle: title }));
                        }}
                        placeholder="Blog post title"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Slug *</Label>
                      <Input value={blogForm.slug} onChange={e => setBlogForm(f => ({ ...f, slug: e.target.value }))} placeholder="url-friendly-slug" className="mt-1" />
                    </div>
                    <div>
                      <Label>Primary Keyword</Label>
                      <Input value={blogForm.primaryKeyword} onChange={e => setBlogForm(f => ({ ...f, primaryKeyword: e.target.value }))} placeholder="main SEO keyword" className="mt-1" />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Meta Title</Label>
                      <Input value={blogForm.metaTitle} onChange={e => setBlogForm(f => ({ ...f, metaTitle: e.target.value }))} placeholder="SEO meta title (60 chars)" className="mt-1" />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Meta Description</Label>
                      <Input value={blogForm.metaDescription} onChange={e => setBlogForm(f => ({ ...f, metaDescription: e.target.value }))} placeholder="SEO meta description (160 chars)" className="mt-1" />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Excerpt</Label>
                      <Input value={blogForm.excerpt} onChange={e => setBlogForm(f => ({ ...f, excerpt: e.target.value }))} placeholder="Short summary shown in blog listing" className="mt-1" />
                    </div>
                    <div>
                      <Label>Category</Label>
                      <select value={blogForm.category} onChange={e => setBlogForm(f => ({ ...f, category: e.target.value }))} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white">
                        {['Software Guide','Comparison','How-To','Industry News','Case Studies','City Guides','Restaurant Tips','Technology','Lead Generation','Free Resources'].map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Target Market</Label>
                      <select value={blogForm.targetMarket} onChange={e => setBlogForm(f => ({ ...f, targetMarket: e.target.value }))} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white">
                        {['India','US','UK','UAE','Singapore','Malaysia','Australia','Canada','Global'].map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <select value={blogForm.status} onChange={e => setBlogForm(f => ({ ...f, status: e.target.value }))} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white">
                        <option value="published">Published</option>
                        <option value="draft">Draft</option>
                        <option value="scheduled">Scheduled</option>
                      </select>
                    </div>
                    <div>
                      <Label>Content Type</Label>
                      <select value={blogForm.contentType} onChange={e => setBlogForm(f => ({ ...f, contentType: e.target.value }))} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white">
                        {['standard','pillar','comparison','how-to','listicle','case-study','tool-page','city-guide','app-feature'].map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Read Time</Label>
                      <Input value={blogForm.readTime} onChange={e => setBlogForm(f => ({ ...f, readTime: e.target.value }))} placeholder="5 min read" className="mt-1" />
                    </div>
                    <div>
                      <Label>Image URL</Label>
                      <Input value={blogForm.image} onChange={e => setBlogForm(f => ({ ...f, image: e.target.value }))} placeholder="https://images.unsplash.com/..." className="mt-1" />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Image Alt Text</Label>
                      <Input value={blogForm.imageAlt} onChange={e => setBlogForm(f => ({ ...f, imageAlt: e.target.value }))} placeholder="Descriptive alt text for SEO" className="mt-1" />
                    </div>
                    <div className="flex items-center gap-6 md:col-span-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={blogForm.featured} onChange={e => setBlogForm(f => ({ ...f, featured: e.target.checked }))} className="w-4 h-4" />
                        <span className="text-sm font-medium">Featured Post</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={blogForm.leadMagnet} onChange={e => setBlogForm(f => ({ ...f, leadMagnet: e.target.checked }))} className="w-4 h-4" />
                        <span className="text-sm font-medium">Lead Magnet</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={blogForm.appPromo} onChange={e => setBlogForm(f => ({ ...f, appPromo: e.target.checked }))} className="w-4 h-4" />
                        <span className="text-sm font-medium">App Promo</span>
                      </label>
                    </div>
                    <div className="md:col-span-2">
                      <Label>Content (Markdown) *</Label>
                      <textarea
                        value={blogForm.content}
                        onChange={e => setBlogForm(f => ({ ...f, content: e.target.value }))}
                        placeholder="Write your blog post content in Markdown format..."
                        rows={16}
                        className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-purple-400"
                      />
                      <p className="text-xs text-gray-400 mt-1">{blogForm.content.split(/\s+/).filter(Boolean).length} words</p>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <Button
                      onClick={() => {
                        if (!blogForm.title || !blogForm.slug || !blogForm.content) {
                          toast.error('Title, slug, and content are required');
                          return;
                        }
                        const newPost = {
                          ...blogForm,
                          id: Date.now(),
                          date: new Date().toISOString().split('T')[0],
                          lastModified: new Date().toISOString().split('T')[0],
                          targetMarket: [blogForm.targetMarket],
                          author: { name: 'BillByteKOT Team', bio: 'Restaurant technology experts', avatar: '/images/authors/team.jpg', social: {} },
                          tags: [blogForm.category.toLowerCase(), blogForm.primaryKeyword].filter(Boolean),
                          keywords: [blogForm.primaryKeyword].filter(Boolean),
                          relatedPosts: [],
                        };
                        if (editingPost) {
                          setBlogPosts(prev => prev.map(p => p.id === editingPost.id ? { ...newPost, id: editingPost.id } : p));
                          toast.success('Blog post updated');
                        } else {
                          setBlogPosts(prev => [newPost, ...prev]);
                          toast.success('Blog post created â€” copy the JS object below to add it to blogPosts.js');
                        }
                        setShowBlogForm(false);
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {editingPost ? 'Update Post' : 'Create Post'}
                    </Button>
                    <Button variant="outline" onClick={() => setShowBlogForm(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Blog Posts List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Blog Posts ({blogPosts.length} in session)</span>
                  {blogPosts.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const code = blogPosts.map(p => JSON.stringify(p, null, 2)).join(',\n');
                        navigator.clipboard.writeText(code);
                        toast.success('Copied to clipboard â€” paste into blogPosts.js');
                      }}
                      className="flex items-center gap-1 text-xs"
                    >
                      <Copy className="w-3 h-3" />
                      Copy All as JS
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {blogPosts.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No posts created yet</p>
                    <p className="text-sm mt-1">Click "New Blog Post" to create your first post</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {blogPosts.map(post => (
                      <div key={post.id} className="flex items-start gap-4 p-4 border border-gray-200 rounded-xl hover:border-purple-200 transition-colors">
                        {post.image && (
                          <img src={post.image} alt={post.imageAlt} className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-gray-900 truncate">{post.title}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${post.status === 'published' ? 'bg-green-100 text-green-700' : post.status === 'draft' ? 'bg-gray-100 text-gray-600' : 'bg-yellow-100 text-yellow-700'}`}>
                              {post.status}
                            </span>
                            {post.featured && <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-semibold">Featured</span>}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">{post.category} â€¢ {post.targetMarket?.join(', ')} â€¢ {post.readTime}</div>
                          <div className="text-xs text-purple-600 font-mono mt-0.5">/blog/{post.slug}</div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(JSON.stringify(post, null, 2));
                              toast.success('Post JSON copied â€” paste into blogPosts.js');
                            }}
                            className="p-1.5 text-gray-400 hover:text-purple-600 rounded"
                            title="Copy JSON"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingPost(post);
                              setBlogForm({
                                ...post,
                                targetMarket: Array.isArray(post.targetMarket) ? post.targetMarket[0] : post.targetMarket,
                              });
                              setShowBlogForm(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setBlogPosts(prev => prev.filter(p => p.id !== post.id));
                              toast.success('Post removed from session');
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-4">
                <div className="flex gap-3">
                  <Lightbulb className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-bold mb-1">How to publish posts</p>
                    <ol className="list-decimal list-inside space-y-1 text-blue-700">
                      <li>Create your post using the form above</li>
                      <li>Click the <strong>Copy</strong> icon to copy the post JSON</li>
                      <li>Open <code className="bg-blue-100 px-1 rounded">frontend/src/data/blogPosts.js</code></li>
                      <li>Paste the JSON object inside the <code className="bg-blue-100 px-1 rounded">blogPosts</code> array</li>
                      <li>Deploy â€” the post will appear on the live blog immediately</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminPage;

