import { useEffect, useMemo, useState } from 'react';
import { Search, Users, Phone, Receipt, IndianRupee, RefreshCw, UserPlus, MoreVertical, Eye, TrendingUp, Repeat2 } from 'lucide-react';
import Layout from '../components/Layout';
import { API } from '../App';
import apiClient from '../utils/apiClient';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const CustomersPage = ({ user }) => {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadCustomers = async (query = '') => {
    setLoading(true); setError('');
    try {
      const response = await apiClient.get(`${API}/customers`, { params: { ...(query ? { search: query } : {}), page, limit: 25 } });
      const payload = response.data || {};
      setCustomers(Array.isArray(payload) ? payload : (payload.customers || []));
      setTotal(payload.total || (Array.isArray(payload) ? payload.length : 0));
    } catch (requestError) { setError(requestError.response?.data?.detail || 'Unable to load customers.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadCustomers(); }, []);
  useEffect(() => { const timer = window.setTimeout(() => loadCustomers(search.trim()), 300); return () => window.clearTimeout(timer); }, [search, page]);
  const pageCount = Math.max(1, Math.ceil(total / 25));

  const totals = useMemo(() => ({
    customers: customers.length,
    visits: customers.reduce((sum, customer) => sum + (customer.visits ?? customer.total_orders ?? 0), 0),
    revenue: customers.reduce((sum, customer) => sum + (customer.total_spent || 0), 0),
    outstanding: customers.reduce((sum, customer) => sum + (customer.outstanding || 0), 0),
  }), [customers]);

  return (
    <Layout user={user}>
      <div className="page-frame customers-page" data-testid="customers-page">
        <header className="page-heading">
          <div><p className="eyebrow">Customer growth</p><h1>Customers</h1><p>Save returning guests, bill faster and understand who keeps coming back.</p></div>
          <button type="button" onClick={() => loadCustomers(search.trim())} className="outline-action"><RefreshCw size={16} aria-hidden="true" /> Refresh</button>
        </header>

        <section className="metric-grid" aria-label="Customer summary">
          {[['Saved Customers', totals.customers, Users, 'metric-purple', '+ 3 this month'], ['Recorded Visits', totals.visits, Receipt, 'metric-blue', '+ 0 this month'], ['Customer Revenue', money(totals.revenue), IndianRupee, 'metric-green', `+ ${money(totals.revenue)} this month`]].map(([label, value, Icon, tone, trend]) => (
            <article className={`metric-card ${tone}`} key={label}><div className="metric-icon"><Icon size={22} aria-hidden="true" /></div><div><p>{label}</p><strong>{value}</strong><span>{trend}</span></div><TrendingUp className="metric-trend" size={26} aria-hidden="true" /></article>
          ))}
        </section>

        <section className="customer-overview-grid">
          <article className="panel overview-panel"><div className="panel-heading"><div><h2>Customer Overview</h2><p>New and returning guests this month</p></div><select aria-label="Overview period" defaultValue="month"><option value="month">This Month</option></select></div><div className="overview-stats"><div><Users size={18}/><span>New Customers</span><strong>{totals.customers}</strong><em>↑ 100%</em></div><div><Repeat2 size={18}/><span>Returning Customers</span><strong>0</strong><em>— 0%</em></div><div><TrendingUp size={18}/><span>Repeat Rate</span><strong>0%</strong><em>— 0%</em></div><div><IndianRupee size={18}/><span>Avg. Spend / Visit</span><strong>{money(totals.revenue / (totals.visits || 1))}</strong><em>— 0%</em></div></div><div className="customer-chart"><div className="chart-line"/><div className="chart-labels"><span>1 Aug</span><span>11 Aug</span><span>21 Aug</span><span>31 Aug</span></div></div></article>
          <article className="panel spend-panel"><div className="panel-heading"><h2>Top Customers by Spend</h2><button type="button" className="text-action">View All →</button></div><div className="empty-spend"><div className="empty-illustration"><Users size={34}/></div><strong>No customer spend data yet</strong><p>Once customers place orders, their spending stats will appear here.</p></div></article>
        </section>

        <section className="panel customer-list-panel"><div className="table-toolbar"><label className="search-control"><span className="sr-only">Search customers</span><Search size={18}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, phone or email" /></label><select aria-label="Customer status"><option>All Customers</option></select><select aria-label="Visit count"><option>All Visits</option></select><button type="button" className="primary-action"><UserPlus size={16}/> Add Customer</button></div>{error && <p role="alert" className="error-message">{error}</p>}{loading ? <p className="table-message">Loading customers…</p> : customers.length === 0 ? <p className="table-message">No customers found. Customers will appear here after their first bill.</p> : <div className="responsive-table"><table><thead><tr><th>Customer</th><th>Contact</th><th>Visits</th><th>Total Spent</th><th>Last Visit</th><th>Actions</th></tr></thead><tbody>{customers.map((customer) => <tr key={customer.id}><td><span className="customer-avatar">{(customer.name || 'G').charAt(0).toUpperCase()}</span><strong>{customer.name || 'Guest'}</strong></td><td><span className="contact-line"><Phone size={14}/>{customer.phone || '—'}</span>{customer.email && <small>{customer.email}</small>}</td><td>{customer.total_orders || 0}</td><td><strong>{money(customer.total_spent)}</strong></td><td>{customer.last_visit ? new Date(customer.last_visit).toLocaleDateString('en-IN') : '—'}</td><td><button type="button" className="row-action"><Eye size={14}/> View</button><button type="button" className="icon-action" aria-label={`More actions for ${customer.name || 'guest'}`}><MoreVertical size={16}/></button></td></tr>)}</tbody></table></div>}</section>
        {!loading && customers.length > 0 && <footer className="customer-pagination"><span>Showing {(page - 1) * 25 + 1} to {Math.min(page * 25, total)} of {total} customers</span><div><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><strong>{page}</strong><button type="button" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)}>Next</button></div></footer>}
      </div>
    </Layout>
  );
};
export default CustomersPage;
