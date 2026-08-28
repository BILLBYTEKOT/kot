const MARKET_CURRENCIES = {
  IN: { currency: 'INR', locale: 'en-IN' },
  US: { currency: 'USD', locale: 'en-US' },
  GB: { currency: 'GBP', locale: 'en-GB' },
  AE: { currency: 'AED', locale: 'en-AE' },
  EU: { currency: 'EUR', locale: 'en-IE' },
  CA: { currency: 'CAD', locale: 'en-CA' },
  AU: { currency: 'AUD', locale: 'en-AU' },
};

// Product prices are stored in INR. These rates convert the INR base price
// consistently for display and checkout; update them when commercial rates change.
export const INR_RATES = {
  INR: 1,
  USD: 0.0115,
  GBP: 0.0088,
  EUR: 0.0106,
  AED: 0.0423,
  CAD: 0.0157,
  AUD: 0.0177,
};

export const convertFromINR = (amount, currency = 'INR') =>
  Math.round((Number(amount) || 0) * (INR_RATES[currency] || 1));

export const getMarketCurrency = () => {
  const language = typeof navigator !== 'undefined' ? navigator.language || '' : '';
  const region = language.split('-')[1]?.toUpperCase();
  return MARKET_CURRENCIES[region] || MARKET_CURRENCIES.IN;
};

export const formatCurrency = (amount, currency = 'INR', locale) =>
  new Intl.NumberFormat(locale || undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(amount) || 0);

export const currencyForMarket = (market) => MARKET_CURRENCIES[market] || MARKET_CURRENCIES.IN;
