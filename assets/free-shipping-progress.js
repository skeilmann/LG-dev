/*
 Centralized Free Shipping Progress module
 - Single source of truth for computing remaining amount and progress
 - Works wherever a container with [data-free-shipping-progress] exists
 - Uses Shopify AJAX cart (/cart.js) and PUB/SUB cartUpdate events when available

 Markup contract (minimal example):
 <div class="js-free-shipping" data-free-shipping-progress
      data-threshold-cents="5000"
      data-currency-code="USD"
      data-locale-key-progress="announcement.free_shipping.progress"
      data-locale-key-empty="announcement.free_shipping.empty"
      data-locale-key-reached="announcement.free_shipping.reached"
      data-settings-message-progress=""
      data-settings-message-empty=""
      data-settings-message-reached="">
   <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
     <div class="progress__fill"></div>
   </div>
   <div class="message" aria-live="polite"></div>
 </div>

 Optional sub-elements if present will be updated:
   .js-fs-current-amount, .js-fs-target-amount
  Optional classes for the bar if different naming is used:
    .progress-bar-container / .progress-bar-fill or .ai-cart-progress__bar-container-[suffix] / .ai-cart-progress__bar-fill-[suffix]
    The module will attempt to discover these automatically.
*/

(function () {
  const GLOBAL = window || globalThis;

  // Simple pub/sub integration if theme exposes subscribe/publish
  const subscribe = GLOBAL.subscribe || function () { return function () {}; };
  const publish = GLOBAL.publish || function () {};
  const EVENTS = GLOBAL.PUB_SUB_EVENTS || { cartUpdate: 'cart-update' };

  // Shared Cart store with debounced fetch
  const CartStore = (function () {
    let inflightPromise = null;
    let lastCart = null;
    let lastFetchTs = 0;
    const MIN_FETCH_MS = 300; // debounce network

    function fetchCart() {
      const now = Date.now();
      if (inflightPromise) return inflightPromise;
      if (now - lastFetchTs < MIN_FETCH_MS && lastCart) return Promise.resolve(lastCart);

      inflightPromise = fetch('/cart.js', { credentials: 'same-origin' })
        .then((r) => r.json())
        .then((cart) => {
          lastFetchTs = Date.now();
          lastCart = cart;
          return cart;
        })
        .catch((e) => {
          console.error('free-shipping: fetch /cart.js failed', e);
          return lastCart || { total_price: 0, item_count: 0 };
        })
        .finally(() => {
          inflightPromise = null;
        });

      return inflightPromise;
    }

    function getLast() {
      return lastCart;
    }

    return { fetchCart, getLast };
  })();

  function getLocale() {
    return document.documentElement.lang || 'en';
  }

  function formatMoneyCents(cents, currency) {
    try {
      return new Intl.NumberFormat(getLocale(), {
        style: 'currency',
        currency: currency || 'USD',
        currencyDisplay: 'symbol',
      }).format((cents || 0) / 100);
    } catch (e) {
      // Fallback to a simple format if Intl fails
      const amount = (cents || 0) / 100;
      return `${amount.toFixed(2)}`;
    }
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(val, max));
  }

  function tokenize(messageTemplate, remainingFormatted, thresholdFormatted) {
    if (!messageTemplate) return '';
    let out = messageTemplate;
    // Support {{ remaining }} and __REMAINING__ and [remaining]
    out = out.replace(/\{\{\s*remaining\s*\}\}/g, remainingFormatted);
    out = out.replace(/__REMAINING__/g, remainingFormatted);
    out = out.replace(/\[remaining\]/g, remainingFormatted);
    // Support legacy Dawn key pattern __AMOUNT__
    out = out.replace(/__AMOUNT__/g, remainingFormatted);
    // Support {{ threshold }} and __THRESHOLD__ tokens for empty messages
    if (thresholdFormatted) {
      out = out.replace(/\{\{\s*threshold\s*\}\}/g, thresholdFormatted);
      out = out.replace(/__THRESHOLD__/g, thresholdFormatted);
    }
    return out;
  }

  class FreeShippingInstance {
    constructor(root) {
      this.root = root;
      this.inited = false;
      this.thresholdCents = parseInt(root.dataset.thresholdCents || root.dataset.threshold || '0', 10) || 0;
      this.currency = root.dataset.currencyCode || (GLOBAL.Shopify && GLOBAL.Shopify.currency && GLOBAL.Shopify.currency.active) || (GLOBAL.Shopify && GLOBAL.Shopify.currency) || 'USD';



      // Pre-rendered locale strings coming from Liquid
      this.msgProgressLocale = (root.dataset.localeMessageProgress || '').trim();
      this.msgEmptyLocale = (root.dataset.localeMessageEmpty || '').trim();
      this.msgReachedLocale = (root.dataset.localeMessageReached || '').trim();
      this.msgQualifyLocale = (root.dataset.localeMessageQualify || '').trim();
      
      // Custom message overrides
      this.msgProgressOverride = (root.dataset.customMessageProgress || '').trim();
      this.msgEmptyOverride = (root.dataset.customMessageEmpty || '').trim();
      this.msgReachedOverride = (root.dataset.customMessageReached || '').trim();


      // Elements - using standardized naming only
      this.contentEl = root.querySelector('.fs-content') || root;
      this.emptyEl = root.querySelector('.fs-empty');
      this.emptyMessageEl = root.querySelector('.fs-empty-message');
      this.successEl = root.querySelector('.fs-success-container');
      this.successMessageEl = root.querySelector('.fs-success-message');
      this.progressFill = root.querySelector('.fs-progress-fill');
      this.progressContainer = root.querySelector('.fs-progress-bar');
      this.currentAmountEl = root.querySelector('.fs-current');
      this.targetAmountEl = root.querySelector('.fs-target');

      if (this.targetAmountEl && this.thresholdCents) {
        this.targetAmountEl.textContent = formatMoneyCents(this.thresholdCents, this.currency);
      }

      this.rafId = null;
      this.lastTotal = -1;
      this.inited = true;
      
      // Don't update immediately if no cart data - wait for it to load
      const initialCart = CartStore.getLast();
      if (initialCart) {
        this.updateFromCart(initialCart);
      }
    }

    getMessageTemplates() {
      // Preference order: locale (with proper translation) -> setting override -> empty string
      return {
        empty: this.msgEmptyLocale || this.msgEmptyOverride || '',
        progress: this.msgProgressLocale || this.msgProgressOverride || '',
        reached: this.msgReachedLocale || this.msgReachedOverride || '',
        qualify: this.msgQualifyLocale || '',
      };
    }

    scheduleRender(cart) {
      if (this.rafId) cancelAnimationFrame(this.rafId);
      this.rafId = requestAnimationFrame(() => this.render(cart));
    }

    updateFromCart(cart) {
      if (!cart) return;
      if (typeof cart.total_price !== 'number') return;
      if (cart.total_price === this.lastTotal) return;
      this.lastTotal = cart.total_price;
      this.scheduleRender(cart);
    }

    render(cart) {
      const total = cart ? cart.total_price : 0;
      const threshold = this.thresholdCents || 0;
      const remainingCents = Math.max(threshold - total, 0);
      const progressPct = threshold > 0 ? Math.round((total / threshold) * 100) : 0;
      const clamped = clamp(progressPct, 0, 100);
      const moneyRemaining = formatMoneyCents(remainingCents, this.currency);
      const isThresholdMet = total >= threshold && threshold > 0;

      if (this.currentAmountEl) this.currentAmountEl.textContent = formatMoneyCents(total, this.currency);

      // Set progress bar to 100% when threshold is met, otherwise use calculated percentage
      const displayProgress = isThresholdMet ? 100 : clamped;
      if (this.progressFill) this.progressFill.style.width = `${displayProgress}%`;
      if (this.progressContainer) {
        this.progressContainer.setAttribute('role', 'progressbar');
        this.progressContainer.setAttribute('aria-valuemin', '0');
        this.progressContainer.setAttribute('aria-valuemax', '100');
        this.progressContainer.setAttribute('aria-valuenow', String(clamped));
      }

      const { empty, progress, reached, qualify } = this.getMessageTemplates();
      
      // Update empty cart message
      if (this.emptyMessageEl) {
        this.emptyMessageEl.textContent = tokenize(empty, '', formatMoneyCents(threshold, this.currency));
      }

      // Update success message content
      if (this.successMessageEl) {
        this.successMessageEl.textContent = qualify || reached;
      }

      // Toggle between empty/progress/success containers based on cart state
      this.toggleContainerVisibility(cart, total, threshold, isThresholdMet);
    }

    toggleContainerVisibility(cart, total, threshold, isThresholdMet) {
      if (!this.emptyEl || !this.contentEl) return;

      // If no threshold is set, show empty message only
      if (threshold <= 0) {
        this.showContainer('empty');
        return;
      }

      // Determine which container should be visible
      const isEmpty = !cart || cart.item_count === 0 || total === 0;
      
      if (isEmpty) {
        this.showContainer('empty');
      } else if (isThresholdMet) {
        this.showContainer('success');
      } else {
        this.showContainer('progress');
      }
    }

    showContainer(containerType) {
      const containers = {
        empty: this.emptyEl,
        progress: this.contentEl,
        success: this.successEl
      };

      // Hide all containers first
      Object.entries(containers).forEach(([type, element]) => {
        if (element) {
          if (type !== containerType) {
            element.classList.add('is-hidden');
            element.classList.remove('fs-visible');
            // Use setTimeout to allow animation before hiding
            setTimeout(() => {
              if (element.classList.contains('is-hidden')) {
                element.style.display = 'none';
              }
            }, 300);
          }
        }
      });

      // Show the target container
      const targetContainer = containers[containerType];
      if (targetContainer) {
        targetContainer.style.display = 'block';
        targetContainer.classList.remove('is-hidden');
        if (containerType === 'success') {
          targetContainer.classList.add('fs-visible');
        }
      }
    }
  }

  const instances = new WeakMap();

  function initOne(el) {
    if (!el || instances.has(el)) return;
    instances.set(el, new FreeShippingInstance(el));
  }

  function initAll(root = document) {
    root.querySelectorAll('[data-free-shipping-progress]').forEach(initOne);
  }

  // Keep instances in sync with cart updates
  function attachCartListeners() {
    // Theme-wide cartUpdate pubsub
    try {
      subscribe(EVENTS.cartUpdate, (payload) => {
        // prefer provided cartData if shape matches
        const maybeCart = payload && payload.cartData;
        if (maybeCart && typeof maybeCart.total_price === 'number') {
          document.querySelectorAll('[data-free-shipping-progress]').forEach((el) => {
            const inst = instances.get(el);
            if (inst) inst.updateFromCart(maybeCart);
          });
        } else {
          CartStore.fetchCart().then((cart) => {
            document.querySelectorAll('[data-free-shipping-progress]').forEach((el) => {
              const inst = instances.get(el);
              if (inst) inst.updateFromCart(cart);
            });
          });
        }
      });
    } catch (e) {
      // no-op
    }

    // Initial fetch after DOM ready
    const start = () => CartStore.fetchCart().then((cart) => {
      document.querySelectorAll('[data-free-shipping-progress]').forEach((el) => {
        const inst = instances.get(el);
        if (inst) inst.updateFromCart(cart);
      });
    });

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
      start();
    }
  }

  // Auto init on section load (Theme Editor)
  document.addEventListener('shopify:section:load', (e) => {
    initAll(e.target || document);
  });

  // Public API
  GLOBAL.FreeShippingProgress = GLOBAL.FreeShippingProgress || { initAll };

  // Auto init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initAll();
      attachCartListeners();
    }, { once: true });
  } else {
    initAll();
    attachCartListeners();
  }
})();
