import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Flame, Timer, ArrowRight, Zap } from 'lucide-react';
import { getMarketPricing, detectMarket } from '../utils/marketPricing';

const EarlyAdopterBanner = ({ pricing, marketCountry }) => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    // Check if banner was dismissed
    const dismissed = localStorage.getItem('earlyAdopterBannerDismissed');
    const dismissedTime = dismissed ? new Date(dismissed).getTime() : 0;
    const now = new Date().getTime();
    const hoursSinceDismissal = (now - dismissedTime) / (1000 * 60 * 60);

    // Show banner if not dismissed or if more than 24 hours have passed
    if (!dismissed || hoursSinceDismissal > 24) {
      setIsVisible(true);
    }
  }, []);

  useEffect(() => {
    // Always show banner with fallback data
    setIsVisible(true);
    
    // Rolling 24h countdown — resets at midnight every day
    const calculateTimeLeft = () => {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const now = new Date();
      const diff = end - now;
      
      setTimeLeft({
        days: 0,
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / 1000 / 60) % 60),
        seconds: Math.floor((diff / 1000) % 60)
      });
      return true;
    };
    
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    
    return () => clearInterval(timer);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('earlyAdopterBannerDismissed', new Date().toISOString());
  };

  if (!isVisible) return null;

  // Use fallback values if pricing not loaded — 5% OFF
  const spotsLeft = pricing?.early_adopter_spots_left || 47;
  const marketPricing = getMarketPricing(marketCountry || detectMarket(), pricing);
  const monthlyPrice = Math.round(marketPricing.sale / 12);
  const yearlyPrice = marketPricing.saleDisplay;
  const originalYearlyPrice = marketPricing.regularDisplay;
  const discountPercent = Math.round(((marketPricing.regular - marketPricing.sale) / marketPricing.regular) * 100);

  return (
    <div className="relative overflow-hidden text-white" style={{
      background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 25%, #ff4757 50%, #ff6348 75%, #ff9f43 100%)',
      backgroundSize: '400% 400%',
      animation: 'gradient-x 3s ease infinite'
    }}>
      {/* Glowing orbs - pointer-events-none */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-20 h-20 bg-yellow-400 rounded-full filter blur-2xl opacity-30" />
        <div className="absolute top-0 right-1/3 w-20 h-20 bg-orange-500 rounded-full filter blur-2xl opacity-30" />
        <div className="absolute top-0 right-1/4 w-20 h-20 bg-pink-500 rounded-full filter blur-2xl opacity-30" />
      </div>
      
      <div className="relative z-10 py-2 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
          
          {/* Animated Badge */}
          <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full border border-yellow-400/50">
            <Flame className="w-4 h-4 text-yellow-300 animate-pulse" />
            <span className="font-black text-sm tracking-wide text-yellow-100">
              🔥 {discountPercent}% OFF — TODAY ONLY
            </span>
            <Flame className="w-4 h-4 text-yellow-300 animate-pulse" />
          </div>
          
          {/* Monthly Price - HIGHLIGHTED */}
          <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm px-3 py-1 rounded-xl border border-white/20">
            <span className="text-2xl sm:text-3xl font-black text-yellow-200">₹{monthlyPrice}</span>
            <div className="text-left">
              <span className="text-yellow-200 text-xs font-bold block">/month</span>
              <span className="text-white/60 text-[10px]">billed yearly</span>
            </div>
          </div>
          
          {/* Yearly Price Display */}
          <div className="hidden sm:flex items-center gap-2 bg-black/30 backdrop-blur-sm px-3 py-1 rounded-xl border border-white/20">
            <span className="text-white/50 line-through text-sm">₹{originalYearlyPrice}/yr</span>
            <ArrowRight className="w-4 h-4 text-yellow-300" />
            <span className="text-xl font-black text-yellow-200">₹{yearlyPrice}</span>
            <span className="text-yellow-200 text-sm">/year</span>
            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-2 py-0.5 rounded-lg font-black text-xs">
              {discountPercent}% OFF
            </span>
          </div>
          
          {/* Countdown Timer */}
          <div className="hidden md:flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-lg">
            <Timer className="w-4 h-4 text-red-400" />
            <div className="flex gap-0.5">
              {[
                { val: timeLeft.days, label: 'd' },
                { val: timeLeft.hours, label: 'h' },
                { val: timeLeft.minutes, label: 'm' },
                { val: timeLeft.seconds, label: 's' }
              ].map((item, i) => (
                <div key={i} className="bg-red-600/80 px-1.5 py-0.5 rounded text-center min-w-[28px]">
                  <span className="font-mono font-bold text-white text-sm">{String(item.val).padStart(2, '0')}</span>
                  <span className="text-[9px] text-red-200">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* CTA Button */}
          <button 
            onClick={() => navigate('/login')} 
            className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black px-4 py-1.5 rounded-full font-bold text-sm shadow-lg hover:scale-105 transition-all flex items-center gap-1.5"
          >
            <Zap className="w-4 h-4" />
            Get This Deal Now!
            <ArrowRight className="w-4 h-4" />
          </button>
          
          {/* Close */}
          <button onClick={handleDismiss} className="text-white/60 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Scrolling urgency text */}
        <div className="mt-1 overflow-hidden border-t border-white/10 pt-1">
          <div className="animate-marquee whitespace-nowrap text-xs font-medium">
            <span className="mx-4 text-yellow-200">🔥 {discountPercent}% OFF — OFFER ENDS TONIGHT</span>
            <span className="mx-4 text-white">⚡ ONLY ₹{monthlyPrice}/MONTH</span>
            <span className="mx-4 text-yellow-200">💎 ALL PREMIUM FEATURES INCLUDED</span>
            <span className="mx-4 text-white">📞 24/7 PRIORITY SUPPORT</span>
            <span className="mx-4 text-yellow-200">⏰ PRICE GOES BACK TO ₹{originalYearlyPrice} TOMORROW</span>
            <span className="mx-4 text-white">🚀 JOIN 500+ RESTAURANTS SAVING BIG</span>
            <span className="mx-4 text-yellow-200">🔥 {discountPercent}% OFF — OFFER ENDS TONIGHT</span>
            <span className="mx-4 text-white">⚡ ONLY ₹{monthlyPrice}/MONTH</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EarlyAdopterBanner;
