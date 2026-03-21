/**
 * Recently Viewed Products Handler
 * Tracks product page visits in localStorage and renders cards
 * via Section Rendering API (card-product-standalone) for full
 * feature parity with universal card-product snippet.
 */

const STORAGE_KEY = 'recentlyViewedProducts';
const MAX_PRODUCTS = 20;

class RecentlyViewedProducts extends HTMLElement {
  constructor() {
    super();
    this.sectionId = this.dataset.sectionId;
    this.productsToShow = parseInt(this.dataset.productsToShow) || 4;
    this.excludeCurrent = this.dataset.excludeCurrent === 'true';
    this.currentProductId = this.dataset.currentProductId;

    this.grid = this.querySelector('[data-recently-viewed-grid]');
    this.emptyMessage = this.querySelector('[data-recently-viewed-empty]');
    this.clearButton = this.querySelector('[data-recently-viewed-clear]');
    this.sliderButtons = this.querySelector('[data-slider-buttons]');
  }

  connectedCallback() {
    this.trackCurrentProduct();
    this.bindEvents();

    // Lazy-load cards when section approaches viewport
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect();
          this.renderProducts();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(this);
  }

  bindEvents() {
    if (this.clearButton) {
      this.boundClearHistory = this.clearHistory.bind(this);
      this.clearButton.addEventListener('click', this.boundClearHistory);
    }
  }

  disconnectedCallback() {
    if (this.clearButton && this.boundClearHistory) {
      this.clearButton.removeEventListener('click', this.boundClearHistory);
    }
  }

