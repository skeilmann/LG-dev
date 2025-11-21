/**
 * Favorites Page Component
 * Handles displaying favorite products from localStorage (guests) or customer metafields (logged-in users)
 * Expected format: {saved: [{id, handle}, ...]}
 */
class FavoritesPage extends HTMLElement {
    constructor() {
      super();
      this.initialized = false;
      this.isLoggedIn = !!(window.Shopify && window.Shopify.customerId);
    }

    connectedCallback() {
      this.grid = this.querySelector('[id^="Slider-"]');
      
      if (!this.grid) {
        console.error('Favorites grid not found');
        return;
      }
      
      this.sectionId = this.grid.dataset.sectionId;
      this.enableSlider = this.grid.dataset.enableSlider === 'true';
      this.emptyTemplate = document.getElementById('favorites-empty-template');
      
      this.settings = {
        showVendor: this.grid.dataset.showVendor === 'true',
        showRating: this.grid.dataset.showRating === 'true',
        showSecondaryImage: this.grid.dataset.showSecondaryImage === 'true',
        imageRatio: this.grid.dataset.imageRatio || 'square',
        imageShape: this.grid.dataset.imageShape || 'default',
        quickAdd: this.grid.dataset.quickAdd || 'standard'
      };

      if (!this.initialized) {
        this.initialized = true;
        this.loadFavorites();
        
        window.addEventListener('favorites:changed', () => {
          this.loadFavorites();
        });
      }
    }

    /**
     * Load favorites and render products
     */
    async loadFavorites() {
      if (!this.grid) {
        console.error('Grid not found');
        return;
      }

      const favorites = this.getFavorites();
      
      if (!favorites || favorites.length === 0) {
        this.renderEmptyState();
        return;
      }

      await this.renderProducts(favorites);
    }

    /**
     * Get favorites from handler, metafield, or localStorage
     * Expected format: {saved: [{id, handle}, ...]}
     * @returns {Array} Array of favorite objects with {id, handle}
     */
    getFavorites() {
      try {
        // First, try to get from favorites handler (most up-to-date)
        if (window.favoritesHandler && window.favoritesHandler.favorites && window.favoritesHandler.favorites.size > 0) {
          const handlerFavorites = Array.from(window.favoritesHandler.favorites.values());
          if (handlerFavorites.length > 0) {
            return handlerFavorites
              .filter(fav => fav && fav.handle)
              .map(fav => ({
                ...fav,
                handle: fav.handle.includes('%') ? decodeURIComponent(fav.handle) : fav.handle
              }));
          }
        }
        
        // For logged-in users, fall back to customer metafield
        if (this.isLoggedIn && window.Shopify && window.Shopify.favorites) {
          return this.getFavoritesFromMetafield();
        }
        
        // For guests, use localStorage
        return this.getFavoritesFromLocalStorage();
      } catch (error) {
        console.error('Error reading favorites:', error);
        return [];
      }
    }

    /**
     * Get favorites from metafield
     * Expected format: {saved: [{id, handle}, ...]}
     * @returns {Array} Array of favorite objects
     * @private
     */
    getFavoritesFromMetafield() {
      let metafieldData = window.Shopify.favorites;
      
      if (!metafieldData || metafieldData === 'null' || metafieldData === '') {
        return [];
      }
      
      if (typeof metafieldData === 'string') {
        try {
          metafieldData = JSON.parse(metafieldData);
        } catch (e) {
          console.error('Error parsing favorites metafield:', e);
          return [];
        }
      }
      
      // Handle expected format: {saved: [{id, handle}, ...]}
      if (metafieldData && typeof metafieldData === 'object' && metafieldData.saved && Array.isArray(metafieldData.saved)) {
        return metafieldData.saved
          .filter(fav => fav && fav.id && fav.handle)
          .map(fav => {
            const normalized = {
              id: typeof fav.id === 'number' ? fav.id : parseInt(fav.id, 10),
              handle: fav.handle || ''
            };
            
            if (normalized.handle && normalized.handle.includes('%')) {
              normalized.handle = decodeURIComponent(normalized.handle);
            }
            
            return normalized;
          })
          .filter(fav => fav.id && fav.handle);
      }
      
      return [];
    }

    /**
     * Get favorites from localStorage
     * Expected format: {saved: [{id, handle}, ...]}
     * @returns {Array} Array of favorite objects
     * @private
     */
    getFavoritesFromLocalStorage() {
      try {
        const stored = localStorage.getItem('guestFavorites');
        if (!stored) return [];
        
        const parsed = JSON.parse(stored);
        if (!parsed || !parsed.saved || !Array.isArray(parsed.saved)) {
          return [];
        }
        
        return parsed.saved
          .filter(fav => fav && fav.id && fav.handle)
          .map(fav => ({
            ...fav,
            handle: fav.handle.includes('%') ? decodeURIComponent(fav.handle) : fav.handle
          }));
      } catch (error) {
        console.error('Error reading favorites from localStorage:', error);
        return [];
      }
    }

