const MARKET_CURRENCIES = {
  IN: { currency: 'INR', locale: 'en-IN' },
  US: { currency: 'USD', locale: 'en-US' },
  GB: { currency: 'GBP', locale: 'en-GB' },
  AE: { currency: 'AED', locale: 'en-AE' },
  EU: { currency: 'EUR', locale: 'en-IE' },
  CA: { currency: 'CAD', locale: 'en-CA' },
  AU: { currency: 'AUD', locale: 'en-AU' },
};

export const getMarketCurrency = () => {
  const language = typeof navigator !== 'undefined' ? navigator.language || '' : '';
  const region = language.split('-')[1]?.toUpperCase();
  return MARKET_CURRENCIES[region] || MARKET_CURRENCIES.IN;
};

export const formatCurrency = (amount, currency = 'INR', locale) =>
  new Intl.NumberFormat(locale || undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(amount) || 0);

export const currencyForMarket = (market) => MARKET_CURRENCIES[market] || MARKET_CURRENCIES.IN;
