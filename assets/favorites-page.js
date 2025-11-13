/**
 * Favorites Page Component
 * Handles displaying favorite products from localStorage
 * Uses existing card-product-standalone section for consistent rendering
 */
class FavoritesPage extends HTMLElement {
    constructor() {
      super();
      this.initialized = false;
    }

    connectedCallback() {
      // Query for elements after the element is connected to DOM
      this.grid = this.querySelector('[id^="Favorites-Grid-"]');
      
      if (!this.grid) {
        console.error('Favorites grid not found');
        return;
      }
      
      this.sectionId = this.grid.dataset.sectionId;
      this.enableSlider = this.grid.dataset.enableSlider === 'true';
      this.emptyTemplate = document.getElementById('favorites-empty-template');
      
      // Get settings from data attributes
      this.settings = {
        showVendor: this.grid.dataset.showVendor === 'true',
        showRating: this.grid.dataset.showRating === 'true',
        imageRatio: this.grid.dataset.imageRatio || 'square',
        imageShape: this.grid.dataset.imageShape || 'default'
      };

      // Initialize only once
      if (!this.initialized) {
        this.initialized = true;
        this.loadFavorites();
        
        // Listen for favorites changes
        window.addEventListener('favorites:changed', () => {
          this.loadFavorites();
        });
      }
    }

    /**
     * Load favorites from localStorage and render products
     */
    async loadFavorites() {
      if (!this.grid) {
        console.error('Grid not found');
        return;
      }

      const favorites = this.getFavoritesFromStorage();
      
      if (!favorites || favorites.length === 0) {
        this.renderEmptyState();
        return;
      }

      await this.renderProducts(favorites);
    }

    /**
     * Get favorites from localStorage
     * @returns {Array} Array of favorite objects with {id, handle}
     */
    getFavoritesFromStorage() {
      try {
        const stored = localStorage.getItem('guestFavorites');
        if (!stored) return [];
        
        const favorites = JSON.parse(stored);
        if (!Array.isArray(favorites)) return [];
        
        // Filter out favorites without handles and decode any URL-encoded handles
        return favorites
          .filter(fav => fav && fav.handle)
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
     * @param {Array} favorites - Array of favorite products
     */
    async renderProducts(favorites) {
      // Clear current content
      this.grid.innerHTML = '';
      
      let successCount = 0;
      let slideIndex = 1;

      // Fetch products in parallel for better performance
      const productPromises = favorites.map(fav => 
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
          console.error('Failed to fetch product:', favorites[index].handle, result.reason);
        }
      });

      // If no products were successfully loaded, show empty state
      if (successCount === 0) {
        this.renderEmptyState();
        return;
      }

      // Initialize slider if enabled
      if (this.enableSlider) {
        this.initializeSlider();
      }

      // Update favorite buttons state
      if (window.favoritesHandler) {
        window.favoritesHandler.updateButtons(this);
      }
    }

    /**
     * Fetch product card HTML from server
     * @param {string} handle - Product handle
     * @returns {Promise<string|null>} Product card HTML or null
     */
    async fetchProductCard(handle) {
      try {
        const response = await fetch(
          `/products/${handle}?section_id=card-product-standalone`,
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
      
      if (this.enableSlider) {
        li.classList.add('slider__slide');
        li.id = `Slide-${this.sectionId}-${slideIndex}`;
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
      
      if (!sliderComponent) return;

      // Reset slider pages if method exists
      if (typeof sliderComponent.resetPages === 'function') {
        sliderComponent.resetPages();
      } else {
        // Fallback: trigger resize event to recalculate slider
        window.dispatchEvent(new Event('resize'));
      }
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
  // Find the favorites grid
  const grid = document.querySelector('[id^="Favorites-Grid-"]');
  
  if (!grid) {
    return;
  }
  
  // Create instance and initialize directly
  const favoritesPage = new FavoritesPage();
  favoritesPage.grid = grid;
  favoritesPage.sectionId = grid.dataset.sectionId;
  favoritesPage.enableSlider = grid.dataset.enableSlider === 'true';
  favoritesPage.emptyTemplate = document.getElementById('favorites-empty-template');
  
  favoritesPage.settings = {
    showVendor: grid.dataset.showVendor === 'true',
    showRating: grid.dataset.showRating === 'true',
    imageRatio: grid.dataset.imageRatio || 'square',
    imageShape: grid.dataset.imageShape || 'default'
  };
  
  // Load favorites
  favoritesPage.loadFavorites();
  
  // Listen for favorites changes
  window.addEventListener('favorites:changed', () => {
    favoritesPage.loadFavorites();
  });
}

// Handle both cases: DOM already loaded or still loading
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeFavoritesPage);
} else {
  // DOM is already loaded (script with defer attribute)
  initializeFavoritesPage();
}

