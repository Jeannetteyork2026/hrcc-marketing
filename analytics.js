/* Analytics helper for Insights page
   - Place your GA4 Measurement ID in a meta tag: <meta name="ga-id" content="G-XXXX" />
   - If GA is configured, events are sent via gtag; otherwise clicks are stored in localStorage
   - Run `exportInsightsClicks()` in the console to download collected events
*/
(function(){
  'use strict';
  // GA4 is now loaded once from the inline tag in each page's <head>.
  // This file only adds custom click tracking, sent via the global gtag()
  // (with a localStorage fallback if gtag isn't present).

  function sendEvent(name, params){
    if (window.gtag) {
      try { window.gtag('event', name, params); } catch(e) { console.warn(e); }
    } else {
      try {
        const store = JSON.parse(localStorage.getItem('insights_clicks') || '[]');
        store.push({name, params, ts: new Date().toISOString()});
        localStorage.setItem('insights_clicks', JSON.stringify(store));
      } catch(e){ console.warn('analytics store failed', e); }
    }
  }

  document.addEventListener('click', function(ev){
    const a = ev.target.closest && ev.target.closest('a');
    if (!a) return;

    // share links use data-share attribute
    const sharePlatform = a.getAttribute('data-share');
    if (sharePlatform) {
      ev.preventDefault();
      const href = a.getAttribute('data-href') || a.href;
      const utm = `?utm_source=${encodeURIComponent(sharePlatform)}&utm_medium=social&utm_campaign=insights`;
      const shareUrl = href + (href.includes('?') ? '&' : '') + utm;
      // open share window for common platforms
      let url = shareUrl;
      if (sharePlatform === 'twitter') url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(document.title)}&url=${encodeURIComponent(shareUrl)}`;
      if (sharePlatform === 'linkedin') url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
      if (sharePlatform === 'facebook') url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
      window.open(url, '_blank', 'noopener');
      sendEvent('share', {platform: sharePlatform, href: shareUrl});
      return;
    }

    // track clicks from article cards or read-more links
    if (a.classList.contains('read-more') || a.closest('.article-card')){
      const card = a.closest('.article-card');
      const title = card ? (card.querySelector('h2')?.innerText || a.textContent) : a.textContent;
      sendEvent('insight_click', {title: title, href: a.href});
    }

    // track CTA / contact clicks
    if (a.classList.contains('nav-cta') || a.href.includes('/contact')){
      sendEvent('lead_click', {href: a.href});
    }
  }, false);

  // helper to export stored clicks
  window.exportInsightsClicks = function(){
    const data = localStorage.getItem('insights_clicks') || '[]';
    const blob = new Blob([data], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'insights_clicks.json'; a.click();
    URL.revokeObjectURL(url);
  };
})();
