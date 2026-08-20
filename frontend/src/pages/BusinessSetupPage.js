import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API, setAuthToken } from '../App';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Building2, Upload, X } from 'lucide-react';

const BusinessSetupPage = ({ user }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState('');
  const [currencies, setCurrencies] = useState([]);
  const [themes, setThemes] = useState([]);
  const [formData, setFormData] = useState({
    restaurant_name: '',
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
    footer_message: 'Thank you for dining with us!'
  });

  useEffect(() => {
    fetchCurrencies();
    fetchThemes();
  }, []);

  const fetchCurrencies = async () => {
    try {
      const response = await axios.get(`${API}/currencies`);
      setCurrencies(response.data);
    } catch (error) {
      console.error('Failed to fetch currencies', error);
    }
  };

  const fetchThemes = async () => {
    try {
      const response = await axios.get(`${API}/receipt-themes`);
      setThemes(response.data);
    } catch (error) {
      console.error('Failed to fetch themes', error);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await axios.post(`${API}/upload/image`, formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setFormData({ ...formData, logo_url: response.data.image_url });
      setLogoPreview(response.data.image_url);
      toast.success('Logo uploaded successfully!');
    } catch (error) {
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.restaurant_name || !formData.phone) {
      toast.error('Please fill required fields');
      return;
    }

    setLoading(true);
    try {
      // Submit business settings
      await axios.post(`${API}/business/setup`, formData);

      // Fetch updated user data
      const userResponse = await axios.get(`${API}/auth/me`);
      const updatedUser = userResponse.data;

      // Refresh auth storage in ALL mechanisms (localStorage / IndexedDB / cookie)
      const currentToken = localStorage.getItem('token');
      if (currentToken) {
        setAuthToken(currentToken, updatedUser);
      } else {
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }

      toast.success('🎉 Business setup complete! Taking you to your dashboard…');

      // Smooth SPA navigation — no hard reload
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 400);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-violet-50 to-purple-50">
      <Card className="w-full max-w-3xl shadow-2xl" data-testid="business-setup-card">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <Building2 className="w-10 h-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Setup Your Business
          </CardTitle>
          <CardDescription className="text-base">
            Let's configure your restaurant details to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Logo Upload */}
            <div>
              <Label>Restaurant Logo (Optional)</Label>
              <div className="mt-2 space-y-3">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex-1"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? 'Uploading...' : 'Upload Logo'}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </div>
                {logoPreview && (
                  <div className="relative inline-block">
                    <img src={logoPreview} alt="Logo" className="h-20 w-20 object-contain rounded-lg border" />
                    <button
                      type="button"
                      onClick={() => {
                        setLogoPreview('');
                        setFormData({ ...formData, logo_url: '' });
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Restaurant Name *</Label>
                <Input
                  value={formData.restaurant_name}
                  onChange={(e) => setFormData({ ...formData, restaurant_name: e.target.value })}
                  placeholder="e.g., Delicious Bites"
                  required
                  data-testid="restaurant-name-input"
                />
              </div>

              <div>
                <Label>Phone Number *</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 1234567890"
                  required
                  data-testid="phone-input"
                />
              </div>

              <div className="md:col-span-2">
                <Label>Address</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street, City, State, PIN"
                  data-testid="address-input"
                />
              </div>

              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="restaurant@example.com"
                />
              </div>

              <div>
                <Label>GSTIN (Optional)</Label>
                <Input
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                  placeholder="22AAAAA0000A1Z5"
                />
              </div>

              <div>
                <Label>FSSAI License (Optional)</Label>
                <Input
                  value={formData.fssai}
                  onChange={(e) => setFormData({ ...formData, fssai: e.target.value })}
                  placeholder="12345678901234"
                />
              </div>

              <div>
                <Label>Website (Optional)</Label>
                <Input
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="www.yourrestaurant.com"
                />
              </div>

              <div className="md:col-span-2">
                <Label>Tagline (Optional)</Label>
                <Input
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  placeholder="Delicious food, memorable moments"
                />
              </div>

              <div className="md:col-span-2">
                <Label>Receipt Footer Message</Label>
                <Input
                  value={formData.footer_message}
                  onChange={(e) => setFormData({ ...formData, footer_message: e.target.value })}
                  placeholder="Thank you for dining with us!"
                />
              </div>
            </div>

            {/* Currency and Tax */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Currency</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  data-testid="currency-select"
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
                  value={formData.tax_rate}
                  onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) })}
                  placeholder="5.0"
                />
              </div>
            </div>

            {/* Receipt Theme */}
            <div>
              <Label>Receipt Theme</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                {themes.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, receipt_theme: theme.id })}
                    className={`p-4 border-2 rounded-lg text-center transition-all ${
                      formData.receipt_theme === theme.id
                        ? 'border-violet-600 bg-violet-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    data-testid={`theme-${theme.id}`}
                  >
                    <p className="font-medium text-sm">{theme.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{theme.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 h-12 text-lg"
              data-testid="complete-setup-button"
            >
              {loading ? 'Setting up...' : 'Complete Setup & Go to Dashboard'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default BusinessSetupPage;
