export const MARKET_OPTIONS = [
  { country: 'IN', name: 'India', currency: 'INR', symbol: '₹', razorpaySupported: true },
  { country: 'US', name: 'United States', currency: 'USD', symbol: '$', razorpaySupported: false },
  { country: 'GB', name: 'United Kingdom', currency: 'GBP', symbol: '£', razorpaySupported: false },
  { country: 'AE', name: 'United Arab Emirates', currency: 'AED', symbol: 'د.إ', razorpaySupported: false },
  { country: 'CA', name: 'Canada', currency: 'CAD', symbol: 'C$', razorpaySupported: false },
  { country: 'AU', name: 'Australia', currency: 'AUD', symbol: 'A$', razorpaySupported: false },
];

const MARKET_PRICES = {
  IN: { regular: 1999, sale: 1899 },
  US: { regular: 29, sale: 24 },
  GB: { regular: 24, sale: 20 },
  AE: { regular: 109, sale: 89 },
  CA: { regular: 39, sale: 32 },
  AU: { regular: 45, sale: 37 },
};

export const getMarket = (country) =>
  MARKET_OPTIONS.find((market) => market.country === country) || MARKET_OPTIONS[1];

export const getMarketPricing = (country, pricing = {}) => {
  const market = getMarket(country);
  const configured = pricing?.market_pricing?.[market.country];
  const fallback = MARKET_PRICES[market.country] || MARKET_PRICES.US;
  const regular = Number(configured?.regular ?? fallback.regular);
  const sale = Number(configured?.sale ?? fallback.sale);
  const formatter = new Intl.NumberFormat(undefined, {
    style: 'currency', currency: market.currency, maximumFractionDigits: 0,
  });
  return { market, regular, sale, regularDisplay: formatter.format(regular), saleDisplay: formatter.format(sale) };
};

export const detectMarket = () => {
  const locale = typeof navigator !== 'undefined' ? navigator.language : '';
  const country = locale.split('-')[1]?.toUpperCase();
  return MARKET_OPTIONS.some((market) => market.country === country) ? country : 'US';
};

export const saveMarket = (country) => {
  if (typeof window !== 'undefined') window.localStorage.setItem('billbytekot_market', country);
};

export default MARKET_OPTIONS;
