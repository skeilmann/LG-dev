/**
 * Recently Viewed Products Handler
 * Tracks product page visits in localStorage and displays them in the recently-viewed-products section
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
    this.template = document.getElementById(`recently-viewed-card-template-${this.sectionId}`);
  }

  connectedCallback() {
    this.trackCurrentProduct();
    this.renderProducts();
    this.bindEvents();
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
    // Only track on product pages
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
    // Check for product data exposed by the section
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
          priceFormatted: data.priceVaries
            ? `From ${this.formatMoney(data.priceMin)}`
            : this.formatMoney(data.price),
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
    const price = document.querySelector('meta[property="product:price:amount"]')?.content || '';
    const currency = document.querySelector('meta[property="product:price:currency"]')?.content || 'MDL';

    return {
      id: this.currentProductId || handle,
      handle: handle,
      title: title,
      url: `/products/${handle}`,
      vendor: '',
      price: parseFloat(price) * 100,
      priceFormatted: price ? `${price} ${currency}` : '',
      image: image,
      secondaryImage: null,
      timestamp: Date.now(),
    };
  }

  /**
   * Format money value (cents to display format)
   */
  formatMoney(cents) {
    if (!cents) return '';
    const amount = (cents / 100).toFixed(0);
    return `${amount} MDL`;
  }

  /**
   * Render recently viewed products
   */
  renderProducts() {
    if (!this.grid || !this.template) return;

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
      if (this.emptyMessage) {
        this.emptyMessage.hidden = false;
      }
      if (this.clearButton) {
        this.clearButton.hidden = true;
      }
      if (this.sliderButtons) {
        this.sliderButtons.hidden = true;
      }
      return;
    }

    // Hide empty message, show clear button
    if (this.emptyMessage) {
      this.emptyMessage.hidden = true;
    }
    if (this.clearButton) {
      this.clearButton.hidden = false;
    }
    if (this.sliderButtons && products.length > 1) {
      this.sliderButtons.hidden = false;
      const totalSpan = this.sliderButtons.querySelector('.slider-counter--total');
      if (totalSpan) {
        totalSpan.textContent = products.length;
      }
    }

    // Render product cards
    this.grid.innerHTML = '';
    products.forEach((product, index) => {
      const card = this.createProductCard(product, index);
      if (card) {
        this.grid.appendChild(card);
      }
    });

    // Reinitialize slider if present
    const sliderComponent = this.querySelector('slider-component');
    if (sliderComponent && typeof sliderComponent.resetPages === 'function') {
      sliderComponent.resetPages();
    }
  }

  /**
   * Create a product card element from template
   */
  createProductCard(product, index) {
    if (!this.template) return null;

    const clone = this.template.content.cloneNode(true);
    const li = clone.querySelector('li');

    if (li) {
      li.id = `Slide-${this.sectionId}-${index + 1}`;
    }

    // Set links
    const links = clone.querySelectorAll('a');
    links.forEach((link) => {
      link.href = product.url;
    });

    // Set title
    const titleLink = clone.querySelector('.recently-viewed-card__title-link');
    if (titleLink) {
      titleLink.textContent = product.title;
      titleLink.href = product.url;
    }

    // Set image
    const image = clone.querySelector('.recently-viewed-card__image');
    if (image && product.image) {
      // Use Shopify image URL with size parameter if it's a Shopify CDN URL
      const imageUrl = this.getResizedImageUrl(product.image, 600);
      image.src = imageUrl;
      image.alt = product.title;
    }

    // Set secondary image if available
    const secondaryImage = clone.querySelector('.recently-viewed-card__image-secondary');
    if (secondaryImage && product.secondaryImage) {
      const secondaryUrl = this.getResizedImageUrl(product.secondaryImage, 600);
      secondaryImage.src = secondaryUrl;
      secondaryImage.alt = product.title;
      secondaryImage.hidden = false;
    }

    // Set vendor
    const vendor = clone.querySelector('.recently-viewed-card__vendor');
    if (vendor) {
      vendor.textContent = product.vendor || '';
      if (!product.vendor) {
        vendor.style.display = 'none';
      }
    }

    // Set price
    const price = clone.querySelector('.recently-viewed-card__price');
    if (price) {
      price.textContent = product.priceFormatted || '';
    }

    return clone;
  }

  /**
   * Get resized image URL for Shopify CDN images
   */
  getResizedImageUrl(url, width) {
    if (!url) return '';

    // Check if it's a Shopify CDN URL
    if (url.includes('cdn.shopify.com')) {
      // Insert width parameter before the file extension
      return url.replace(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i, `_${width}x.$1$2`);
    }

    return url;
  }

  /**
   * Clear viewing history
   */
  clearHistory() {
    this.saveProducts([]);
    this.renderProducts();

    // Dispatch custom event for other components
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
 * This ensures products are tracked even if the recently viewed section isn't present
 */
document.addEventListener('DOMContentLoaded', () => {
  // Only run if not already handled by the custom element
  if (document.querySelector('recently-viewed-products')) return;

  // Check if on product page
  const isProductPage = window.location.pathname.includes('/products/');
  if (!isProductPage) return;

  // Track the product using meta tags as fallback
  const productIdMatch = window.location.pathname.match(/\/products\/([^/?#]+)/);
  if (!productIdMatch) return;

  const handle = productIdMatch[1];
  const title = document.querySelector('meta[property="og:title"]')?.content || '';
  const image = document.querySelector('meta[property="og:image"]')?.content || '';
  const price = document.querySelector('meta[property="product:price:amount"]')?.content || '';
  const currency = document.querySelector('meta[property="product:price:currency"]')?.content || 'MDL';

  // Get product ID from main-product section if available
  const mainProduct = document.querySelector('[data-product-id]');
  const productId = mainProduct?.dataset.productId || handle;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let products = stored ? JSON.parse(stored) : [];

    // Remove if exists
    products = products.filter((p) => String(p.id) !== String(productId) && p.handle !== handle);

    // Add to front
    products.unshift({
      id: productId,
      handle: handle,
      title: title,
      url: `/products/${handle}`,
      vendor: '',
      price: parseFloat(price) * 100 || 0,
      priceFormatted: price ? `${price} ${currency}` : '',
      image: image,
      secondaryImage: null,
      timestamp: Date.now(),
    });

    // Limit
    if (products.length > MAX_PRODUCTS) {
      products = products.slice(0, MAX_PRODUCTS);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  } catch (e) {
    console.warn('RecentlyViewed: Error tracking product', e);
  }
});
