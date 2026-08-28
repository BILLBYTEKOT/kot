// MarketFilter — pill-style filter buttons for targetMarket
// Only renders when more than one market value exists across published posts
// Props: markets (string[]), selected (string|null), onChange (fn)
const MarketFilter = ({ markets = [], selected = null, onChange }) => {
  if (markets.length <= 1) return null;

  const MARKET_LABELS = {
    India: '🇮🇳 India',
    US: '🇺🇸 USA',
    UK: '🇬🇧 UK',
    UAE: '🇦🇪 UAE',
    Singapore: '🇸🇬 Singapore',
    Malaysia: '🇲🇾 Malaysia',
    Australia: '🇦🇺 Australia',
    Canada: '🇨🇦 Canada',
    Global: 'Global',
    EU: 'Europe',
  };

  return (
    <div className="flex items-center gap-2 flex-wrap mb-6">
      <span className="text-xs text-gray-500 font-semibold mr-1">Filter by market:</span>
      <button
        onClick={() => onChange(null)}
        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
          selected === null
            ? 'bg-orange-500 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        All
      </button>
      {markets.map(market => (
        <button
          key={market}
          onClick={() => onChange(market === selected ? null : market)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            selected === market
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {MARKET_LABELS[market] || market}
        </button>
      ))}
    </div>
  );
};

export default MarketFilter;
