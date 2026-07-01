import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * AdSense component — production-safe.
 *
 * Fixes for "ads not generating revenue":
 *  - AdSense verification meta + <script async> are now injected in public/index.html (loaded early).
 *  - We only push({}) ONCE per <ins> element (guarded via data-adsbygoogle-status + ref flag)
 *    to avoid the "adsbygoogle.push() error: All ins elements in the DOM with class=adsbygoogle
 *    already have ads in them" warning that suppresses further ad requests on the page.
 *  - We wait for window.adsbygoogle to be defined (script parsed) before pushing.
 *  - Fallback CTA renders only if the script truly failed to load (adblocker / offline).
 */

const ADSENSE_CLIENT = 'ca-pub-3519568544880293';

const AdSense = ({
  slot,
  format = 'auto',
  responsive = 'true',
  style = { display: 'block' },
  className = '',
  adFormat = 'auto', // kept for backward compatibility with existing call-sites
}) => {
  const location = useLocation();
  const isBlogPage = location.pathname.startsWith('/blog');
  const insRef = useRef(null);
  const pushedRef = useRef(false);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    if (!isBlogPage) return;
    if (process.env.NODE_ENV !== 'production') return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 30; // 3 seconds @ 100ms

    const tryPush = () => {
      if (cancelled || pushedRef.current) return;

      // Confirm the <ins> is in DOM and not already filled by AdSense.
      const el = insRef.current;
      if (!el) return;
      if (el.getAttribute('data-adsbygoogle-status')) {
        // Already processed by AdSense — don't push again.
        pushedRef.current = true;
        return;
      }

      if (typeof window === 'undefined') return;

      if (typeof window.adsbygoogle === 'undefined') {
        // Script hasn't parsed yet — retry.
        attempts += 1;
        if (attempts >= maxAttempts) {
          setShowFallback(true);
          return;
        }
        setTimeout(tryPush, 100);
        return;
      }

      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        pushedRef.current = true;
      } catch (err) {
        // Common cause: element already has an ad. Safe to ignore.
        pushedRef.current = true;
      }
    };

    // Start on next tick so React has committed the <ins> element.
    const t = setTimeout(tryPush, 50);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [isBlogPage, slot]);

  if (!isBlogPage) return null;

  // Dev: show placeholder so layout is visible without loading real ads.
  if (process.env.NODE_ENV !== 'production') {
    return (
      <div
        className={`bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center ${className}`}
      >
        <p className="text-gray-500 font-medium">Ad placeholder (blog only)</p>
        <p className="text-xs text-gray-400 mt-1">slot: {slot}</p>
      </div>
    );
  }

  // Fallback CTA (only when script truly fails).
  if (showFallback) {
    return (
      <div className={`w-full my-6 ${className}`}>
        <a
          href="/login"
          className="block bg-gradient-to-r from-violet-600 to-purple-600 text-white text-center py-4 px-6 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all"
        >
          🚀 Start Free 7-Day Trial — Restaurant Billing Software
        </a>
      </div>
    );
  }

  return (
    <ins
      ref={insRef}
      className={`adsbygoogle ${className}`}
      style={style}
      data-ad-client={ADSENSE_CLIENT}
      data-ad-slot={slot}
      data-ad-format={adFormat || format}
      data-full-width-responsive={responsive}
    />
  );
};

export default AdSense;
