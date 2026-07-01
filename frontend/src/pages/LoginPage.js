import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { API, setAuthToken } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { 
  ChefHat, Mail, Lock, User, Eye, EyeOff, ArrowRight, Sparkles,
  Shield, Zap, BarChart3, MessageCircle,
  CheckCircle, Star, TrendingUp, Users, Clock, CreditCard, Gift
} from 'lucide-react';
import GuidedDemo from '../components/GuidedDemo';

const LoginPage = ({ setUser }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [tempUser, setTempUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    referralCode: '',
  });
  const [referralValidation, setReferralValidation] = useState({
    isValidating: false,
    isValid: null,
    discountAmount: null,
    errorMessage: null,
  });
  const [loading, setLoading] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const navigate = useNavigate();

  // Rotate features
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature(prev => (prev + 1) % 4);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    { icon: Zap, title: 'Lightning Fast', desc: 'Process orders in seconds', color: 'from-yellow-400 to-orange-500' },
    { icon: BarChart3, title: 'Smart Analytics', desc: 'Real-time insights', color: 'from-blue-400 to-cyan-500' },
    { icon: MessageCircle, title: 'WhatsApp Integration', desc: 'Auto customer updates', color: 'from-green-400 to-emerald-500' },
    { icon: Shield, title: 'Secure & Reliable', desc: 'Cloud-based system', color: 'from-purple-400 to-pink-500' },
  ];

  const stats = [
    { value: 'Free', label: '7-Day Trial', icon: TrendingUp },
    { value: '24/7', label: 'Support', icon: Users },
    { value: 'Cloud', label: 'Based', icon: Clock },
    { value: '₹0', label: 'Setup Fee', icon: CreditCard },
  ];

  // Validate referral code on blur (Requirement 3.3, 3.4, 3.6)
  const validateReferralCode = async (code) => {
    if (!code || code.trim().length === 0) {
      setReferralValidation({
        isValidating: false,
        isValid: null,
        discountAmount: null,
        errorMessage: null,
      });
      return;
    }

    setReferralValidation(prev => ({ ...prev, isValidating: true, errorMessage: null }));

    try {
      const response = await axios.post(`${API}/referral/validate`, {
        referral_code: code.trim(),
        new_user_email: formData.email || null,
      });

      if (response.data.valid) {
        setReferralValidation({
          isValidating: false,
          isValid: true,
          discountAmount: response.data.discount_amount,
          errorMessage: null,
        });
        toast.success(`🎉 Valid code! You'll get ₹${response.data.discount_amount} off!`);
      }
    } catch (error) {
      const errorDetail = error.response?.data?.detail;
      const errorMessage = typeof errorDetail === 'object' 
        ? errorDetail.message 
        : errorDetail || 'Invalid referral code';
      
      setReferralValidation({
        isValidating: false,
        isValid: false,
        discountAmount: null,
        errorMessage: errorMessage,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        let response;
        let isTeamMember = false;
        
        try {
          response = await axios.post(`${API}/auth/login`, {
            username: formData.username.trim(),
            password: formData.password
          });
        } catch (userLoginError) {
          if (userLoginError.response?.status === 401) {
            try {
              response = await axios.post(`${API}/team/login`, {
                username: formData.username.trim(),
                password: formData.password
              });
              isTeamMember = true;
            } catch {
              throw userLoginError;
            }
          } else {
            throw userLoginError;
          }
        }
        
        const { token, access_token, user } = response.data;
        const authToken = token || access_token;
        const userData = { ...user, isTeamMember };
        setAuthToken(authToken, userData);
        setTempUser(userData);
        
        if (isTeamMember) {
          completeLogin(userData);
        } else if (user.onboarding_completed === false) {
          setShowOnboarding(true);
        } else {
          completeLogin(userData);
        }
      } else {
        // Step 1: Request OTP for registration
        await axios.post(`${API}/auth/register-request`, {
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: 'admin',
          referral_code: formData.referralCode.trim() || null  // Include referral code (Requirement 3.7)
        });
        
        toast.success('📧 OTP sent to your email! Check your inbox.');
        setShowOTPVerification(true);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }
    
    setOtpLoading(true);
    try {
      const response = await axios.post(`${API}/auth/verify-registration`, {
        email: formData.email.trim(),
        otp: otp
      });

      // Backend now returns {token, user} — auto-login the user so they don't
      // drop off between verification and login. This was the main retention leak.
      const { token, access_token, user } = response.data || {};
      const authToken = token || access_token;

      if (authToken && user) {
        setAuthToken(authToken, user);
        setUser(user);
        toast.success('🎉 Email verified! Welcome to BillByteKOT');
        setShowOTPVerification(false);
        setOtp('');
        // New admin accounts always land on /setup; if setup already done, dashboard.
        navigate(user.setup_completed ? '/dashboard' : '/setup');
      } else {
        // Fallback: legacy response shape — fall back to old "please login" flow.
        toast.success('🎉 Email verified! Please login to continue.');
        setShowOTPVerification(false);
        setOtp('');
        setIsLogin(true);
        setFormData({ ...formData, password: '' });
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleRegistrationError = (error) => {
    const errorDetail = error.response?.data?.detail;
    
    if (typeof errorDetail === 'string') {
      if (errorDetail.includes('duplicate key error')) {
        if (errorDetail.includes('referral_code')) {
          toast.error('Registration system error. Please try again or contact support.');
        } else if (errorDetail.includes('username')) {
          toast.error('Username already exists. Please choose a different username.');
        } else if (errorDetail.includes('email')) {
          toast.error('Email already registered. Please use a different email or login.');
        } else {
          toast.error('Account already exists. Please try logging in instead.');
        }
      } else if (errorDetail.includes('Username already exists')) {
        toast.error('Username taken. Please choose a different username.');
      } else if (errorDetail.includes('Email already registered')) {
        toast.error('Email already registered. Please login or use a different email.');
      } else {
        toast.error(errorDetail);
      }
    } else {
      toast.error('Registration failed. Please try again.');
    }
  };

  const handleResendOTP = async () => {
    setOtpLoading(true);
    try {
      await axios.post(`${API}/auth/register-request`, {
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: 'admin',
        referral_code: formData.referralCode.trim() || null
      });
      toast.success('New OTP sent to your email!');
    } catch (error) {
      handleRegistrationError(error);
    } finally {
      setOtpLoading(false);
    }
  };

  const completeLogin = (user) => {
    setUser(user);
    toast.success(`Welcome back, ${user.username}! 🚀`);
    navigate(user.role === 'admin' && !user.setup_completed ? '/setup' : '/dashboard');
  };

  const handleOnboardingComplete = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/users/me/onboarding`, 
        { onboarding_completed: true },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
    } catch {
      console.error('Failed to update onboarding status');
    }
    setShowOnboarding(false);
    completeLogin(tempUser);
  };

  // OTP Verification Screen
  if (showOTPVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-violet-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Verify Your Email</h2>
            <p className="text-gray-500 mt-2">
              We sent a 6-digit OTP to<br />
              <span className="font-medium text-gray-700">{formData.email}</span>
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">Enter OTP</Label>
              <Input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="h-12 text-center text-2xl tracking-widest font-mono mt-2"
                maxLength={6}
              />
            </div>

            <Button
              onClick={handleVerifyOTP}
              disabled={otpLoading || otp.length !== 6}
              className="w-full h-12 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold rounded-xl"
            >
              {otpLoading ? 'Verifying...' : 'Verify & Create Account'}
            </Button>

            <Button
              variant="outline"
              onClick={handleResendOTP}
              disabled={otpLoading}
              className="w-full h-10"
            >
              Resend OTP
            </Button>

            <p className="text-xs text-center text-gray-400 mt-4">
              Didn't receive the email? Check your spam folder or click resend.
            </p>

            <button
              onClick={() => { setShowOTPVerification(false); setOtp(''); }}
              className="w-full text-sm text-violet-600 hover:text-violet-700 font-medium mt-2"
            >
              ← Back to Sign Up
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <GuidedDemo 
        onComplete={handleOnboardingComplete}
        onSkip={() => { setShowOnboarding(false); completeLogin(tempUser); }}
      />
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding & Features */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600">
          <div className="absolute inset-0 opacity-30 bg-grid-pattern"></div>
          
          {/* Floating Orbs */}
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-8 xl:p-12 w-full">
          {/* Logo & Brand */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-xl shadow-black/20">
                <ChefHat className="w-8 h-8 text-violet-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">BillByteKOT</h1>
                <p className="text-white/70 text-sm">Restaurant Management System</p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-8">
            <div>
              <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
                Transform Your
                <span className="block bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                  Restaurant Business
                </span>
              </h2>
              <p className="text-lg text-white/80 max-w-md">
                All-in-one POS system with KOT management, billing, inventory tracking, and real-time analytics.
              </p>
            </div>

            {/* Animated Feature Cards */}
            <div className="grid grid-cols-2 gap-4">
              {features.map((feature, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl backdrop-blur-sm transition-all duration-500 ${
                    activeFeature === idx 
                      ? 'bg-white/20 scale-105 shadow-xl' 
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3`}>
                    <feature.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
                  <p className="text-sm text-white/70">{feature.desc}</p>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="flex gap-6 pt-4">
              {stats.map((stat, idx) => (
                <div key={idx} className="text-center">
                  <div className="text-2xl xl:text-3xl font-bold text-white">{stat.value}</div>
                  <div className="text-xs text-white/60">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                R
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-white/90 text-sm leading-relaxed">
                  "BillByteKOT transformed our restaurant operations. Orders are faster, billing is seamless, and the WhatsApp integration keeps our customers happy!"
                </p>
                <p className="text-white/60 text-sm mt-2">— Rajesh Kumar, Spice Garden Restaurant</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-6 sm:p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl flex items-center justify-center">
              <ChefHat className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
              BillByteKOT
            </h1>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-50 rounded-full text-violet-600 text-sm font-medium mb-4">
                <Sparkles className="w-4 h-4" />
                {isLogin ? '7 Days Free Trial' : 'Start Free Today'}
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {isLogin ? 'Welcome Back!' : 'Create Account'}
              </h2>
              <p className="text-gray-500 mt-2">
                {isLogin ? 'Enter your credentials to continue' : 'Join thousands of restaurants'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                  Username or Email
                </Label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="w-5 h-5 text-gray-400 group-focus-within:text-violet-500 transition-colors" />
                  </div>
                  <Input
                    id="username"
                    placeholder="Enter your username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="pl-12 h-12 rounded-xl border-gray-200 focus:border-violet-500 focus:ring-violet-500 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Email (Register only) */}
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email Address
                  </Label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="w-5 h-5 text-gray-400 group-focus-within:text-violet-500 transition-colors" />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@restaurant.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="pl-12 h-12 rounded-xl border-gray-200 focus:border-violet-500 focus:ring-violet-500 transition-all"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password
                  </Label>
                  {isLogin && (
                    <Link 
                      to="/forgot-password" 
                      className="text-sm text-violet-600 hover:text-violet-700 font-medium"
                    >
                      Forgot?
                    </Link>
                  )}
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-gray-400 group-focus-within:text-violet-500 transition-colors" />
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-12 pr-12 h-12 rounded-xl border-gray-200 focus:border-violet-500 focus:ring-violet-500 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Referral Code (Register only - Optional) - Requirements 3.1, 3.2 */}
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="referralCode" className="text-sm font-medium text-gray-700">
                    Referral Code <span className="text-gray-400 font-normal">(Optional)</span>
                  </Label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Gift className={`w-5 h-5 transition-colors ${
                        referralValidation.isValid === true 
                          ? 'text-green-500' 
                          : referralValidation.isValid === false 
                            ? 'text-red-500' 
                            : 'text-gray-400 group-focus-within:text-violet-500'
                      }`} />
                    </div>
                    <Input
                      id="referralCode"
                      placeholder="Enter referral code"
                      value={formData.referralCode}
                      onChange={(e) => setFormData({ ...formData, referralCode: e.target.value.toUpperCase() })}
                      onBlur={(e) => validateReferralCode(e.target.value)}
                      className={`pl-12 h-12 rounded-xl border-gray-200 focus:border-violet-500 focus:ring-violet-500 transition-all uppercase ${
                        referralValidation.isValid === true 
                          ? 'border-green-500 focus:border-green-500 focus:ring-green-500' 
                          : referralValidation.isValid === false 
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                            : ''
                      }`}
                      maxLength={8}
                    />
                    {referralValidation.isValidating && (
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                        <div className="w-4 h-4 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"></div>
                      </div>
                    )}
                    {referralValidation.isValid === true && !referralValidation.isValidating && (
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                    )}
                  </div>
                  {/* Validation feedback */}
                  {referralValidation.isValid === true && referralValidation.discountAmount && (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      You'll get ₹{referralValidation.discountAmount} off on your subscription!
                    </p>
                  )}
                  {referralValidation.isValid === false && referralValidation.errorMessage && (
                    <p className="text-sm text-red-600">
                      {referralValidation.errorMessage}
                    </p>
                  )}
                  {!referralValidation.isValid && !referralValidation.errorMessage && (
                    <p className="text-xs text-gray-400">
                      Have a referral code? Enter it to get ₹200 off!
                    </p>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold shadow-lg shadow-violet-500/30 hover:shadow-violet-500/40 transition-all group"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Please wait...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    {isLogin ? 'Sign In' : 'Create Account'}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </Button>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">or</span>
                </div>
              </div>

              {/* Toggle Login/Register */}
              <div className="text-center">
                <p className="text-gray-600">
                  {isLogin ? "Don't have an account?" : 'Already have an account?'}
                  <button
                    type="button"
                    className="ml-2 text-violet-600 hover:text-violet-700 font-semibold"
                    onClick={() => setIsLogin(!isLogin)}
                  >
                    {isLogin ? 'Sign Up Free' : 'Sign In'}
                  </button>
                </p>
              </div>
            </form>

            {/* Features List */}
            {!isLogin && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-3">What you'll get:</p>
                <div className="grid grid-cols-2 gap-2">
                  {['7-day free trial', 'No credit card', 'Full features', '24/7 support'].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Links */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>
              By continuing, you agree to our{' '}
              <Link to="/privacy" className="text-violet-600 hover:underline">Terms</Link>
              {' '}and{' '}
              <Link to="/privacy" className="text-violet-600 hover:underline">Privacy Policy</Link>
            </p>
          </div>

          {/* Mobile Stats */}
          <div className="lg:hidden mt-8 grid grid-cols-4 gap-2">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center p-3 bg-white rounded-xl shadow-sm">
                <div className="text-lg font-bold text-violet-600">{stat.value}</div>
                <div className="text-[10px] text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
