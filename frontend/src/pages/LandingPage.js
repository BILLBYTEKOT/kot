import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "../App";
import { HomepageSEO, FAQPageSchemaInjector } from "../seo";
import { Button } from "../components/ui/button";
import { ArrowRight, BarChart3, Check, ChevronDown, Globe2, Menu, Package, ShieldCheck, Sparkles, Utensils, X, Zap } from "lucide-react";

const markets = {
  IN: { name: "India", currency: "INR", symbol: "₹", price: 4999, note: "Billed yearly · GST applicable" },
  US: { name: "United States", currency: "USD", symbol: "$", price: 69, note: "Billed yearly · international card checkout" },
  GB: { name: "United Kingdom", currency: "GBP", symbol: "£", price: 55, note: "Billed yearly · international card checkout" },
  AE: { name: "United Arab Emirates", currency: "AED", symbol: "د.إ", price: 249, note: "Billed yearly · international card checkout" },
  OTHER: { name: "Your region", currency: "USD", symbol: "$", price: 69, note: "Billed yearly · final currency confirmed at checkout" },
};

const features = [
  { icon: Utensils, title: "Built for service", text: "Fast billing, KOT, tables, modifiers, and split payments in one calm workspace." },
  { icon: Package, title: "Know your stock", text: "Ingredient-level inventory, low-stock alerts, and purchase tracking without spreadsheets." },
  { icon: BarChart3, title: "Run with clarity", text: "Live sales, staff, expenses, and branch reporting your whole team can understand." },
];

const faqs = [
  ["Can I try BillByteKOT before paying?", "Yes. Create an account to explore the product and set up your restaurant before choosing a plan."],
  ["Does it work outside India?", "Yes. The product is available internationally. India pricing stays in INR; other markets are shown in a local or USD reference currency."],
  ["How does Razorpay checkout work internationally?", "Razorpay is retained for the existing checkout flow. Availability of non-INR payment methods depends on your Razorpay account, enabled currencies, and supported customer country. The final payable currency is always confirmed by checkout."],
  ["Can I use my own Razorpay account?", "Yes. Restaurant owners can configure their own Razorpay keys in Settings so payments settle directly to their account."],
];

