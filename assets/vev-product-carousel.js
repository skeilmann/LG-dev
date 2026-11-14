/**
 * <vev-product-carousel>
 * Category chips for the VEV product carousel (sections/vev-product-carousel.liquid).
 *
 * Clicking a chip loads that collection's products (same order/mode as the section)
 * from /collections/<handle>?view=<view>&sort_by=<order> and swaps the slides.
 * Clicking the active chip again restores the section's own products.
 * Responses are cached per chip; in-flight requests are aborted on a new click.
 */
if (!customElements.get('vev-product-carousel')) {
  class VevProductCarousel extends HTMLElement {
    connectedCallback() {
      this.track = this.querySelector('[data-vev-carousel-track]');
      this.slider = this.querySelector('slider-component');
      this.status = this.querySelector('[data-vev-carousel-status]');
      this.viewAll = this.querySelector('[data-vev-carousel-view-all]');
      this.chips = Array.from(this.querySelectorAll('.vev-chip'));
      if (!this.track || this.chips.length === 0) return;

      this.cache = new Map();
      this.defaultHTML = this.track.innerHTML;
      this.limit = parseInt(this.dataset.limit, 10) || 10;
      this.strings = this.readStrings();

      this.onChipClick = this.onChipClick.bind(this);
      this.chips.forEach((chip) => chip.addEventListener('click', this.onChipClick));
    }

    disconnectedCallback() {
      if (this.chips) this.chips.forEach((chip) => chip.removeEventListener('click', this.onChipClick));
      if (this.abortController) this.abortController.abort();
    }

    readStrings() {
      const strings = {};
      const template = this.querySelector('template[data-vev-carousel-strings]');
      if (!template) return strings;
      template.content.querySelectorAll('[data-key]').forEach((el) => {
        strings[el.dataset.key] = el.textContent.trim();
      });
      return strings;
    }

    onChipClick(event) {
      const chip = event.currentTarget;
      const isActive = chip.getAttribute('aria-pressed') === 'true';

      this.chips.forEach((c) => c.setAttribute('aria-pressed', 'false'));

      if (isActive) {
        this.render(this.defaultHTML, this.strings.all, this.dataset.defaultUrl);
        return;
      }

      chip.setAttribute('aria-pressed', 'true');
      this.load(chip);
    }

    async load(chip) {
      const url = `${chip.dataset.collectionUrl}?view=${encodeURIComponent(this.dataset.view)}&sort_by=${encodeURIComponent(this.dataset.sortBy)}`;
      const label = chip.dataset.label;

      if (this.cache.has(url)) {
        this.render(this.cache.get(url), label, chip.dataset.viewAllUrl);
        return;
      }

      if (this.abortController) this.abortController.abort();
      this.abortController = new AbortController();

      this.track.setAttribute('aria-busy', 'true');
      this.classList.add('is-loading');
      this.announce(this.strings.loading);

      try {
        const response = await fetch(url, { signal: this.abortController.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = new DOMParser().parseFromString(await response.text(), 'text/html');
        const list = html.querySelector('[data-vev-carousel-items]');
        if (!list) throw new Error('Missing carousel items');

        const items = Array.from(list.children).slice(0, this.limit);
        const fragment = items.map((item) => item.outerHTML).join('');
        this.cache.set(url, fragment);

        // Only render if this chip is still the one the shopper selected.
        if (chip.getAttribute('aria-pressed') === 'true') {
          this.render(fragment, label, chip.dataset.viewAllUrl);
        }
      } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('VEV carousel:', error);
        chip.setAttribute('aria-pressed', 'false');
        this.announce(this.dataset.errorMessage);
      } finally {
        this.track.setAttribute('aria-busy', 'false');
        this.classList.remove('is-loading');
      }
    }

    render(html, label, viewAllUrl) {
      this.track.innerHTML = html;

      // Keep slide IDs unique per section so SliderComponent and aria-controls work.
      const sectionId = this.dataset.sectionId;
      this.track.querySelectorAll('.slider__slide').forEach((slide, index) => {
        slide.id = `Slide-${sectionId}-${index + 1}`;
      });

      this.track.scrollTo({ left: 0 });
      if (this.slider && typeof this.slider.resetPages === 'function') this.slider.resetPages();

      if (this.viewAll && viewAllUrl) this.viewAll.href = viewAllUrl;

      // Show "in cart" counts on the new cards.
      const cartManager = window.cartQuantityManager;
      if (cartManager && cartManager.cartData) cartManager.updateCartQuantities(cartManager.cartData);

      if (label && this.strings.shown) this.announce(this.strings.shown.replace('__CATEGORY__', label));
    }

    announce(message) {
      if (!this.status || !message) return;
      this.status.textContent = '';
      // Re-set on the next frame so screen readers announce repeated messages.
      requestAnimationFrame(() => {
        this.status.textContent = message;
      });
    }
  }

  customElements.define('vev-product-carousel', VevProductCarousel);
}