  /**
   * Get stored products from localStorage
   */
  getStoredProducts() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.warn('RecentlyViewed: Error reading localStorage', e);
      return [];
    }
  }

  /**
   * Save products to localStorage
   */
  saveProducts(products) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    } catch (e) {
      console.warn('RecentlyViewed: Error writing to localStorage', e);
    }
  }

  /**
   * Track the current product page visit
   */
  trackCurrentProduct() {
    const productData = this.getProductDataFromPage();
    if (!productData) return;

    let products = this.getStoredProducts();

    // Remove if already exists (to move to front)
    products = products.filter((p) => p.id !== productData.id);

    // Add to front
    products.unshift(productData);

    // Limit to max products
    if (products.length > MAX_PRODUCTS) {
      products = products.slice(0, MAX_PRODUCTS);
    }

    this.saveProducts(products);
  }

  /**
   * Extract product data from the current page
   */
  getProductDataFromPage() {
    const productJson = document.querySelector('[data-recently-viewed-product-data]');
    if (productJson) {
      try {
        const data = JSON.parse(productJson.textContent);
        return {
          id: data.id,
          handle: data.handle,
          title: data.title,
          url: data.url || `/products/${data.handle}`,
          vendor: data.vendor || '',
          price: data.price,
          image: data.image || '',
          secondaryImage: data.secondaryImage || null,
          timestamp: Date.now(),
        };
      } catch (e) {
        console.warn('RecentlyViewed: Error parsing product JSON', e);
      }
    }

    // Fallback: try to extract from meta tags
    const productIdMatch = window.location.pathname.match(/\/products\/([^/?#]+)/);
    if (!productIdMatch) return null;

    const handle = productIdMatch[1];
    const title = document.querySelector('meta[property="og:title"]')?.content || '';
    const image = document.querySelector('meta[property="og:image"]')?.content || '';

    return {
      id: this.currentProductId || handle,
      handle: handle,
      title: title,
      url: `/products/${handle}`,
      vendor: '',
      price: 0,
      image: image,
      secondaryImage: null,
      timestamp: Date.now(),
    };
  }

  /**
   * Render recently viewed products via Section Rendering API
   */
  async renderProducts() {
    if (!this.grid) return;

    let products = this.getStoredProducts();

    // Exclude current product if configured
    if (this.excludeCurrent && this.currentProductId) {
      products = products.filter((p) => String(p.id) !== String(this.currentProductId));
    }

    // Limit to configured number
    products = products.slice(0, this.productsToShow);

    // Show empty message if no products
    if (products.length === 0) {
      this.grid.innerHTML = '';
      if (this.emptyMessage) this.emptyMessage.hidden = false;
      if (this.clearButton) this.clearButton.hidden = true;
      if (this.sliderButtons) this.sliderButtons.hidden = true;
      return;
    }

    // Hide empty message, show clear button
    if (this.emptyMessage) this.emptyMessage.hidden = true;
    if (this.clearButton) this.clearButton.hidden = false;

    // Fetch all cards in parallel via Section Rendering API
    this.grid.innerHTML = '';
    this.setAttribute('data-loading', 'true');

    const fetchPromises = products.map((product, index) =>
      this.fetchProductCard(product.handle, index)
    );

    const results = await Promise.allSettled(fetchPromises);

    // Append successful cards in order
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        this.grid.appendChild(result.value);
      }
    });

    this.removeAttribute('data-loading');

    // Update slider
    const renderedCount = this.grid.children.length;
    if (this.sliderButtons) {
      this.sliderButtons.hidden = renderedCount <= 1;
      const totalSpan = this.sliderButtons.querySelector('.slider-counter--total');
      if (totalSpan) totalSpan.textContent = renderedCount;
    }

    // Reinitialize slider if present
    const sliderComponent = this.querySelector('slider-component');
    if (sliderComponent && typeof sliderComponent.resetPages === 'function') {
      sliderComponent.resetPages();
    }
  }

  /**
   * Fetch a single product card via Section Rendering API
   */
  async fetchProductCard(handle, index) {
    try {
      const sectionId = 'card-product-standalone';
      const response = await fetch(`/products/${handle}?section_id=${sectionId}`);

      if (!response.ok) return null;

      const html = await response.text();
      const temp = document.createElement('div');
      temp.innerHTML = html;

      // Wrap in <li> with slider classes
      const li = document.createElement('li');
      li.className = 'grid__item slider__slide';
      li.id = `Slide-${this.sectionId}-${index + 1}`;
      li.innerHTML = temp.innerHTML;
      return li;
    } catch (e) {
      console.warn(`RecentlyViewed: Failed to fetch card for "${handle}"`, e);
      return null;
    }
  }

  /**
   * Clear viewing history
   */
  clearHistory() {
    this.saveProducts([]);
    this.renderProducts();

    document.dispatchEvent(
      new CustomEvent('recentlyViewed:cleared', {
        bubbles: true,
      })
    );
  }
}

// Register custom element
if (!customElements.get('recently-viewed-products')) {
  customElements.define('recently-viewed-products', RecentlyViewedProducts);
}

/**
 * Track product views on page load (for pages without the section)
 */
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('recently-viewed-products')) return;

  const isProductPage = window.location.pathname.includes('/products/');
  if (!isProductPage) return;

  const productIdMatch = window.location.pathname.match(/\/products\/([^/?#]+)/);
  if (!productIdMatch) return;

  const handle = productIdMatch[1];
  const title = document.querySelector('meta[property="og:title"]')?.content || '';
  const image = document.querySelector('meta[property="og:image"]')?.content || '';

  const mainProduct = document.querySelector('[data-product-id]');
  const productId = mainProduct?.dataset.productId || handle;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let products = stored ? JSON.parse(stored) : [];

    products = products.filter((p) => String(p.id) !== String(productId) && p.handle !== handle);

    products.unshift({
      id: productId,
      handle: handle,
      title: title,
      url: `/products/${handle}`,
      vendor: '',
      price: 0,
      image: image,
      secondaryImage: null,
      timestamp: Date.now(),
    });

    if (products.length > MAX_PRODUCTS) {
      products = products.slice(0, MAX_PRODUCTS);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  } catch (e) {
    console.warn('RecentlyViewed: Error tracking product', e);
  }
});
