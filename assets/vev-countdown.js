/**
 * <vev-countdown data-end="1798754399">  (offer end, Unix seconds)
 * "N days left" badge for sections/vev-promo.liquid.
 *
 * Liquid renders the first number; this element recalculates it in the browser so
 * cached pages stay correct, and hides the badge once the offer has ended.
 * The label word comes from data-one / data-few / data-many / data-other
 * (rendered with Shopify's plural rules), picked with Intl.PluralRules.
 */
if (!customElements.get('vev-countdown')) {
  const DAY_MS = 24 * 60 * 60 * 1000;

  class VevCountdown extends HTMLElement {
    connectedCallback() {
      this.end = Number(this.dataset.end) * 1000;
      this.number = this.querySelector('[data-countdown-number]');
      this.label = this.querySelector('[data-countdown-label]');
      if (!Number.isFinite(this.end) || this.end <= 0 || !this.number) return;

      const lang = document.documentElement.lang || 'en';
      try {
        this.plural = new Intl.PluralRules(lang);
      } catch (error) {
        this.plural = new Intl.PluralRules('en');
      }

      this.update();
      // Once a minute is plenty for a day counter.
      this.timer = window.setInterval(() => this.update(), 60 * 1000);
    }

    disconnectedCallback() {
      window.clearInterval(this.timer);
    }

    update() {
      const msLeft = this.end - Date.now();
      if (msLeft <= 0) {
        this.hidden = true;
        window.clearInterval(this.timer);
        return;
      }

      const days = Math.ceil(msLeft / DAY_MS);
      this.number.textContent = String(days);
      if (this.label) {
        const form = this.dataset[this.plural.select(days)] || this.dataset.other;
        if (form) this.label.textContent = form;
      }
      this.hidden = false;
    }
  }

  customElements.define('vev-countdown', VevCountdown);
}
