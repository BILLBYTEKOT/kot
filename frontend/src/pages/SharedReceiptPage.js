import axios from 'axios';
import { Download, Printer } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'د.إ'
};

function formatDate(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function SharedReceiptPage() {
  const { encodedReceipt } = useParams();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadReceipt = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await axios.get(`${BACKEND_URL}/api/public/receipt-data/${encodedReceipt}`);
        if (active) {
          setReceipt(response.data);
        }
      } catch (err) {
        if (active) {
          setError('Receipt not found');
          setReceipt(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadReceipt();
    return () => {
      active = false;
    };
  }, [encodedReceipt]);

  const currency = useMemo(
    () => CURRENCY_SYMBOLS[receipt?.currency] || CURRENCY_SYMBOLS.INR,
    [receipt]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 text-center text-gray-600">
          Loading receipt...
        </div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 text-center">
          <h1 className="text-xl font-bold text-gray-900">Receipt unavailable</h1>
          <p className="text-sm text-gray-600 mt-2">{error || 'This receipt link is invalid.'}</p>
        </div>
      </div>
    );
  }

  const items = Array.isArray(receipt.items) ? receipt.items : [];

  const handleDownloadPdf = async () => {
    try {
      const response = await axios.get(
        `${BACKEND_URL}/api/public/receipt/${encodedReceipt}?download=1`,
        { responseType: 'blob' }
      );
      const blobUrl = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `invoice-${receipt.invoice_number || encodedReceipt}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setError('Unable to download this invoice. Please try again.');
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 py-6 px-3 print:bg-white print:py-0 print:px-0">
      <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-stone-200 print:max-w-none print:rounded-none print:shadow-none print:border-0">
        <div className="flex flex-wrap justify-end gap-3 px-6 pt-5 print:hidden">
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2"
          >
            <Download aria-hidden="true" size={18} />
            Download invoice PDF
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-900 shadow-sm transition hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2"
          >
            <Printer aria-hidden="true" size={18} />
            Print
          </button>
        </div>
        <div className="bg-stone-900 text-white px-6 py-5">
          <div className="text-2xl font-bold">{receipt.restaurant_name || 'Restaurant'}</div>
          {receipt.restaurant_address ? <div className="text-sm text-stone-300 mt-1">{receipt.restaurant_address}</div> : null}
          {receipt.restaurant_phone ? <div className="text-sm text-stone-300 mt-1">{receipt.restaurant_phone}</div> : null}
        </div>

        <div className="px-6 py-5 space-y-5 print:pt-5">
          <div className="flex justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">Invoice</div>
              <div className="text-lg font-semibold text-gray-900">{receipt.invoice_number || 'RECEIPT'}</div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-gray-500">Date</div>
              <div className="text-sm font-medium text-gray-900">{formatDate(receipt.created_at)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-stone-50 p-3">
              <div className="text-gray-500">Customer</div>
              <div className="font-medium text-gray-900">{receipt.customer_name || 'Guest'}</div>
            </div>
            <div className="rounded-2xl bg-stone-50 p-3">
              <div className="text-gray-500">Table</div>
              <div className="font-medium text-gray-900">{receipt.table_number || 'N/A'}</div>
            </div>
          </div>

          {items.length > 0 ? (
            <div className="rounded-2xl border border-stone-200 overflow-hidden">
              <div className="px-4 py-3 bg-stone-50 text-sm font-semibold text-gray-900">Items</div>
              <div className="divide-y divide-stone-200">
                {items.map((item, index) => {
                  const quantity = Number(item.quantity || 0);
                  const price = Number(item.price || 0);
                  const lineTotal = quantity * price;
                  return (
                    <div key={`${item.name}-${index}`} className="px-4 py-3 flex justify-between gap-3 text-sm">
                      <div>
                        <div className="font-medium text-gray-900">{item.name || 'Item'}</div>
                        <div className="text-gray-500">{quantity} x {currency}{price.toFixed(2)}</div>
                      </div>
                      <div className="font-semibold text-gray-900">{currency}{lineTotal.toFixed(2)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl bg-stone-900 text-white p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-stone-300">Subtotal</span>
              <span>{currency}{Number(receipt.subtotal || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-300">Tax</span>
              <span>{currency}{Number(receipt.tax || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-stone-700">
              <span>Total</span>
              <span>{currency}{Number(receipt.total || 0).toFixed(2)}</span>
            </div>
          </div>

          <div className="text-center text-sm text-gray-600">
            {receipt.footer_message || 'Thank you for dining with us!'}
          </div>
        </div>
      </div>
    </div>
  );
}