function track(event, detail = {}) {
  window.dispatchEvent(new CustomEvent("billbytekot:marketing", { detail: { event, ...detail } }));
  if (window.gtag) window.gtag("event", event, detail);
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [country, setCountry] = useState(() => window.localStorage.getItem("billbytekot_market") || "IN");
  const [pricing, setPricing] = useState(null);
  const [openFaq, setOpenFaq] = useState(0);
  const market = markets[country] || markets.OTHER;

  useEffect(() => {
    window.localStorage.setItem("billbytekot_market", country);
    track("market_selected", { country, currency: market.currency });
    axios.get(`${API}/public/pricing`, { params: { country, currency: market.currency } }).then(({ data }) => setPricing(data)).catch(() => {});
  }, [country, market.currency]);

  const displayedPrice = pricing?.annual_price || market.price;
  const currency = pricing?.currency || market.currency;
  const symbol = pricing?.symbol || market.symbol;
  const choosePlan = (placement) => { track("cta_clicked", { placement, country, currency }); navigate("/login"); };
  const priceLabel = useMemo(() => `${symbol}${Number(displayedPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, [displayedPrice, symbol]);

  return <div className="bbk-site">
    <HomepageSEO />
    <FAQPageSchemaInjector faqs={faqs.map(([question, answer]) => ({ question, answer }))} />
    <header className="bbk-nav">
      <a className="bbk-brand" href="#top" aria-label="BillByteKOT home"><span className="bbk-brand-mark"><Utensils size={17} /></span><span>BillByte<span>KOT</span></span></a>
      <nav className={`bbk-links ${menuOpen ? "is-open" : ""}`} aria-label="Main navigation">
        <a href="#product" onClick={() => setMenuOpen(false)}>Product</a><a href="#pricing" onClick={() => setMenuOpen(false)}>Pricing</a><a href="#faq" onClick={() => setMenuOpen(false)}>FAQ</a><a href="/blog">Resources</a>
        <Button variant="outline" onClick={() => navigate("/login")}>Log in</Button><Button onClick={() => choosePlan("nav")}>Start free <ArrowRight size={16} /></Button>
      </nav>
      <button className="bbk-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Close menu" : "Open menu"}>{menuOpen ? <X /> : <Menu />}</button>
    </header>

    <main id="top">
      <section className="bbk-hero bbk-container">
        <div className="bbk-hero-copy"><div className="bbk-eyebrow"><span className="bbk-live-dot" /> The operating system for modern restaurants</div><h1>More time serving.<br /><em>Less time managing.</em></h1><p>BillByteKOT brings billing, kitchen operations, inventory, and insight into one beautifully simple POS built for ambitious restaurants.</p><div className="bbk-actions"><Button size="lg" onClick={() => choosePlan("hero")}>Start your free setup <ArrowRight size={17} /></Button><a className="bbk-text-link" href="#product">See how it works <ArrowRight size={15} /></a></div><div className="bbk-proof"><div className="bbk-avatars"><span>AK</span><span>RM</span><span>PS</span><span>+</span></div><span>Trusted by growing restaurants<br /><strong>across 12+ countries</strong></span></div></div>
        <div className="bbk-dashboard" aria-label="BillByteKOT dashboard preview"><div className="bbk-window-top"><span /><span /><span /><small>Today · Tuesday, 28 Aug</small></div><div className="bbk-window-body"><aside><div className="bbk-mini-logo"><Utensils size={14} /></div>{[BarChart3, Utensils, Package, ShieldCheck].map((Icon, i) => <div className={`bbk-side-icon ${i === 0 ? "active" : ""}`} key={i}><Icon size={15} /></div>)}</aside><div className="bbk-dash-main"><div className="bbk-dash-heading"><div><small>GOOD MORNING, ALEX</small><h3>Your restaurant at a glance</h3></div><span className="bbk-status"><span /> Live</span></div><div className="bbk-stat-grid"><div><small>Today&apos;s sales</small><strong>₹48,290</strong><span className="up">↗ 18.4%</span></div><div><small>Orders</small><strong>186</strong><span className="up">↗ 12.2%</span></div><div><small>Avg. order value</small><strong>₹1,204</strong><span className="neutral">Today</span></div></div><div className="bbk-chart"><div className="bbk-chart-label"><span>Sales overview</span><strong>₹1,84,620 <small>this week</small></strong></div><div className="bbk-bars">{[35,48,42,65,56,82,73,94,76,88,100,91].map((h, i) => <i style={{ height: `${h}%` }} key={i} />)}</div><div className="bbk-days"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div></div></div></div></div>
      </section>

      <section className="bbk-trust"><div className="bbk-container"><span>One system. Every service.</span><div><b>POS</b><b>QROrdering</b><b>Inventory</b><b>Reports</b><b>Multi-location</b></div></div></section>
      <section id="product" className="bbk-section bbk-container"><div className="bbk-section-intro"><div className="bbk-eyebrow">A better way to run service</div><h2>Everything your restaurant needs.<br /><em>Nothing it doesn&apos;t.</em></h2><p>Designed around the pace of a real shift. Every screen is intentional, every workflow gets out of your way.</p></div><div className="bbk-feature-grid">{features.map(({ icon: Icon, title, text }) => <article className="bbk-feature" key={title}><span className="bbk-feature-icon"><Icon size={20} /></span><h3>{title}</h3><p>{text}</p><a href="#pricing">Explore feature <ArrowRight size={14} /></a></article>)}</div></section>
      <section className="bbk-quote"><div className="bbk-container"><div className="bbk-quote-mark">“</div><blockquote>We stopped stitching five tools together. Now the team sees the same picture, from the first order to the end-of-day report.</blockquote><div className="bbk-quote-author"><span>NP</span><div><strong>Neha Patel</strong><small>Founder, The Curry Room · Dubai</small></div></div></div></section>
      <section id="pricing" className="bbk-section bbk-container bbk-pricing-section"><div className="bbk-section-intro"><div className="bbk-eyebrow">Simple, transparent pricing</div><h2>One plan to run<br /><em>the whole restaurant.</em></h2><p>Start with a free setup. Upgrade when your team is ready. No surprise feature gates.</p></div><div className="bbk-market-row"><Globe2 size={17} /><label htmlFor="market">Showing pricing for</label><select id="market" value={country} onChange={(e) => setCountry(e.target.value)}>{Object.entries(markets).map(([key, value]) => <option value={key} key={key}>{value.name} · {value.currency}</option>)}</select><span className="bbk-market-note">{market.note}</span></div><div className="bbk-price-card"><div><span className="bbk-plan-tag">GROWTH</span><h3>Everything you need to grow with confidence.</h3><ul>{["Unlimited orders & billing", "Kitchen display & KOT", "Inventory & purchase management", "Reports, expenses & staff", "QR ordering included", "Email and WhatsApp support"].map((item) => <li key={item}><Check size={16} />{item}</li>)}</ul></div><div className="bbk-price"><small>Starting at</small><strong>{priceLabel}</strong><span>/ year · {currency}</span><Button size="lg" onClick={() => choosePlan("pricing")}>Start free setup <ArrowRight size={16} /></Button><small>No credit card required to begin</small></div></div></section>
      <section id="faq" className="bbk-section bbk-faq bbk-container"><div className="bbk-section-intro"><div className="bbk-eyebrow">Questions, answered</div><h2>Good to know.</h2></div><div>{faqs.map(([question, answer], i) => <div className={`bbk-faq-item ${openFaq === i ? "open" : ""}`} key={question}><button onClick={() => setOpenFaq(openFaq === i ? -1 : i)} aria-expanded={openFaq === i}><span>{question}</span><ChevronDown size={18} /></button>{openFaq === i && <p>{answer}</p>}</div>)}</div></section>
      <section className="bbk-cta"><div className="bbk-container"><Sparkles size={20} /><h2>Your best service starts here.</h2><p>Set up your restaurant on BillByteKOT and give your team room to do what they do best.</p><Button size="lg" onClick={() => choosePlan("footer")}>Start your free setup <ArrowRight size={17} /></Button></div></section>
    </main>
    <footer className="bbk-footer"><div className="bbk-container"><div className="bbk-footer-top"><a className="bbk-brand" href="#top"><span className="bbk-brand-mark"><Utensils size={17} /></span><span>BillByte<span>KOT</span></span></a><span>Restaurant operations, made human.</span><div><a href="/privacy">Privacy</a><a href="/contact">Contact</a><a href="/blog">Blog</a></div></div><div className="bbk-footer-bottom">© 2026 BillByteKOT. Built for restaurants everywhere.</div></div></footer>
  </div>;
}

export { track }; 
