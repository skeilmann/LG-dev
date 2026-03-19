/**
 * Account Favorites Component
 * Renders favorite products grid on the customer account page.
 * Reuses the Section Rendering API pattern from favorites-page.js.
 * Dependencies: favorites-handler.js (must be loaded first)
 */
class AccountFavorites extends HTMLElement {
  constructor() {
    super();
    this.initialized = false;
  }

  connectedCallback() {
    if (this.initialized) return;
    this.initialized = true;

    this.grid = this.querySelector('.account-favorites__grid');
    this.emptyState = this.querySelector('.account-favorites__empty');
    this.loadingState = this.querySelector('.account-favorites__loading');

    if (!this.grid) return;

    this.maxProducts = parseInt(this.dataset.maxProducts, 10) || 6;
    this.settings = {
      showVendor: this.dataset.showVendor === 'true',
      imageRatio: this.dataset.imageRatio || 'adapt',
    };

    this.loadFavorites();

    window.addEventListener('favorites:changed', () => {
      this.loadFavorites();
    });
  }

  /**
   * Load favorites and render product cards
   */
  async loadFavorites() {
    const favorites = this.getFavorites();

    if (!favorites || favorites.length === 0) {
      this.showEmpty();
      return;
    }

    this.showLoading();

    const limited = favorites.slice(0, this.maxProducts);
    await this.renderProducts(limited);
  }

  /**
   * Get favorites from handler, metafield, or localStorage (same fallback chain as favorites-page.js)
   */
  getFavorites() {
    try {
      if (window.favoritesHandler && window.favoritesHandler.favorites && window.favoritesHandler.favorites.size > 0) {
        return Array.from(window.favoritesHandler.favorites.values())
          .filter(fav => fav && fav.handle)
          .map(fav => ({
            ...fav,
            handle: fav.handle.includes('%') ? decodeURIComponent(fav.handle) : fav.handle,
          }));
      }

      if (window.Shopify && window.Shopify.favorites) {
        let data = window.Shopify.favorites;
        if (typeof data === 'string') {
          data = JSON.parse(data);
        }
        if (data && data.saved && Array.isArray(data.saved)) {
          return data.saved.filter(fav => fav && fav.handle);
        }
      }

      const stored = localStorage.getItem('guestFavorites');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.saved) return parsed.saved.filter(fav => fav && fav.handle);
      }
    } catch (error) {
      console.error('AccountFavorites: Error reading favorites:', error);
    }
    return [];
  }

  /**
   * Render product cards via Section Rendering API
   */
  async renderProducts(favorites) {
    const promises = favorites.map(fav => this.fetchProductCard(fav.handle));
    const results = await Promise.allSettled(promises);

    this.grid.innerHTML = '';
    let count = 0;

    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        const li = document.createElement('li');
        li.className = 'grid__item account-favorites__item';
        li.innerHTML = result.value;
        this.grid.appendChild(li);
        count++;
      }
    });

    if (count === 0) {
      this.showEmpty();
      return;
    }

    this.hideLoading();
    this.hideEmpty();
    this.grid.style.display = '';

    if (window.favoritesHandler) {
      window.favoritesHandler.updateButtons(this);
    }
  }

  /**
   * Fetch a product card via Section Rendering API
   */
  async fetchProductCard(handle) {
    try {
      const params = new URLSearchParams({
        section_id: 'card-product-standalone',
        show_vendor: this.settings.showVendor ? 'true' : 'false',
        image_ratio: this.settings.imageRatio || 'adapt',
      });

      const response = await fetch(`/products/${handle}?${params.toString()}`, {
        method: 'GET',
        headers: { Accept: 'text/html' },
      });

      if (!response.ok) return null;

      const html = await response.text();
      const temp = document.createElement('div');
      temp.innerHTML = html;

      const card = temp.querySelector('.card-wrapper');
      return card ? card.outerHTML : null;
    } catch (error) {
      console.error(`AccountFavorites: Error fetching product ${handle}:`, error);
      return null;
    }
  }

  showLoading() {
    if (this.loadingState) this.loadingState.style.display = '';
    if (this.emptyState) this.emptyState.style.display = 'none';
    this.grid.style.display = 'none';
  }

  hideLoading() {
    if (this.loadingState) this.loadingState.style.display = 'none';
  }

  showEmpty() {
    this.hideLoading();
    this.grid.style.display = 'none';
    if (this.emptyState) this.emptyState.style.display = '';
  }

  hideEmpty() {
    if (this.emptyState) this.emptyState.style.display = 'none';
  }
}

if (!customElements.get('account-favorites')) {
  customElements.define('account-favorites', AccountFavorites);
}
