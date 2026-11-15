/**
 * <vev-sticky-atc>
 * Mobile sticky "Add to cart" bar for the product page (snippets/vev-sticky-atc.liquid).
 *
 * - Shows once the main add-to-cart button has scrolled above the screen; hides
 *   again when it comes back or when the shopper scrolls up past it.
 * - Clicking the bar's button clicks the main button, so variant, quantity and
 *   errors are handled by the normal product form.
 * - Watches the product section for variant changes and copies the current price,
 *   button text and disabled state.
 */
if (!customElements.get('vev-sticky-atc')) {
  class VevStickyAtc extends HTMLElement {
    connectedCallback() {
      // quick-add.js copies the whole <product-info> into its popup; the bar is not wanted there.
      if (this.closest('quick-add-modal')) {
        this.remove();
        return;
      }

      this.button = this.querySelector('[data-sticky-atc-button]');
      this.text = this.querySelector('[data-sticky-atc-text]');
      this.priceSlot = this.querySelector('[data-sticky-atc-price]');
      this.root = this.closest('product-info') || document.body;
      if (!this.button || !this.getMainButton()) return;

      this.onClick = this.onClick.bind(this);
      this.button.addEventListener('click', this.onClick);

      this.intersection = new IntersectionObserver(([entry]) => {
        // Only show when the main button is above the viewport (already scrolled past).
        this.setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      });

      this.mutations = new MutationObserver((records) => {
        // Ignore changes this bar makes to itself.
        if (records.every((record) => this.contains(record.target))) return;
        if (this.syncFrame) return;
        this.syncFrame = requestAnimationFrame(() => {
          this.syncFrame = null;
          this.sync();
        });
      });
      this.mutations.observe(this.root, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['disabled'],
      });

      this.sync();
    }

    disconnectedCallback() {
      if (this.button) this.button.removeEventListener('click', this.onClick);
      if (this.intersection) this.intersection.disconnect();
      if (this.mutations) this.mutations.disconnect();
      if (this.syncFrame) cancelAnimationFrame(this.syncFrame);
    }

    getMainButton() {
      return document.getElementById(this.dataset.mainButtonId);
    }

    onClick() {
      const main = this.getMainButton();
      if (!main || main.disabled) return;
      main.click();
    }

    setVisible(visible) {
      this.classList.toggle('is-visible', visible);
      this.toggleAttribute('inert', !visible);
      this.setAttribute('aria-hidden', String(!visible));
    }

    sync() {
      const main = this.getMainButton();
      if (!main) return;

      // The main button can be re-rendered on variant change; watch the current one.
      if (main !== this.observedButton) {
        if (this.observedButton) this.intersection.unobserve(this.observedButton);
        this.intersection.observe(main);
        this.observedButton = main;
      }

      this.button.disabled = main.disabled;
      const label = main.querySelector('.button__text');
      if (label && this.text) this.text.textContent = label.textContent.trim();

      const price = document.getElementById(this.dataset.priceId)?.querySelector('.price');
      if (price && this.priceSlot) {
        const selector = price.classList.contains('price--on-sale')
          ? '.price__sale .price-item--sale'
          : '.price__regular .price-item--regular:not(s)';
        const current = price.querySelector(selector);
        if (current) this.priceSlot.textContent = current.textContent.trim();
      }
    }
  }

  customElements.define('vev-sticky-atc', VevStickyAtc);
}
