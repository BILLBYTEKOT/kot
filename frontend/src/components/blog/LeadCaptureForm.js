import { useState } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';

const RESTAURANT_TYPES = [
  'Fine Dining', 'Casual Dining', 'QSR / Fast Food', 'Cafe / Bistro',
  'Cloud Kitchen', 'Food Truck', 'Dhaba', 'Bakery', 'Bar / Pub',
  'Canteen', 'Sweet Shop', 'Other',
];

// LeadCaptureForm â€” renders at the bottom of every blog post
// POSTs to the existing backend contact/lead endpoint
const LeadCaptureForm = ({ title = 'Get a Free Demo & Consultation' }) => {
  const [form, setForm] = useState({
    restaurantName: '',
    ownerName: '',
    phone: '',
    restaurantType: '',
  });
  const [status, setStatus] = useState('idle'); // idle | loading | success | error

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, source: 'blog_lead_form' }),
      });
      if (res.ok) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="rounded-2xl bg-green-50 border border-green-200 p-8 text-center my-8">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <h3 className="font-black text-lg text-gray-900 mb-1">We'll be in touch soon!</h3>
        <p className="text-gray-600 text-sm">Our team will contact you within 24 hours to schedule your free demo.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gray-50 border border-gray-200 p-6 my-8">
      <h3 className="font-black text-lg text-gray-900 mb-1">{title}</h3>
      <p className="text-gray-500 text-sm mb-5">Fill in your details and we'll reach out within 24 hours.</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            name="restaurantName"
            value={form.restaurantName}
            onChange={handleChange}
            placeholder="Restaurant Name *"
            required
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <input
            name="ownerName"
            value={form.ownerName}
            onChange={handleChange}
            placeholder="Owner Name *"
            required
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="Phone Number *"
            required
            type="tel"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <select
            name="restaurantType"
            value={form.restaurantType}
            onChange={handleChange}
            required
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
          >
            <option value="">Restaurant Type *</option>
            {RESTAURANT_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        {status === 'error' && (
          <p className="text-red-500 text-xs">Something went wrong. Please try again or WhatsApp us at +91-9353685739.</p>
        )}
        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-white font-black py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
        >
          {status === 'loading' ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
          ) : (
            'ðŸ“… Book Free Demo'
          )}
        </button>
      </form>
    </div>
  );
};

export default LeadCaptureForm;

