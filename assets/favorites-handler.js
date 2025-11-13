/**
 * Handles favorite product functionality for both logged-in and non-logged-in users
 * Manages favorites storage, UI updates, and navigation to favorites page
 * Optimized version - removed redundant code and unnecessary data collection
 */
class FavoritesHandler {
    constructor() {
        this.isLoggedIn = !!(window.Shopify && window.Shopify.customerId);
        this.favorites = new Map(); // id -> {id, handle}

        this.loadFavorites().then(favorites => {
            this.favorites = favorites;
            this.initializeUI();

            // Migrate guest favorites to user account on login
            if (this.isLoggedIn) {
                const guestFavorites = localStorage.getItem('guestFavorites');
                if (guestFavorites) {
                    this.migrateGuestFavorites(JSON.parse(guestFavorites));
                }
            }
        });
    }

    /**
     * Initializes UI elements and sets up event listeners
     * @private
     */
    initializeUI() {
        this.updateButtons();
        this.setupEventListeners();
    }

    /**
     * Updates visibility and state of all favorite buttons in the UI
     * @private
     * @param {HTMLElement} [root=document] - Root element to search from
     */
    updateButtons(root = document) {
        // Show .heart-icon for logged-in users
        root.querySelectorAll('.heart-icon').forEach(icon => {
            icon.style.removeProperty('display');
            icon.classList.toggle('hidden', !this.isLoggedIn);
        });

        // Show .header__icon containing .heart-empty for logged-in users
        root.querySelectorAll('.header__icon').forEach(headerIcon => {
            const heartEmpty = headerIcon.querySelector('.heart-empty');
            const favIcon = headerIcon.classList.contains('header__icon--favorites')
                ? headerIcon
                : headerIcon.querySelector('.header__icon--favorites');
            if (heartEmpty) {
                headerIcon.style.removeProperty('display');
                headerIcon.classList.toggle('hidden', !this.isLoggedIn);
            }
            if (favIcon) {
                favIcon.style.removeProperty('display');
                favIcon.classList.toggle('hidden', this.isLoggedIn);
            }
        });

        // Handle favorite icons for non-logged-in users
        root.querySelectorAll('.favorite-icon').forEach(icon => {
            icon.style.removeProperty('display');
            icon.classList.toggle('hidden', this.isLoggedIn);

            if (!this.isLoggedIn && icon.dataset.productId) {
                const id = parseInt(icon.dataset.productId, 10);
                const isFavorite = this.favorites.has(id);
                icon.classList.toggle('active', isFavorite);
                icon.setAttribute('aria-label',
                    isFavorite ?
                        this.getTranslation('customer.favorites.remove', 'Remove from Favorites') :
                        this.getTranslation('customer.favorites.add', 'Add to Favorites')
                );
            }
        });

        // Update favorites count bubble
        this.updateFavoritesBubble();
    }

    /**
     * Loads favorites from localStorage or Shopify customer data
     * @returns {Promise<Map>} Map of favorite products
     */
    async loadFavorites() {
        try {
            if (this.isLoggedIn) {
                // For logged-in users, could load from customer metafields in the future
                return new Map();
            }
            
            const stored = localStorage.getItem('guestFavorites');
            if (!stored) return new Map();
            
            const parsed = JSON.parse(stored);
            if (!Array.isArray(parsed)) return new Map();
            
            // Create Map from array of {id, handle}
            const favorites = new Map();
            parsed.forEach(obj => {
                if (obj && obj.id) {
                    favorites.set(parseInt(obj.id, 10), { 
                        id: parseInt(obj.id, 10), 
                        handle: obj.handle 
                    });
                }
            });
            return favorites;
        } catch (e) {
            console.error('Error loading favorites:', e);
            return new Map();
        }
    }

    /**
     * Saves favorites to localStorage for non-logged-in users
     * @private
     */
    saveFavorites() {
        if (!this.isLoggedIn) {
            try {
                // Save array of {id, handle} - only essential data
                const favoritesArray = Array.from(this.favorites.values());
                localStorage.setItem('guestFavorites', JSON.stringify(favoritesArray));
            } catch (e) {
                console.warn('localStorage is not available:', e);
            }
        }
    }

    /**
     * Sets up event listeners for favorites functionality
     * @private
     */
    setupEventListeners() {
        if (this.isLoggedIn) return;

        // Handle favorite toggle and navigation to favorites page
        document.addEventListener('click', (e) => {
            // Toggle favorite
            const favoriteButton = e.target.closest('.favorite-icon');
            if (favoriteButton?.dataset.productId) {
                this.toggleFavorite(favoriteButton.dataset.productId);
                return;
            }

            // Navigate to favorites page
            const favoritesHeaderIcon = e.target.closest('.header__icon--favorites, #favorites-icon-bubble');
            if (favoritesHeaderIcon && !favoritesHeaderIcon.closest('.header__search')) {
                e.preventDefault();
                this.navigateToFavoritesPage();
            }
        });

        // Handle dynamically added elements
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.updateButtons(mutation.target);
                        break;
                    }
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    /**
     * Navigate to favorites page
     * @private
     */
    navigateToFavoritesPage() {
        // Use existing favorites data instead of re-reading from localStorage
        if (this.favorites.size > 0) {
            const handles = Array.from(this.favorites.values())
                .map(fav => fav.handle)
                .filter(Boolean);
            window.location.href = `/pages/favorites${handles.length ? '?favorites=' + handles.join(',') : ''}`;
        } else {
            window.location.href = '/pages/favorites';
        }
    }

