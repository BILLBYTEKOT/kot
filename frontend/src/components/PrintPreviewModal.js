import { useState, useEffect, useRef } from 'react';
import { X, Printer, Download, Edit2, Eye, Zap, Check, RefreshCw, Smartphone, Monitor, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { generatePlainTextReceipt, generateReceiptHTML, manualPrintReceipt, getPrintSettings, getBusinessSettings } from '../utils/printUtils';

/**
 * Enhanced Print Preview Modal - Futuristic POS Feature
 * - Live receipt preview with thermal printer simulation
 * - Edit before print capability
 * - Multiple paper size support (58mm/80mm)
 * - Quick print with instant feedback
 */
const PrintPreviewModal = ({ 
  isOpen, 
  onClose, 
  order, 
  businessSettings,
  onPrint,
  allowEdit = false 
}) => {
  const [previewContent, setPreviewContent] = useState('');
  const [htmlPreview, setHtmlPreview] = useState('');
  const [paperWidth, setPaperWidth] = useState('80mm');
  const [previewMode, setPreviewMode] = useState('thermal'); // 'thermal' | 'html'
  const [isPrinting, setIsPrinting] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);
  const previewRef = useRef(null);
  const [editMode, setEditMode] = useState(false);
  const [editableOrder, setEditableOrder] = useState(null);

  useEffect(() => {
    if (isOpen && order) {
      const settings = getPrintSettings();
      setPaperWidth(settings.paper_width || '80mm');
      generatePreview(order);
      setEditableOrder({ ...order });
    }
  }, [isOpen, order, businessSettings]);

  useEffect(() => {
    if (editableOrder) {
      generatePreview(editableOrder);
    }
  }, [paperWidth, editableOrder]);

  const generatePreview = (orderData) => {
    try {
      // Generate plain text receipt for thermal preview
      const plainText = generatePlainTextReceipt(orderData, businessSettings);
      setPreviewContent(plainText);
      
      // Generate HTML for visual preview
      const html = generateReceiptHTML(orderData, businessSettings);
      setHtmlPreview(html);
    } catch (error) {
      console.error('Preview generation error:', error);
      setPreviewContent('Error generating preview');
    }
  };

  const handlePrint = async () => {
    if (!editableOrder && !order) {
      toast.error('No order data to print');
      return;
    }

    setIsPrinting(true);
    setPrintSuccess(false);
    
    try {
      const orderToPrint = editableOrder || order;
      console.log('[v0] PrintPreviewModal: Starting print for order', orderToPrint.id);
      
      // Play print sound
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      } catch (e) {
        console.debug('[v0] Print sound failed (non-critical)');
      }
      
      // Vibration feedback
      if (navigator.vibrate) {
        try {
          navigator.vibrate([100, 50, 100]);
        } catch (e) {
          console.debug('[v0] Vibration not available');
        }
      }
      
      // Trigger print with timeout
      const printPromise = onPrint 
        ? onPrint(orderToPrint)
        : manualPrintReceipt(orderToPrint, businessSettings);
      
      const result = await Promise.race([
        printPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Print timeout after 30s')), 30000)
        )
      ]);
      
      console.log('[v0] PrintPreviewModal: Print result', result);
      
      setPrintSuccess(true);
      toast.success('Print sent to printer!', {
        icon: <Printer className="w-4 h-4" />,
        duration: 2000
      });
      
      // Auto-close after success
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (error) {
      console.error('[v0] PrintPreviewModal error:', error.message);
      const errorMsg = error.message?.includes('timeout') 
        ? 'Print operation timed out - printer may be offline'
        : `Print failed: ${error.message}`;
      toast.error(errorMsg, { duration: 4000 });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleQuickPrint = async () => {
    // Instant print without preview
    setIsPrinting(true);
    try {
      await manualPrintReceipt(editableOrder || order, businessSettings);
      setPrintSuccess(true);
      toast.success('Sent to printer!');
      setTimeout(() => onClose(), 1000);
    } catch (error) {
      toast.error('Quick print failed');
    } finally {
      setIsPrinting(false);
    }
  };

  if (!isOpen) return null;

  const widthClass = paperWidth === '58mm' ? 'w-[220px]' : 'w-[300px]';
  const total = editableOrder?.total || order?.total || 0;
  const currency = businessSettings?.currency === 'USD' ? '$' : '₹';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.7)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      data-testid="print-preview-modal"
    >
      {/* Modal Container */}
      <div 
        className="bg-white border border-gray-300 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        style={{ boxShadow: '0 0 60px rgba(124, 58, 237, 0.1)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
              <Eye className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 font-['Chivo']">Print Preview</h2>
              <p className="text-sm text-gray-600">Order #{order?.order_number || order?.id?.slice(0, 8)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Paper Size Toggle */}
            <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
              <button
                onClick={() => setPaperWidth('58mm')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  paperWidth === '58mm' 
                    ? 'bg-cyan-500 text-white shadow-lg' 
                    : 'text-zinc-400 hover:text-white'
                }`}
                data-testid="paper-58mm-btn"
              >
                <Smartphone className="w-3.5 h-3.5" />
                58mm
              </button>
              <button
                onClick={() => setPaperWidth('80mm')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  paperWidth === '80mm' 
                    ? 'bg-cyan-500 text-white shadow-lg' 
                    : 'text-zinc-400 hover:text-white'
                }`}
                data-testid="paper-80mm-btn"
              >
                <Monitor className="w-3.5 h-3.5" />
                80mm
              </button>
            </div>
            
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
              data-testid="close-preview-btn"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex flex-col lg:flex-row h-[calc(90vh-180px)]">
          {/* Preview Panel */}
          <div className="flex-1 p-6 overflow-auto bg-gray-50">
            <div className="flex items-center justify-center min-h-full">
              {/* Thermal Paper Simulation */}
              <div 
                ref={previewRef}
                className={`${widthClass} bg-white rounded-sm shadow-2xl transition-all duration-300`}
                style={{ 
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(6, 182, 212, 0.1)',
                  transform: 'perspective(1000px) rotateX(2deg)'
                }}
              >
                {/* Paper Top Edge */}
                <div className="h-4 bg-gradient-to-b from-zinc-100 to-white rounded-t-sm" />
                
                {/* Receipt Content */}
                <div className="px-2 py-4">
                  <pre 
                    className="text-[11px] leading-[1.4] text-zinc-800 whitespace-pre-wrap font-['JetBrains_Mono',_monospace] overflow-x-auto"
                    style={{ fontVariantLigatures: 'none' }}
                  >
                    {previewContent}
                  </pre>
                </div>
                
                {/* Paper Bottom Edge - Torn Effect */}
                <div 
                  className="h-6 bg-gradient-to-t from-zinc-200 to-white"
                  style={{ 
                    clipPath: 'polygon(0% 0%, 5% 60%, 10% 20%, 15% 70%, 20% 30%, 25% 80%, 30% 10%, 35% 60%, 40% 25%, 45% 75%, 50% 15%, 55% 65%, 60% 20%, 65% 70%, 70% 35%, 75% 85%, 80% 10%, 85% 55%, 90% 25%, 95% 75%, 100% 0%)'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Info Panel */}
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-gray-200 bg-gray-50 p-6 flex flex-col">
            {/* Order Summary */}
            <div className="space-y-4 flex-1">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Order Summary</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                  <span className="text-zinc-400">Items</span>
                  <span className="text-white font-mono">
                    {(editableOrder?.items || order?.items || []).length} items
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                  <span className="text-zinc-400">Subtotal</span>
                  <span className="text-white font-mono">
                    {currency}{(editableOrder?.subtotal || order?.subtotal || 0).toFixed(2)}
                  </span>
                </div>
                
                {(editableOrder?.discount || order?.discount || 0) > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                    <span className="text-emerald-400">Discount</span>
                    <span className="text-emerald-400 font-mono">
                      -{currency}{(editableOrder?.discount || order?.discount || 0).toFixed(2)}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                  <span className="text-zinc-400">Tax</span>
                  <span className="text-white font-mono">
                    {currency}{(editableOrder?.tax || order?.tax || 0).toFixed(2)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-3 bg-zinc-800/50 rounded-lg px-3 -mx-3">
                  <span className="text-lg font-bold text-white">Total</span>
                  <span className="text-2xl font-bold text-cyan-400 font-mono">
                    {currency}{total.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Payment Status */}
              {(order?.payment_received || 0) > 0 && (
                <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Check className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Payment: {currency}{(order?.payment_received || 0).toFixed(2)}
                    </span>
                  </div>
                  {(order?.balance_amount || 0) > 0 && (
                    <div className="text-xs text-amber-400 mt-1">
                      Balance Due: {currency}{order.balance_amount.toFixed(2)}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4 border-t border-zinc-800 mt-4">
              {/* Quick Print - Primary Action */}
              <Button
                onClick={handlePrint}
                disabled={isPrinting}
                className={`w-full h-14 text-lg font-bold rounded-xl transition-all duration-200 ${
                  printSuccess 
                    ? 'bg-emerald-500 hover:bg-emerald-600' 
                    : 'bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700'
                } text-white shadow-lg hover:shadow-cyan-500/25 hover:-translate-y-0.5 active:scale-[0.98]`}
                data-testid="print-btn"
              >
                {isPrinting ? (
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                ) : printSuccess ? (
                  <Check className="w-5 h-5 mr-2" />
                ) : (
                  <Printer className="w-5 h-5 mr-2" />
                )}
                {isPrinting ? 'Printing...' : printSuccess ? 'Print Sent!' : 'Print Receipt'}
              </Button>

              {/* Secondary Actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Download as text file
                    const blob = new Blob([previewContent], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `receipt-${order?.order_number || order?.id?.slice(0, 8)}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success('Receipt downloaded!');
                  }}
                  className="h-10 bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-white"
                  data-testid="download-txt-btn"
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  Save
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(previewContent);
                    toast.success('Copied to clipboard!');
                  }}
                  className="h-10 bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-white"
                  data-testid="copy-receipt-btn"
                >
                  <Edit2 className="w-4 h-4 mr-1.5" />
                  Copy
                </Button>
              </div>

              {/* Instant Print Button */}
              <Button
                variant="ghost"
                onClick={handleQuickPrint}
                disabled={isPrinting}
                className="w-full h-9 text-zinc-400 hover:text-cyan-400 hover:bg-cyan-500/10"
                data-testid="quick-print-btn"
              >
                <Zap className="w-4 h-4 mr-1.5" />
                Instant Print (Skip Preview)
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Settings className="w-3.5 h-3.5" />
            <span>Paper: {paperWidth} | Theme: {getPrintSettings().print_theme || 'default'}</span>
          </div>
          <div className="text-xs text-zinc-500">
            Press <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400">Esc</kbd> to close
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintPreviewModal;
