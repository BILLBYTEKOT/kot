import { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { API } from "../App";
import { fetchMenu, fetchBusinessSettings as fetchBusinessSettingsShared } from "../utils/sharedDataCache";
import Layout from "../components/Layout";
import TrialBanner from "../components/TrialBanner";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Label } from "../components/ui/label";
import EditOrderModal from "../components/EditOrderModal";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { toast } from "sonner";
import {
  FileText, 
  Download, 
  Sparkles, 
  TrendingUp,
  Users,
  Clock,
  Package,
  ShoppingCart,
  Calendar,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  CalendarDays,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Layers,
  Pencil,
  Trash2,
  Eye,
  X
} from "lucide-react";

const formatLocalDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const ReportsPage = ({ user }) => {
  const [dailyReport, setDailyReport] = useState(null);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [bestSelling, setBestSelling] = useState([]);
  const [staffPerformance, setStaffPerformance] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  const [categoryAnalysis, setCategoryAnalysis] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [customerBalances, setCustomerBalances] = useState([]);
  const [customerBalanceLoading, setCustomerBalanceLoading] = useState(false);

  const [menuItems, setMenuItems] = useState([]);
  const [businessSettings, setBusinessSettings] = useState({});
  const [reportOrders, setReportOrders] = useState([]);
  const [reportOrdersLoading, setReportOrdersLoading] = useState(false);
  const [editOrderModal, setEditOrderModal] = useState({ open: false, order: null });
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({ open: false, order: null });
  const [viewOrderModal, setViewOrderModal] = useState({ open: false, order: null });
  const [cancelConfirmModal, setCancelConfirmModal] = useState({ open: false, order: null });
  
  // Stock Report State
  const [stockReport, setStockReport] = useState(null);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockCategories, setStockCategories] = useState([]);
  const [stockSuppliers, setStockSuppliers] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  
  const [dateRange, setDateRange] = useState({
    start_date: formatLocalDate(), // Today's date
    end_date: formatLocalDate(),   // Today's date
  });
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [activePreset, setActivePreset] = useState('today'); // Default to today

  // Quick date presets
  const datePresets = useMemo(() => ({
    today: () => {
      const today = formatLocalDate();
      return { start_date: today, end_date: today };
    },
    yesterday: () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const date = yesterday.toISOString().split("T")[0];
      return { start_date: date, end_date: date };
    },
    week: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 7);
      return { 
        start_date: start.toISOString().split("T")[0], 
        end_date: end.toISOString().split("T")[0] 
      };
    },
    fifteenDays: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 15);
      return {
        start_date: start.toISOString().split("T")[0],
        end_date: end.toISOString().split("T")[0]
      };
    },
    month: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      return { 
        start_date: start.toISOString().split("T")[0], 
        end_date: end.toISOString().split("T")[0] 
      };
    },
    thisMonth: () => {
      const end = new Date();
      const start = new Date(end.getFullYear(), end.getMonth(), 1);
      return { 
        start_date: start.toISOString().split("T")[0], 
        end_date: end.toISOString().split("T")[0] 
      };
    },
    lastMonth: () => {
      const end = new Date();
      end.setDate(0); // Last day of previous month
      const start = new Date(end.getFullYear(), end.getMonth(), 1);
      return { 
        start_date: start.toISOString().split("T")[0], 
        end_date: end.toISOString().split("T")[0] 
      };
    }
  }), []);

  const applyPreset = useCallback((preset) => {
    setActivePreset(preset);
    setDateRange(datePresets[preset]());
  }, [datePresets]);

  const reportOrdersTotal = useMemo(
    () => reportOrders.reduce((sum, order) => sum + (Number(order?.total) || 0), 0),
    [reportOrders]
  );

  const fetchReportOrders = useCallback(async () => {
    setReportOrdersLoading(true);
    try {
      const response = await axios.get(`${API}/reports/export`, {
        params: dateRange,
      });
      setReportOrders(response.data.orders || []);
    } catch (error) {
      console.error("Failed to fetch report orders", error);
      toast.error("Failed to load orders for selected date range");
      setReportOrders([]);
    } finally {
      setReportOrdersLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    // Prioritized loading: Load critical data first, then supporting data
    const loadReports = async () => {
      setInitialLoading(true);
      
      try {
        // Priority 1: Load essential reports first (most important for overview)
        await Promise.all([
          fetchDailyReport(),
          fetchWeeklyReport(),
          fetchMonthlyReport()
        ]);
        
        // Priority 2: Load analytics data in parallel (less critical)
        Promise.all([
          fetchBestSelling(),
          fetchStaffPerformance(),
          fetchPeakHours(),
          fetchCategoryAnalysis(),
          fetchCustomerBalances({ showToast: false }),
          fetchStockReport(),
          fetchStockCategories(),
          fetchStockSuppliers()
        ]);
        
        // Priority 3: Load AI forecast last (least critical, can be slow)
        setTimeout(() => {
          fetchForecast();
        }, 500);
        
      } catch (error) {
        console.error("Error loading reports:", error);
        toast.error("Failed to load some reports");
      } finally {
        setInitialLoading(false);
      }
    };
    
    loadReports();
  }, []);

  useEffect(() => {
    fetchReportOrders();
  }, [fetchReportOrders]);

  useEffect(() => {
    const loadMenuAndSettings = async () => {
      try {
        const [menuData, settingsData] = await Promise.all([
          fetchMenu(),
          fetchBusinessSettingsShared()
        ]);
        const items = Array.isArray(menuData) ? menuData.filter((item) => item && item.available !== false) : [];
        setMenuItems(items);
        setBusinessSettings(settingsData?.business_settings || settingsData || {});
      } catch (error) {
        console.error("Failed to load menu/settings for reports", error);
      }
    };
    loadMenuAndSettings();
  }, []);

  const fetchDailyReport = async () => {
    try {
      const response = await axios.get(`${API}/reports/daily`);
      setDailyReport(response.data);
    } catch (error) {
      console.error("Failed to fetch daily report", error);
      setDailyReport({ total_orders: 0, total_sales: 0, orders: [] });
    }
  };

  const fetchWeeklyReport = async () => {
    try {
      const response = await axios.get(`${API}/reports/weekly`);
      setWeeklyReport(response.data);
    } catch (error) {
      console.error("Failed to fetch weekly report", error);
      setWeeklyReport({ total_orders: 0, total_sales: 0 });
    }
  };

  const fetchMonthlyReport = async () => {
    try {
      const response = await axios.get(`${API}/reports/monthly`);
      setMonthlyReport(response.data);
    } catch (error) {
      console.error("Failed to fetch monthly report", error);
      setMonthlyReport({ total_orders: 0, total_sales: 0 });
    }
  };

  const fetchBestSelling = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/reports/best-selling`);
      setBestSelling(response.data || []);
    } catch (error) {
      console.error("Failed to fetch best selling items", error);
      setBestSelling([]);
    }
  }, []);

  const fetchStaffPerformance = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/reports/staff-performance`);
      setStaffPerformance(response.data || []);
    } catch (error) {
      console.error("Failed to fetch staff performance", error);
      setStaffPerformance([]);
    }
  }, []);

  const fetchPeakHours = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/reports/peak-hours`);
      setPeakHours(response.data || []);
    } catch (error) {
      console.error("Failed to fetch peak hours", error);
      setPeakHours([]);
    }
  }, []);

  const fetchCategoryAnalysis = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/reports/category-analysis`);
      setCategoryAnalysis(response.data || []);
    } catch (error) {
      console.error("Failed to fetch category analysis", error);
      setCategoryAnalysis([]);
    }
  }, []);

  const handleUpdateOrder = async (payload) => {
    if (!editOrderModal.order?.id) return;
    try {
      await axios.put(`${API}/orders/${editOrderModal.order.id}`, payload);
      toast.success("Order updated successfully!");
      setEditOrderModal({ open: false, order: null });
      fetchReportOrders();
    } catch (error) {
      console.error("Update order failed", error);
      toast.error("Failed to update order");
    }
  };

  const handleDeleteOrder = async () => {
    if (!deleteConfirmModal.order?.id) return;
    try {
      await axios.delete(`${API}/orders/${deleteConfirmModal.order.id}`);
      toast.success("Order deleted");
      setDeleteConfirmModal({ open: false, order: null });
      fetchReportOrders();
    } catch (error) {
      console.error("Delete order failed", error);
      toast.error("Failed to delete order");
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelConfirmModal.order?.id) return;
    try {
      await axios.put(`${API}/orders/${cancelConfirmModal.order.id}/cancel`);
      toast.success("Order cancelled");
      setCancelConfirmModal({ open: false, order: null });
      fetchReportOrders();
    } catch (error) {
      console.error("Cancel order failed", error);
      toast.error("Failed to cancel order");
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700',
      preparing: 'bg-blue-100 text-blue-700',
      ready: 'bg-green-100 text-green-700',
      completed: 'bg-gray-100 text-gray-700',
      cancelled: 'bg-red-100 text-red-700',
      credit: 'bg-orange-100 text-orange-700',
      due: 'bg-orange-100 text-orange-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const fetchCustomerBalances = useCallback(async ({ showToast = false } = {}) => {
    setCustomerBalanceLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await axios.get(`${API}/reports/customer-balances`, { 
        headers,
        timeout: 10000 // 10 second timeout
      });
      
      const data = response.data || [];
      
      // Log for debugging
      console.log("Customer balance data received:", data);
      
      setCustomerBalances(data);
      
      if (data.length > 0) {
        if (showToast) {
          toast.success(`Found ${data.length} customers with outstanding balances`);
        }
      } else {
        console.log("No customers with outstanding balances found");
        if (showToast) {
          toast.info("No customers with outstanding balances found");
        }
      }
    } catch (error) {
      console.error("Failed to fetch customer balances", error);
      
      // More detailed error handling
      if (error.response?.status === 404) {
        if (showToast) {
          toast.error("Customer balance endpoint not found. Please check backend.");
        }
        console.log("?? Backend endpoint /reports/customer-balances not found");
      } else if (error.response?.status === 401) {
        if (showToast) {
          toast.error("Authentication required for customer balances");
        }
      } else if (error.code === 'ECONNABORTED') {
        if (showToast) {
          toast.error("Request timeout - server took too long to respond");
        }
      } else if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        if (showToast) {
          toast.error("Cannot connect to backend server");
        }
        console.log("?? Backend server might not be running");
        
        // Optional: Load mock data for testing
        if (process.env.NODE_ENV === 'development') {
          console.log("?? Loading mock data for development testing...");
          const mockData = [
            {
              customer_name: "John Doe",
              customer_phone: "+91-9876543210",
              balance_amount: 250.50,
              total_orders: 5,
              total_amount_ordered: 1250.00,
              total_paid: 999.50,
              last_order_date: new Date().toISOString(),
              credit_orders_count: 2
            },
            {
              customer_name: "Jane Smith", 
              customer_phone: "+91-9876543211",
              balance_amount: 180.00,
              total_orders: 3,
              total_amount_ordered: 680.00,
              total_paid: 500.00,
              last_order_date: new Date(Date.now() - 86400000).toISOString(),
              credit_orders_count: 1
            }
          ];
          setCustomerBalances(mockData);
          if (showToast) {
            toast.info("Using mock data for testing (development mode)");
          }
          setCustomerBalanceLoading(false);
          return;
        }
      } else {
        if (showToast) {
          toast.error("Failed to load customer balances");
        }
      }
      
      setCustomerBalances([]);
    } finally {
      setCustomerBalanceLoading(false);
    }
  }, []);

  const fetchForecast = useCallback(async () => {
    try {
      const response = await axios.post(`${API}/ai/sales-forecast`);
      setForecast(response.data);
    } catch (error) {
      console.error("Failed to fetch forecast", error);
      setForecast(null);
    }
  }, []);

  // Stock Report Functions
  const fetchStockReport = useCallback(async () => {
    setStockLoading(true);
    try {
      const response = await axios.get(`${API}/inventory`);
      const inventory = response.data || [];
      
      // Calculate stock statistics
      const totalItems = inventory.length;
      const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * item.price_per_unit), 0);
      const lowStockItems = inventory.filter(item => item.quantity <= item.min_quantity);
      const outOfStockItems = inventory.filter(item => item.quantity <= 0);
      const healthyStockItems = inventory.filter(item => item.quantity > item.min_quantity);
      
      // Calculate expiry statistics
      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
      const expiringItems = inventory.filter(item => {
        if (!item.expiry_date) return false;
        const expiryDate = new Date(item.expiry_date);
        return expiryDate > today && expiryDate <= thirtyDaysFromNow;
      });
      const expiredItems = inventory.filter(item => {
        if (!item.expiry_date) return false;
        const expiryDate = new Date(item.expiry_date);
        return expiryDate <= today;
      });
      
      setStockReport({
        inventory,
        totalItems,
        totalValue,
        lowStockItems,
        outOfStockItems,
        healthyStockItems,
        expiringItems,
        expiredItems,
        lowStockCount: lowStockItems.length,
        outOfStockCount: outOfStockItems.length,
        healthyStockCount: healthyStockItems.length,
        expiringCount: expiringItems.length,
        expiredCount: expiredItems.length
      });
    } catch (error) {
      console.error("Failed to fetch stock report", error);
      setStockReport(null);
    } finally {
      setStockLoading(false);
    }
  }, []);

  const fetchStockCategories = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/inventory/categories`);
      setStockCategories(response.data || []);
    } catch (error) {
      console.error("Failed to fetch stock categories", error);
      setStockCategories([]);
    }
  }, []);

  const fetchStockSuppliers = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/inventory/suppliers`);
      setStockSuppliers(response.data || []);
    } catch (error) {
      console.error("Failed to fetch stock suppliers", error);
      setStockSuppliers([]);
    }
  }, []);

  const fetchStockMovements = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/inventory/movements`);
      setStockMovements(response.data || []);
    } catch (error) {
      console.error("Failed to fetch stock movements", error);
      setStockMovements([]);
    }
  }, []);

  // Stock Report Export Function
  const handleExportStockReport = useCallback(async (format) => {
    if (!stockReport) {
      toast.error("No stock data to export");
      return;
    }

    setExportLoading(true);
    try {
      if (format === 'csv') {
        // Export Stock Report as CSV
        const csvContent = [
          [
            "Item Name",
            "Category", 
            "Current Stock",
            "Unit",
            "Min Quantity",
            "Price per Unit",
            "Total Value",
            "Status",
            "Supplier",
            "Expiry Date",
            "Last Updated"
          ],
          ...stockReport.inventory.map((item) => [
            item.name || 'Unknown',
            item.category_name || 'N/A',
            item.quantity || 0,
            item.unit || 'pcs',
            item.min_quantity || 0,
            item.price_per_unit?.toFixed(2) || '0.00',
            (item.quantity * item.price_per_unit)?.toFixed(2) || '0.00',
            item.quantity <= 0 ? 'Out of Stock' : 
            item.quantity <= item.min_quantity ? 'Low Stock' : 'Healthy',
            item.supplier_name || 'N/A',
            item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : 'N/A',
            item.updated_at ? new Date(item.updated_at).toLocaleDateString() : 'N/A'
          ]),
        ]
          .map((row) => row.join(","))
          .join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `stock-report-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);

        toast.success("Stock report CSV exported successfully!");
      } else if (format === 'pdf') {
        // Export Stock Report as PDF
        const printWindow = window.open('about:blank', '_blank');
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Stock Report - ${new Date().toLocaleDateString()}</title>
            <style>
              @page { size: A4 landscape; margin: 10mm; }
              body {
                font-family: 'Segoe UI', Arial, sans-serif;
                font-size: 10px;
                line-height: 1.4;
                color: #1f2937;
                margin: 0;
                padding: 10px;
              }
              .header {
                text-align: center;
                padding: 15px;
                background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
                color: white;
                border-radius: 8px;
                margin-bottom: 15px;
              }
              .header h1 { margin: 0 0 5px 0; font-size: 20px; }
              .header p { margin: 2px 0; opacity: 0.9; }
              .summary-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 10px;
                margin-bottom: 15px;
              }
              .summary-card {
                padding: 12px;
                border-radius: 8px;
                text-align: center;
              }
              .summary-card.total { background: #dbeafe; }
              .summary-card.healthy { background: #dcfce7; }
              .summary-card.low { background: #fef3c7; }
              .summary-card.out { background: #fee2e2; }
              .summary-card h4 { margin: 0 0 5px 0; font-size: 9px; text-transform: uppercase; color: #666; }
              .summary-card p { margin: 0; font-size: 16px; font-weight: bold; }
              .summary-card.total p { color: #1d4ed8; }
              .summary-card.healthy p { color: #15803d; }
              .summary-card.low p { color: #d97706; }
              .summary-card.out p { color: #dc2626; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
              th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; font-size: 9px; }
              th { background: #7c3aed; color: white; font-weight: 600; }
              tr:nth-child(even) { background: #f9fafb; }
              tr.low-stock { background: #fef3c7; }
              tr.out-of-stock { background: #fee2e2; }
              .status-healthy { color: #15803d; font-weight: bold; }
              .status-low { color: #d97706; font-weight: bold; }
              .status-out { color: #dc2626; font-weight: bold; }
              .footer { text-align: center; margin-top: 15px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 8px; color: #666; }
              @media print { body { padding: 0; } .no-print { display: none; } }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>?? Stock Report</h1>
              <p>Generated: ${new Date().toLocaleString()}</p>
              <p>Total Items: ${stockReport.totalItems} | Total Value: &#8377;${stockReport.totalValue.toFixed(2)}</p>
            </div>

            <div class="summary-grid">
              <div class="summary-card total">
                <h4>Total Items</h4>
                <p>${stockReport.totalItems}</p>
                <small>&#8377;${stockReport.totalValue.toFixed(0)} value</small>
              </div>
              <div class="summary-card healthy">
                <h4>Healthy Stock</h4>
                <p>${stockReport.healthyStockCount}</p>
                <small>${stockReport.totalItems > 0 ? Math.round((stockReport.healthyStockCount / stockReport.totalItems) * 100) : 0}% of total</small>
              </div>
              <div class="summary-card low">
                <h4>Low Stock</h4>
                <p>${stockReport.lowStockCount}</p>
                <small>Needs attention</small>
              </div>
              <div class="summary-card out">
                <h4>Out of Stock</h4>
                <p>${stockReport.outOfStockCount}</p>
                <small>Urgent action</small>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Current Stock</th>
                  <th>Min Qty</th>
                  <th>Unit Price</th>
                  <th>Total Value</th>
                  <th>Status</th>
                  <th>Expiry</th>
                </tr>
              </thead>
              <tbody>
                ${stockReport.inventory.map(item => {
                  const status = item.quantity <= 0 ? 'Out of Stock' : 
                               item.quantity <= item.min_quantity ? 'Low Stock' : 'Healthy';
                  const rowClass = item.quantity <= 0 ? 'out-of-stock' : 
                                 item.quantity <= item.min_quantity ? 'low-stock' : '';
                  const statusClass = item.quantity <= 0 ? 'status-out' : 
                                    item.quantity <= item.min_quantity ? 'status-low' : 'status-healthy';
                  
                  return `
                    <tr class="${rowClass}">
                      <td><strong>${item.name || 'Unknown'}</strong></td>
                      <td>${item.category_name || 'N/A'}</td>
                      <td>${item.quantity || 0} ${item.unit || 'pcs'}</td>
                      <td>${item.min_quantity || 0}</td>
                      <td>&#8377;${(item.price_per_unit || 0).toFixed(2)}</td>
                      <td>&#8377;${((item.quantity || 0) * (item.price_per_unit || 0)).toFixed(2)}</td>
                      <td class="${statusClass}">${status}</td>
                      <td>${item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : 'N/A'}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>

            <div class="footer">
              <p><strong>BillByteKOT</strong> - Restaurant Management System</p>
              <p>Stock Report generated on ${new Date().toLocaleString()}</p>
            </div>

            <div class="no-print" style="text-align: center; margin-top: 15px;">
              <button onclick="window.print(); setTimeout(() => window.close(), 100);" 
                style="padding: 10px 20px; background: #7c3aed; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">
                Save as PDF
              </button>
              <button onclick="window.close()" 
                style="padding: 10px 20px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; margin-left: 10px;">
                Close
              </button>
            </div>
          </body>
          </html>
        `);
        printWindow.document.close();
        
        toast.success("Stock report PDF preview opened! Use Print dialog to save as PDF");
      }
    } catch (error) {
      console.error("Failed to export stock report:", error);
      toast.error("Failed to export stock report");
    } finally {
      setExportLoading(false);
    }
  }, [stockReport]);

  const handleExportCSV = async () => {
    setExportLoading(true);
    try {
      const response = await axios.get(`${API}/reports/export`, {
        params: dateRange,
      });

      const orders = response.data.orders;
      if (!orders || orders.length === 0) {
        toast.error("No data found for selected date range");
        setExportLoading(false);
        return;
      }

      const csvContent = [
        [
          "Order ID",
          "Table",
          "Waiter",
          "Customer",
          "Items",
          "Subtotal",
          "Tax",
          "Total",
          "Status",
          "Date",
        ],
        ...orders.map((order) => [
          order.id,
          order.table_number,
          order.waiter_name,
          order.customer_name || "N/A",
          order.items.map((i) => `${i.quantity}x ${i.name}`).join("; "),
          order.subtotal.toFixed(2),
          order.tax.toFixed(2),
          order.total.toFixed(2),
          order.status,
          new Date(order.created_at).toLocaleString(),
        ]),
      ]
        .map((row) => row.join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `restaurant-report-${dateRange.start_date}-to-${dateRange.end_date}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success("CSV exported successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export CSV");
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportCustomerBalances = async () => {
    setExportLoading(true);
    try {
      if (!customerBalances || customerBalances.length === 0) {
        toast.error("No customer balance data to export");
        return;
      }

      // Filter customers with outstanding balances
      const customersWithBalance = customerBalances.filter(c => c.balance_amount > 0);
      
      if (customersWithBalance.length === 0) {
        toast.error("No customers with outstanding balances");
        return;
      }

      // Create CSV content
      const csvContent = [
        [
          "Customer Name",
          "Phone Number", 
          "Outstanding Balance",
          "Total Orders",
          "Total Amount Ordered",
          "Total Paid",
          "Last Order Date",
          "Days Since Last Order"
        ],
        ...customersWithBalance.map((customer) => [
          customer.customer_name || 'Unknown',
          customer.customer_phone || 'N/A',
          customer.balance_amount.toFixed(2),
          customer.total_orders || 0,
          customer.total_amount_ordered?.toFixed(2) || '0.00',
          customer.total_paid?.toFixed(2) || '0.00',
          customer.last_order_date ? new Date(customer.last_order_date).toLocaleDateString() : 'N/A',
          customer.last_order_date ? Math.floor((new Date() - new Date(customer.last_order_date)) / (1000 * 60 * 60 * 24)) : 'N/A'
        ]),
      ]
        .map((row) => row.join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `customer-balances-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success("Customer balance report exported successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export customer balance report");
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      const response = await axios.get(`${API}/reports/export`, {
        params: dateRange,
      });

      const orders = response.data.orders;
      if (!orders || orders.length === 0) {
        toast.error("No data found for selected date range");
        setExportLoading(false);
        return;
      }

      // Create Excel-compatible HTML table
      const totalSales = orders.reduce((sum, order) => sum + order.total, 0);
      const totalTax = orders.reduce((sum, order) => sum + order.tax, 0);
      const totalSubtotal = orders.reduce((sum, order) => sum + order.subtotal, 0);

      const excelContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head>
          <meta charset="UTF-8">
          <style>
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #7c3aed; color: white; font-weight: bold; }
            .total-row { background-color: #f3f4f6; font-weight: bold; }
            .header { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <div class="header">Sales Report: ${dateRange.start_date} to ${dateRange.end_date}</div>
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Table</th>
                <th>Waiter</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Subtotal</th>
                <th>Tax</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${orders.map(order => `
                <tr>
                  <td>${order.id.slice(0, 8)}</td>
                  <td>${order.table_number}</td>
                  <td>${order.waiter_name}</td>
                  <td>${order.customer_name || 'N/A'}</td>
                  <td>${order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}</td>
                  <td>&#8377;${order.subtotal.toFixed(2)}</td>
                  <td>&#8377;${order.tax.toFixed(2)}</td>
                  <td>&#8377;${order.total.toFixed(2)}</td>
                  <td>${order.status}</td>
                  <td>${new Date(order.created_at).toLocaleString()}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="5">TOTALS</td>
                <td>&#8377;${totalSubtotal.toFixed(2)}</td>
                <td>&#8377;${totalTax.toFixed(2)}</td>
                <td>&#8377;${totalSales.toFixed(2)}</td>
                <td colspan="2"></td>
              </tr>
            </tbody>
          </table>
        </body>
        </html>
      `;

      const blob = new Blob([excelContent], { type: "application/vnd.ms-excel" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `restaurant-report-${dateRange.start_date}-to-${dateRange.end_date}.xls`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success("Excel file exported successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export Excel");
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setExportLoading(true);
    try {
      const response = await axios.get(`${API}/reports/export`, {
        params: dateRange,
      });

      const orders = response.data.orders;
      if (!orders || orders.length === 0) {
        toast.error("No data found for selected date range");
        setExportLoading(false);
        return;
      }

      // Calculate totals
      const totalOrders = orders.length;
      const totalSales = orders.reduce((sum, order) => sum + order.total, 0);
      const totalTax = orders.reduce((sum, order) => sum + order.tax, 0);
      const totalSubtotal = orders.reduce((sum, order) => sum + order.subtotal, 0);

      // Create PDF-friendly print window
      const printWindow = window.open('about:blank', '_blank');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Sales Report PDF</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body {
              font-family: Arial, sans-serif;
              font-size: 10px;
              line-height: 1.4;
              color: #000;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #7c3aed;
              padding-bottom: 10px;
            }
            .header h1 {
              margin: 0;
              color: #7c3aed;
              font-size: 20px;
            }
            .header p {
              margin: 5px 0;
              color: #666;
            }
            .summary {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              margin-bottom: 20px;
              background: #f3f4f6;
              padding: 15px;
              border-radius: 8px;
            }
            .summary-item {
              text-align: center;
            }
            .summary-item h3 {
              margin: 0;
              font-size: 9px;
              color: #666;
            }
            .summary-item p {
              margin: 5px 0 0 0;
              font-size: 16px;
              font-weight: bold;
              color: #7c3aed;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 6px;
              text-align: left;
              font-size: 9px;
            }
            th {
              background-color: #7c3aed;
              color: white;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #f9fafb;
            }
            .total-row {
              background-color: #e5e7eb;
              font-weight: bold;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              padding-top: 10px;
              border-top: 1px solid #ddd;
              font-size: 8px;
              color: #666;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${user?.business_settings?.restaurant_name || 'Restaurant'}</h1>
            <p>Sales Report</p>
            <p>${new Date(dateRange.start_date).toLocaleDateString()} - ${new Date(dateRange.end_date).toLocaleDateString()}</p>
            <p>Generated on: ${new Date().toLocaleString()}</p>
          </div>

          <div class="summary">
            <div class="summary-item">
              <h3>Total Orders</h3>
              <p>${totalOrders}</p>
            </div>
            <div class="summary-item">
              <h3>Total Sales</h3>
              <p>&#8377;${totalSales.toFixed(2)}</p>
            </div>
            <div class="summary-item">
              <h3>Total Tax</h3>
              <p>&#8377;${totalTax.toFixed(2)}</p>
            </div>
            <div class="summary-item">
              <h3>Avg Order</h3>
              <p>&#8377;${(totalSales / totalOrders).toFixed(2)}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Date</th>
                <th>Table</th>
                <th>Waiter</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Subtotal</th>
                <th>Tax</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${orders.map(order => `
                <tr>
                  <td>${order.id.slice(0, 8)}</td>
                  <td>${new Date(order.created_at).toLocaleDateString()}</td>
                  <td>${order.table_number}</td>
                  <td>${order.waiter_name}</td>
                  <td>${order.customer_name || 'N/A'}</td>
                  <td>${order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}</td>
                  <td>&#8377;${order.subtotal.toFixed(2)}</td>
                  <td>&#8377;${order.tax.toFixed(2)}</td>
                  <td>&#8377;${order.total.toFixed(2)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="6">TOTALS</td>
                <td>&#8377;${totalSubtotal.toFixed(2)}</td>
                <td>&#8377;${totalTax.toFixed(2)}</td>
                <td>&#8377;${totalSales.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            <p>Generated by BillByteKOT AI - Restaurant Management System</p>
            <p>${user?.business_settings?.address || ''} | ${user?.business_settings?.phone || ''}</p>
          </div>

          <div class="no-print" style="text-align: center; margin-top: 20px;">
            <button onclick="window.print(); setTimeout(() => window.close(), 100);" 
              style="padding: 12px 24px; background: #7c3aed; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600;">
              Download as PDF
            </button>
            <button onclick="window.close()" 
              style="padding: 12px 24px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; margin-left: 10px;">
              Close
            </button>
            <p style="margin-top: 10px; font-size: 12px; color: #666;">
              Click "Download as PDF" and choose "Save as PDF" in the print dialog
            </p>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      
      toast.success("PDF preview opened! Use Print dialog to save as PDF");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate PDF");
    } finally {
      setExportLoading(false);
    }
  };

  const handlePrintReport = async () => {
    setExportLoading(true);
    try {
      const response = await axios.get(`${API}/reports/export`, {
        params: dateRange,
      });

      const orders = response.data.orders;
      if (!orders || orders.length === 0) {
        toast.error("No data found for selected date range");
        return;
      }

      // Calculate totals
      const totalOrders = orders.length;
      const totalSales = orders.reduce((sum, order) => sum + order.total, 0);
      const totalTax = orders.reduce((sum, order) => sum + order.tax, 0);
      const totalSubtotal = orders.reduce((sum, order) => sum + order.subtotal, 0);

      // Create print window
      const printWindow = window.open('about:blank', '_blank');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Sales Report - ${dateRange.start_date} to ${dateRange.end_date}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              max-width: 1200px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            .header h1 {
              margin: 0;
              color: #7c3aed;
            }
            .header p {
              margin: 5px 0;
              color: #666;
            }
            .summary {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
              margin-bottom: 30px;
            }
            .summary-card {
              background: #f3f4f6;
              padding: 15px;
              border-radius: 8px;
              text-align: center;
            }
            .summary-card h3 {
              margin: 0 0 5px 0;
              font-size: 14px;
              color: #666;
            }
            .summary-card p {
              margin: 0;
              font-size: 24px;
              font-weight: bold;
              color: #7c3aed;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 12px;
              text-align: left;
            }
            th {
              background-color: #7c3aed;
              color: white;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #f9fafb;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              color: #666;
              font-size: 12px;
              border-top: 1px solid #ddd;
              padding-top: 20px;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${user?.business_settings?.restaurant_name || 'Restaurant'}</h1>
            <p>Sales Report</p>
            <p>${new Date(dateRange.start_date).toLocaleDateString()} - ${new Date(dateRange.end_date).toLocaleDateString()}</p>
            <p>Generated on: ${new Date().toLocaleString()}</p>
          </div>

          <div class="summary">
            <div class="summary-card">
              <h3>Total Orders</h3>
              <p>${totalOrders}</p>
            </div>
            <div class="summary-card">
              <h3>Total Sales</h3>
              <p>&#8377;${totalSales.toFixed(2)}</p>
            </div>
            <div class="summary-card">
              <h3>Total Tax</h3>
              <p>&#8377;${totalTax.toFixed(2)}</p>
            </div>
            <div class="summary-card">
              <h3>Avg Order</h3>
              <p>&#8377;${(totalSales / totalOrders).toFixed(2)}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Date</th>
                <th>Table</th>
                <th>Waiter</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Subtotal</th>
                <th>Tax</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${orders.map(order => `
                <tr>
                  <td>${order.id.slice(0, 8)}</td>
                  <td>${new Date(order.created_at).toLocaleDateString()}</td>
                  <td>${order.table_number}</td>
                  <td>${order.waiter_name}</td>
                  <td>${order.customer_name || 'N/A'}</td>
                  <td>${order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}</td>
                  <td>&#8377;${order.subtotal.toFixed(2)}</td>
                  <td>&#8377;${order.tax.toFixed(2)}</td>
                  <td><strong>&#8377;${order.total.toFixed(2)}</strong></td>
                  <td>${order.status}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="background-color: #f3f4f6; font-weight: bold;">
                <td colspan="6" style="text-align: right;">TOTALS:</td>
                <td>&#8377;${totalSubtotal.toFixed(2)}</td>
                <td>&#8377;${totalTax.toFixed(2)}</td>
                <td>&#8377;${totalSales.toFixed(2)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>

          <div class="footer">
            <p>Generated by BillByteKOT AI - Restaurant Management System</p>
            <p>${user?.business_settings?.address || ''} | ${user?.business_settings?.phone || ''}</p>
          </div>

          <div class="no-print" style="text-align: center; margin-top: 20px;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #7c3aed; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">
              Print Report
            </button>
            <button onclick="window.close()" style="padding: 10px 20px; background: #6b7280; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; margin-left: 10px;">
              Close
            </button>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      
      toast.success("Print preview opened!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate print report");
    } finally {
      setExportLoading(false);
    }
  };

  // Comprehensive Detailed Report with all analytics
  const handleDetailedReport = async () => {
    setExportLoading(true);
    try {
      const response = await axios.get(`${API}/reports/export`, {
        params: dateRange,
      });

      const orders = response.data.orders || [];
      
      // Calculate totals
      const totalOrders = orders.length;
      const totalSales = orders.reduce((sum, order) => sum + order.total, 0);
      const totalTax = orders.reduce((sum, order) => sum + order.tax, 0);
      const completedOrders = orders.filter(o => o.status === 'completed').length;
      const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;

      // Create comprehensive PDF report
      const printWindow = window.open('about:blank', '_blank');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Detailed Business Report - ${dateRange.start_date} to ${dateRange.end_date}</title>
          <style>
            @page { size: A4; margin: 10mm; }
            * { box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              font-size: 11px;
              line-height: 1.4;
              color: #1f2937;
              margin: 0;
              padding: 15px;
            }
            .header {
              text-align: center;
              padding: 20px;
              background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
              color: white;
              border-radius: 12px;
              margin-bottom: 20px;
            }
            .header h1 { margin: 0 0 5px 0; font-size: 24px; }
            .header p { margin: 3px 0; opacity: 0.9; }
            .section { margin-bottom: 25px; page-break-inside: avoid; }
            .section-title {
              font-size: 16px;
              font-weight: bold;
              color: #7c3aed;
              border-bottom: 2px solid #7c3aed;
              padding-bottom: 8px;
              margin-bottom: 15px;
            }
            .stats-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
              margin-bottom: 20px;
            }
            .stat-card {
              background: #f3f4f6;
              padding: 15px;
              border-radius: 10px;
              text-align: center;
            }
            .stat-card.highlight { background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; }
            .stat-card h4 { margin: 0 0 5px 0; font-size: 10px; opacity: 0.8; text-transform: uppercase; }
            .stat-card p { margin: 0; font-size: 22px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px 10px; text-align: left; font-size: 10px; }
            th { background: #7c3aed; color: white; font-weight: 600; }
            tr:nth-child(even) { background: #f9fafb; }
            .rank { 
              display: inline-flex; 
              align-items: center; 
              justify-content: center;
              width: 24px; 
              height: 24px; 
              background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); 
              color: white; 
              border-radius: 50%; 
              font-weight: bold;
              font-size: 11px;
            }
            .progress-bar { 
              height: 8px; 
              background: #e5e7eb; 
              border-radius: 4px; 
              overflow: hidden;
              margin-top: 4px;
            }
            .progress-fill { height: 100%; background: linear-gradient(90deg, #7c3aed, #a855f7); border-radius: 4px; }
            .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .footer {
              text-align: center;
              padding: 15px;
              border-top: 2px solid #e5e7eb;
              margin-top: 20px;
              color: #6b7280;
              font-size: 10px;
            }
            .no-print { margin-top: 20px; text-align: center; }
            .btn {
              padding: 12px 24px;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              font-weight: 600;
              font-size: 14px;
              margin: 5px;
            }
            .btn-primary { background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; }
            .btn-secondary { background: #6b7280; color: white; }
            @media print {
              .no-print { display: none !important; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>?? ${user?.business_settings?.restaurant_name || 'Restaurant'}</h1>
            <p><strong>Detailed Business Report</strong></p>
            <p>${new Date(dateRange.start_date).toLocaleDateString()} - ${new Date(dateRange.end_date).toLocaleDateString()}</p>
            <p>Generated: ${new Date().toLocaleString()}</p>
          </div>

          <!-- Summary Stats -->
          <div class="section">
            <div class="section-title">?? Summary Overview</div>
            <div class="stats-grid">
              <div class="stat-card highlight">
                <h4>Total Revenue</h4>
                <p>&#8377;${totalSales.toFixed(0)}</p>
              </div>
              <div class="stat-card">
                <h4>Total Orders</h4>
                <p>${totalOrders}</p>
              </div>
              <div class="stat-card">
                <h4>Avg Order Value</h4>
                <p>&#8377;${totalOrders > 0 ? (totalSales / totalOrders).toFixed(0) : 0}</p>
              </div>
              <div class="stat-card">
                <h4>Tax Collected</h4>
                <p>&#8377;${totalTax.toFixed(0)}</p>
              </div>
            </div>
            <div class="stats-grid">
              <div class="stat-card" style="background: #dcfce7;">
                <h4>Completed</h4>
                <p style="color: #16a34a;">${completedOrders}</p>
              </div>
              <div class="stat-card" style="background: #fef3c7;">
                <h4>Pending</h4>
                <p style="color: #d97706;">${orders.filter(o => o.status === 'pending').length}</p>
              </div>
              <div class="stat-card" style="background: #dbeafe;">
                <h4>Preparing</h4>
                <p style="color: #2563eb;">${orders.filter(o => o.status === 'preparing').length}</p>
              </div>
              <div class="stat-card" style="background: #fee2e2;">
                <h4>Cancelled</h4>
                <p style="color: #dc2626;">${cancelledOrders}</p>
              </div>
            </div>
          </div>

          <div class="two-col">
            <!-- Best Selling Items -->
            <div class="section">
              <div class="section-title">?? Top Selling Items</div>
              ${bestSelling && bestSelling.length > 0 ? `
                <table>
                  <thead>
                    <tr><th>#</th><th>Item</th><th>Qty</th><th>Revenue</th></tr>
                  </thead>
                  <tbody>
                    ${bestSelling.slice(0, 10).map((item, i) => `
                      <tr>
                        <td><span class="rank">${i + 1}</span></td>
                        <td><strong>${item.name || 'Unknown'}</strong><br><small style="color:#6b7280">${item.category || ''}</small></td>
                        <td>${item.total_quantity || 0}</td>
                        <td>&#8377;${(item.total_revenue || 0).toFixed(0)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              ` : '<p style="color:#6b7280;text-align:center;">No data available</p>'}
            </div>

            <!-- Staff Performance -->
            <div class="section">
              <div class="section-title">?? Staff Performance</div>
              ${staffPerformance && staffPerformance.length > 0 ? `
                <table>
                  <thead>
                    <tr><th>Staff</th><th>Orders</th><th>Sales</th><th>Avg</th></tr>
                  </thead>
                  <tbody>
                    ${staffPerformance.slice(0, 10).map(staff => `
                      <tr>
                        <td><strong>${staff.waiter_name}</strong></td>
                        <td>${staff.total_orders}</td>
                        <td>&#8377;${(staff.total_sales || 0).toFixed(0)}</td>
                        <td>&#8377;${(staff.avg_order_value || 0).toFixed(0)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              ` : '<p style="color:#6b7280;text-align:center;">No data available</p>'}
            </div>
          </div>

          <div class="two-col">
            <!-- Peak Hours -->
            <div class="section">
              <div class="section-title">? Peak Hours Analysis</div>
              ${peakHours && peakHours.length > 0 ? `
                <table>
                  <thead>
                    <tr><th>Hour</th><th>Orders</th><th>Sales</th><th>Activity</th></tr>
                  </thead>
                  <tbody>
                    ${peakHours.slice(0, 12).map(hour => {
                      const maxOrders = Math.max(...peakHours.map(h => h.order_count || 0));
                      const pct = maxOrders > 0 ? ((hour.order_count || 0) / maxOrders) * 100 : 0;
                      return `
                        <tr>
                          <td>${hour.hour}:00</td>
                          <td>${hour.order_count || 0}</td>
                          <td>&#8377;${(hour.total_sales || 0).toFixed(0)}</td>
                          <td>
                            <div class="progress-bar">
                              <div class="progress-fill" style="width:${pct}%"></div>
                            </div>
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              ` : '<p style="color:#6b7280;text-align:center;">No data available</p>'}
            </div>

            <!-- Category Analysis -->
            <div class="section">
              <div class="section-title">?? Sales by Category</div>
              ${categoryAnalysis && categoryAnalysis.length > 0 ? `
                <table>
                  <thead>
                    <tr><th>Category</th><th>Items</th><th>Revenue</th><th>Share</th></tr>
                  </thead>
                  <tbody>
                    ${categoryAnalysis.map(cat => {
                      const maxRev = Math.max(...categoryAnalysis.map(c => c.total_revenue || 0));
                      const pct = maxRev > 0 ? ((cat.total_revenue || 0) / maxRev) * 100 : 0;
                      return `
                        <tr>
                          <td><strong>${cat.category}</strong></td>
                          <td>${cat.total_quantity || 0}</td>
                          <td>&#8377;${(cat.total_revenue || 0).toFixed(0)}</td>
                          <td>
                            <div class="progress-bar">
                              <div class="progress-fill" style="width:${pct}%"></div>
                            </div>
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              ` : '<p style="color:#6b7280;text-align:center;">No data available</p>'}
            </div>
          </div>

          <!-- Orders Table -->
          ${orders.length > 0 ? `
            <div class="section">
              <div class="section-title">?? Order Details (${orders.length} orders)</div>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Date</th>
                    <th>Table</th>
                    <th>Staff</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${orders.slice(0, 50).map(order => `
                    <tr>
                      <td>${order.id.slice(0, 8)}</td>
                      <td>${new Date(order.created_at).toLocaleDateString()}</td>
                      <td>${order.table_number}</td>
                      <td>${order.waiter_name}</td>
                      <td>${order.items.map(i => i.quantity + 'x ' + i.name).join(', ').slice(0, 40)}${order.items.length > 2 ? '...' : ''}</td>
                      <td><strong>&#8377;${order.total.toFixed(0)}</strong></td>
                      <td style="color: ${order.status === 'completed' ? '#16a34a' : order.status === 'cancelled' ? '#dc2626' : '#d97706'}">${order.status}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              ${orders.length > 50 ? '<p style="text-align:center;color:#6b7280;font-size:10px;">Showing first 50 orders. Export CSV for complete data.</p>' : ''}
            </div>
          ` : ''}

          <div class="footer">
            <p><strong>BillByteKOT</strong> - Restaurant Management System</p>
            <p>${user?.business_settings?.address || ''} ${user?.business_settings?.phone ? '| ' + user.business_settings.phone : ''}</p>
            <p>Report generated on ${new Date().toLocaleString()}</p>
          </div>

          <div class="no-print">
            <button class="btn btn-primary" onclick="window.print()">?? Save as PDF / Print</button>
            <button class="btn btn-secondary" onclick="window.close()">? Close</button>
            <p style="margin-top:10px;font-size:12px;color:#6b7280;">
              Click "Save as PDF" in print dialog to download PDF
            </p>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      
      toast.success("Detailed report ready! Click 'Save as PDF' to download");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate detailed report");
    } finally {
      setExportLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <Layout user={user}>
        <div className="space-y-6">
          <TrialBanner user={user} />
          
          {/* Header Skeleton */}
          <div>
            <div className="h-10 bg-gray-200 rounded animate-pulse w-80 mb-2"></div>
            <div className="h-5 bg-gray-200 rounded animate-pulse w-96"></div>
          </div>

          {/* Tabs Skeleton */}
          <div className="flex gap-2 mb-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded animate-pulse w-24"></div>
            ))}
          </div>

          {/* Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border-0 shadow-lg rounded-lg p-6 bg-white">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-24 mb-4"></div>
                <div className="h-12 bg-gray-200 rounded animate-pulse w-32"></div>
              </div>
            ))}
          </div>

          {/* Large Card Skeleton */}
          <div className="border-0 shadow-lg rounded-lg p-6 bg-white">
            <div className="h-6 bg-gray-200 rounded animate-pulse w-48 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user}>
      <div className="reports-page space-y-6" data-testid="reports-page">
        <TrialBanner user={user} />
        <div>
          <h1
            className="text-2xl sm:text-4xl font-bold"
            style={{ fontFamily: "Space Grotesk, sans-serif" }}
          >
            Reports & Analytics
          </h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
            Comprehensive business insights
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
          {/* Mobile-optimized scrollable tabs */}
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-2">
            <TabsList className="inline-flex w-max sm:w-full sm:grid sm:grid-cols-9 gap-1 min-w-max sm:min-w-0 bg-gray-100/80 p-1 rounded-xl">
              <TabsTrigger value="overview" className="whitespace-nowrap px-3 py-2 text-xs sm:text-sm rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <span className="hidden sm:inline">Overview</span>
                <span className="sm:hidden">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="sales" className="whitespace-nowrap px-3 py-2 text-xs sm:text-sm rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <span className="hidden sm:inline">Sales Trends</span>
                <span className="sm:hidden">Sales</span>
              </TabsTrigger>
              <TabsTrigger value="items" className="whitespace-nowrap px-3 py-2 text-xs sm:text-sm rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <span className="hidden sm:inline">Best Sellers</span>
                <span className="sm:hidden">Top Items</span>
              </TabsTrigger>
              <TabsTrigger value="stock" className="whitespace-nowrap px-3 py-2 text-xs sm:text-sm rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <span className="hidden sm:inline">Stock Report</span>
                <span className="sm:hidden">Stock</span>
              </TabsTrigger>
              <TabsTrigger value="staff" className="whitespace-nowrap px-3 py-2 text-xs sm:text-sm rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <span className="hidden sm:inline">Staff Performance</span>
                <span className="sm:hidden">Staff</span>
              </TabsTrigger>
              <TabsTrigger value="hours" className="whitespace-nowrap px-3 py-2 text-xs sm:text-sm rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <span className="hidden sm:inline">Peak Hours</span>
                <span className="sm:hidden">Hours</span>
              </TabsTrigger>
              <TabsTrigger value="customers" className="whitespace-nowrap px-3 py-2 text-xs sm:text-sm rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <span className="hidden sm:inline">Customer Balance</span>
                <span className="sm:hidden">Customers</span>
              </TabsTrigger>
              <TabsTrigger value="daybook" className="whitespace-nowrap px-3 py-2 text-xs sm:text-sm rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <span className="hidden sm:inline">Day Book</span>
                <span className="sm:hidden">Day Book</span>
              </TabsTrigger>
              <TabsTrigger value="export" className="whitespace-nowrap px-3 py-2 text-xs sm:text-sm rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <span className="hidden sm:inline">Export</span>
                <span className="sm:hidden">Export</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 sm:space-y-6">
            {dailyReport && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
                <Card
                  className="card-hover border-0 shadow-lg"
                  data-testid="daily-orders-card"
                >
                  <CardHeader className="pb-2 sm:pb-4">
                    <CardTitle className="text-xs sm:text-sm text-gray-600">
                      Today's Orders
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-2xl sm:text-4xl font-bold text-violet-600">
                      {dailyReport.total_orders}
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className="card-hover border-0 shadow-lg"
                  data-testid="daily-sales-card"
                >
                  <CardHeader className="pb-2 sm:pb-4">
                    <CardTitle className="text-xs sm:text-sm text-gray-600">
                      Today's Sales
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-2xl sm:text-4xl font-bold text-green-600 truncate">
                      {"\u20B9"}{(dailyReport?.total_sales || 0).toFixed(2)}
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className="card-hover border-0 shadow-lg sm:col-span-1 col-span-1"
                  data-testid="avg-order-card"
                >
                  <CardHeader className="pb-2 sm:pb-4">
                    <CardTitle className="text-xs sm:text-sm text-gray-600">
                      Avg Order Value
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-2xl sm:text-4xl font-bold text-blue-600 truncate">
                      {"\u20B9"}
                      {(dailyReport?.total_orders || 0) > 0
                        ? (
                            (dailyReport?.total_sales || 0) / (dailyReport?.total_orders || 1)
                          ).toFixed(2)
                        : "0.00"}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {forecast && (
              <Card className="border-0 shadow-lg" data-testid="forecast-card">
                <CardHeader className="pb-2 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600" />
                    AI Sales Forecast
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 sm:space-y-4">
                    <div className="grid grid-cols-3 gap-2 sm:gap-4 p-3 sm:p-4 bg-violet-50 rounded-lg">
                      <div className="text-center sm:text-left">
                        <p className="text-xs sm:text-sm text-gray-600">Orders</p>
                        <p className="text-lg sm:text-2xl font-bold text-violet-600">
                          {forecast.current_stats.total_orders}
                        </p>
                      </div>
                      <div className="text-center sm:text-left">
                        <p className="text-xs sm:text-sm text-gray-600">Sales</p>
                        <p className="text-lg sm:text-2xl font-bold text-green-600 truncate">
                          {"\u20B9"}{(forecast?.current_stats?.total_sales || 0).toFixed(0)}
                        </p>
                      </div>
                      <div className="text-center sm:text-left">
                        <p className="text-xs sm:text-sm text-gray-600">Avg</p>
                        <p className="text-lg sm:text-2xl font-bold text-blue-600 truncate">
                          {"\u20B9"}{(forecast?.current_stats?.avg_order || 0).toFixed(0)}
                        </p>
                      </div>
                    </div>
                    <div className="p-3 sm:p-4 bg-gradient-to-br from-violet-50 to-purple-50 rounded-lg border border-violet-200">
                      <p className="text-xs sm:text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                        {forecast.forecast}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-0 shadow-lg" data-testid="export-card">
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600" />
                  Quick Export
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 sm:space-y-4">
                  {/* Quick Presets - Mobile optimized */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'today', label: 'Today' },
                      { key: 'yesterday', label: 'Yesterday' },
                      { key: 'week', label: '7 Days' },
                      { key: 'fifteenDays', label: '15 Days' },
                      { key: 'month', label: '30 Days' },
                    ].map(preset => (
                      <button
                        key={preset.key}
                        onClick={() => applyPreset(preset.key)}
                        className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg border-2 transition-all text-xs sm:text-sm font-medium ${
                          activePreset === preset.key
                            ? 'border-violet-500 bg-violet-50 text-violet-700'
                            : 'border-gray-200 hover:border-violet-300'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  
                  {/* Date Range + Total */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                    <div>
                      <Label className="text-xs text-gray-500">From</Label>
                      <input
                        type="date"
                        value={dateRange.start_date}
                        onChange={(e) => {
                          setActivePreset('custom');
                          setDateRange({ ...dateRange, start_date: e.target.value });
                        }}
                        className="w-full px-2 sm:px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:border-violet-500 outline-none transition-all"
                        data-testid="start-date-input"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">To</Label>
                      <input
                        type="date"
                        value={dateRange.end_date}
                        onChange={(e) => {
                          setActivePreset('custom');
                          setDateRange({ ...dateRange, end_date: e.target.value });
                        }}
                        className="w-full px-2 sm:px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:border-violet-500 outline-none transition-all"
                        data-testid="end-date-input"
                      />
                    </div>
                    <div className="flex items-end">
                      <div className="w-full p-3 rounded-lg border border-violet-200 bg-violet-50">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[11px] text-gray-600">Selected Total</p>
                            <p className="text-lg font-bold text-violet-700 truncate">
                              {"\u20B9"}{reportOrdersTotal.toFixed(2)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] text-gray-600">Orders</p>
                            <p className="text-sm font-semibold text-gray-700">{reportOrders.length}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleExportCSV}
                    disabled={exportLoading}
                    className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-sm sm:text-base"
                    data-testid="export-button"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {exportLoading ? "Exporting..." : "Export to CSV"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {reportOrdersLoading && (
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-2 sm:pb-4">
                  <CardTitle className="text-base sm:text-lg">Orders in Selected Range</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">Loading orders...</p>
                </CardContent>
              </Card>
            )}

            {!reportOrdersLoading && reportOrders.length > 0 && (
              <Card className="border-0 shadow-lg" data-testid="range-orders-list">
                <CardHeader className="pb-2 sm:pb-4">
                  <CardTitle className="text-base sm:text-lg">Orders in Selected Range</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-72 sm:max-h-96 overflow-y-auto">
                    {reportOrders.map((order) => (
                      <div
                        key={order.id}
                        className="p-2 sm:p-3 bg-gray-50 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm sm:text-base truncate">
                            Order #{order.id.slice(0, 8)}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-500">
                            Table {order.table_number} • {(order.items || []).length} items • {new Date(order.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3">
                          <p className="font-bold text-violet-600 text-sm sm:text-base flex-shrink-0">
                            {"\u20B9"}{(order?.total || 0).toFixed(0)}
                          </p>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setViewOrderModal({ open: true, order })}
                              className="p-2 rounded-lg bg-white border hover:bg-gray-100"
                              title="View"
                            >
                              <Eye className="w-4 h-4 text-gray-700" />
                            </button>
                            <button
                              onClick={() => setEditOrderModal({ open: true, order })}
                              className="p-2 rounded-lg bg-white border hover:bg-gray-100"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4 text-blue-600" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmModal({ open: true, order })}
                              className="p-2 rounded-lg bg-white border hover:bg-gray-100"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                            <button
                              onClick={() => setCancelConfirmModal({ open: true, order })}
                              className="p-2 rounded-lg bg-white border hover:bg-gray-100"
                              title="Cancel"
                            >
                              <XCircle className="w-4 h-4 text-orange-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {!reportOrdersLoading && reportOrders.length === 0 && (
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-2 sm:pb-4">
                  <CardTitle className="text-base sm:text-lg">Orders in Selected Range</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">No orders found for the selected date range.</p>
                </CardContent>
              </Card>
            )}

            {dailyReport?.orders && dailyReport.orders.length > 0 && (
              <Card
                className="border-0 shadow-lg"
                data-testid="today-orders-list"
              >
                <CardHeader className="pb-2 sm:pb-4">
                  <CardTitle className="text-base sm:text-lg">Today's Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-72 sm:max-h-96 overflow-y-auto">
                    {dailyReport.orders.map((order) => (
                      <div
                        key={order.id}
                        className="p-2 sm:p-3 bg-gray-50 rounded-lg flex justify-between items-center"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm sm:text-base truncate">
                            Order #{order.id.slice(0, 8)}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-500">
                            Table {order.table_number} • {order.items.length} items
                          </p>
                        </div>
                        <p className="font-bold text-violet-600 text-sm sm:text-base ml-2 flex-shrink-0">
                          {"\u20B9"}{(order?.total || 0).toFixed(0)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Sales Trends Tab */}
          <TabsContent value="sales" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
              {dailyReport && (
                <Card className="border-0 shadow-lg">
                  <CardHeader className="pb-2 sm:pb-4">
                    <CardTitle className="text-xs sm:text-sm text-gray-600 flex items-center gap-2">
                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                      Today
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xl sm:text-3xl font-bold text-violet-600 truncate">
                      {"\u20B9"}{(dailyReport?.total_sales || 0).toFixed(2)}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      {dailyReport.total_orders} orders
                    </p>
                  </CardContent>
                </Card>
              )}

              {weeklyReport && (
                <Card className="border-0 shadow-lg">
                  <CardHeader className="pb-2 sm:pb-4">
                    <CardTitle className="text-xs sm:text-sm text-gray-600 flex items-center gap-2">
                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                      This Week
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xl sm:text-3xl font-bold text-green-600 truncate">
                      {"\u20B9"}{(weeklyReport?.total_sales || 0).toFixed(2)}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      {weeklyReport.total_orders} orders
                    </p>
                  </CardContent>
                </Card>
              )}

              {monthlyReport && (
                <Card className="border-0 shadow-lg">
                  <CardHeader className="pb-2 sm:pb-4">
                    <CardTitle className="text-xs sm:text-sm text-gray-600 flex items-center gap-2">
                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                      This Month
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xl sm:text-3xl font-bold text-blue-600 truncate">
                      {"\u20B9"}{(monthlyReport?.total_sales || 0).toFixed(2)}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      {monthlyReport.total_orders} orders
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sales Comparison */}
            {weeklyReport && monthlyReport && (
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-2 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600" />
                    Sales Comparison
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg gap-3 sm:gap-0">
                      <div className="text-center sm:text-left">
                        <p className="text-xs sm:text-sm text-gray-600">Weekly Average</p>
                        <p className="text-lg sm:text-2xl font-bold text-violet-600">
                          {"\u20B9"}{((weeklyReport?.total_sales || 0) / 7).toFixed(2)}/day
                        </p>
                      </div>
                      <div className="text-center sm:text-right">
                        <p className="text-xs sm:text-sm text-gray-600">Monthly Average</p>
                        <p className="text-lg sm:text-2xl font-bold text-blue-600">
                          {"\u20B9"}{((monthlyReport?.total_sales || 0) / 30).toFixed(2)}/day
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Best Sellers Tab */}
          <TabsContent value="items" className="space-y-4 sm:space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Package className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600" />
                  Top Selling Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bestSelling && bestSelling.length > 0 ? (
                  <div className="space-y-2 sm:space-y-3">
                    {bestSelling.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0">
                            #{index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{item.name || 'Unknown'}</p>
                            <p className="text-xs sm:text-sm text-gray-500 truncate">
                              {item.category || 'N/A'} • {"\u20B9"}{(item.price || 0).toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <p className="text-lg sm:text-2xl font-bold text-violet-600">
                            {item.total_quantity || 0}
                          </p>
                          <p className="text-[10px] sm:text-sm text-gray-500 truncate">
                            {"\u20B9"}{(item.total_revenue || 0).toFixed(0)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-6 sm:py-8 text-sm">
                    No sales data available yet
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Category Analysis */}
            {categoryAnalysis && categoryAnalysis.length > 0 && (
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-2 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600" />
                    Sales by Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 sm:space-y-4">
                    {categoryAnalysis.map((cat, index) => (
                      <div key={index} className="space-y-1.5 sm:space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-900 truncate flex-1">{cat.category}</span>
                          <span className="text-xs sm:text-sm text-gray-600 ml-2 flex-shrink-0">
                            {cat.total_quantity || 0} • {"\u20B9"}{(cat.total_revenue || 0).toFixed(0)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-violet-500 to-purple-600 h-2 rounded-full"
                            style={{
                              width: `${(cat.total_revenue / categoryAnalysis[0].total_revenue) * 100}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Stock Report Tab */}
          <TabsContent value="stock" className="space-y-4 sm:space-y-6">
            {/* Stock Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-blue-600 mb-2">
                    <Package className="w-5 h-5" />
                    <span className="text-sm font-medium">Total Items</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-700">
                    {stockReport?.totalItems || 0}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    {"\u20B9"}{(stockReport?.totalValue || 0).toFixed(0)} value
                  </p>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-green-600 mb-2">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Healthy Stock</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700">
                    {stockReport?.healthyStockCount || 0}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    {stockReport?.totalItems > 0 ? Math.round((stockReport?.healthyStockCount / stockReport?.totalItems) * 100) : 0}% of total
                  </p>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-amber-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-orange-600 mb-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="text-sm font-medium">Low Stock</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-700">
                    {stockReport?.lowStockCount || 0}
                  </p>
                  <p className="text-xs text-orange-600 mt-1">
                    Needs attention
                  </p>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-pink-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-red-600 mb-2">
                    <XCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Out of Stock</span>
                  </div>
                  <p className="text-2xl font-bold text-red-700">
                    {stockReport?.outOfStockCount || 0}
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    Urgent action needed
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Expiry Alerts */}
            {stockReport && (stockReport.expiringCount > 0 || stockReport.expiredCount > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stockReport.expiredCount > 0 && (
                  <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-pink-50 border-l-4 border-l-red-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-red-700">
                        <AlertTriangle className="w-5 h-5" />
                        Expired Items ({stockReport.expiredCount})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {stockReport.expiredItems.slice(0, 5).map((item, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-white rounded border border-red-200">
                            <div>
                              <p className="font-medium text-sm">{item.name}</p>
                              <p className="text-xs text-gray-500">Expired: {new Date(item.expiry_date).toLocaleDateString()}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-red-600">{item.quantity} {item.unit}</p>
                            </div>
                          </div>
                        ))}
                        {stockReport.expiredItems.length > 5 && (
                          <p className="text-xs text-gray-500 text-center">+{stockReport.expiredItems.length - 5} more expired items</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {stockReport.expiringCount > 0 && (
                  <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-50 to-orange-50 border-l-4 border-l-yellow-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-yellow-700">
                        <Clock className="w-5 h-5" />
                        Expiring Soon ({stockReport.expiringCount})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {stockReport.expiringItems.slice(0, 5).map((item, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-white rounded border border-yellow-200">
                            <div>
                              <p className="font-medium text-sm">{item.name}</p>
                              <p className="text-xs text-gray-500">Expires: {new Date(item.expiry_date).toLocaleDateString()}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-yellow-600">{item.quantity} {item.unit}</p>
                            </div>
                          </div>
                        ))}
                        {stockReport.expiringItems.length > 5 && (
                          <p className="text-xs text-gray-500 text-center">+{stockReport.expiringItems.length - 5} more expiring items</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Low Stock Items */}
            {stockReport && stockReport.lowStockCount > 0 && (
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                    Low Stock Items ({stockReport.lowStockCount})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 sm:space-y-3">
                    {stockReport.lowStockItems.slice(0, 10).map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200"
                      >
                        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0">
                            !
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{item.name}</p>
                            <p className="text-xs sm:text-sm text-gray-500 truncate">
                              Min required: {item.min_quantity} {item.unit}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <p className="text-lg sm:text-2xl font-bold text-orange-600">
                            {item.quantity} {item.unit}
                          </p>
                          <p className="text-[10px] sm:text-sm text-gray-500">
                            {"\u20B9"}{(item.quantity * item.price_per_unit).toFixed(0)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {stockReport.lowStockItems.length > 10 && (
                      <p className="text-center text-gray-500 text-sm">+{stockReport.lowStockItems.length - 10} more low stock items</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stock by Category */}
            {stockCategories && stockCategories.length > 0 && stockReport && (
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600" />
                    Stock by Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 sm:space-y-4">
                    {stockCategories.map((category, index) => {
                      const categoryItems = stockReport.inventory.filter(item => String(item.category_id) === String(category.id));
                      const categoryValue = categoryItems.reduce((sum, item) => sum + (item.quantity * item.price_per_unit), 0);
                      const maxValue = Math.max(...stockCategories.map(cat => {
                        const items = stockReport.inventory.filter(item => String(item.category_id) === String(cat.id));
                        return items.reduce((sum, item) => sum + (item.quantity * item.price_per_unit), 0);
                      }));
                      
                      return (
                        <div key={index} className="space-y-1.5 sm:space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }}></div>
                              <span className="font-medium text-gray-900 truncate flex-1">{category.name}</span>
                            </div>
                            <span className="text-xs sm:text-sm text-gray-600 ml-2 flex-shrink-0">
                              {categoryItems.length} items • {"\u20B9"}{categoryValue.toFixed(0)}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full"
                              style={{
                                backgroundColor: category.color,
                                width: `${maxValue > 0 ? (categoryValue / maxValue) * 100 : 0}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stock Export Options */}
            <Card className="border-0 shadow-lg bg-gradient-to-r from-violet-50 to-purple-50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Download className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600" />
                  Export Stock Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => handleExportStockReport('csv')}
                    disabled={exportLoading || !stockReport}
                    className="bg-gradient-to-r from-green-600 to-emerald-600"
                    size="sm"
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button
                    onClick={() => handleExportStockReport('pdf')}
                    disabled={exportLoading || !stockReport}
                    className="bg-gradient-to-r from-red-600 to-pink-600"
                    size="sm"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                  <Button
                    onClick={fetchStockReport}
                    disabled={stockLoading}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {stockLoading ? 'Loading...' : 'Refresh'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Loading State */}
            {stockLoading && (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="border-0 shadow-lg">
                    <CardContent className="p-6">
                      <div className="animate-pulse space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!stockLoading && !stockReport && (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-8 text-center">
                  <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Stock Data Available</h3>
                  <p className="text-gray-500 mb-4">Stock report will appear here once inventory data is available</p>
                  <Button onClick={fetchStockReport} className="bg-gradient-to-r from-violet-600 to-purple-600">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Load Stock Report
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Staff Performance Tab */}
          <TabsContent value="staff" className="space-y-4 sm:space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600" />
                  Staff Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {staffPerformance && staffPerformance.length > 0 ? (
                  <div className="space-y-2 sm:space-y-3">
                    {staffPerformance.map((staff, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-lg flex-shrink-0">
                            {staff.waiter_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{staff.waiter_name}</p>
                            <p className="text-xs sm:text-sm text-gray-500">
                              {staff.total_orders} orders
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <p className="text-lg sm:text-2xl font-bold text-green-600 truncate">
                            {"\u20B9"}{(staff.total_sales || 0).toFixed(0)}
                          </p>
                          <p className="text-[10px] sm:text-sm text-gray-500">
                            Avg: {"\u20B9"}{(staff.avg_order_value || 0).toFixed(0)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-6 sm:py-8 text-sm">
                    No staff performance data available yet
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Peak Hours Tab */}
          <TabsContent value="hours" className="space-y-4 sm:space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600" />
                  Peak Hours Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {peakHours && peakHours.length > 0 ? (
                  <div className="space-y-2 sm:space-y-3">
                    {peakHours.map((hour, index) => {
                      const maxOrders = Math.max(...peakHours.map(h => h.order_count));
                      const percentage = (hour.order_count / maxOrders) * 100;
                      
                      return (
                        <div key={index} className="space-y-1.5 sm:space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-gray-900 text-xs sm:text-sm">
                              {hour.hour}:00 - {hour.hour}:59
                            </span>
                            <span className="text-[10px] sm:text-sm text-gray-600">
                              {hour.order_count || 0} • {"\u20B9"}{(hour.total_sales || 0).toFixed(0)}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
                            <div
                              className={`h-2 sm:h-3 rounded-full ${
                                percentage > 80
                                  ? 'bg-gradient-to-r from-red-500 to-orange-600'
                                  : percentage > 50
                                  ? 'bg-gradient-to-r from-orange-500 to-amber-600'
                                  : 'bg-gradient-to-r from-violet-500 to-purple-600'
                              }`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-6 sm:py-8 text-sm">
                    No peak hours data available yet
                  </p>
                )}
              </CardContent>
            </Card>

            {peakHours && peakHours.length > 0 && (
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
                <CardHeader className="pb-2 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {(() => {
                      const sortedHours = [...peakHours].sort((a, b) => b.order_count - a.order_count);
                      const peakHour = sortedHours[0];
                      const slowHour = sortedHours[sortedHours.length - 1];
                      
                      return (
                        <>
                          <div className="p-2 sm:p-3 bg-white rounded-lg">
                            <p className="text-[10px] sm:text-sm text-gray-600">Busiest</p>
                            <p className="text-sm sm:text-lg font-bold text-blue-600">
                              {peakHour.hour}:00
                            </p>
                            <p className="text-[10px] sm:text-sm text-gray-500">
                              {peakHour.order_count || 0} orders
                            </p>
                          </div>
                          <div className="p-2 sm:p-3 bg-white rounded-lg">
                            <p className="text-[10px] sm:text-sm text-gray-600">Slowest</p>
                            <p className="text-sm sm:text-lg font-bold text-gray-600">
                              {slowHour.hour}:00
                            </p>
                            <p className="text-[10px] sm:text-sm text-gray-500">
                              {slowHour.order_count || 0} orders
                            </p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Customer Balance Tab */}
          <TabsContent value="customers" className="space-y-4 sm:space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600" />
                    Customer Balance Management
                  </div>
                  <Button
                    onClick={() => fetchCustomerBalances({ showToast: true })}
                    disabled={customerBalanceLoading}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${customerBalanceLoading ? 'animate-spin' : ''}`} />
                    {customerBalanceLoading ? 'Loading...' : 'Refresh'}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {customerBalanceLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg animate-pulse">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                          <div>
                            <div className="w-24 h-4 bg-gray-200 rounded mb-1"></div>
                            <div className="w-16 h-3 bg-gray-200 rounded"></div>
                          </div>
                        </div>
                        <div className="w-16 h-6 bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : customerBalances && customerBalances.length > 0 ? (
                  <div className="space-y-2 sm:space-y-3">
                    {/* Debug Info */}
                    <div className="p-2 bg-blue-50 rounded-lg text-xs text-blue-700 mb-4">
                      <strong>Debug:</strong> Found {customerBalances.length} customers with outstanding balances
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4">
                      <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                        <p className="text-xs text-gray-600">Total Credit</p>
                        <p className="text-lg font-bold text-green-600">
                          {"\u20B9"}{customerBalances.reduce((sum, customer) => sum + (customer.balance_amount > 0 ? customer.balance_amount : 0), 0).toFixed(0)}
                        </p>
                      </div>
                      <div className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg">
                        <p className="text-xs text-gray-600">Customers</p>
                        <p className="text-lg font-bold text-blue-600">
                          {customerBalances.filter(c => c.balance_amount > 0).length}
                        </p>
                      </div>
                      <div className="p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg">
                        <p className="text-xs text-gray-600">Avg Balance</p>
                        <p className="text-lg font-bold text-orange-600">
                          {"\u20B9"}{customerBalances.length > 0 ? (customerBalances.reduce((sum, c) => sum + (c.balance_amount > 0 ? c.balance_amount : 0), 0) / customerBalances.filter(c => c.balance_amount > 0).length || 0).toFixed(0) : 0}
                        </p>
                      </div>
                      <div className="p-3 bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg">
                        <p className="text-xs text-gray-600">Last 30 Days</p>
                        <p className="text-lg font-bold text-violet-600">
                          {customerBalances.filter(c => {
                            const lastOrderDate = new Date(c.last_order_date);
                            const thirtyDaysAgo = new Date();
                            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                            return lastOrderDate >= thirtyDaysAgo;
                          }).length}
                        </p>
                      </div>
                    </div>

                    {/* Customer List */}
                    <div className="space-y-2">
                      {customerBalances
                        .filter(customer => customer.balance_amount > 0) // Only show customers with outstanding balance
                        .sort((a, b) => b.balance_amount - a.balance_amount) // Sort by balance amount (highest first)
                        .map((customer, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg hover:shadow-md transition-shadow border border-red-100"
                        >
                          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-lg flex-shrink-0">
                              {customer.customer_name ? customer.customer_name.charAt(0).toUpperCase() : '?'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                                {customer.customer_name || 'Unknown Customer'}
                              </p>
                              <p className="text-xs sm:text-sm text-gray-500 truncate">
                                ?? {customer.customer_phone || 'No phone'} • 
                                ?? {customer.total_orders} orders • 
                                ?? {customer.last_order_date ? new Date(customer.last_order_date).toLocaleDateString() : 'N/A'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <p className="text-lg sm:text-2xl font-bold text-red-600 truncate">
                              {"\u20B9"}{customer.balance_amount.toFixed(0)}
                            </p>
                            <p className="text-[10px] sm:text-sm text-gray-500">
                              Outstanding
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Export Customer Balance Report */}
                    <div className="mt-6 p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg border border-violet-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Export Customer Balance Report</h4>
                          <p className="text-xs sm:text-sm text-gray-600">Download detailed customer balance statements</p>
                        </div>
                        <Button
                          onClick={handleExportCustomerBalances}
                          disabled={exportLoading}
                          className="bg-gradient-to-r from-violet-600 to-purple-600 text-xs sm:text-sm"
                        >
                          <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                          {exportLoading ? "..." : "Export"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="relative inline-block mb-6">
                      <Users className="w-16 h-16 text-gray-300 mx-auto" />
                      <CheckCircle className="w-6 h-6 text-green-500 absolute -bottom-1 -right-1 bg-white rounded-full" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">All Clear! No Outstanding Balances</h3>
                    <div className="text-sm text-gray-600 space-y-3 max-w-lg mx-auto">
                      <p className="text-base">Great news! All your customers have paid in full.</p>
                      
                      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="font-medium text-blue-900 mb-2">?? How Customer Balances Work:</p>
                        <ul className="text-left space-y-2 text-blue-800">
                          <li>• Create orders with <strong>Credit</strong> payment method</li>
                          <li>• Accept <strong>partial payments</strong> on orders</li>
                          <li>• Track customers who owe money</li>
                          <li>• View outstanding amounts here</li>
                        </ul>
                      </div>
                      
                      <p className="mt-4 text-xs text-gray-500 italic">
                        Tip: Go to Billing ? Select items ? Choose "Credit" payment ? Enter partial amount
                      </p>
                    </div>
                    
                    {/* Manual refresh button */}
                    <div className="mt-8 flex gap-3 justify-center">
                      <Button
                        onClick={() => fetchCustomerBalances({ showToast: true })}
                        disabled={customerBalanceLoading}
                        variant="outline"
                      >
                        <RefreshCw className={`w-4 h-4 mr-2 ${customerBalanceLoading ? 'animate-spin' : ''}`} />
                        {customerBalanceLoading ? 'Checking...' : 'Refresh Data'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Day Book Tab */}
          <TabsContent value="daybook" className="space-y-4 sm:space-y-6">
            <DayBookTab dateRange={dateRange} />
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-4 sm:space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600" />
                  Export Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 sm:space-y-6">
                  {/* Quick Date Presets - Mobile optimized grid */}
                  <div>
                    <Label className="text-sm sm:text-base font-semibold mb-2 sm:mb-3 block">Quick Select</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {[
                        { key: 'today', label: 'Today', icon: 'T' },
                        { key: 'yesterday', label: 'Yesterday', icon: 'Y' },
                        { key: 'week', label: '7 Days', icon: '7d' },
                        { key: 'fifteenDays', label: '15 Days', icon: '15d' },
                        { key: 'month', label: '30 Days', icon: '30d' },
                        { key: 'thisMonth', label: 'This Month', icon: 'TM' },
                        { key: 'lastMonth', label: 'Last Month', icon: 'LM' },
                      ].map(preset => (
                        <button
                          key={preset.key}
                          onClick={() => applyPreset(preset.key)}
                          className={`p-2 sm:p-3 rounded-lg sm:rounded-xl border-2 transition-all text-center ${
                            activePreset === preset.key
                              ? 'border-violet-500 bg-violet-50 text-violet-700 shadow-md'
                              : 'border-gray-200 hover:border-violet-300 hover:bg-violet-50'
                          }`}
                        >
                          <span className="text-base sm:text-xl block mb-0.5 sm:mb-1">{preset.icon}</span>
                          <span className="text-[10px] sm:text-xs font-medium leading-tight block">{preset.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Date Range - Mobile optimized */}
                  <div className="p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl">
                    <Label className="text-xs sm:text-sm font-semibold mb-2 sm:mb-3 block flex items-center gap-2">
                      <CalendarDays className="w-3 h-3 sm:w-4 sm:h-4" />
                      Custom Range
                    </Label>
                    <div className="grid grid-cols-2 gap-2 sm:gap-4">
                      <div>
                        <Label className="text-[10px] sm:text-xs text-gray-500 mb-1 block">Start</Label>
                        <input
                          type="date"
                          value={dateRange.start_date}
                          onChange={(e) => {
                            setActivePreset('custom');
                            setDateRange({ ...dateRange, start_date: e.target.value });
                          }}
                          className="w-full px-2 sm:px-4 py-2 sm:py-3 text-sm border-2 border-gray-200 rounded-lg sm:rounded-xl focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all"
                          data-testid="export-start-date"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] sm:text-xs text-gray-500 mb-1 block">End</Label>
                        <input
                          type="date"
                          value={dateRange.end_date}
                          onChange={(e) => {
                            setActivePreset('custom');
                            setDateRange({ ...dateRange, end_date: e.target.value });
                          }}
                          className="w-full px-2 sm:px-4 py-2 sm:py-3 text-sm border-2 border-gray-200 rounded-lg sm:rounded-xl focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all"
                          data-testid="export-end-date"
                        />
                      </div>
                    </div>
                    <div className="mt-2 sm:mt-3 p-1.5 sm:p-2 bg-violet-100 rounded-lg text-center">
                      <span className="text-[10px] sm:text-sm text-violet-700 font-medium">
                        ?? {new Date(dateRange.start_date).toLocaleDateString()} ? {new Date(dateRange.end_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Export Buttons - Mobile optimized grid */}
                  <div>
                    <Label className="text-sm sm:text-base font-semibold mb-2 sm:mb-3 block">Export Format</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-4">
                      <Button
                        onClick={handleExportCSV}
                        disabled={exportLoading}
                        className="h-14 sm:h-16 bg-gradient-to-r from-green-600 to-emerald-600 flex-col gap-0.5 sm:gap-1 px-2"
                        data-testid="export-csv-button"
                      >
                        <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6" />
                        <span className="text-[10px] sm:text-sm">{exportLoading ? "..." : "CSV"}</span>
                      </Button>
                      
                      <Button
                        onClick={handleExportExcel}
                        disabled={exportLoading}
                        className="h-14 sm:h-16 bg-gradient-to-r from-blue-600 to-cyan-600 flex-col gap-0.5 sm:gap-1 px-2"
                        data-testid="export-excel-button"
                      >
                        <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6" />
                        <span className="text-[10px] sm:text-sm">{exportLoading ? "..." : "Excel"}</span>
                      </Button>
                      
                      <Button
                        onClick={handleExportPDF}
                        disabled={exportLoading}
                        className="h-14 sm:h-16 bg-gradient-to-r from-red-600 to-pink-600 flex-col gap-0.5 sm:gap-1 px-2"
                        data-testid="export-pdf-button"
                      >
                        <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
                        <span className="text-[10px] sm:text-sm">{exportLoading ? "..." : "PDF"}</span>
                      </Button>
                      
                      <Button
                        onClick={handleDetailedReport}
                        disabled={exportLoading}
                        className="h-14 sm:h-16 bg-gradient-to-r from-violet-600 to-purple-600 flex-col gap-0.5 sm:gap-1 px-2 col-span-2 sm:col-span-1"
                        data-testid="detailed-report-button"
                      >
                        <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
                        <span className="text-[10px] sm:text-sm">{exportLoading ? "..." : "Detailed"}</span>
                      </Button>
                      
                      <Button
                        onClick={handlePrintReport}
                        disabled={exportLoading}
                        variant="outline"
                        className="h-14 sm:h-16 flex-col gap-0.5 sm:gap-1 border-2 px-2 col-span-1 sm:col-span-1"
                        data-testid="print-report-button"
                      >
                        <Printer className="w-5 h-5 sm:w-6 sm:h-6" />
                        <span className="text-[10px] sm:text-sm">Print</span>
                      </Button>
                    </div>
                  </div>

                  {/* Info Box - Mobile optimized */}
                  <div className="p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg sm:rounded-xl border border-blue-200">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm sm:text-base">
                      <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-violet-600" />
                      Export Options
                    </h4>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                      <div className="p-1.5 sm:p-2 bg-white rounded-lg border">
                        <p className="font-semibold text-green-700 text-[10px] sm:text-sm">CSV / Excel</p>
                        <p className="text-[9px] sm:text-xs text-gray-600">Spreadsheet data</p>
                      </div>
                      <div className="p-1.5 sm:p-2 bg-white rounded-lg border">
                        <p className="font-semibold text-red-700 text-[10px] sm:text-sm">PDF</p>
                        <p className="text-[9px] sm:text-xs text-gray-600">Sales report</p>
                      </div>
                      <div className="p-1.5 sm:p-2 bg-white rounded-lg border border-violet-300 bg-violet-50 col-span-2">
                        <p className="font-semibold text-violet-700 text-[10px] sm:text-sm">? Detailed Report</p>
                        <p className="text-[9px] sm:text-xs text-gray-600">Full analytics with charts</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {viewOrderModal.open && viewOrderModal.order && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3 sm:p-4">
            <Card className="w-full max-w-lg border-0 shadow-2xl max-h-[95vh] overflow-hidden flex flex-col bg-white">
              <CardHeader className="relative bg-violet-600 text-white rounded-t-lg p-4 sm:p-6 flex-shrink-0">
                <button
                  onClick={() => setViewOrderModal({ open: false, order: null })}
                  className="absolute right-3 sm:right-4 top-3 sm:top-4 text-white/80 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg pr-8">
                  <FileText className="w-5 h-5" />
                  Order #{(viewOrderModal.order?.id || '').slice(0, 8)}
                </CardTitle>
                <p className="text-violet-100 text-xs sm:text-sm mt-1">
                  {viewOrderModal.order?.created_at ? new Date(viewOrderModal.order.created_at).toLocaleString() : ''}
                </p>
              </CardHeader>
              <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-2 sm:gap-4 text-sm">
                  <div className="p-2 sm:p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 text-xs">Table</p>
                    <p className="font-bold text-base sm:text-lg">{viewOrderModal.order?.table_number || 'Counter'}</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 text-xs">Status</p>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(viewOrderModal.order?.status)}`}>
                      {viewOrderModal.order?.status || 'unknown'}
                    </span>
                  </div>
                  {viewOrderModal.order?.customer_name && (
                    <div className="p-2 sm:p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-500 text-xs">Customer</p>
                      <p className="font-bold text-sm truncate">{viewOrderModal.order.customer_name}</p>
                    </div>
                  )}
                  <div className="p-2 sm:p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 text-xs">Server</p>
                    <p className="font-bold text-sm truncate">{viewOrderModal.order?.waiter_name || 'N/A'}</p>
                  </div>
                </div>

                <div className="border-t pt-3 sm:pt-4">
                  <h4 className="font-bold mb-2 sm:mb-3 text-sm sm:text-base">Order Items</h4>
                  <div className="space-y-1.5 sm:space-y-2 max-h-40 overflow-y-auto">
                    {(viewOrderModal.order?.items || []).map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 sm:p-3 bg-gray-50 rounded-lg">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{item.quantity}× {item.name}</p>
                          {item.notes && <p className="text-xs text-orange-600 truncate">Note: {item.notes}</p>}
                        </div>
                        <p className="font-bold text-sm ml-2 flex-shrink-0">{"\u20B9"}{((item.price || 0) * (item.quantity || 0)).toFixed(0)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-3 sm:pt-4 space-y-1 sm:space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span className="font-medium">{"\u20B9"}{(viewOrderModal.order?.subtotal || 0).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm text-gray-600">
                    <span>Tax:</span>
                    <span>{"\u20B9"}{(viewOrderModal.order?.tax || 0).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-lg sm:text-xl font-bold text-violet-600 pt-2 border-t">
                    <span>Total:</span>
                    <span>{"\u20B9"}{(viewOrderModal.order?.total || 0).toFixed(0)}</span>
                  </div>
                  {viewOrderModal.order?.payment_method && (
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-gray-500">Payment:</span>
                      <span className="font-medium capitalize">{viewOrderModal.order.payment_method === 'split' ? 'Split Payment' : viewOrderModal.order.payment_method}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-3 sm:p-4 border-t flex gap-2">
                <Button
                  onClick={() => { setEditOrderModal({ open: true, order: viewOrderModal.order }); setViewOrderModal({ open: false, order: null }); }}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-sm"
                >
                  Edit Order
                </Button>
                <Button
                  onClick={() => { setCancelConfirmModal({ open: true, order: viewOrderModal.order }); setViewOrderModal({ open: false, order: null }); }}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600 text-sm"
                >
                  Cancel Order
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setViewOrderModal({ open: false, order: null })}
                  className="text-sm"
                >
                  Close
                </Button>
              </div>
            </Card>
          </div>
        )}

        <EditOrderModal
          open={editOrderModal.open}
          order={editOrderModal.order}
          onClose={() => setEditOrderModal({ open: false, order: null })}
          onUpdate={handleUpdateOrder}
          menuItems={menuItems}
          businessSettings={businessSettings}
        />

        {deleteConfirmModal.open && deleteConfirmModal.order && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md border-0 shadow-2xl bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-red-600" />
                  Delete Order
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">
                  Are you sure you want to permanently delete order{" "}
                  <strong>#{deleteConfirmModal.order.id.slice(0, 8)}</strong>
                </p>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Table:</strong> {deleteConfirmModal.order.table_number}</p>
                  <p><strong>Total:</strong> {"\u20B9"}{deleteConfirmModal.order.total.toFixed(0)}</p>
                  <p><strong>Status:</strong> {deleteConfirmModal.order.status}</p>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleDeleteOrder}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-sm"
                  >
                    Delete
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setDeleteConfirmModal({ open: false, order: null })}
                    className="flex-1 text-sm"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {cancelConfirmModal.open && cancelConfirmModal.order && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md border-0 shadow-2xl bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-orange-600" />
                  Cancel Order
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">
                  Are you sure you want to cancel order{" "}
                  <strong>#{cancelConfirmModal.order.id.slice(0, 8)}</strong>
                </p>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Table:</strong> {cancelConfirmModal.order.table_number}</p>
                  <p><strong>Total:</strong> {"\u20B9"}{cancelConfirmModal.order.total.toFixed(0)}</p>
                  <p><strong>Status:</strong> {cancelConfirmModal.order.status}</p>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleCancelOrder}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-sm"
                  >
                    Cancel Order
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCancelConfirmModal({ open: false, order: null })}
                    className="flex-1 text-sm"
                  >
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
};

// Day Book Tab Component
const DayBookTab = ({ dateRange }) => {
  const [daybook, setDaybook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchDaybook();
  }, [selectedDate]);

  const fetchDaybook = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/reports/daybook?date=${selectedDate}`);
      setDaybook(response.data);
    } catch (error) {
      console.error('Failed to fetch day book:', error);
      toast.error('Failed to fetch day book');
    } finally {
      setLoading(false);
    }
  };

  // Export Day Book to PDF via backend API
  const handleExportDayBookPDF = async () => {
    if (!daybook) {
      toast.error('No data to export');
      return;
    }
    setExportLoading(true);
    try {
      const response = await axios.get(`${API}/reports/daybook/export`, {
        params: {
          date: selectedDate,
          format: 'pdf'
        },
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `daybook-${selectedDate}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('PDF exported successfully!');
    } catch (error) {
      console.error('Failed to export PDF:', error);
      // Fallback to client-side PDF generation
      handleExportDayBookPDFFallback();
    } finally {
      setExportLoading(false);
    }
  };

  // Fallback client-side PDF generation
  const handleExportDayBookPDFFallback = () => {
    try {
      const printWindow = window.open('about:blank', '_blank');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Day Book Report - ${selectedDate}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              font-size: 11px;
              line-height: 1.4;
              color: #1f2937;
              margin: 0;
              padding: 15px;
            }
            .header {
              text-align: center;
              padding: 20px;
              background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
              color: white;
              border-radius: 12px;
              margin-bottom: 20px;
            }
            .header h1 { margin: 0 0 5px 0; font-size: 24px; }
            .header p { margin: 3px 0; opacity: 0.9; }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
              margin-bottom: 20px;
            }
            .summary-card {
              padding: 15px;
              border-radius: 10px;
              text-align: center;
            }
            .summary-card.inflow { background: #dcfce7; }
            .summary-card.outflow { background: #fee2e2; }
            .summary-card.net { background: #dbeafe; }
            .summary-card.closing { background: #f3e8ff; }
            .summary-card h4 { margin: 0 0 5px 0; font-size: 10px; text-transform: uppercase; color: #666; }
            .summary-card p { margin: 0; font-size: 18px; font-weight: bold; }
            .summary-card.inflow p { color: #15803d; }
            .summary-card.outflow p { color: #dc2626; }
            .summary-card.net p { color: #1d4ed8; }
            .summary-card.closing p { color: #7c3aed; }
            .section { margin-bottom: 20px; }
            .section-title { font-size: 14px; font-weight: bold; color: #7c3aed; margin-bottom: 10px; border-bottom: 2px solid #7c3aed; padding-bottom: 5px; }
            .breakdown-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .breakdown-item { display: flex; justify-content: space-between; padding: 8px 12px; border-radius: 6px; margin-bottom: 5px; }
            .breakdown-item.inflow { background: #dcfce7; }
            .breakdown-item.outflow { background: #fee2e2; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px 10px; text-align: left; font-size: 10px; }
            th { background: #7c3aed; color: white; font-weight: 600; }
            tr:nth-child(even) { background: #f9fafb; }
            tr.inflow-row { background: #f0fdf4; }
            tr.outflow-row { background: #fef2f2; }
            .amount-inflow { color: #15803d; font-weight: bold; }
            .amount-outflow { color: #dc2626; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 10px; color: #666; }
            @media print { body { padding: 0; } .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>?? Day Book Report</h1>
            <p>Date: ${new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p>Generated: ${new Date().toLocaleString()}</p>
          </div>

          <div class="summary-grid">
            <div class="summary-card inflow">
              <h4>Total Inflows</h4>
              <p>&#8377;${daybook.total_inflows.toFixed(2)}</p>
              <small>${daybook.order_count} orders</small>
            </div>
            <div class="summary-card outflow">
              <h4>Total Outflows</h4>
              <p>&#8377;${daybook.total_outflows.toFixed(2)}</p>
              <small>${daybook.expense_count} expenses</small>
            </div>
            <div class="summary-card net">
              <h4>Net Cash Flow</h4>
              <p>${daybook.net_cash_flow >= 0 ? '+' : ''}&#8377;${daybook.net_cash_flow.toFixed(2)}</p>
            </div>
            <div class="summary-card closing">
              <h4>Closing Balance</h4>
              <p>&#8377;${daybook.closing_balance.toFixed(2)}</p>
            </div>
          </div>

          <div class="breakdown-grid">
            <div class="section">
              <div class="section-title">?? Inflow Breakdown</div>
              ${Object.entries(daybook.inflow_breakdown).filter(([_, amount]) => amount > 0).map(([method, amount]) => `
                <div class="breakdown-item inflow">
                  <span style="text-transform: capitalize;">${method}</span>
                  <span class="amount-inflow">&#8377;${amount.toFixed(2)}</span>
                </div>
              `).join('') || '<p style="color: #666; text-align: center;">No inflows recorded</p>'}
            </div>
            <div class="section">
              <div class="section-title">?? Outflow Breakdown</div>
              ${Object.entries(daybook.outflow_breakdown).filter(([_, amount]) => amount > 0).map(([category, amount]) => `
                <div class="breakdown-item outflow">
                  <span>${category}</span>
                  <span class="amount-outflow">&#8377;${amount.toFixed(2)}</span>
                </div>
              `).join('') || '<p style="color: #666; text-align: center;">No outflows recorded</p>'}
            </div>
          </div>

          <div class="section">
            <div class="section-title">?? Transaction Details (${daybook.entries.length} transactions)</div>
            ${daybook.entries.length > 0 ? `
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Running Balance</th>
                  </tr>
                </thead>
                <tbody>
                  ${daybook.entries.map(entry => `
                    <tr class="${entry.type === 'inflow' ? 'inflow-row' : 'outflow-row'}">
                      <td>${entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                      <td>${entry.type === 'inflow' ? '? Inflow' : '? Outflow'}</td>
                      <td>${entry.category}</td>
                      <td>${entry.description}</td>
                      <td class="${entry.type === 'inflow' ? 'amount-inflow' : 'amount-outflow'}">
                        ${entry.type === 'inflow' ? '+' : '-'}&#8377;${entry.amount.toFixed(2)}
                      </td>
                      <td>&#8377;${entry.running_balance.toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : '<p style="color: #666; text-align: center; padding: 20px;">No transactions for this date</p>'}
          </div>

          <div class="footer">
            <p>Generated by BillByteKOT - Restaurant Management System</p>
          </div>

          <div class="no-print" style="text-align: center; margin-top: 20px;">
            <button onclick="window.print(); setTimeout(() => window.close(), 100);" 
              style="padding: 12px 24px; background: #7c3aed; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600;">
              Download as PDF
            </button>
            <button onclick="window.close()" 
              style="padding: 12px 24px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; margin-left: 10px;">
              Close
            </button>
            <p style="margin-top: 10px; font-size: 12px; color: #666;">
              Click "Download as PDF" and choose "Save as PDF" in the print dialog
            </p>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      toast.success('PDF preview opened! Use Print dialog to save as PDF');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  // Export Day Book to Excel via backend API
  const handleExportDayBookExcel = async () => {
    if (!daybook) {
      toast.error('No data to export');
      return;
    }
    setExportLoading(true);
    try {
      const response = await axios.get(`${API}/reports/daybook/export`, {
        params: {
          date: selectedDate,
          format: 'excel'
        },
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `daybook-${selectedDate}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Excel file exported successfully!');
    } catch (error) {
      console.error('Failed to export Excel from backend:', error);
      // Fallback to client-side Excel generation
      handleExportDayBookExcelFallback();
    } finally {
      setExportLoading(false);
    }
  };

  // Fallback client-side Excel generation
  const handleExportDayBookExcelFallback = () => {
    try {
      const excelContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head>
          <meta charset="UTF-8">
          <style>
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #7c3aed; color: white; font-weight: bold; }
            .header-row { background-color: #f3e8ff; font-weight: bold; }
            .inflow-row { background-color: #dcfce7; }
            .outflow-row { background-color: #fee2e2; }
            .summary-row { background-color: #f3f4f6; font-weight: bold; }
            .section-header { background-color: #7c3aed; color: white; font-weight: bold; font-size: 14px; }
          </style>
        </head>
        <body>
          <h2>Day Book Report - ${selectedDate}</h2>
          <p>Generated: ${new Date().toLocaleString()}</p>
          
          <h3>Summary</h3>
          <table>
            <tr class="header-row">
              <td>Total Inflows</td>
              <td>Total Outflows</td>
              <td>Net Cash Flow</td>
              <td>Closing Balance</td>
            </tr>
            <tr>
              <td style="color: green;">&#8377;${daybook.total_inflows.toFixed(2)}</td>
              <td style="color: red;">&#8377;${daybook.total_outflows.toFixed(2)}</td>
              <td style="color: ${daybook.net_cash_flow >= 0 ? 'green' : 'red'};">${daybook.net_cash_flow >= 0 ? '+' : ''}&#8377;${daybook.net_cash_flow.toFixed(2)}</td>
              <td style="color: purple;">&#8377;${daybook.closing_balance.toFixed(2)}</td>
            </tr>
          </table>
          
          <h3>Inflow Breakdown</h3>
          <table>
            <tr class="section-header">
              <th>Payment Method</th>
              <th>Amount</th>
            </tr>
            ${Object.entries(daybook.inflow_breakdown).map(([method, amount]) => `
              <tr class="inflow-row">
                <td style="text-transform: capitalize;">${method}</td>
                <td>&#8377;${amount.toFixed(2)}</td>
              </tr>
            `).join('')}
            <tr class="summary-row">
              <td>Total Inflows</td>
              <td>&#8377;${daybook.total_inflows.toFixed(2)}</td>
            </tr>
          </table>
          
          <h3>Outflow Breakdown</h3>
          <table>
            <tr class="section-header">
              <th>Category</th>
              <th>Amount</th>
            </tr>
            ${Object.entries(daybook.outflow_breakdown).map(([category, amount]) => `
              <tr class="outflow-row">
                <td>${category}</td>
                <td>&#8377;${amount.toFixed(2)}</td>
              </tr>
            `).join('')}
            <tr class="summary-row">
              <td>Total Outflows</td>
              <td>&#8377;${daybook.total_outflows.toFixed(2)}</td>
            </tr>
          </table>
          
          <h3>Transaction Details</h3>
          <table>
            <tr class="section-header">
              <th>Time</th>
              <th>Type</th>
              <th>Category</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Running Balance</th>
            </tr>
            ${daybook.entries.map(entry => `
              <tr class="${entry.type === 'inflow' ? 'inflow-row' : 'outflow-row'}">
                <td>${entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                <td>${entry.type === 'inflow' ? 'Inflow' : 'Outflow'}</td>
                <td>${entry.category}</td>
                <td>${entry.description}</td>
                <td>${entry.type === 'inflow' ? '+' : '-'}&#8377;${entry.amount.toFixed(2)}</td>
                <td>&#8377;${entry.running_balance.toFixed(2)}</td>
              </tr>
            `).join('')}
          </table>
        </body>
        </html>
      `;

      const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `daybook-${selectedDate}.xls`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Excel file exported successfully!');
    } catch (error) {
      console.error('Failed to export Excel:', error);
      toast.error('Failed to export Excel');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Date Selector */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap justify-between">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-violet-600" />
                <Label>Select Date:</Label>
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500"
              />
              <Button variant="outline" size="sm" onClick={fetchDaybook}>
                <RefreshCw className="w-4 h-4 mr-2" />Refresh
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportDayBookPDF}
                disabled={exportLoading || !daybook}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportDayBookExcel}
                disabled={exportLoading || !daybook}
                className="text-green-600 border-green-200 hover:bg-green-50"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {daybook && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-green-600 mb-2">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-sm font-medium">Total Inflows</span>
                </div>
                <p className="text-2xl font-bold text-green-700">{"\u20B9"}{daybook.total_inflows.toFixed(2)}</p>
                <p className="text-xs text-green-600 mt-1">{daybook.order_count} orders</p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-orange-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-600 mb-2">
                  <Package className="w-5 h-5" />
                  <span className="text-sm font-medium">Total Outflows</span>
                </div>
                <p className="text-2xl font-bold text-red-700">{"\u20B9"}{daybook.total_outflows.toFixed(2)}</p>
                <p className="text-xs text-red-600 mt-1">{daybook.expense_count} expenses</p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                  <Sparkles className="w-5 h-5" />
                  <span className="text-sm font-medium">Net Cash Flow</span>
                </div>
                <p className={`text-2xl font-bold ${daybook.net_cash_flow >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {daybook.net_cash_flow >= 0 ? '+' : ''}{"\u20B9"}{daybook.net_cash_flow.toFixed(2)}
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg bg-gradient-to-br from-violet-50 to-purple-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-violet-600 mb-2">
                  <FileText className="w-5 h-5" />
                  <span className="text-sm font-medium">Closing Balance</span>
                </div>
                <p className="text-2xl font-bold text-violet-700">{"\u20B9"}{daybook.closing_balance.toFixed(2)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Inflow Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Inflow Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(daybook.inflow_breakdown).map(([method, amount]) => (
                    amount > 0 && (
                      <div key={method} className="flex justify-between items-center p-2 bg-green-50 rounded-lg">
                        <span className="capitalize font-medium">{method}</span>
                        <span className="text-green-700 font-bold">{"\u20B9"}{amount.toFixed(2)}</span>
                      </div>
                    )
                  ))}
                  {Object.values(daybook.inflow_breakdown).every(v => v === 0) && (
                    <p className="text-gray-500 text-center py-4">No inflows recorded</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="w-5 h-5 text-red-600" />
                  Outflow Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(daybook.outflow_breakdown).map(([category, amount]) => (
                    amount > 0 && (
                      <div key={category} className="flex justify-between items-center p-2 bg-red-50 rounded-lg">
                        <span className="font-medium">{category}</span>
                        <span className="text-red-700 font-bold">{"\u20B9"}{amount.toFixed(2)}</span>
                      </div>
                    )
                  ))}
                  {Object.keys(daybook.outflow_breakdown).length === 0 && (
                    <p className="text-gray-500 text-center py-4">No outflows recorded</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transaction List */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-5 h-5 text-violet-600" />
                Transactions ({daybook.entries.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {daybook.entries.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No transactions for this date</p>
                ) : (
                  daybook.entries.map((entry, idx) => (
                    <div key={idx} className={`flex justify-between items-center p-3 rounded-lg ${
                      entry.type === 'inflow' ? 'bg-green-50' : 'bg-red-50'
                    }`}>
                      <div>
                        <p className="font-medium text-sm">{entry.description}</p>
                        <p className="text-xs text-gray-500">{entry.category}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${entry.type === 'inflow' ? 'text-green-700' : 'text-red-700'}`}>
                          {entry.type === 'inflow' ? '+' : '-'}{"\u20B9"}{entry.amount.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">Balance: {"\u20B9"}{entry.running_balance.toFixed(2)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ReportsPage;


