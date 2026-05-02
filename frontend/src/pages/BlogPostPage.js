import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { ChefHat, Calendar, User, Clock, ArrowLeft, Share2, BookmarkPlus, Flame, Tag, Zap, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { blogPosts as blogPostsData } from '../data/blogPosts';
import { BlogPostSEO } from '../seo';
import AdSense from '../components/AdSense';
import { useState, useEffect } from 'react';
import { publishedPosts } from '../data/blogPosts';
import BreadcrumbNav from '../components/blog/BreadcrumbNav';
import AppDownloadBanner from '../components/blog/AppDownloadBanner';
import LeadCaptureForm from '../components/blog/LeadCaptureForm';
import TimedPopup from '../components/blog/TimedPopup';
import RelatedArticles from '../components/blog/RelatedArticles';
import AppPromoCard from '../components/blog/AppPromoCard';
import InlineCTA from '../components/blog/InlineCTA';
import StickyMobileCTA from '../components/blog/StickyMobileCTA';
import { PLAY_STORE_URL } from '../utils/playStoreUrl';

// Rolling 24h countdown
const useCountdown = () => {
  const [t, setT] = useState({ hours: 23, minutes: 59, seconds: 59 });
  useEffect(() => {
    const tick = () => {
      const end = new Date(); end.setHours(23, 59, 59, 999);
      const diff = end - new Date();
      setT({ hours: Math.floor((diff / 3600000) % 24), minutes: Math.floor((diff / 60000) % 60), seconds: Math.floor((diff / 1000) % 60) });
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, []);
  return t;
};

// Sticky article sidebar
const ArticleSidebar = ({ timeLeft, relatedPosts = [] }) => (
  <aside className="hidden xl:block w-72 flex-shrink-0">
    <div className="sticky top-24 space-y-5">
      {/* FOMO box */}
      <div className="bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500 rounded-2xl p-4 text-white shadow-xl">
        <div className="flex items-center gap-1.5 mb-1">
          <Flame className="w-4 h-4 animate-pulse" />
          <span className="font-black text-xs tracking-widest">SPECIAL OFFER — 5% OFF</span>
        </div>
        <div className="text-3xl font-black">₹1899<span className="text-base font-normal">/yr</span></div>
        <div className="text-white/60 text-xs line-through mb-2">Regular ₹1999/yr — Save ₹100</div>
        <div className="flex gap-1 mb-3">
          {[{ v: timeLeft.hours, l: 'H' }, { v: timeLeft.minutes, l: 'M' }, { v: timeLeft.seconds, l: 'S' }].map((x, i) => (
            <div key={i} className="flex-1 bg-black/30 rounded-lg py-1 text-center">
              <div className="font-mono font-black text-lg">{String(x.v).padStart(2, '0')}</div>
              <div className="text-[9px] text-white/60">{x.l}</div>
            </div>
          ))}
        </div>
        <Link to="/login"><button className="w-full bg-white text-orange-600 font-black py-2 rounded-xl text-xs hover:bg-yellow-50 transition-all">Claim 5% OFF →</button></Link>
        <p className="text-[9px] text-white/50 text-center mt-1">Limited time • No credit card</p>
      </div>

      {/* Ad slot */}
      <AdSense slot="2847291650" format="auto" responsive="true" />

      {/* Related posts */}
      {relatedPosts.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow border">
          <div className="font-bold text-gray-800 text-sm mb-3">Related Articles</div>
          <ul className="space-y-3">
            {relatedPosts.slice(0, 4).map(p => (
              <li key={p.id}>
                <Link to={`/blog/${p.slug}`} className="flex gap-2 group">
                  <img src={p.image} alt={p.title} className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-800 group-hover:text-violet-600 line-clamp-2 leading-snug">{p.title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{p.readTime}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Ad slot 2 */}
      <AdSense slot="3958402761" format="auto" responsive="true" />

      {/* Keywords */}
      <div className="bg-white rounded-2xl p-4 shadow border">
        <div className="flex items-center gap-1.5 mb-2">
          <Tag className="w-3.5 h-3.5 text-violet-600" />
          <span className="font-bold text-gray-800 text-sm">Popular Topics</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {['KOT System', 'GST Billing', 'POS India', 'Thermal Printer', 'WhatsApp Billing', 'Free Trial', 'Inventory', 'Cloud Kitchen'].map(tag => (
            <span key={tag} className="bg-violet-50 text-violet-700 text-[10px] px-2 py-0.5 rounded-full border border-violet-100">{tag}</span>
          ))}
        </div>
      </div>
    </div>
  </aside>
);

const BlogPostPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [markdownContent, setMarkdownContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const timeLeft = useCountdown();

  // List of markdown blog files
  const markdownBlogs = [
    'customer-experience-revolution',
    'how-to-increase-restaurant-sales-2026',
    'profit-margin-secrets',
    'restaurant-automation-revolution-2025',
    'restaurant-billing-software-free-vs-paid-2026',
    'restaurant-pos-system-complete-guide-2025',
    'restaurant-technology-trends-2025'
  ];

  // Try to load markdown file if it exists
  useEffect(() => {
    if (markdownBlogs.includes(slug)) {
      fetch(`/blog/${slug}.md`)
        .then(response => {
          if (response.ok) {
            return response.text();
          }
          throw new Error('Markdown file not found');
        })
        .then(text => {
          setMarkdownContent(text);
          setLoading(false);
        })
        .catch(error => {
          console.error('Error loading markdown:', error);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [slug]);

  // Check if markdown content was loaded
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading article...</p>
        </div>
      </div>
    );
  }

  // If markdown content exists, render it
  if (markdownContent) {
    // Extract metadata from markdown
    const lines = markdownContent.split('\n');
    const titleLine = lines.find(line => line.startsWith('# '));
    const title = titleLine ? titleLine.substring(2).trim() : 'Blog Post';
    
    // Extract published date and reading time from markdown
    const metaLine = lines.find(line => line.includes('Published:') || line.includes('Reading Time:'));
    let publishedDate = new Date().toISOString().split('T')[0];
    let readTime = '10 min read';
    
    if (metaLine) {
      const dateMatch = metaLine.match(/Published:\s*([^|]+)/);
      const timeMatch = metaLine.match(/Reading Time:\s*([^|]+)/);
      if (dateMatch) publishedDate = dateMatch[1].trim();
      if (timeMatch) readTime = timeMatch[1].trim();
    }

    // Determine category from content
    const categoryMatch = markdownContent.match(/Category:\s*([^\n]+)/);
    const category = categoryMatch ? categoryMatch[1].trim() : 'Restaurant Tips';

    const image = `https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=600&fit=crop`;

    return (
      <>
        <Helmet>
          <title>{title} | BillByteKOT Blog</title>
          <meta name="description" content={title} />
          <meta name="keywords" content={`${category}, restaurant billing, KOT system, restaurant software, BillByteKOT`} />
          <link rel="canonical" href={`https://billbytekot.in/blog/${slug}`} />
          
          <meta property="og:title" content={`${title} | BillByteKOT`} />
          <meta property="og:description" content={title} />
          <meta property="og:image" content={image} />
          <meta property="og:url" content={`https://billbytekot.in/blog/${slug}`} />
          <meta property="og:type" content="article" />
          
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={title} />
          <meta name="twitter:description" content={title} />
          <meta name="twitter:image" content={image} />
          
          <meta property="article:published_time" content={publishedDate} />
          <meta property="article:author" content="BillByteKOT Team" />
          <meta property="article:section" content={category} />
        </Helmet>
        
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        
        {/* Header */}
        <header className="bg-white border-b sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <ChefHat className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                  BillByteKOT
                </span>
              </Link>
              <Button variant="outline" onClick={() => navigate('/blog')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Blog
              </Button>
            </div>
          </div>
        </header>

        <AppDownloadBanner mobile targetMarket={['India']} />

        {/* Article + Sidebar */}
        <div className="container mx-auto px-4 py-10">
          <div className="flex gap-8 max-w-7xl mx-auto">
          <article className="flex-1 min-w-0 max-w-4xl">
          {/* Hero Image */}
          <img 
            src={image} 
            alt={title}
            className="w-full h-80 object-cover rounded-2xl shadow-2xl mb-6"
          />

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-6">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(publishedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <span className="flex items-center gap-1">
              <User className="w-4 h-4" />
              BillByteKOT Team
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {readTime}
            </span>
            <span className="px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-medium">
              {category}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            {title}
          </h1>
          <BreadcrumbNav category={category} postTitle={title} />

          {/* Ad - Top of Article */}
          <div className="my-8">
            <AdSense 
              slot="1635338536"
              format="auto"
              responsive="true"
              className="mb-8"
            />
          </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            {(() => {
              const paragraphs = markdownContent.split('\n\n');
              const wordCount = markdownContent.split(/\s+/).length;
              const injectInlineCTA = wordCount > 2000;
              const inlineCTAIndex = injectInlineCTA ? Math.floor(paragraphs.length * 0.5) : -1;
              const elements = [];
              let adCount = 0;

              paragraphs.forEach((paragraph, index) => {
                // Skip empty paragraphs and metadata lines
                if (!paragraph.trim() || paragraph.startsWith('*Published:') || paragraph.startsWith('*Reading Time:')) return;

                // Inject InlineCTA at ~50% position
                if (index === inlineCTAIndex) {
                  elements.push(<InlineCTA key={`cta-${index}`} market="India" />);
                }

                // Headers
                if (paragraph.startsWith('# ')) {
                  elements.push(<h1 key={index} className="text-4xl font-bold mt-12 mb-6 text-gray-900">{paragraph.substring(2)}</h1>);
                } else if (paragraph.startsWith('## ')) {
                  elements.push(<h2 key={index} className="text-3xl font-bold mt-10 mb-4 text-gray-900">{paragraph.substring(3)}</h2>);
                } else if (paragraph.startsWith('### ')) {
                  elements.push(<h3 key={index} className="text-2xl font-bold mt-8 mb-3 text-gray-900">{paragraph.substring(4)}</h3>);
                } else if (paragraph.startsWith('#### ')) {
                  elements.push(<h4 key={index} className="text-xl font-bold mt-6 mb-2 text-gray-900">{paragraph.substring(5)}</h4>);
                } else if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                  elements.push(<p key={index} className="font-bold text-lg my-4 text-gray-900">{paragraph.slice(2, -2)}</p>);
                } else if (paragraph.includes('\n- ') || paragraph.startsWith('- ')) {
                  const items = paragraph.split('\n').filter(line => line.trim().startsWith('- '));
                  elements.push(
                    <ul key={index} className="list-disc ml-6 my-4 space-y-2">
                      {items.map((item, i) => {
                        let itemText = item.substring(2);
                        itemText = itemText.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold">$1</strong>');
                        itemText = itemText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-violet-600 hover:text-violet-700 underline">$1</a>');
                        return <li key={i} className="text-gray-700" dangerouslySetInnerHTML={{ __html: itemText }} />;
                      })}
                    </ul>
                  );
                } else if (paragraph.match(/\[([^\]]+)\]\(([^)]+)\)/) && paragraph.trim().startsWith('[')) {
                  const linkMatch = paragraph.match(/\[([^\]]+)\]\(([^)]+)\)/);
                  elements.push(
                    <div key={index} className="my-6">
                      <Link to={linkMatch[2]}>
                        <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700">
                          {linkMatch[1]}
                        </Button>
                      </Link>
                    </div>
                  );
                } else if (paragraph.trim() === '---') {
                  elements.push(<hr key={index} className="my-8 border-gray-300" />);
                } else if (paragraph.startsWith('> ')) {
                  elements.push(
                    <blockquote key={index} className="border-l-4 border-violet-600 pl-4 italic text-gray-700 my-4">
                      {paragraph.substring(2)}
                    </blockquote>
                  );
                } else {
                  let formattedText = paragraph;
                  formattedText = formattedText.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold">$1</strong>');
                  formattedText = formattedText.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>');
                  formattedText = formattedText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-violet-600 hover:text-violet-700 underline">$1</a>');
                  formattedText = formattedText.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-2 py-1 rounded text-sm">$1</code>');
                  elements.push(
                    <p key={index} className="text-gray-700 leading-relaxed my-4 text-lg" dangerouslySetInnerHTML={{ __html: formattedText }} />
                  );
                }

                // Inject in-content AdSense every ~800 words when total > 2000, max 5 units
                if (injectInlineCTA && adCount < 5) {
                  const wordsPerParagraph = wordCount / paragraphs.length;
                  const paragraphsPerAd = Math.max(1, Math.floor(800 / wordsPerParagraph));
                  if ((index + 1) % paragraphsPerAd === 0) {
                    elements.push(
                      <div key={`ad-inline-${index}`} className="my-6">
                        <AdSense slot="2847291650" format="auto" responsive="true" />
                      </div>
                    );
                    adCount++;
                  }
                }
              });

              return elements;
            })()}
          </div>

          {/* Ad - Middle of Article */}
          <div className="my-6">
            <AdSense slot="2847291650" format="auto" responsive="true" />
          </div>

          {/* FOMO inline CTA */}
          <div className="my-8 p-5 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl text-white text-center">
            <Flame className="w-6 h-6 mx-auto mb-1 text-yellow-300 animate-pulse" />
            <div className="font-black text-lg mb-1">🔥 5% OFF — Special Offer</div>
            <div className="text-white/80 text-sm mb-3">₹1999/yr → ₹1899/yr • Save ₹100</div>
            <Link to="/login"><button className="bg-white text-orange-600 font-black px-6 py-2 rounded-full text-sm hover:bg-yellow-50 transition-all">Claim 5% OFF Now →</button></Link>
          </div>

          <AppDownloadBanner targetMarket={['India']} />

          {/* CTA */}
          <div className="mt-10 p-8 bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl text-white text-center">
            <h3 className="text-2xl font-bold mb-3">Ready to Get Started?</h3>
            <p className="text-base mb-5 opacity-90">Start your 7-day free trial today. No credit card required.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" className="bg-white text-violet-600 hover:bg-gray-100 h-11 px-6" onClick={() => navigate('/login')}>
                Start Free Trial
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 h-11 px-6" onClick={() => navigate('/login')}>
                🔥 Get 5% OFF — ₹1899/yr
              </Button>
            </div>
          </div>

          {/* Ad - Bottom of Article */}
          <div className="mt-6">
            <AdSense slot="3958402761" format="auto" responsive="true" />
          </div>

          <LeadCaptureForm />
          <RelatedArticles
            posts={publishedPosts.length > 0 ? publishedPosts : blogPostsData}
            currentSlug={slug}
            targetMarket={['India']}
            category={category}
          />

          {/* Final ad */}
          <div className="mt-6">
            <AdSense slot="1635338536" format="auto" responsive="true" />
          </div>
        </article>

        {/* Sidebar */}
        <ArticleSidebar timeLeft={timeLeft} relatedPosts={blogPostsData.filter(p => p.featured && p.slug !== slug).slice(0, 4)} />
        </div>
        </div>
        </div>
        <TimedPopup />
        <StickyMobileCTA />
      </>
    );
  }

  // Check if post exists in new blog posts data
  const newBlogPost = (publishedPosts.length > 0 ? publishedPosts : blogPostsData).find(post => post.slug === slug);
  
  if (newBlogPost) {
    return (
      <>
        {/* SEO Meta Tags and Schema Markup */}
        <BlogPostSEO
          title={`${newBlogPost.title} | BillByteKOT Blog`}
          description={newBlogPost.excerpt || newBlogPost.title}
          keywords={[
            newBlogPost.category.toLowerCase(),
            'restaurant billing',
            'KOT system',
            'restaurant software',
            'BillByteKOT',
            ...newBlogPost.title.toLowerCase().split(' ').slice(0, 5)
          ]}
          url={`https://billbytekot.in/blog/${slug}`}
          image={newBlogPost.image}
          author={typeof newBlogPost.author === 'string' ? newBlogPost.author : newBlogPost.author?.name || 'BillByteKOT Team'}
          publishedDate={newBlogPost.date}
          modifiedDate={newBlogPost.modifiedDate || newBlogPost.date}
          schemaData={{
            headline: newBlogPost.title,
            description: newBlogPost.excerpt || newBlogPost.title,
            image: newBlogPost.image,
            author: typeof newBlogPost.author === 'string' ? newBlogPost.author : newBlogPost.author?.name || 'BillByteKOT Team',
            publishedDate: newBlogPost.date,
            modifiedDate: newBlogPost.modifiedDate || newBlogPost.date,
            url: `https://billbytekot.in/blog/${slug}`,
            wordCount: newBlogPost.content ? newBlogPost.content.split(' ').length : 1000,
            keywords: [newBlogPost.category, 'restaurant billing', 'KOT system', 'restaurant software'],
            articleSection: newBlogPost.category,
            about: {
              name: 'Restaurant Management',
              description: 'Tips and guides for restaurant owners and managers'
            }
          }}
          customMeta={{
            ...(newBlogPost.targetMarket?.[0] && newBlogPost.targetMarket[0] !== 'Global' ? {
              'geo.region': { India: 'IN', US: 'US', UK: 'GB', UAE: 'AE', Singapore: 'SG', Malaysia: 'MY', Australia: 'AU', Canada: 'CA' }[newBlogPost.targetMarket[0]] || 'IN'
            } : {})
          }}
        />
        
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        
        {/* Header */}
        <header className="bg-white border-b sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <ChefHat className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                  BillByteKOT
                </span>
              </Link>
              <Button variant="outline" onClick={() => navigate('/blog')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Blog
              </Button>
            </div>
          </div>
        </header>

        <AppDownloadBanner mobile targetMarket={newBlogPost.targetMarket || ['India']} />

        {/* Article + Sidebar */}
        <div className="container mx-auto px-4 py-10">
          <div className="flex gap-8 max-w-7xl mx-auto">
          <article className="flex-1 min-w-0 max-w-4xl">
          {/* Hero Image */}
          <img 
            src={newBlogPost.image} 
            alt={newBlogPost.title}
            className="w-full h-80 object-cover rounded-2xl shadow-2xl mb-6"
          />

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-6">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(newBlogPost.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <span className="flex items-center gap-1">
              <User className="w-4 h-4" />
              {typeof newBlogPost.author === 'string' ? newBlogPost.author : newBlogPost.author?.name || 'BillByteKOT Team'}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {newBlogPost.readTime}
            </span>
            <span className="px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-medium">
              {newBlogPost.category}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            {newBlogPost.title}
          </h1>
          <BreadcrumbNav category={newBlogPost.category} postTitle={newBlogPost.title} />

          {/* Ad - Top of Article */}
          <div className="my-6">
            <AdSense slot="1635338536" format="auto" responsive="true" />
          </div>

          {/* App feature showcase for app-feature content type */}
          {newBlogPost.contentType === 'app-feature' && (
            <div className="rounded-2xl bg-green-50 border border-green-200 p-6 mb-6">
              <h2 className="font-black text-xl text-gray-900 mb-3">📱 BillByteKOT Android App</h2>
              <ul className="text-sm text-gray-700 space-y-1 mb-4">
                {['Fast KOT-first billing', 'Offline mode with auto-sync', 'WhatsApp bill sharing', 'Real-time inventory tracking', 'Multi-staff management'].map(f => (
                  <li key={f} className="flex items-center gap-2">✅ {f}</li>
                ))}
              </ul>
              <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="inline-block bg-green-600 hover:bg-green-500 text-white font-black px-6 py-2.5 rounded-xl text-sm">GET IT ON Google Play</a>
            </div>
          )}

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            {(() => {
              const paragraphs = newBlogPost.content.split('\n\n');
              const wordCount = newBlogPost.content.split(/\s+/).length;
              const injectInlineCTA = wordCount > 2000;
              const inlineCTAIndex = injectInlineCTA ? Math.floor(paragraphs.length * 0.5) : -1;
              const elements = [];
              let adCount = 0;

              paragraphs.forEach((paragraph, index) => {
                // Skip empty paragraphs
                if (!paragraph.trim()) return;

                // Inject AppPromoCard between 2nd and 3rd paragraph
                if (index === 2 && newBlogPost.appPromo === true) {
                  elements.push(<AppPromoCard key={`promo-${index}`} compact />);
                }

                // Inject InlineCTA at ~50% position
                if (index === inlineCTAIndex) {
                  elements.push(<InlineCTA key={`cta-${index}`} market={newBlogPost.targetMarket?.[0] || 'India'} />);
                }

                // Headers
                if (paragraph.startsWith('# ')) {
                  elements.push(<h1 key={index} className="text-4xl font-bold mt-12 mb-6 text-gray-900">{paragraph.substring(2)}</h1>);
                } else if (paragraph.startsWith('## ')) {
                  elements.push(<h2 key={index} className="text-3xl font-bold mt-10 mb-4 text-gray-900">{paragraph.substring(3)}</h2>);
                } else if (paragraph.startsWith('### ')) {
                  elements.push(<h3 key={index} className="text-2xl font-bold mt-8 mb-3 text-gray-900">{paragraph.substring(4)}</h3>);
                } else if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                  elements.push(<p key={index} className="font-bold text-lg my-4 text-gray-900">{paragraph.slice(2, -2)}</p>);
                } else if (paragraph.includes('\n- ') || paragraph.startsWith('- ')) {
                  const items = paragraph.split('\n').filter(line => line.trim().startsWith('- '));
                  elements.push(
                    <ul key={index} className="list-disc ml-6 my-4 space-y-2">
                      {items.map((item, i) => (
                        <li key={i} className="text-gray-700">{item.substring(2)}</li>
                      ))}
                    </ul>
                  );
                } else if (paragraph.match(/\[([^\]]+)\]\(([^)]+)\)/)) {
                  const linkMatch = paragraph.match(/\[([^\]]+)\]\(([^)]+)\)/);
                  elements.push(
                    <div key={index} className="my-6">
                      <Link to={linkMatch[2]}>
                        <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700">
                          {linkMatch[1]}
                        </Button>
                      </Link>
                    </div>
                  );
                } else if (paragraph.trim() === '---') {
                  elements.push(<hr key={index} className="my-8 border-gray-300" />);
                } else {
                  let formattedText = paragraph;
                  formattedText = formattedText.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold">$1</strong>');
                  formattedText = formattedText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-violet-600 hover:text-violet-700 underline">$1</a>');
                  elements.push(
                    <p key={index} className="text-gray-700 leading-relaxed my-4 text-lg" dangerouslySetInnerHTML={{ __html: formattedText }} />
                  );
                }

                // Inject in-content AdSense every ~800 words when total > 2000, max 5 units
                if (injectInlineCTA && adCount < 5 && wordCount > 2000) {
                  const wordsPerParagraph = wordCount / paragraphs.length;
                  const paragraphsPerAd = Math.max(1, Math.floor(800 / wordsPerParagraph));
                  if ((index + 1) % paragraphsPerAd === 0) {
                    elements.push(
                      <div key={`ad-inline-${index}`} className="my-6">
                        <AdSense slot="2847291650" format="auto" responsive="true" />
                      </div>
                    );
                    adCount++;
                  }
                }
              });

              return elements;
            })()}
          </div>

          {/* Ad - Middle of Article */}
          <div className="my-6">
            <AdSense slot="2847291650" format="auto" responsive="true" />
          </div>

          {/* FOMO inline CTA */}
          <div className="my-8 p-5 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl text-white text-center">
            <Flame className="w-6 h-6 mx-auto mb-1 text-yellow-300 animate-pulse" />
            <div className="font-black text-lg mb-1">🔥 5% OFF — Special Offer</div>
            <div className="text-white/80 text-sm mb-3">₹1999/yr → ₹1899/yr • Save ₹100</div>
            <Link to="/login"><button className="bg-white text-orange-600 font-black px-6 py-2 rounded-full text-sm hover:bg-yellow-50 transition-all">Claim 5% OFF Now →</button></Link>
          </div>

          <AppDownloadBanner targetMarket={newBlogPost.targetMarket || ['India']} />

          {/* CTA */}
          <div className="mt-10 p-8 bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl text-white text-center">
            <h3 className="text-2xl font-bold mb-3">Ready to Get Started?</h3>
            <p className="text-base mb-5 opacity-90">Start your 7-day free trial today. No credit card required.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" className="bg-white text-violet-600 hover:bg-gray-100 h-11 px-6" onClick={() => navigate('/login')}>
                Start Free Trial
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 h-11 px-6" onClick={() => navigate('/login')}>
                🔥 Get 5% OFF — ₹1899/yr
              </Button>
            </div>
          </div>

          {/* Ad - Bottom of Article */}
          <div className="mt-6">
            <AdSense slot="3958402761" format="auto" responsive="true" />
          </div>

          <LeadCaptureForm />
          <RelatedArticles
            posts={publishedPosts.length > 0 ? publishedPosts : blogPostsData}
            currentSlug={slug}
            targetMarket={newBlogPost.targetMarket || ['India']}
            category={newBlogPost.category}
          />

          {/* Final ad */}
          <div className="mt-6">
            <AdSense slot="1635338536" format="auto" responsive="true" />
          </div>
        </article>

        {/* Sidebar */}
        <ArticleSidebar timeLeft={timeLeft} relatedPosts={blogPostsData.filter(p => p.featured && p.slug !== slug).slice(0, 4)} />
        </div>
        </div>
        </div>
        <TimedPopup />
        <StickyMobileCTA />
      </>
    );
  }

  const blogContent = {
    'restaurant-billing-software-guide-2025': {
      title: 'Complete Guide to Restaurant Billing Software in 2025',
      author: 'BillByteKOT Team',
      date: '2025-12-01',
      readTime: '8 min read',
      category: 'Guide',
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200',
      content: `
# Complete Guide to Restaurant Billing Software in 2025

Running a restaurant in 2025 requires more than just great food and service. You need the right technology to manage orders, billing, inventory, and customer relationships efficiently. This comprehensive guide will help you choose the perfect billing software for your restaurant.

## What is Restaurant Billing Software?

Restaurant billing software is a digital solution that automates the entire billing process, from order taking to payment processing. Modern systems integrate with kitchen displays (KOT), inventory management, customer databases, and analytics dashboards.

## Key Features to Look For

### 1. **Multi-Platform Support**
Your billing software should work seamlessly across:
- Desktop computers (Windows, Mac, Linux)
- Tablets and iPads
- Mobile phones (Android, iOS)
- Web browsers

**Why it matters**: Staff can take orders from anywhere in the restaurant, reducing wait times and improving service quality.

### 2. **KOT (Kitchen Order Ticket) System**
A proper KOT system sends orders directly to the kitchen with:
- Item details and modifications
- Table numbers and timing
- Priority indicators
- Real-time status updates

**Impact**: Reduces order errors by 80% and speeds up kitchen operations by 40%.

### 3. **Thermal Printer Integration**
Professional thermal printing with:
- Multiple receipt themes (Classic, Modern, Elegant, Minimal)
- ESC/POS standard support (58mm & 80mm)
- Logo and branding customization
- QR codes for digital receipts

**Cost savings**: Thermal printers are 70% cheaper to operate than inkjet printers.

### 4. **Payment Integration**
Support for multiple payment methods:
- Cash
- Credit/Debit cards
- UPI (PhonePe, Google Pay, Paytm)
- Razorpay integration
- Split bills
- Tips management

**Customer satisfaction**: 95% of customers prefer having multiple payment options.

### 5. **Inventory Management**
Track stock levels automatically:
- Real-time inventory updates
- Low-stock alerts
- Supplier management
- Waste tracking
- Auto-deduction on sales

**ROI**: Reduces food waste by 30% and prevents stockouts.

### 6. **Staff Management**
Role-based access control:
- Admin (full access)
- Cashier (billing only)
- Waiter (orders & tables)
- Kitchen (KOT view)

**Security**: Prevents unauthorized access and tracks individual performance.

### 7. **Analytics & Reports**
Comprehensive reporting:
- Daily/monthly sales
- Top-selling items
- Revenue trends
- Tax summaries
- Customer insights
- Export to CSV/PDF

**Business growth**: Data-driven decisions increase revenue by 25%.

## Top Restaurant Billing Software in India (2025)

### 1. **BillByteKOT AI** ⭐ Best Overall
**Pricing**: ₹999/year
**Free Trial**: 7 days full access

**Pros**:
- AI-powered recommendations
- 6 thermal printer themes
- Multi-currency support (10+ currencies)
- WhatsApp integration
- Offline mode (desktop app)
- Priority 24/7 support
- Unlimited bills

**Cons**:
- Newer in market (but growing fast)

**Best for**: Small to medium restaurants, cafes, cloud kitchens

### 2. **Petpooja**
**Pricing**: ₹999/month
**Pros**: Established brand, good support
**Cons**: Expensive, limited customization

### 3. **Posist**
**Pricing**: ₹1,500/month
**Pros**: Enterprise features
**Cons**: High cost, complex setup

### 4. **Gofrugal**
**Pricing**: ₹800/month
**Pros**: Retail + restaurant
**Cons**: Cluttered interface

### 5. **Lightspeed**
**Pricing**: $69/month (₹5,700)
**Pros**: International features
**Cons**: Very expensive, USD pricing

## How to Choose the Right Software

### Step 1: Assess Your Needs
- Restaurant size (tables, daily orders)
- Budget (monthly/yearly)
- Required features
- Staff technical skills
- Growth plans

### Step 2: Try Free Trials
Most software offers 7-14 day trials. Test:
- Ease of use
- Speed and performance
- Customer support response
- Mobile app quality
- Printer compatibility

### Step 3: Check Integration
Ensure compatibility with:
- Your thermal printer
- Payment gateway
- Accounting software
- Delivery platforms (Swiggy, Zomato)

### Step 4: Calculate Total Cost
Consider:
- Software subscription
- Hardware (printer, tablet)
- Training time
- Payment gateway fees
- Support costs

### Step 5: Read Reviews
Check:
- Google reviews
- Social media feedback
- Restaurant owner forums
- Case studies

## Implementation Best Practices

### Week 1: Setup
- Install software on all devices
- Configure business settings
- Add menu items with prices
- Setup tables and sections
- Create staff accounts

### Week 2: Training
- Train admin on full features
- Train cashiers on billing
- Train waiters on order taking
- Train kitchen on KOT system
- Practice with test orders

### Week 3: Soft Launch
- Run parallel with old system
- Process real orders
- Identify issues
- Gather staff feedback
- Make adjustments

### Week 4: Full Launch
- Switch completely to new system
- Monitor performance
- Optimize workflows
- Celebrate success!

## Common Mistakes to Avoid

### 1. **Choosing Based on Price Alone**
Cheapest isn't always best. Consider:
- Features you actually need
- Support quality
- Long-term costs
- Scalability

### 2. **Skipping Training**
Proper training is crucial:
- Reduces errors
- Increases efficiency
- Improves staff confidence
- Maximizes ROI

### 3. **Not Testing Printers**
Always test thermal printer compatibility before committing. Request a demo or trial period.

### 4. **Ignoring Mobile Support**
In 2025, mobile-first is essential. Your staff should be able to take orders on tablets or phones.

### 5. **Overlooking Support**
24/7 support is critical for restaurants. A system crash during dinner rush can cost thousands.

## Future Trends (2025-2026)

### 1. **AI-Powered Insights**
- Predictive inventory
- Dynamic pricing
- Customer preference learning
- Automated marketing

### 2. **Voice Ordering**
- Voice-to-order conversion
- Multi-language support
- Hands-free operation

### 3. **Blockchain Payments**
- Cryptocurrency acceptance
- Instant settlements
- Lower transaction fees

### 4. **AR Menu Displays**
- 3D food visualization
- Interactive menus
- Virtual table previews

### 5. **Sustainability Tracking**
- Carbon footprint monitoring
- Waste reduction analytics
- Eco-friendly reporting

## ROI Calculator

**Example: 50-table restaurant**

**Before BillByteKOT**:
- Manual billing: 5 min/order
- Order errors: 10%
- Inventory waste: 20%
- Monthly cost: ₹0 (but hidden costs)

**After BillByteKOT**:
- Digital billing: 1 min/order
- Order errors: 1%
- Inventory waste: 5%
- Monthly cost: ₹83 (₹999/year)

**Savings**:
- Time saved: 200 hours/month
- Error reduction: ₹15,000/month
- Waste reduction: ₹25,000/month
- **Total savings: ₹40,000/month**

**ROI**: 9,500% in first year!

## Conclusion

Choosing the right restaurant billing software in 2025 is crucial for success. Look for:
- ✅ Multi-platform support
- ✅ KOT system integration
- ✅ Thermal printer compatibility
- ✅ Multiple payment options
- ✅ Inventory management
- ✅ Staff role management
- ✅ Comprehensive analytics
- ✅ Affordable pricing
- ✅ Excellent support

**Our Recommendation**: BillByteKOT AI offers the best value with AI-powered features, unlimited bills, and just ₹999/year. Try the 7-day free trial risk-free!

## Ready to Transform Your Restaurant?

Start your free trial today and experience the difference modern billing software can make. No credit card required!

[Start Free Trial →](/login)

---

**Need Help Choosing?** Contact our restaurant technology experts for a free consultation. We'll help you find the perfect solution for your specific needs.

📧 Email: support@billbytekot.in  
📞 Phone: +91-9353685739  
💬 Live Chat: Available 24/7
      `
    },
    'kot-system-benefits-restaurants': {
      title: 'What is KOT System? Benefits for Your Restaurant',
      author: 'Restaurant Expert',
      date: '2025-11-28',
      readTime: '6 min read',
      category: 'KOT System',
      image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200',
      content: `
# What is KOT System? Benefits for Your Restaurant

If you've ever wondered how busy restaurants manage to serve hundreds of customers without mixing up orders, the answer is KOT - Kitchen Order Ticket system. This guide explains everything you need to know about KOT systems and why they're essential for modern restaurants.

## What is KOT (Kitchen Order Ticket)?

KOT is a digital or printed ticket that communicates customer orders from the front-of-house (waiters/cashiers) to the back-of-house (kitchen staff). It's the bridge between your dining area and kitchen.

### Traditional vs Digital KOT

**Traditional (Paper-based)**:
- Handwritten order slips
- Prone to errors
- Slow communication
- Hard to track
- No analytics

**Digital KOT**:
- Instant electronic transmission
- Clear, printed orders
- Real-time status updates
- Complete order history
- Performance analytics

## How KOT System Works

### Step 1: Order Taking
Waiter takes customer order on:
- Tablet or mobile app
- POS terminal
- Handheld device

### Step 2: Order Transmission
Order instantly sent to:
- Kitchen display screen (KDS)
- Kitchen printer
- Chef's mobile device

### Step 3: Kitchen Preparation
Kitchen staff:
- Receives clear order details
- Marks items as "preparing"
- Updates status to "ready"
- Notifies waiter

### Step 4: Order Delivery
Waiter:
- Gets notification
- Picks up prepared items
- Serves customer
- Marks order as "completed"

## Key Benefits of KOT System

### 1. **Eliminates Order Errors** (80% Reduction)

**Common errors eliminated**:
- Misread handwriting
- Missing items
- Wrong table numbers
- Incorrect modifications
- Duplicate orders

**Real example**: A 100-seat restaurant reduced order remakes from 15/day to 3/day, saving ₹30,000/month.

### 2. **Faster Service** (40% Speed Increase)

**Time savings**:
- No walking to kitchen: 2 min/order
- Instant order receipt: 30 sec/order
- Clear communication: 1 min/order
- **Total**: 3.5 min saved per order

**Impact**: Serve 30% more customers during peak hours.

### 3. **Better Kitchen Organization**

**Features**:
- Orders displayed by priority
- Color-coded by timing
- Grouped by station (grill, fryer, etc.)
- Alerts for delayed orders

**Result**: Kitchen operates like a well-oiled machine.

### 4. **Improved Customer Satisfaction**

**Customer benefits**:
- Faster service
- Accurate orders
- Real-time order tracking
- Transparent wait times

**Stats**: 95% customer satisfaction vs 75% without KOT.

### 5. **Complete Order Tracking**

**Track everything**:
- Order placement time
- Preparation start time
- Cooking duration
- Delivery time
- Total service time

**Use case**: Identify bottlenecks and optimize operations.

### 6. **Staff Accountability**

**Monitor**:
- Who took the order
- When it was sent to kitchen
- Preparation time by chef
- Delivery time by waiter

**Benefit**: Identify top performers and training needs.

### 7. **Inventory Integration**

**Automatic updates**:
- Deduct ingredients on order
- Track usage patterns
- Predict stock needs
- Prevent over-ordering

**Savings**: 25% reduction in food waste.

### 8. **Multi-Location Support**

**For chains**:
- Centralized menu management
- Consistent order format
- Cross-location analytics
- Standardized operations

### 9. **Customer Preferences**

**Remember**:
- Dietary restrictions
- Spice levels
- Allergies
- Favorite dishes

**Loyalty**: Personalized service increases repeat visits by 40%.

### 10. **Analytics & Insights**

**Reports**:
- Peak hours analysis
- Popular items
- Average preparation time
- Kitchen efficiency
- Waiter performance

**Growth**: Data-driven decisions boost revenue by 30%.

## Types of KOT Systems

### 1. **Printer-Based KOT**
- Prints physical tickets
- Best for: Traditional kitchens
- Cost: ₹5,000-15,000
- Pros: Simple, reliable
- Cons: Paper costs, no real-time updates

### 2. **Kitchen Display System (KDS)**
- Digital screens in kitchen
- Best for: Modern restaurants
- Cost: ₹20,000-50,000
- Pros: Eco-friendly, real-time
- Cons: Higher initial cost

### 3. **Hybrid System**
- Both printer and display
- Best for: Large restaurants
- Cost: ₹25,000-60,000
- Pros: Redundancy, flexibility
- Cons: Most expensive

### 4. **Mobile KOT**
- Orders on chef's tablet/phone
- Best for: Cloud kitchens
- Cost: ₹0 (use existing devices)
- Pros: Cheapest, portable
- Cons: Screen size limitations

## KOT Best Practices

### 1. **Clear Order Format**
Include:
- Table number (large font)
- Order time
- Item name
- Quantity
- Modifications (highlighted)
- Allergies (red text)
- Priority level

### 2. **Color Coding**
- 🟢 Green: New order
- 🟡 Yellow: Preparing
- 🔴 Red: Delayed (>15 min)
- ⚫ Black: Completed

### 3. **Sound Alerts**
- Beep for new orders
- Different tones for priority
- Alarm for delayed orders

### 4. **Order Grouping**
Group by:
- Station (grill, fryer, salad)
- Course (appetizer, main, dessert)
- Table (for multi-item orders)

### 5. **Modification Highlighting**
Make special requests stand out:
- **BOLD** for important notes
- RED for allergies
- CAPS for urgent items

## Common KOT Mistakes to Avoid

### 1. **Too Much Information**
❌ Don't include:
- Customer names
- Payment details
- Waiter notes
- Unnecessary details

✅ Keep it simple:
- Table number
- Items
- Modifications
- Timing

### 2. **Poor Printer Placement**
❌ Bad locations:
- Far from cooking stations
- Near water/heat
- In high-traffic areas

✅ Good locations:
- Central kitchen position
- Protected from splashes
- Easy access for all chefs

### 3. **No Backup System**
Always have:
- Backup printer
- Manual order pads
- Alternative communication method

### 4. **Ignoring Training**
Train staff on:
- How to send KOT
- Reading KOT format
- Updating order status
- Handling errors

### 5. **Not Reviewing Analytics**
Weekly review:
- Average preparation time
- Error rates
- Peak hour performance
- Staff efficiency

## KOT System Pricing

### Budget Option (₹5,000-10,000)
- Basic thermal printer
- Simple software
- Manual status updates
- Best for: Small cafes

### Mid-Range (₹15,000-30,000)
- Quality thermal printer
- Digital KOT software
- Real-time updates
- Basic analytics
- Best for: Medium restaurants

### Premium (₹40,000-80,000)
- Kitchen display screens
- Advanced software
- AI-powered insights
- Multi-location support
- Best for: Large chains

### BillByteKOT Solution (₹999/year)
- Software included
- Works with any ESC/POS printer
- Real-time KOT system
- Complete analytics
- Unlimited orders
- **Best value for money!**

## ROI of KOT System

**Example: 40-table restaurant**

**Investment**:
- Thermal printer: ₹8,000
- BillByteKOT software: ₹999/year
- **Total**: ₹8,999

**Monthly Savings**:
- Reduced errors: ₹12,000
- Faster service (more tables): ₹20,000
- Less food waste: ₹8,000
- **Total**: ₹40,000/month

**Payback Period**: 6 days!
**Annual ROI**: 5,600%

## Success Stories

### Case Study 1: Mumbai Cafe
**Before KOT**:
- 15 order errors/day
- 45 min average service time
- 80% customer satisfaction

**After KOT**:
- 2 order errors/day
- 25 min average service time
- 96% customer satisfaction

**Result**: 40% revenue increase in 3 months

### Case Study 2: Bangalore Cloud Kitchen
**Before KOT**:
- Manual order management
- 20% wrong deliveries
- Stressed kitchen staff

**After KOT**:
- Automated order flow
- 2% wrong deliveries
- Happy, efficient team

**Result**: Expanded from 1 to 3 locations in 6 months

## Conclusion

KOT system is no longer optional for restaurants in 2025. It's essential for:
- ✅ Reducing order errors
- ✅ Faster service
- ✅ Better kitchen organization
- ✅ Improved customer satisfaction
- ✅ Complete order tracking
- ✅ Staff accountability
- ✅ Data-driven decisions

**Investment**: As low as ₹8,499
**ROI**: 5,600% annually
**Payback**: Less than a week

## Get Started with KOT Today

BillByteKOT offers a complete KOT solution for just ₹999/year:
- Real-time order transmission
- Kitchen display & printer support
- Order status tracking
- Performance analytics
- 7-day free trial

[Start Free Trial →](/login)

---

**Questions about KOT?** Our restaurant technology experts are here to help!

📧 support@billbytekot.in  
📞 +91-9353685739  
💬 Live chat available 24/7
      `
    }
  };

  const post = blogContent[slug];

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Blog Post Not Found</h1>
          <Button onClick={() => navigate('/blog')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blog
          </Button>
        </div>
      </div>
    );
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post.title,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* SEO Meta Tags for Legacy Blog Posts */}
      <Helmet>
        <title>{post.title} | BillByteKOT Blog</title>
        <meta name="description" content={post.content?.substring(0, 160) || post.title} />
        <meta name="keywords" content={`${post.category}, restaurant billing, KOT system, BillByteKOT`} />
        <link rel="canonical" href={`https://billbytekot.in/blog/${slug}`} />
        
        {/* Open Graph */}
        <meta property="og:title" content={`${post.title} | BillByteKOT`} />
        <meta property="og:description" content={post.content?.substring(0, 160) || post.title} />
        <meta property="og:image" content={post.image} />
        <meta property="og:url" content={`https://billbytekot.in/blog/${slug}`} />
        <meta property="og:type" content="article" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.content?.substring(0, 160) || post.title} />
        <meta name="twitter:image" content={post.image} />
        
        {/* Article specific */}
        <meta property="article:published_time" content={post.date} />
        <meta property="article:author" content={typeof post.author === 'string' ? post.author : post.author?.name || 'BillByteKOT Team'} />
        <meta property="article:section" content={post.category} />
      </Helmet>
      
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                BillByteKOT
              </span>
            </Link>
            <Button onClick={() => navigate('/blog')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              All Posts
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Image */}
      <div className="relative h-96 overflow-hidden">
        <img
          src={post.image}
          alt={post.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="container mx-auto">
            <span className="bg-violet-600 text-white px-4 py-2 rounded-full text-sm font-medium">
              {post.category}
            </span>
          </div>
        </div>
      </div>

      {/* Article Content */}
      <article className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-6 text-gray-600 mb-8">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5" />
            <span>{typeof post.author === 'string' ? post.author : post.author?.name || 'BillByteKOT Team'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            <span>{new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <span>{post.readTime}</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold mb-8 leading-tight">
          {post.title}
        </h1>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-12">
          <Button onClick={handleShare} variant="outline">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button variant="outline">
            <BookmarkPlus className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>

        {/* Content */}
        <div className="prose prose-lg max-w-none">
          {post.content.split('\n\n').map((paragraph, index) => {
            // Skip empty paragraphs
            if (!paragraph.trim()) return null;
            
            // Headers
            if (paragraph.startsWith('# ')) {
              return <h1 key={index} className="text-4xl font-bold mt-12 mb-6 text-gray-900">{paragraph.substring(2)}</h1>;
            } else if (paragraph.startsWith('## ')) {
              return <h2 key={index} className="text-3xl font-bold mt-10 mb-4 text-gray-900">{paragraph.substring(3)}</h2>;
            } else if (paragraph.startsWith('### ')) {
              return <h3 key={index} className="text-2xl font-bold mt-8 mb-3 text-gray-900">{paragraph.substring(4)}</h3>;
            }
            
            // Bold paragraphs
            if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
              return <p key={index} className="font-bold text-lg my-4 text-gray-900">{paragraph.slice(2, -2)}</p>;
            }
            
            // Lists
            if (paragraph.includes('\n- ') || paragraph.startsWith('- ')) {
              const items = paragraph.split('\n').filter(line => line.trim().startsWith('- '));
              return (
                <ul key={index} className="list-disc ml-6 my-4 space-y-2">
                  {items.map((item, i) => (
                    <li key={i} className="text-gray-700">{item.substring(2)}</li>
                  ))}
                </ul>
              );
            }
            
            // Links/Buttons
            const linkMatch = paragraph.match(/\[([^\]]+)\]\(([^)]+)\)/);
            if (linkMatch) {
              return (
                <div key={index} className="my-6">
                  <Link to={linkMatch[2]}>
                    <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700">
                      {linkMatch[1]}
                    </Button>
                  </Link>
                </div>
              );
            }
            
            // Horizontal rule
            if (paragraph.trim() === '---') {
              return <hr key={index} className="my-8 border-gray-300" />;
            }
            
            // Regular paragraph with inline formatting
            let formattedText = paragraph;
            
            // Handle bold text
            formattedText = formattedText.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold">$1</strong>');
            
            // Handle links
            formattedText = formattedText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-violet-600 hover:text-violet-700 underline">$1</a>');
            
            return (
              <p 
                key={index} 
                className="text-gray-700 leading-relaxed my-4 text-lg"
                dangerouslySetInnerHTML={{ __html: formattedText }}
              />
            );
          })}
        </div>

        {/* CTA Card */}
        <Card className="mt-16 bg-gradient-to-r from-violet-600 to-purple-600 text-white border-0">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold mb-4">Ready to Transform Your Restaurant?</h3>
            <p className="text-white/90 mb-6">
              Start your 7-day free trial of BillByteKOT today. No credit card required.
            </p>
            <Link to="/login">
              <Button size="lg" className="bg-white text-violet-600 hover:bg-gray-100">
                Start Free Trial
              </Button>
            </Link>
          </CardContent>
        </Card>
      </article>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-20">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">© 2025 BillByteKOT by BillByte Innovations. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default BlogPostPage;

