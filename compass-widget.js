/**
 * HR Compliance Compass - Lead Capture Widget
 * 
 * WHAT THIS DOES:
 * 1. Silent tracking: Sends scroll depth, time on page, and engagement data to Google Analytics
 * 2. Opt-in bubble: Shows a subtle popup after 12 seconds offering the 50-State Reference Guide
 * 3. HubSpot integration: Sends name/email to HubSpot when someone opts in
 * 
 * HOW TO USE:
 * Add this line before </body> on any page:
 * <script src="compass-widget.js"></script>
 */

(function() {
  'use strict';

  // ========================================
  // CONFIGURATION - Edit these values
  // ========================================
  
  const CONFIG = {
    // HubSpot form settings (you'll get these after creating the form)
    hubspotPortalId: '245545744',        // Your HubSpot account ID
    hubspotFormId: '45673b82-c489-4ebd-a21d-ee835c9db653',  // 50-State Guide form
    
    // Timing
    bubbleDelaySeconds: 12,              // When to show the bubble (12 seconds)
    
    // Google Sheet link (what they'll receive via email)
    referenceGuideUrl: 'https://docs.google.com/spreadsheets/d/1nmUOgT3hJeDjxTEEj3gKVGDyh05Kcz3W/edit?usp=sharing&ouid=110147534613470286478&rtpof=true&sd=true',
    
    // How long to remember dismissed/submitted (in days)
    dismissRememberDays: 7,
    submitRememberDays: 365
  };


  // ========================================
  // PART 1: SILENT TRACKING (Always Running)
  // ========================================
  
  const Tracking = {
    startTime: Date.now(),
    maxScroll: 0,
    scrollMilestones: [25, 50, 75, 90, 100],
    milestonesReached: [],
    
    init: function() {
      // Track scroll depth
      window.addEventListener('scroll', this.trackScroll.bind(this), { passive: true });
      
      // Track time on page when leaving
      window.addEventListener('beforeunload', this.trackTimeOnPage.bind(this));
      
      // Track page visibility changes (tab switches)
      document.addEventListener('visibilitychange', this.trackVisibility.bind(this));
      
      // Track link clicks
      document.addEventListener('click', this.trackClicks.bind(this));
    },
    
    trackScroll: function() {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;
      
      this.maxScroll = Math.max(this.maxScroll, scrollPercent);
      
      // Send milestone events to GA
      this.scrollMilestones.forEach(milestone => {
        if (this.maxScroll >= milestone && !this.milestonesReached.includes(milestone)) {
          this.milestonesReached.push(milestone);
          this.sendEvent('scroll_depth', { percent: milestone });
        }
      });
    },
    
    trackTimeOnPage: function() {
      const timeOnPage = Math.round((Date.now() - this.startTime) / 1000);
      this.sendEvent('time_on_page', { 
        seconds: timeOnPage,
        max_scroll: this.maxScroll 
      });
    },
    
    trackVisibility: function() {
      if (document.hidden) {
        this.sendEvent('tab_hidden', {});
      }
    },
    
    trackClicks: function(e) {
      const link = e.target.closest('a');
      if (link && link.href) {
        // Track CTA button clicks
        if (link.classList.contains('btnPrimary') || link.classList.contains('btn')) {
          this.sendEvent('cta_click', { 
            text: link.textContent.trim(),
            href: link.href 
          });
        }
      }
    },
    
    sendEvent: function(eventName, params) {
      // Send to Google Analytics if gtag is available
      if (typeof gtag === 'function') {
        gtag('event', eventName, {
          event_category: 'engagement',
          ...params
        });
      }
    }
  };


  // ========================================
  // PART 2: OPT-IN BUBBLE
  // ========================================
  
  const Bubble = {
    isSubmitted: false,
    isDismissed: false,
    
    init: function() {
      // Check if already submitted or dismissed
      if (localStorage.getItem('hrcc_guide_submitted')) {
        this.isSubmitted = true;
        return; // Don't show bubble to people who already got the guide
      }
      
      const dismissedAt = localStorage.getItem('hrcc_guide_dismissed');
      if (dismissedAt) {
        const dismissedDate = new Date(parseInt(dismissedAt));
        const daysSince = (Date.now() - dismissedDate) / (1000 * 60 * 60 * 24);
        if (daysSince < CONFIG.dismissRememberDays) {
          this.isDismissed = true;
          return; // Don't show if recently dismissed
        }
      }
      
      // Show bubble after delay
      setTimeout(() => this.show(), CONFIG.bubbleDelaySeconds * 1000);
    },
    
    createStyles: function() {
      const style = document.createElement('style');
      style.textContent = `
        /* Bubble container */
        #hrcc-bubble {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          animation: hrcc-slideIn 0.4s ease-out;
        }
        
        @keyframes hrcc-slideIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        /* Main bubble card */
        #hrcc-bubble .bubble-card {
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05);
          padding: 24px;
          width: 320px;
          max-width: calc(100vw - 48px);
        }
        
        /* Close button */
        #hrcc-bubble .bubble-close {
          position: absolute;
          top: 12px;
          right: 12px;
          background: none;
          border: none;
          cursor: pointer;
          color: #94a3b8;
          padding: 4px;
          line-height: 1;
          font-size: 20px;
          transition: color 0.2s;
        }
        #hrcc-bubble .bubble-close:hover {
          color: #475569;
        }
        
        /* Badge */
        #hrcc-bubble .bubble-badge {
          display: inline-block;
          background: #ecfdf5;
          color: #059669;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 4px 10px;
          border-radius: 99px;
          margin-bottom: 12px;
        }
        
        /* Title */
        #hrcc-bubble .bubble-title {
          font-size: 18px;
          font-weight: 700;
          color: #1a4a7c;
          margin: 0 0 8px;
          line-height: 1.3;
        }
        
        /* Description */
        #hrcc-bubble .bubble-desc {
          font-size: 14px;
          color: #64748b;
          margin: 0 0 16px;
          line-height: 1.5;
        }
        
        /* Form */
        #hrcc-bubble .bubble-form {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        #hrcc-bubble .bubble-input {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          color: #1e293b;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        #hrcc-bubble .bubble-input:focus {
          outline: none;
          border-color: #2c9faf;
          box-shadow: 0 0 0 3px rgba(44, 159, 175, 0.15);
        }
        #hrcc-bubble .bubble-input::placeholder {
          color: #94a3b8;
        }
        
        #hrcc-bubble .bubble-submit {
          width: 100%;
          padding: 12px 20px;
          background: #e67e22;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s;
        }
        #hrcc-bubble .bubble-submit:hover {
          background: #d35400;
        }
        #hrcc-bubble .bubble-submit:active {
          transform: scale(0.98);
        }
        #hrcc-bubble .bubble-submit:disabled {
          background: #94a3b8;
          cursor: not-allowed;
        }
        
        /* Textarea */
        #hrcc-bubble .bubble-textarea {
          resize: none;
          font-family: inherit;
          min-height: 60px;
        }
        
        /* Challenge section */
        #hrcc-bubble .bubble-challenge {
          margin-top: 4px;
        }
        #hrcc-bubble .bubble-challenge-label {
          font-size: 12px;
          color: #64748b;
          display: block;
          margin-bottom: 8px;
        }
        #hrcc-bubble .bubble-options {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        #hrcc-bubble .bubble-option {
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 6px 12px;
          font-size: 12px;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s;
        }
        #hrcc-bubble .bubble-option:hover {
          background: #e2e8f0;
          border-color: #cbd5e1;
        }
        #hrcc-bubble .bubble-option.selected {
          background: #2c9faf;
          border-color: #2c9faf;
          color: white;
        }
        #hrcc-bubble .bubble-other-input {
          margin-top: 8px;
        }
        
        /* Privacy note */
        #hrcc-bubble .bubble-privacy {
          font-size: 11px;
          color: #94a3b8;
          text-align: center;
          margin-top: 10px;
        }
        #hrcc-bubble .bubble-privacy a {
          color: #64748b;
          text-decoration: underline;
        }
        
        /* Success state */
        #hrcc-bubble .bubble-success {
          text-align: center;
          padding: 8px 0;
        }
        #hrcc-bubble .bubble-success-icon {
          width: 48px;
          height: 48px;
          background: #ecfdf5;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 12px;
          color: #059669;
          font-size: 24px;
        }
        #hrcc-bubble .bubble-success h4 {
          font-size: 16px;
          font-weight: 700;
          color: #1a4a7c;
          margin: 0 0 8px;
        }
        #hrcc-bubble .bubble-success p {
          font-size: 14px;
          color: #64748b;
          margin: 0;
        }
        
        /* Mobile adjustments */
        @media (max-width: 480px) {
          #hrcc-bubble {
            bottom: 16px;
            right: 16px;
            left: 16px;
          }
          #hrcc-bubble .bubble-card {
            width: 100%;
          }
        }
      `;
      document.head.appendChild(style);
    },
    
    show: function() {
      this.createStyles();
      
      const bubble = document.createElement('div');
      bubble.id = 'hrcc-bubble';
      bubble.innerHTML = `
        <div class="bubble-card">
          <button class="bubble-close" aria-label="Close">&times;</button>
          
          <span class="bubble-badge">Free Resource</span>
          <h3 class="bubble-title">50-State Employment Law Quick Reference</h3>
          <p class="bubble-desc">Minimum wage, overtime, leave laws, and more—one spreadsheet, all 50 states. We'll email it to you.</p>
          
          <form class="bubble-form" id="hrcc-bubble-form">
            <input type="text" name="firstname" class="bubble-input" placeholder="First name" required>
            <input type="email" name="email" class="bubble-input" placeholder="Work email" required>
            
            <div class="bubble-challenge">
              <label class="bubble-challenge-label">What's your biggest HR challenge? (optional)</label>
              <div class="bubble-options" id="hrcc-challenge-options">
                <button type="button" class="bubble-option" data-value="Multi-state compliance">Multi-state compliance</button>
                <button type="button" class="bubble-option" data-value="Investigations">Investigations</button>
                <button type="button" class="bubble-option" data-value="Performance conversations">Performance conversations</button>
                <button type="button" class="bubble-option" data-value="Leave & accommodations">Leave & accommodations</button>
                <button type="button" class="bubble-option" data-value="other">Something else</button>
              </div>
              <input type="text" name="challenge_other" class="bubble-input bubble-other-input" placeholder="Tell us more..." style="display:none;">
              <input type="hidden" name="challenge" value="">
            </div>
            
            <button type="submit" class="bubble-submit">Send Me the Guide</button>
          </form>
          
          <p class="bubble-privacy">No spam. <a href="privacy.html">Privacy policy</a></p>
        </div>
      `;
      
      document.body.appendChild(bubble);
      
      // Event listeners
      bubble.querySelector('.bubble-close').addEventListener('click', () => this.dismiss());
      bubble.querySelector('#hrcc-bubble-form').addEventListener('submit', (e) => this.handleSubmit(e));
      
      // Challenge option click handlers
      const options = bubble.querySelectorAll('.bubble-option');
      const hiddenInput = bubble.querySelector('[name="challenge"]');
      const otherInput = bubble.querySelector('[name="challenge_other"]');
      
      options.forEach(option => {
        option.addEventListener('click', () => {
          // Remove selected from all
          options.forEach(opt => opt.classList.remove('selected'));
          // Add selected to clicked
          option.classList.add('selected');
          
          const value = option.dataset.value;
          if (value === 'other') {
            otherInput.style.display = 'block';
            otherInput.focus();
            hiddenInput.value = '';
          } else {
            otherInput.style.display = 'none';
            otherInput.value = '';
            hiddenInput.value = value;
          }
        });
      });
      
      // Update hidden input when typing in "other" field
      otherInput.addEventListener('input', () => {
        hiddenInput.value = otherInput.value;
      });
      
      // Track that bubble was shown
      Tracking.sendEvent('lead_bubble_shown', { page: window.location.pathname });
    },
    
    dismiss: function() {
      const bubble = document.getElementById('hrcc-bubble');
      if (bubble) {
        bubble.style.animation = 'hrcc-slideIn 0.3s ease-in reverse';
        setTimeout(() => bubble.remove(), 300);
      }
      localStorage.setItem('hrcc_guide_dismissed', Date.now().toString());
      Tracking.sendEvent('lead_bubble_dismissed', {});
    },
    
    handleSubmit: async function(e) {
      e.preventDefault();
      
      const form = e.target;
      const submitBtn = form.querySelector('.bubble-submit');
      const firstname = form.querySelector('[name="firstname"]').value.trim();
      const email = form.querySelector('[name="email"]').value.trim();
      const challenge = form.querySelector('[name="challenge"]').value.trim();
      
      // Disable button while submitting
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
      
      try {
        // Submit to HubSpot
        await this.submitToHubSpot(firstname, email, challenge);
        
        // Show success state
        this.showSuccess();
        
        // Remember submission
        localStorage.setItem('hrcc_guide_submitted', 'true');
        
        // Track conversion
        Tracking.sendEvent('lead_captured', { 
          source: 'bubble',
          page: window.location.pathname 
        });
        
      } catch (error) {
        console.error('Form submission error:', error);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Try Again';
        alert('Something went wrong. Please try again or email support@hrcompliancecompass.com');
      }
    },
    
    submitToHubSpot: async function(firstname, email, challenge) {
      // Build fields array
      const fields = [
        { name: 'firstname', value: firstname },
        { name: 'email', value: email }
      ];
      
      // Add challenge if provided (uses HubSpot property internal name)
      if (challenge) {
        fields.push({ name: 'biggest_hr_challenge', value: challenge });
      }
      
      const response = await fetch(`https://api.hsforms.com/submissions/v3/integration/submit/${CONFIG.hubspotPortalId}/${CONFIG.hubspotFormId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: fields,
          context: {
            pageUri: window.location.href,
            pageName: document.title
          }
        })
      });
      
      if (!response.ok) {
        throw new Error('HubSpot submission failed');
      }
      
      return response.json();
    },
    
    showSuccess: function() {
      const card = document.querySelector('#hrcc-bubble .bubble-card');
      card.innerHTML = `
        <button class="bubble-close" aria-label="Close">&times;</button>
        <div class="bubble-success">
          <div class="bubble-success-icon">✓</div>
          <h4>You're in!</h4>
          <p>Here's your 50-State Reference Guide:</p>
          <a href="${CONFIG.referenceGuideUrl}" target="_blank" class="bubble-submit" style="display: block; text-decoration: none; margin-top: 12px;">Open the Guide →</a>
        </div>
      `;
      
      card.querySelector('.bubble-close').addEventListener('click', () => this.dismiss());
      
      // Don't auto-dismiss — let them click the link
    }
  };


  // ========================================
  // INITIALIZE EVERYTHING
  // ========================================
  
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  function init() {
    Tracking.init();
    Bubble.init();
  }

})();