    /**
     * Render favorite products
     * @param {Array} favorites - Array of favorite products with {id, handle}
     */
    async renderProducts(favorites) {
      this.grid.innerHTML = '';
      
      const favoritesWithHandles = favorites.filter(fav => fav && fav.handle);
      
      if (favoritesWithHandles.length === 0) {
        this.renderEmptyState();
        return;
      }
      
      let successCount = 0;
      let slideIndex = 1;

      const productPromises = favoritesWithHandles.map(fav => 
        this.fetchProductCard(fav.handle)
      );

      const results = await Promise.allSettled(productPromises);

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          const li = this.createListItem(result.value, slideIndex);
          this.grid.appendChild(li);
          successCount++;
          if (this.enableSlider) slideIndex++;
        } else if (result.status === 'rejected') {
          console.error('Failed to fetch product:', favoritesWithHandles[index].handle, result.reason);
        }
      });

      if (successCount === 0) {
        this.renderEmptyState();
        return;
      }

      if (window.favoritesHandler) {
        window.favoritesHandler.updateButtons(this);
      }

      if (this.enableSlider) {
        setTimeout(() => {
          this.initializeSlider();
        }, 100);
      }
    }

    /**
     * Fetch product card HTML from server
     * @param {string} handle - Product handle
     * @returns {Promise<string|null>} Product card HTML or null
     */
    async fetchProductCard(handle) {
      try {
        const params = new URLSearchParams({
          section_id: 'card-product-standalone',
          show_vendor: this.settings.showVendor ? 'true' : 'false',
          show_rating: this.settings.showRating ? 'true' : 'false',
          show_secondary_image: this.settings.showSecondaryImage ? 'true' : 'false',
          image_ratio: this.settings.imageRatio || 'square',
          image_shape: this.settings.imageShape || 'default',
          quick_add: this.settings.quickAdd || 'standard',
          section_id_param: this.sectionId || ''
        });

        const response = await fetch(
          `/products/${handle}?${params.toString()}`,
          {
            method: 'GET',
            headers: {
              'Accept': 'text/html'
            }
          }
        );

        if (!response.ok) {
          return null;
        }

        const html = await response.text();
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        const cardWrapper = tempDiv.querySelector('.card-wrapper');
        return cardWrapper ? cardWrapper.outerHTML : null;
      } catch (error) {
        console.error(`Error fetching product ${handle}:`, error);
        return null;
      }
    }

    /**
     * Create list item element for product card
     * @param {string} cardHTML - Product card HTML
     * @param {number} slideIndex - Slide index for slider
     * @returns {HTMLElement} List item element
     */
    createListItem(cardHTML, slideIndex) {
      const li = document.createElement('li');
      li.className = 'grid__item';
      li.id = `Slide-${this.sectionId}-${slideIndex}`;
      
      if (this.enableSlider) {
        li.classList.add('slider__slide');
      }
      
      li.innerHTML = cardHTML;
      return li;
    }

    /**
     * Render empty state when no favorites exist
     */
    renderEmptyState() {
      if (!this.emptyTemplate) {
        this.grid.innerHTML = `
          <li class="grid__item grid__item--full-width">
            <div class="collection collection--empty">
              <div class="title-wrapper center">
                <h2 class="title">${this.getTranslation('favorites.empty', 'You haven\'t added any favorites yet')}</h2>
                <a href="/collections" class="button">
                  ${this.getTranslation('favorites.browse_products', 'Browse Products')}
                </a>
              </div>
            </div>
          </li>
        `;
        return;
      }

      const emptyContent = this.emptyTemplate.content.cloneNode(true);
      this.grid.innerHTML = '';
      this.grid.appendChild(emptyContent);
    }

    /**
     * Initialize slider component
     */
    initializeSlider() {
      const sliderComponent = this.grid.closest('slider-component');
      
      if (!sliderComponent) {
        console.warn('Slider component not found');
        return;
      }

      if (!this.grid || this.grid.children.length === 0) {
        console.warn('Slider grid has no items');
        return;
      }

      requestAnimationFrame(() => {
        if (!sliderComponent.slider) {
          setTimeout(() => {
            this.initializeSlider();
          }, 50);
          return;
        }

        if (typeof sliderComponent.resetPages === 'function') {
          sliderComponent.resetPages();
        } else {
          window.dispatchEvent(new Event('resize'));
        }
      });
    }

    /**
     * Get translation with fallback
     * @param {string} key - Translation key
     * @param {string} fallback - Fallback text
     * @returns {string} Translated text
     */
    getTranslation(key, fallback) {
      const keys = key.split('.');
      let value = window.translations || {};
      
      for (const k of keys) {
        value = value[k];
        if (!value) return fallback;
      }
      
      return value || fallback;
    }
  }

// Register custom element if not already registered
if (!customElements.get('favorites-page')) {
  customElements.define('favorites-page', FavoritesPage);
}

// Initialize favorites page
function initializeFavoritesPage() {
  const grid = document.querySelector('[id^="Slider-"]');
  
  if (!grid || !grid.dataset.sectionId) {
    return;
  }
  
  const favoritesPage = new FavoritesPage();
  favoritesPage.grid = grid;
  favoritesPage.sectionId = grid.dataset.sectionId;
  favoritesPage.enableSlider = grid.dataset.enableSlider === 'true';
  favoritesPage.emptyTemplate = document.getElementById('favorites-empty-template');
  
  favoritesPage.settings = {
    showVendor: grid.dataset.showVendor === 'true',
    showRating: grid.dataset.showRating === 'true',
    showSecondaryImage: grid.dataset.showSecondaryImage === 'true',
    imageRatio: grid.dataset.imageRatio || 'square',
    imageShape: grid.dataset.imageShape || 'default',
    quickAdd: grid.dataset.quickAdd || 'standard'
  };
  
  favoritesPage.loadFavorites();
  
  window.addEventListener('favorites:changed', () => {
    favoritesPage.loadFavorites();
  });
}

// Handle both cases: DOM already loaded or still loading
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeFavoritesPage);
} else {
  initializeFavoritesPage();
}
