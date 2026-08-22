import { useEffect, useMemo, useState } from 'react';
import { Search, Users, Phone, Receipt, IndianRupee, RefreshCw } from 'lucide-react';
import Layout from '../components/Layout';
import { API } from '../App';
import apiClient from '../utils/apiClient';

const CustomersPage = ({ user }) => {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCustomers = async (query = '') => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get(`${API}/customers`, { params: query ? { search: query } : {} });
      setCustomers(Array.isArray(response.data) ? response.data : []);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Unable to load customers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCustomers(); }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => loadCustomers(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const totals = useMemo(() => ({
    customers: customers.length,
    visits: customers.reduce((sum, customer) => sum + (customer.total_orders || 0), 0),
    revenue: customers.reduce((sum, customer) => sum + (customer.total_spent || 0), 0),
  }), [customers]);

  return (
    <Layout user={user}>
      <div className="text-slate-900">
        <div className="w-full space-y-6">
          <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Customer growth</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight">Customers</h1>
              <p className="mt-2 text-slate-600">Save returning guests, bill faster and understand who keeps coming back.</p>
            </div>
            <button type="button" onClick={() => loadCustomers(search.trim())} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-100">
              <RefreshCw size={16} aria-hidden="true" /> Refresh
            </button>
          </header>

          <section className="grid gap-4 sm:grid-cols-3" aria-label="Customer summary">
            {[
              ['Saved customers', totals.customers, Users],
              ['Recorded visits', totals.visits, Receipt],
              ['Customer revenue', `₹${totals.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, IndianRupee],
            ].map(([label, value, Icon]) => (
              <article key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between"><p className="text-sm text-slate-500">{label}</p><Icon size={20} className="text-indigo-600" aria-hidden="true" /></div>
                <p className="mt-3 text-2xl font-bold">{value}</p>
              </article>
            ))}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4">
              <label className="relative block max-w-xl">
                <span className="sr-only">Search customers by name, phone or email</span>
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, phone or email" className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
              </label>
            </div>
            {error && <p role="alert" className="p-6 text-sm text-red-600">{error}</p>}
            {loading ? <p className="p-8 text-center text-slate-500">Loading customers…</p> : customers.length === 0 ? <p className="p-8 text-center text-slate-500">No customers found. Customers will appear here after their first bill.</p> : (
              <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Contact</th><th className="px-5 py-3">Visits</th><th className="px-5 py-3">Total spent</th><th className="px-5 py-3">Last visit</th></tr></thead><tbody className="divide-y divide-slate-100">{customers.map((customer) => <tr key={customer.id} className="hover:bg-slate-50"><td className="px-5 py-4 font-semibold">{customer.name || 'Guest'}</td><td className="px-5 py-4"><span className="inline-flex items-center gap-2"><Phone size={15} aria-hidden="true" />{customer.phone}</span>{customer.email && <span className="mt-1 block text-xs text-slate-500">{customer.email}</span>}</td><td className="px-5 py-4">{customer.total_orders || 0}</td><td className="px-5 py-4 font-semibold">₹{(customer.total_spent || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td><td className="px-5 py-4 text-slate-500">{customer.last_visit ? new Date(customer.last_visit).toLocaleDateString('en-IN') : '—'}</td></tr>)}</tbody></table></div>
            )}
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default CustomersPage;
