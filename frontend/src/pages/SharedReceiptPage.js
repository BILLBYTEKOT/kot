import axios from 'axios';
import { Download, Printer, CheckCircle2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

const CONFIGURED_BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? (CONFIGURED_BACKEND_URL || window.location.origin)
  : window.location.origin;
const CURRENCY_SYMBOLS = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ' };
const THEMES = {
  classic: { accent: 'bg-slate-900', soft: 'bg-slate-50', border: 'border-slate-200', ink: 'text-slate-900', muted: 'text-slate-500', radius: 'rounded-2xl', label: 'Classic' },
  modern: { accent: 'bg-indigo-600', soft: 'bg-indigo-50', border: 'border-indigo-100', ink: 'text-slate-900', muted: 'text-indigo-700', radius: 'rounded-3xl', label: 'Modern' },
  minimal: { accent: 'bg-white', soft: 'bg-white', border: 'border-slate-200', ink: 'text-slate-900', muted: 'text-slate-500', radius: 'rounded-none', label: 'Minimal' },
  elegant: { accent: 'bg-amber-950', soft: 'bg-amber-50', border: 'border-amber-200', ink: 'text-amber-950', muted: 'text-amber-800', radius: 'rounded-xl', label: 'Elegant' },
  compact: { accent: 'bg-emerald-700', soft: 'bg-emerald-50', border: 'border-emerald-100', ink: 'text-slate-900', muted: 'text-emerald-800', radius: 'rounded-lg', label: 'Compact' },
  detailed: { accent: 'bg-violet-700', soft: 'bg-violet-50', border: 'border-violet-100', ink: 'text-slate-900', muted: 'text-violet-700', radius: 'rounded-2xl', label: 'Detailed' }
};
function formatDate(value) { if (!value) return 'N/A'; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }

export default function SharedReceiptPage() {
  const { encodedReceipt } = useParams();
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => { let active = true; axios.get(`${BACKEND_URL}/api/public/receipt-data/${encodedReceipt}`).then(({ data }) => active && setReceipt(data)).catch(() => active && setError('Receipt not found')).finally(() => active && setLoading(false)); return () => { active = false; }; }, [encodedReceipt]);
  const theme = THEMES[receipt?.invoice_presentation?.receipt_theme] || THEMES.classic;
  const currency = CURRENCY_SYMBOLS[receipt?.currency] || CURRENCY_SYMBOLS.INR;
  const customization = receipt?.invoice_presentation?.print_customization || {};
  const items = Array.isArray(receipt?.items) ? receipt.items : [];
  const show = (key, fallback = true) => customization[key] ?? fallback;
  const download = async () => { try { const response = await axios.get(`${BACKEND_URL}/api/public/receipt/${encodedReceipt}?download=1`, { responseType: 'blob' }); const url = window.URL.createObjectURL(response.data); const link = document.createElement('a'); link.href = url; link.download = `invoice-${receipt.invoice_number || encodedReceipt}.pdf`; link.click(); window.URL.revokeObjectURL(url); } catch { setError('Unable to download this invoice. Please try again.'); } };
  if (loading) return <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4"><div className="bg-white rounded-2xl p-6 shadow text-slate-600">Loading invoice...</div></div>;
  if (error || !receipt) return <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4"><div className="bg-white rounded-2xl p-7 shadow text-center"><h1 className="text-xl font-bold text-slate-900">Invoice unavailable</h1><p className="mt-2 text-sm text-slate-500">{error || 'This invoice link is invalid.'}</p></div></div>;
  const presentation = receipt.invoice_presentation || {};
  return <main className="min-h-screen bg-slate-100 px-3 py-6 print:bg-white print:p-0">
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap justify-end gap-2 print:hidden"><button onClick={download} className={`inline-flex items-center gap-2 ${theme.accent} ${theme.accent === 'bg-white' ? 'text-slate-900 border border-slate-300' : 'text-white'} rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm`}><Download size={17} aria-hidden="true" /> Download PDF</button><button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900"><Printer size={17} aria-hidden="true" /> Print</button></div>
      <article className={`overflow-hidden border ${theme.border} bg-white shadow-xl ${theme.radius} print:rounded-none print:border-0 print:shadow-none`}>
        <header className={`px-6 py-7 sm:px-10 ${theme.accent} ${theme.accent === 'bg-white' ? 'border-b' : ''} ${theme.accent === 'bg-white' ? 'text-slate-900' : 'text-white'}`}><div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-4">{show('show_logo') && presentation.logo_url ? <img src={presentation.logo_url} alt={`${receipt.restaurant_name} logo`} className="h-14 w-14 rounded-xl object-contain bg-white p-1" /> : null}<div><p className="text-xs font-semibold uppercase tracking-[0.22em] opacity-70">{theme.label} invoice</p><h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{receipt.restaurant_name || 'Restaurant'}</h1>{show('show_tagline') && presentation.tagline ? <p className="mt-1 text-sm opacity-80">{presentation.tagline}</p> : null}</div></div><div className="sm:text-right"><p className="text-xs uppercase tracking-wider opacity-70">Invoice number</p><p className="mt-1 text-lg font-semibold">{receipt.invoice_number || 'RECEIPT'}</p></div></div><div className="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-sm opacity-80">{show('show_address') && receipt.restaurant_address ? <span>{receipt.restaurant_address}</span> : null}{show('show_phone') && receipt.restaurant_phone ? <span>{receipt.restaurant_phone}</span> : null}{show('show_email') && presentation.email ? <span>{presentation.email}</span> : null}</div></header>
        <div className="space-y-7 px-6 py-7 sm:px-10"><div className="grid gap-4 sm:grid-cols-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Issued</p><p className="mt-1 text-sm font-medium text-slate-900">{formatDate(receipt.created_at)}</p></div>{show('show_customer_name') && <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Bill to</p><p className="mt-1 text-sm font-medium text-slate-900">{receipt.customer_name || 'Guest'}</p></div>}{show('show_table_number') && <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Table</p><p className="mt-1 text-sm font-medium text-slate-900">{receipt.table_number || 'N/A'}</p></div>}</div>
          <div className="overflow-hidden rounded-xl border border-slate-200"><div className={`grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 text-xs font-semibold uppercase tracking-wider ${theme.soft} ${theme.muted}`}><span>Item</span><span>Qty</span><span className="text-right">Amount</span></div>{items.length ? items.map((item, index) => { const quantity = Number(item.quantity || 0); const lineTotal = quantity * Number(item.price || 0); return <div key={`${item.name}-${index}`} className="grid grid-cols-[1fr_auto_auto] gap-4 border-t border-slate-100 px-4 py-4 text-sm"><div className="min-w-0"><p className="font-medium text-slate-900 break-words">{item.name || 'Item'}</p><p className="mt-1 text-xs text-slate-500">{currency}{Number(item.price || 0).toFixed(2)} each</p></div><span className="text-slate-600">{quantity}</span><span className="font-semibold text-slate-900">{currency}{lineTotal.toFixed(2)}</span></div>; }) : <div className="px-4 py-6 text-sm text-slate-500">No items listed.</div>}</div>
          <div className="ml-auto max-w-sm space-y-3"><div className="flex justify-between text-sm text-slate-500"><span>Subtotal</span><span>{currency}{Number(receipt.subtotal || 0).toFixed(2)}</span></div><div className="flex justify-between text-sm text-slate-500"><span>Tax</span><span>{currency}{Number(receipt.tax || 0).toFixed(2)}</span></div><div className={`flex justify-between border-t ${theme.border} pt-4 text-xl font-bold ${theme.ink}`}><span>Total</span><span>{currency}{Number(receipt.total || 0).toFixed(2)}</span></div></div>
          <div className={`flex items-center justify-center gap-2 border-t pt-6 text-sm ${theme.border} ${theme.muted}`}><CheckCircle2 size={17} aria-hidden="true" /> Payment receipt</div><footer className="text-center text-sm text-slate-500">{receipt.footer_message || 'Thank you for dining with us!'}</footer>{show('show_gstin') && presentation.gstin ? <p className="text-center text-xs text-slate-400">GSTIN: {presentation.gstin}</p> : null}{show('show_fssai') && presentation.fssai ? <p className="text-center text-xs text-slate-400">FSSAI: {presentation.fssai}</p> : null}</div>
      </article>
    </div>
  </main>;
}
