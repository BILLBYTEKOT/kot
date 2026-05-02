import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { 
  Utensils, ChefHat, Receipt, BarChart3,
  CheckCircle, ArrowRight, Star, Sparkles,
  Zap, Shield, Clock, Flame, Play, Timer,
  MessageCircle
} from 'lucide-react';

const PWAHomePage = () => {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [saleOffer, setSaleOffer] = useState(null);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const SUPPORT_WHATSAPP = '919353685739';

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppiOS = window.navigator.standalone === true;
    const isTWA = document.referrer.includes('android-app://');
    const ua = navigator.userAgent;
    const isAndroidWebView = /wv/.test(ua) || (/Android/.test(ua) && /Version\/[\d.]+/.test(ua));
    const isMobileApp = isStandalone || isInWebAppiOS || isTWA || isAndroidWebView;
    
    if (!isMobileApp) {
      navigate('/', { replace: true });
      return;
    }
    
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/dashboard', { replace: true });
      return;
    }
    
    fetchSaleOffer();
    setIsChecking(false);
  }, [navigate]);

  useEffect(() => {
    if (!saleOffer?.enabled) return;
    let endDateStr = saleOffer.valid_until || saleOffer.end_date;
    if (!endDateStr) return;
    if (endDateStr.length === 10) endDateStr = endDateStr + 'T23:59:59';
    
    const calculateTimeLeft = () => {
      const diff = new Date(endDateStr) - new Date();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return false;
      }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000)
      });
      return true;
    };
    calculateTimeLeft();
    const timer = setInterval(() => { if (!calculateTimeLeft()) clearInterval(timer); }, 1000);
    return () => clearInterval(timer);
  }, [saleOffer]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentSlide(prev => (prev + 1) % 3), 3000);
    return () => clearInterval(timer);
  }, []);

  const fetchSaleOffer = async () => {
    try {
      const res = await axios.get(`${API}/sale-offer`).catch(() => ({ data: { enabled: false } }));
      if (res?.data?.enabled) setSaleOffer(res.data);
    } catch (e) {}
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const slides = [
    { icon: Receipt, title: 'Smart Billing', desc: 'Generate bills in seconds with thermal printing', color: 'from-violet-500 to-purple-600' },
    { icon: ChefHat, title: 'KOT System', desc: 'Send orders directly to kitchen display', color: 'from-orange-500 to-red-500' },
    { icon: BarChart3, title: 'Live Reports', desc: 'Track sales, inventory & staff performance', color: 'from-emerald-500 to-green-600' },
  ];

  const hasDiscount = saleOffer?.enabled && saleOffer?.sale_price && saleOffer?.original_price && saleOffer.sale_price < saleOffer.original_price;
  const displayPrice = saleOffer?.sale_price || saleOffer?.original_price || 1999;
  const originalPrice = saleOffer?.original_price || 1999;
  const discountPercent = saleOffer?.discount_percent || (hasDiscount ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100) : 0);
  const hasTimer = timeLeft.days > 0 || timeLeft.hours > 0 || timeLeft.minutes > 0 || timeLeft.seconds > 0;

  const handleWhatsAppClick = () => {
    window.open(`https://wa.me/${SUPPORT_WHATSAPP}?text=Hi, I'm interested in BillByteKOT app!`, '_blank');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top Section - Purple Gradient */}
      <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-violet-700 px-6 pt-10 pb-16 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        {/* Logo */}
        <div className="flex items-center justify-between mb-8 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-xl">
              <Utensils className="w-6 h-6 text-violet-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">BillByteKOT</h1>
              <p className="text-violet-200 text-xs">Restaurant Management</p>
            </div>
          </div>
          
          {/* WhatsApp Contact Button */}
          <button
            onClick={handleWhatsAppClick}
            className="w-11 h-11 bg-green-500 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          >
            <MessageCircle className="w-5 h-5 text-white fill-white" />
          </button>
        </div>

        {/* Feature Carousel */}
        <div className="relative z-10">
          <div className="bg-white/15 backdrop-blur-sm rounded-3xl p-5 border border-white/20">
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-14 h-14 bg-gradient-to-br ${slides[currentSlide].color} rounded-2xl flex items-center justify-center shadow-lg`}>
                {(() => {
                  const Icon = slides[currentSlide].icon;
                  return <Icon className="w-7 h-7 text-white" />;
                })()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{slides[currentSlide].title}</h3>
                <p className="text-violet-200 text-sm">{slides[currentSlide].desc}</p>
              </div>
            </div>
            
            {/* Slide indicators */}
            <div className="flex justify-center gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`h-1.5 rounded-full transition-all ${i === currentSlide ? 'w-8 bg-white' : 'w-1.5 bg-white/40'}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Rating */}
        <div className="flex items-center justify-center gap-2 mt-5 relative z-10">
          <div className="flex">
            {[1,2,3,4,5].map(i => (
              <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            ))}
          </div>
          <span className="text-white/90 text-sm font-medium">Trusted by 500+ restaurants</span>
        </div>
      </div>

      {/* Bottom Section - White */}
      <div className="flex-1 px-5 -mt-6 relative z-20">
        <div className="bg-white rounded-t-3xl shadow-2xl pt-5 pb-8 px-1">
          
          {/* COMPACT Sale Banner */}
          {hasDiscount && (
            <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 rounded-xl p-3 mb-4 mx-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-yellow-300" />
                  <span className="text-white font-bold text-sm">{saleOffer?.title || `${discountPercent}% OFF`}</span>
                </div>
                {hasTimer && (
                  <div className="flex items-center gap-1 text-[10px] text-white/90">
                    <Timer className="w-3 h-3" />
                    {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-orange-200 line-through text-sm">₹{originalPrice}</span>
                <span className="text-white font-black text-xl">₹{displayPrice}</span>
                <span className="text-orange-100 text-xs">/year</span>
                <span className="bg-yellow-400 text-black px-1.5 py-0.5 rounded text-[10px] font-bold ml-auto">
                  SAVE ₹{originalPrice - displayPrice}
                </span>
              </div>
            </div>
          )}

          {/* No Sale - Show Regular Price */}
          {!hasDiscount && (
            <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl p-3 mb-4 mx-1 flex items-center justify-between">
              <div>
                <p className="text-violet-200 text-xs">Starting at just</p>
                <p className="text-white font-black text-xl">₹{originalPrice}<span className="text-sm font-normal">/year</span></p>
              </div>
              <div className="bg-white/20 rounded-lg px-2 py-1 text-center">
                <p className="text-white/80 text-[10px]">Only</p>
                <p className="text-white font-bold text-sm">₹{Math.round(originalPrice/365)}/day</p>
              </div>
            </div>
          )}

          {/* Features List */}
          <div className="space-y-3 mb-5 px-1">
            {[
              { icon: Zap, text: 'Setup in 2 minutes' },
              { icon: Shield, text: 'Secure cloud backup' },
              { icon: Clock, text: '14-day free trial' },
              { icon: Sparkles, text: 'No credit card needed' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                  <item.icon className="w-4 h-4 text-violet-600" />
                </div>
                <span className="text-gray-700 font-medium text-sm">{item.text}</span>
                <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3 px-1">
            <button
              onClick={() => navigate('/login?signup=true')}
              className={`w-full ${hasDiscount ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gradient-to-r from-violet-600 to-purple-600'} text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-transform`}
            >
              <Play className="w-5 h-5 fill-white" />
              Start Free Trial
            </button>

            <button
              onClick={() => navigate('/login')}
              className="w-full bg-gray-100 text-gray-700 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              I have an account
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* WhatsApp Contact */}
          <div className="mt-5 px-1">
            <button
              onClick={handleWhatsAppClick}
              className="w-full bg-green-50 border border-green-200 text-green-700 py-3 rounded-xl font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              <MessageCircle className="w-5 h-5 text-green-600" />
              Chat with us on WhatsApp
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-gray-400 text-xs mt-5 px-4">
            By continuing, you agree to our Terms & Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default PWAHomePage;
