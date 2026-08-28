import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  ChefHat, Search, Calendar, User, ArrowRight, TrendingUp,
  Flame, Clock, Tag, Zap, BookOpen, Star, Smartphone, Monitor,
  Download, CheckCircle, Globe, Wifi
} from 'lucide-react';
import { blogPosts as blogPostsData, publishedPosts } from '../data/blogPosts';
import { CategoryPageSEO } from '../seo';
import AdSense from '../components/AdSense';
import AppPromoCard from '../components/blog/AppPromoCard';
import MarketFilter from '../components/blog/MarketFilter';

// Rolling 24h countdown
const useCountdown = () => {
  const [t, setT] = useState({ hours: 23, minutes: 59, seconds: 59 });
  useEffect(() => {
    const tick = () => {
      const end = new Date(); end.setHours(23, 59, 59, 999);
      const diff = end - new Date();
      setT({
        hours: Math.floor((diff / 3600000) % 24),
        minutes: Math.floor((diff / 60000) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return t;
};

const authorName = (author) =>
  typeof author === 'string' ? author : author?.name || 'BillByteKOT Team';

const Sidebar = ({ timeLeft }) => (
  <aside className="hidden lg:block w-72 xl:w-80 flex-shrink-0">
    <div className="sticky top-24 space-y-5">

      {/* FOMO card */}
      <div className="rounded-2xl overflow-hidden shadow-lg" style={{ background: 'linear-gradient(135deg,#f97316,#ef4444,#dc2626)' }}>
        <div className="p-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-4 h-4 text-yellow-300 animate-pulse flex-shrink-0" />
            <span className="text-xs font-black tracking-widest uppercase">Flash Sale — Today Only</span>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-4xl font-black">5%</span>
            <span className="text-xl font-bold">OFF</span>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-white font-black text-xl">Flexible local pricing</span>
            <span className="bg-yellow-400 text-black text-[10px] font-black px-1.5 py-0.5 rounded">LOCAL CURRENCY</span>
          </div>
          {/* Countdown */}
          <div className="flex gap-1.5 mb-4">
            {[{ v: timeLeft.hours, l: 'HRS' }, { v: timeLeft.minutes, l: 'MIN' }, { v: timeLeft.seconds, l: 'SEC' }].map((x, i) => (
              <div key={i} className="flex-1 bg-black/25 rounded-xl py-2 text-center">
                <div className="font-mono font-black text-2xl leading-none">{String(x.v).padStart(2, '0')}</div>
                <div className="text-[9px] text-white/60 mt-0.5">{x.l}</div>
              </div>
            ))}
          </div>
          <Link to="/login">
            <button className="w-full bg-white text-red-600 font-black py-2.5 rounded-xl text-sm hover:bg-yellow-50 transition-all shadow">
              See Plans in Your Currency →
            </button>
          </Link>
          <p className="text-[10px] text-white/50 text-center mt-2">Resets at midnight • No credit card needed</p>
        </div>
      </div>

      {/* Ad */}
      <div className="rounded-xl overflow-hidden">
        <AdSense slot="1635338536" format="auto" responsive="true" />
      </div>

      {/* Popular topics */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="w-4 h-4 text-violet-500" />
          <span className="font-bold text-gray-800 text-sm">Popular Topics</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            'Restaurant Billing', 'KOT System', 'POS India', 'GST Billing',
            'Thermal Printer', 'WhatsApp Billing', 'Inventory', 'Free Trial',
            'Cloud Kitchen', 'QSR Billing', 'UPI Payments', 'Table Management',
          ].map(tag => (
            <span key={tag} className="bg-violet-50 text-violet-700 text-[11px] px-2.5 py-1 rounded-full border border-violet-100 hover:bg-violet-100 cursor-pointer transition-colors font-medium">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Ad */}
      <div className="rounded-xl overflow-hidden">
        <AdSense slot="2847291650" format="auto" responsive="true" />
      </div>

      {/* Stats */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-4 h-4 text-yellow-500" />
          <span className="font-bold text-gray-800 text-sm">Why BillByteKOT?</span>
        </div>
        <ul className="space-y-2.5">
          {[
            ['500+', 'Restaurants using it'],
            ['80%', 'Fewer kitchen errors'],
            ['3x', 'Faster table turnover'],
            ['Local pricing', 'Plans for every market'],
            ['5 min', 'Setup time'],
            ['7 days', 'Free trial, no card'],
          ].map(([stat, label]) => (
            <li key={stat} className="flex items-center justify-between text-sm">
              <span className="font-black text-violet-600">{stat}</span>
              <span className="text-gray-500">{label}</span>
            </li>
          ))}
        </ul>
        <Link to="/login">
          <button className="w-full mt-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold py-2.5 rounded-xl text-sm hover:opacity-90 transition-all">
            Start Free Trial
          </button>
        </Link>
      </div>

      {/* App promo */}
      <AppPromoCard />

      {/* Ad */}
      <div className="rounded-xl overflow-hidden">
        <AdSense slot="3958402761" format="auto" responsive="true" />
      </div>
    </div>
  </aside>
);

// Post card
const isNewPost = (post) => new Date() - new Date(post.date) < 14 * 24 * 60 * 60 * 1000;

const PostCard = ({ post, featured = false }) => (
  <Link to={`/blog/${post.slug}`} className="group block">
    <div className={`bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 h-full flex flex-col ${featured ? 'border-violet-200' : ''}`}>
      <div className="relative overflow-hidden" style={{ height: featured ? '200px' : '160px' }}>
        <img
          src={post.image}
          alt={post.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className="bg-violet-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {post.category}
          </span>
          {featured && (
            <span className="bg-yellow-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <Star className="w-2.5 h-2.5" /> Featured
            </span>
          )}
          {isNewPost(post) && (
            <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              New
            </span>
          )}
        </div>
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className={`font-bold text-gray-900 group-hover:text-violet-600 transition-colors leading-snug mb-2 ${featured ? 'text-base' : 'text-sm'}`}>
          {post.title}
        </h3>
        <p className="text-gray-500 text-xs line-clamp-2 mb-3 flex-1">{post.excerpt}</p>
        <div className="flex items-center justify-between text-[11px] text-gray-400 pt-3 border-t border-gray-50">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {authorName(post.author)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {post.readTime}
          </span>
        </div>
      </div>
    </div>
  </Link>
);

const POSTS_PER_PAGE = 20;

const BlogPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const timeLeft = useCountdown();

  const extraPosts = [
    {
      id: 0, title: 'Lightning-Fast Restaurant Billing: The Future is Here ⚡',
      excerpt: 'Discover how lightning-fast restaurant billing systems are transforming restaurants worldwide.',
      author: 'BillByteKOT Team', date: '2025-02-10', category: 'Business Strategy',
      readTime: '12 min read', image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800',
      slug: 'lightning-fast-restaurant-billing', featured: true,
    },
    {
      id: -1, title: 'How to 10X Your Restaurant Revenue Without Hiring More Staff 📈',
      excerpt: 'Discover how top restaurants are increasing revenue 10x without hiring more staff.',
      author: 'BillByteKOT Team', date: '2025-02-10', category: 'Revenue Growth',
      readTime: '14 min read', image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800',
      slug: 'restaurant-revenue-10x-without-hiring', featured: true,
    },
    {
      id: -2, title: 'Why Your Restaurant Lost That Customer (And How to Get Them Back) 💔',
      excerpt: 'Find out the #1 reason customers leave and how simple fixes like instant billing can bring them back.',
      author: 'BillByteKOT Team', date: '2025-02-10', category: 'Customer Retention',
      readTime: '11 min read', image: 'https://images.unsplash.com/photo-1554224311-beee415c15c?w=800',
      slug: 'restaurant-lost-customer-recovery', featured: true,
    },
  ];

  const allPosts = [...(publishedPosts.length > 0 ? publishedPosts : blogPostsData), ...extraPosts];
  const allMarkets = [...new Set(allPosts.flatMap(p => p.targetMarket || []))].filter(Boolean).sort();
  const featuredPosts = allPosts.filter(p => p.featured).slice(0, 4);

  const marketFilteredPosts = selectedMarket
    ? allPosts.filter(p => p.targetMarket?.includes(selectedMarket))
    : allPosts;

  const filteredPosts = marketFilteredPosts.filter(post =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (post.excerpt || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  const paginatedPosts = filteredPosts.slice((currentPage - 1) * POSTS_PER_PAGE, currentPage * POSTS_PER_PAGE);

  return (
    <>
      <CategoryPageSEO
        title="Restaurant Billing Software Blog | Tips, Guides & Updates | BillByteKOT"
        description="Expert guides on restaurant billing software, KOT systems, thermal printing, inventory management, and restaurant technology. Free tips for restaurant owners in India."
        keywords={[
          'restaurant billing software blog', 'KOT system guide', 'restaurant POS tips India',
          'GST billing software', 'restaurant management tips 2026', 'billing software guides',
          'POS system India 2026', 'cloud kitchen billing', 'WhatsApp billing restaurant',
  'best restaurant billing software for small business', 'restaurant sales growth', 'global restaurant POS buying guide',
          'restaurant billing app Android', 'restaurant POS Windows app', 'KOT app download',
          'restaurant billing software UAE', 'restaurant POS UK', 'restaurant app worldwide',
          'offline restaurant billing app', 'best restaurant app 2026',
        ]}
        url="https://billbytekot.in/blog"
        image="https://billbytekot.in/og-blog.jpg"
        schemaData={{
          name: 'Restaurant Software Blog',
          description: 'Expert guides on restaurant billing software, KOT systems, and restaurant technology.',
          items: filteredPosts.slice(0, 10).map(p => ({
            name: p.title, description: p.excerpt, url: `https://billbytekot.in/blog/${p.slug}`,
          })),
        }}
      />

      <div className="min-h-screen bg-gray-50">

        {/* ── HEADER ── */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
                <ChefHat className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-black bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                BillByteKOT
              </span>
            </Link>

            <div className="flex items-center gap-3">
              {/* Countdown pill */}
              <div className="hidden sm:flex items-center gap-1.5 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full">
                <Flame className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                <span className="text-xs font-bold text-red-600">20% OFF ends</span>
                <span className="font-mono text-xs font-black text-red-700 tabular-nums">
                  {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
                </span>
              </div>
              <Link to="/login">
                <Button size="sm" className="bg-gradient-to-r from-violet-600 to-purple-600 shadow-sm">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* ── HERO ── */}
        <section className="bg-gradient-to-br from-violet-700 via-purple-700 to-pink-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 md:py-20">
            <div className="max-w-2xl mx-auto text-center">
              {/* Offer badge */}
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-1.5 rounded-full text-sm font-semibold mb-5">
                <Flame className="w-4 h-4 text-yellow-300 animate-pulse" />
                20% OFF — Restaurant Billing Software — Offer Ends Tonight
              </div>
              <h1 className="text-4xl md:text-5xl font-black mb-4 leading-tight">
                BillByteKOT Blog
              </h1>
              <p className="text-white/80 text-base md:text-lg mb-8 leading-relaxed">
                Practical restaurant billing software guides, KOT system playbooks, POS comparisons and sales-growth ideas for restaurants worldwide
              </p>
              {/* Search */}
              <div className="relative max-w-lg mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 h-12 bg-white text-gray-900 border-0 shadow-lg rounded-xl text-sm"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── MAIN ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex gap-8">

            {/* Left: content */}
            <div className="flex-1 min-w-0">

              {/* Featured grid — only when not searching */}
              {!searchQuery && (
                <div className="mb-10">
                  <div className="flex items-center gap-2 mb-5">
                    <TrendingUp className="w-5 h-5 text-violet-600" />
                    <h2 className="text-xl font-black text-gray-900">Featured Articles</h2>
                  </div>
                  {/* Hero featured post + 3 smaller */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Big hero card */}
                    <Link to={`/blog/${featuredPosts[0]?.slug}`} className="group md:row-span-2 block">
                      <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 h-full flex flex-col">
                        <div className="relative overflow-hidden flex-1" style={{ minHeight: '260px' }}>
                          <img
                            src={featuredPosts[0]?.image}
                            alt={featuredPosts[0]?.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 absolute inset-0"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                            <span className="bg-violet-600 text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 inline-block">
                              {featuredPosts[0]?.category}
                            </span>
                            <h3 className="font-black text-lg leading-snug group-hover:text-yellow-300 transition-colors">
                              {featuredPosts[0]?.title}
                            </h3>
                            <p className="text-white/70 text-xs mt-1 line-clamp-2">{featuredPosts[0]?.excerpt}</p>
                            <div className="flex items-center gap-3 mt-2 text-white/60 text-[11px]">
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{featuredPosts[0]?.readTime}</span>
                              <span className="flex items-center gap-1"><User className="w-3 h-3" />{authorName(featuredPosts[0]?.author)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>

                    {/* 3 smaller featured */}
                    {featuredPosts.slice(1, 4).map(post => (
                      <PostCard key={post.id} post={post} featured />
                    ))}
                  </div>
                </div>
              )}

              {/* Ad — between featured and all posts */}
              {!searchQuery && (
                <div className="mb-8 rounded-xl overflow-hidden">
                  <AdSense slot="2847291650" format="auto" responsive="true" />
                </div>
              )}

              {/* All posts */}
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-gray-900">
                    {searchQuery ? `Results for "${searchQuery}"` : 'All Articles'}
                  </h2>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {filteredPosts.length} articles on restaurant billing, KOT systems &amp; more
                  </p>
                </div>
              </div>

              {/* Market filter */}
              {!searchQuery && allMarkets.length > 1 && (
                <MarketFilter
                  markets={allMarkets}
                  selected={selectedMarket}
                  onChange={(market) => { setSelectedMarket(market); setCurrentPage(1); }}
                />
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {paginatedPosts.map((post, idx) => (
                  <div key={post.id}>
                    <PostCard post={post} />

                    {/* Ad every 6 posts — full width */}
                    {(idx + 1) % 6 === 0 && (
                      <div className="sm:col-span-2 xl:col-span-3 mt-4 rounded-xl overflow-hidden">
                        <AdSense slot="3958402761" format="auto" responsive="true" />
                      </div>
                    )}

                    {/* FOMO CTA every 12 posts */}
                    {(idx + 1) % 12 === 0 && (
                      <div className="sm:col-span-2 xl:col-span-3 mt-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-6 text-white text-center">
                        <Zap className="w-7 h-7 mx-auto mb-2 text-yellow-300" />
                        <div className="font-black text-lg mb-1">🔥 20% OFF — Ends Tonight</div>
                        <div className="text-white/80 text-sm mb-3">₹1999/yr → ₹1599/yr • Save ₹400</div>
                        <Link to="/login">
                          <button className="bg-white text-orange-600 font-black px-6 py-2 rounded-full text-sm hover:bg-yellow-50 transition-all">
                            Claim 20% OFF →
                          </button>
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {filteredPosts.length === 0 && (
                <div className="text-center py-16">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400 font-medium">No articles found for "{searchQuery}"</p>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button key={i} onClick={() => setCurrentPage(i + 1)}
                      className={`w-9 h-9 rounded-lg text-sm font-bold ${currentPage === i + 1 ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}

              {/* Bottom ad */}
              <div className="mt-10 rounded-xl overflow-hidden">
                <AdSense slot="1635338536" format="auto" responsive="true" />
              </div>
            </div>

            {/* Right: sidebar */}
            <Sidebar timeLeft={timeLeft} />
          </div>
        </div>

        {/* ── APP PROMOTION SECTION ── */}
        <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-500/30 px-4 py-1.5 rounded-full text-green-400 text-sm font-bold mb-4">
                <Smartphone className="w-4 h-4" />
                Available on Android, Windows &amp; Web — Worldwide
              </div>
              <h2 className="text-3xl md:text-4xl font-black mb-3">
                Restaurant Billing App for{' '}
                <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">Every Device</span>
              </h2>
              <p className="text-gray-400 text-base max-w-2xl mx-auto">
                The #1 KOT-first restaurant billing app. Works on Android phones, Windows PCs, and any web browser — online or offline. Used by restaurants across India, UAE, UK, USA &amp; more.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-10">
              {/* Android */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all group">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-black text-lg mb-1">Android App</h3>
                <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                  Native Android app for restaurant billing on the go. Bill customers, send KOTs, track inventory — all from your phone. Works offline too.
                </p>
                <ul className="space-y-1.5 mb-5">
                  {['Restaurant billing app Android', 'KOT system mobile app', 'GST invoice app India', 'Offline billing app', 'Works on any Android phone'].map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs text-gray-300">
                      <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <Link to="/download">
                  <button className="w-full bg-green-500 hover:bg-green-400 text-white font-black py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" />
                    Download Android APK
                  </button>
                </Link>
                <p className="text-[10px] text-gray-500 text-center mt-2">Free download • No Play Store needed</p>
              </div>

              {/* Windows */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all group">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                  <Monitor className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-black text-lg mb-1">Windows Desktop App</h3>
                <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                  Full-featured Windows desktop app for restaurant billing. Connects to thermal printers, works offline, and syncs with your team in real-time.
                </p>
                <ul className="space-y-1.5 mb-5">
                  {['Restaurant billing software Windows', 'Thermal printer integration', 'Offline POS system', 'Auto-sync with cloud', 'Works on Windows 10/11'].map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs text-gray-300">
                      <CheckCircle className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <Link to="/download">
                  <button className="w-full bg-blue-500 hover:bg-blue-400 text-white font-black py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" />
                    Download for Windows
                  </button>
                </Link>
                <p className="text-[10px] text-gray-500 text-center mt-2">Free download • Windows 10/11</p>
              </div>

              {/* Web / PWA */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all group relative overflow-hidden">
                <div className="absolute top-3 right-3 bg-violet-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">INSTANT ACCESS</div>
                <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                  <Globe className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-black text-lg mb-1">Web App (Any Device)</h3>
                <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                  Use BillByteKOT directly in your browser — no download needed. Works on iPhone, iPad, Mac, Linux, Chromebook, and any device worldwide.
                </p>
                <ul className="space-y-1.5 mb-5">
                  {['Works on iPhone & iPad', 'Mac & Linux compatible', 'No installation needed', 'Instant 7-day free trial', 'Access from anywhere worldwide'].map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs text-gray-300">
                      <CheckCircle className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <Link to="/login">
                  <button className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:opacity-90 text-white font-black py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                    <Zap className="w-4 h-4" />
                    Start Free Trial — No Download
                  </button>
                </Link>
                <p className="text-[10px] text-gray-500 text-center mt-2">7 days free • No credit card</p>
              </div>
            </div>

            {/* Worldwide availability strip */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Globe className="w-5 h-5 text-green-400" />
                <span className="font-bold text-white">Available Worldwide</span>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                BillByteKOT works in every country. Restaurant owners in India, UAE, UK, USA, Canada, Australia, Singapore &amp; 50+ countries use it daily.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {['🇮🇳 India', '🇦🇪 UAE', '🇬🇧 UK', '🇺🇸 USA', '🇨🇦 Canada', '🇦🇺 Australia', '🇸🇬 Singapore', '🇳🇿 New Zealand', '🇿🇦 South Africa', '🌍 +50 more'].map(c => (
                  <span key={c} className="bg-white/10 text-gray-300 text-xs px-3 py-1 rounded-full">{c}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── SEO KEYWORDS SECTION ── */}
        <section className="bg-white border-t border-gray-100 py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <h2 className="text-base font-bold text-gray-700 mb-5">Restaurant Billing Software — Resource Hub</h2>
            <div className="grid sm:grid-cols-3 gap-6 text-sm text-gray-500">
              {[
                {
                  title: 'Popular Guides',
                  items: ['Restaurant billing software India 2026', 'KOT system for restaurants', 'GST billing software free', 'Thermal printer for restaurant', 'WhatsApp billing integration', 'Restaurant POS system comparison'],
                },
                {
                  title: 'App Downloads',
                  items: ['Restaurant billing app Android', 'Restaurant POS Windows app', 'KOT app for Android phone', 'Offline restaurant billing app', 'Restaurant software free download', 'Best restaurant app India 2026'],
                },
                {
                  title: 'Worldwide',
                  items: ['Restaurant billing software UAE', 'POS system UK restaurants', 'Restaurant app USA', 'Billing software Singapore', 'Restaurant POS Australia', 'KOT system worldwide'],
                },
              ].map(col => (
                <div key={col.title}>
                  <h3 className="font-bold text-gray-700 mb-2 text-sm">{col.title}</h3>
                  <ul className="space-y-1.5">
                    {col.items.map(t => (
                      <li key={t} className="flex items-center gap-1.5">
                        <ArrowRight className="w-3 h-3 text-violet-400 flex-shrink-0" />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="bg-gradient-to-r from-violet-700 to-purple-700 text-white py-14">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 bg-white/15 border border-white/20 px-4 py-1.5 rounded-full text-sm font-semibold mb-5">
              <Flame className="w-4 h-4 text-yellow-300 animate-pulse" />
              20% OFF — ₹1999 → ₹1599/year — Offer ends tonight
            </div>
            <h2 className="text-3xl md:text-4xl font-black mb-3">Ready to Transform Your Restaurant?</h2>
            <p className="text-white/75 text-base mb-8 max-w-lg mx-auto">
              Join 500+ restaurants using BillByteKOT. KOT-first billing, GST invoices, thermal printing, WhatsApp integration.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/login">
                <Button size="lg" className="bg-white text-violet-700 hover:bg-gray-50 h-12 px-8 font-black shadow-lg">
                  Start Free 7-Day Trial
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 h-12 px-8 font-bold">
                  🔥 Claim 20% OFF — ₹1599/yr
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="bg-gray-950 text-white py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <ChefHat className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-black text-lg">BillByteKOT</span>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed">India's KOT-first restaurant billing system. GST compliant, WhatsApp integrated, offline ready.</p>
              </div>
              <div>
                <h4 className="font-bold text-sm mb-3 text-gray-300">Product</h4>
                <ul className="space-y-2 text-gray-400 text-sm">
                  {[['/', 'Home'], ['/login', 'Get Started'], ['/blog', 'Blog']].map(([to, label]) => (
                    <li key={to}><Link to={to} className="hover:text-white transition-colors">{label}</Link></li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-sm mb-3 text-gray-300">Resources</h4>
                <ul className="space-y-2 text-gray-400 text-sm">
                  {[['/contact', 'Contact Us'], ['/support', 'Support'], ['/blog', 'All Articles']].map(([to, label]) => (
                    <li key={to}><Link to={to} className="hover:text-white transition-colors">{label}</Link></li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-sm mb-3 text-gray-300">Popular Searches</h4>
                <ul className="space-y-1.5 text-gray-400 text-xs">
                  {['Restaurant billing software India', 'KOT system for restaurants', 'GST billing software free', 'Restaurant POS system 2026'].map(t => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-800 pt-6 text-center text-gray-500 text-xs">
              © 2026 BillByteKOT by BillByte Innovations. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default BlogPage;
