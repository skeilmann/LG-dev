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

  function tokenize(messageTemplate, remainingFormatted) {
    if (!messageTemplate) return '';
    let out = messageTemplate;
    // Support {{ remaining }} and __REMAINING__ and [remaining]
    out = out.replace(/\{\{\s*remaining\s*\}\}/g, remainingFormatted);
    out = out.replace(/__REMAINING__/g, remainingFormatted);
    out = out.replace(/\[remaining\]/g, remainingFormatted);
    // Support legacy Dawn key pattern __AMOUNT__
    out = out.replace(/__AMOUNT__/g, remainingFormatted);
    return out;
  }

  class FreeShippingInstance {
    constructor(root) {
      this.root = root;
      this.inited = false;
      this.thresholdCents = parseInt(root.dataset.thresholdCents || root.dataset.threshold || '0', 10) || 0;
      this.currency = root.dataset.currencyCode || (GLOBAL.Shopify && GLOBAL.Shopify.currency && GLOBAL.Shopify.currency.active) || (GLOBAL.Shopify && GLOBAL.Shopify.currency) || 'USD';

      // Merchant overrides
      this.msgProgressOverride = (root.dataset.settingsMessageProgress || '').trim();
      this.msgEmptyOverride = (root.dataset.settingsMessageEmpty || '').trim();
      this.msgReachedOverride = (root.dataset.settingsMessageReached || '').trim();

      // Pre-rendered locale strings coming from Liquid (preferred fallback)
      this.msgProgressLocale = (root.dataset.localeMessageProgress || '').trim();
      this.msgEmptyLocale = (root.dataset.localeMessageEmpty || '').trim();
      this.msgReachedLocale = (root.dataset.localeMessageReached || '').trim();

      // Elements
      this.messageEl = root.querySelector('.message, .free-shipping-message .free-shipping-text, .ai-cart-progress__message span, .ai-cart-progress__text');
      this.progressFill =
        root.querySelector('.progress__fill, .progress-bar-fill, [class*="ai-cart-progress__bar-fill"]');
      this.progressContainer =
        root.querySelector('.progress, .progress-bar-container, [class*="ai-cart-progress__bar-container"]');
      this.currentAmountEl = root.querySelector('.js-fs-current-amount, .free-shipping-current, [class*="ai-cart-progress__current"]');
      this.targetAmountEl = root.querySelector('.js-fs-target-amount, .free-shipping-target, [class*="ai-cart-progress__target"]');

      if (this.targetAmountEl && this.thresholdCents) {
        this.targetAmountEl.textContent = formatMoneyCents(this.thresholdCents, this.currency);
      }

      this.rafId = null;
      this.lastTotal = -1;
      this.inited = true;
      this.updateFromCart(CartStore.getLast());
    }

    getMessageTemplates() {
      // Preference order: setting override -> locale -> empty string
      return {
        empty: this.msgEmptyOverride || this.msgEmptyLocale || '',
        progress: this.msgProgressOverride || this.msgProgressLocale || '',
        reached: this.msgReachedOverride || this.msgReachedLocale || '',
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

      if (this.currentAmountEl) this.currentAmountEl.textContent = formatMoneyCents(total, this.currency);

      if (this.progressFill) this.progressFill.style.width = `${clamped}%`;
      if (this.progressContainer) {
        this.progressContainer.setAttribute('role', 'progressbar');
        this.progressContainer.setAttribute('aria-valuemin', '0');
        this.progressContainer.setAttribute('aria-valuemax', '100');
        this.progressContainer.setAttribute('aria-valuenow', String(clamped));
      }

      const { empty, progress, reached } = this.getMessageTemplates();
      let message = '';
      if (!cart || cart.item_count === 0 || total === 0) {
        message = empty;
      } else if (threshold > 0 && total >= threshold) {
        message = reached;
      } else {
        message = tokenize(progress, moneyRemaining);
      }

      if (this.messageEl) this.messageEl.textContent = message;
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