    /**
     * Toggles favorite status for a product
     * @param {string|number} productId - Product ID to toggle
     */
    toggleFavorite(productId) {
        const id = parseInt(productId, 10);
        
        if (this.favorites.has(id)) {
            // Remove from favorites
            this.favorites.delete(id);
            if (this.isLoggedIn) {
                this.removeFavoriteFromServer(id);
            }
        } else {
            // Add to favorites - only store essential data (id and handle)
            const handle = this.extractProductHandle(id);
            
            if (!handle) {
                console.warn('Could not extract handle for product ID:', id);
            }
            
            this.favorites.set(id, { id, handle });
            if (this.isLoggedIn) {
                this.addFavoriteToServer(id);
            }
        }
        
        this.saveFavorites();
        this.updateButtons();
        this.notifyStateChange();
    }

    /**
     * Extracts product handle from DOM or Shopify object
     * @param {number} productId - Product ID
     * @returns {string|null} Product handle
     * @private
     */
    extractProductHandle(productId) {
        // Try Shopify global object first (fastest)
        if (window.Shopify?.product) {
            const shopifyProduct = window.Shopify.product;
            if (productId === Number(shopifyProduct.id) && shopifyProduct.handle) {
                return shopifyProduct.handle;
            }
        }

        // Try DOM extraction
        const element = document.querySelector(`[data-product-id='${productId}']`);
        if (!element) {
            return null;
        }

        // Find product card - try multiple selectors
        let container = element.closest('.card-wrapper, .card, .product-card-wrapper');
        
        if (!container) {
            // On product page, look for info wrapper
            container = document.querySelector('.product__info-wrapper, .product__info-container');
        }
        
        if (!container) {
            return null;
        }

        // Extract handle from product link
        let link = container.querySelector('a[href*="/products/"]');
        
        // Try parent link if not found in container
        if (!link) {
            link = element.closest('a[href*="/products/"]');
        }
        
        // Try canonical link as last resort (for product pages)
        if (!link) {
            link = document.querySelector('link[rel="canonical"]');
        }
        
        if (link) {
            const href = link.getAttribute('href') || link.getAttribute('content');
            const match = href?.match(/\/products\/([^/?#]+)/);
            if (match) {
                // Decode URL-encoded handles (e.g., Cyrillic characters)
                return decodeURIComponent(match[1]);
            }
        }

        return null;
    }

    /**
     * Add favorite to server (for logged-in users)
     * @param {number} productId - Product ID
     * @private
     */
    async addFavoriteToServer(productId) {
        try {
            await fetch('/api/favorites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    customerId: window.Shopify.customerId, 
                    productId 
                })
            });
        } catch (e) {
            console.error('Error adding favorite to server:', e);
        }
    }

    /**
     * Remove favorite from server (for logged-in users)
     * @param {number} productId - Product ID
     * @private
     */
    async removeFavoriteFromServer(productId) {
        try {
            await fetch('/api/favorites', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    customerId: window.Shopify.customerId, 
                    productId 
                })
            });
        } catch (e) {
            console.error('Error removing favorite from server:', e);
        }
    }

    /**
     * Updates the favorites count bubble in the header
     * @private
     */
    updateFavoritesBubble() {
        const bubble = document.getElementById('favorites-count-bubble');
        const countElement = document.getElementById('favorites-count');
        const count = this.favorites.size;

        if (bubble && countElement) {
            if (count > 0) {
                bubble.style.display = 'flex';
                countElement.textContent = count < 100 ? count : '99+';
                
                // Update the visually hidden text
                const visuallyHidden = bubble.querySelector('.visually-hidden');
                if (visuallyHidden) {
                    const translation = this.getTranslation('customer.favorites.count', '{{ count }} favorites');
                    visuallyHidden.textContent = translation.replace('{{ count }}', count);
                }
            } else {
                bubble.style.display = 'none';
            }
        }
    }

    /**
     * Notifies listeners of favorites state changes
     * @private
     */
    notifyStateChange() {
        window.dispatchEvent(new CustomEvent('favorites:changed', {
            detail: { 
                favorites: Array.from(this.favorites.keys()),
                count: this.favorites.size
            }
        }));
    }

    /**
     * Migrates guest favorites to user favorites after login
     * @param {Array} guestFavorites - Array of guest favorite products
     * @private
     */
    async migrateGuestFavorites(guestFavorites) {
        if (!Array.isArray(guestFavorites) || !guestFavorites.length) {
            return;
        }
        
        const customerId = window.Shopify?.customerId;
        if (!customerId) {
            return;
        }

        // Map to IDs for server sync
        const ids = guestFavorites
            .map(obj => obj.id ? obj.id.toString() : null)
            .filter(Boolean);

        try {
            const response = await fetch('https://vev-app.onrender.com/api/sync-favorites', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': 'Gheorghe2025VeV'
                },
                body: JSON.stringify({
                    customerId: window.Shopify.customerId,
                    favorites: ids
                })
            });
            
            if (response.ok) {
                localStorage.removeItem('guestFavorites');
            } else {
                const text = await response.text();
                console.error('Failed to migrate favorites:', text);
            }
        } catch (error) {
            console.error('Error migrating guest favorites:', error);
        }
    }

    /**
     * Get translation with fallback
     * @param {string} key - Translation key (dot notation)
     * @param {string} fallback - Fallback text
     * @returns {string} Translated text
     * @private
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

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    window.favoritesHandler = new FavoritesHandler();

    // Wake up backend on login link interaction
    document.addEventListener('pointerdown', (e) => {
        const loginLink = e.target.closest('.header__icon--account');
        if (loginLink) {
            fetch('https://vev-app.onrender.com/api/ping').catch(() => {});
        }
    });
});

