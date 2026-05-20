/* Analytics helper for Insights page
   - Place your GA4 Measurement ID in a meta tag: <meta name="ga-id" content="G-XXXX" />
   - If GA is configured, events are sent via gtag; otherwise clicks are stored in localStorage
   - Run `exportInsightsClicks()` in the console to download collected events
*/
(function(){
  'use strict';
  const meta = document.querySelector('meta[name="ga-id"]');
  const gaId = meta ? meta.content.trim() : '';

  if (gaId && gaId !== 'G-XXXXXXXXXX') {
    // load GA4
    (function(){
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);} window.gtag = gtag;
      const s = document.createElement('script');
      s.async = true;
      s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(gaId);
      document.head.appendChild(s);
      gtag('js', new Date());
      gtag('config', gaId);
    })();
  }

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
