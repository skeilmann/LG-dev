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
        // Handle favorite icons for all users (logged-in and guests)
        root.querySelectorAll('.favorite-icon').forEach(icon => {
            icon.style.removeProperty('display');
            // Always show favorite icons for all users
            icon.classList.remove('hidden');

            if (icon.dataset.productId) {
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
     * Loads favorites from customer metafields (logged-in users) or localStorage (guests)
     * @returns {Promise<Map>} Map of favorite products
     */
    async loadFavorites() {
        try {
            if (this.isLoggedIn) {
                // For logged-in users, load from customer metafields
                if (window.Shopify && window.Shopify.favorites) {
                    const metafieldFavorites = window.Shopify.favorites;
                    
                    // Handle different metafield formats
                    if (Array.isArray(metafieldFavorites)) {
                        const favorites = new Map();
                        metafieldFavorites.forEach(obj => {
                            if (obj && obj.id) {
                                const id = typeof obj.id === 'number' ? obj.id : parseInt(obj.id, 10);
                                const handle = obj.handle || '';
                                
                                // Only add if we have both id and handle
                                if (id && handle) {
                                    favorites.set(id, { 
                                        id: id, 
                                        handle: handle.includes('%') ? decodeURIComponent(handle) : handle
                                    });
                                }
                            }
                        });
                        return favorites;
                    }
                }
                
                // If metafield is not available or not an array, return empty Map
                return new Map();
            }
            
            // For guests, use localStorage
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
     * Saves favorites to localStorage (for guests) or syncs to server (for logged-in users)
     * @private
     */
    saveFavorites() {
        if (this.isLoggedIn) {
            // For logged-in users, favorites are synced to metafield via the app
            // The app handles the sync, so we don't need to do anything here
            return;
        }
        
        // For guests, save to localStorage
        try {
            // Save array of {id, handle} - only essential data
            const favoritesArray = Array.from(this.favorites.values());
            localStorage.setItem('guestFavorites', JSON.stringify(favoritesArray));
        } catch (e) {
            console.warn('localStorage is not available:', e);
        }
    }

    /**
     * Sets up event listeners for favorites functionality
     * @private
     */
    setupEventListeners() {
        // Handle favorite toggle and navigation to favorites page for all users
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
        const wasFavorite = this.favorites.has(id);
        
        if (wasFavorite) {
            // Remove from favorites
            this.favorites.delete(id);
        } else {
            // Add to favorites - only store essential data (id and handle)
            const handle = this.extractProductHandle(id);
            
            if (!handle) {
                console.warn('Could not extract handle for product ID:', id);
            }
            
            this.favorites.set(id, { id, handle });
            
            // Show notification when adding to favorites
            this.showFavoritesNotification(id, handle);
        }
        
        // Sync to server/metafield for logged-in users
        if (this.isLoggedIn) {
            this.syncFavoritesToServer();
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
     * Sync favorites to server/metafield (for logged-in users)
     * Syncs the entire favorites array to match the app's sync pattern
     * @private
     */
    async syncFavoritesToServer() {
        if (!this.isLoggedIn || !window.Shopify?.customerId) {
            return;
        }

        try {
            // Map to IDs array for server sync (same format as migration)
            const ids = Array.from(this.favorites.keys())
                .map(id => id.toString())
                .filter(Boolean);

            const response = await fetch('http://31.97.184.19:3000/api/sync-favorites', {
            // const response = await fetch('https://vev-app.onrender.com/api/sync-favorites', {
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
            
            if (!response.ok) {
                const text = await response.text();
                console.error('Failed to sync favorites:', text);
            }
        } catch (error) {
            console.error('Error syncing favorites to server:', error);
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
            const response = await fetch('http://31.97.184.19:3000/api/sync-favorites', {
            // const response = await fetch('https://vev-app.onrender.com/api/sync-favorites', {
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

    /**
     * Shows favorites notification when product is added to favorites
     * @param {number} productId - Product ID
     * @param {string} handle - Product handle
     * @private
     */
    async showFavoritesNotification(productId, handle) {
        // Wait for notification element to be available
        let notification = document.querySelector('favorites-notification');
        if (!notification) {
            // Wait a bit for custom element to be defined
            await new Promise(resolve => setTimeout(resolve, 200));
            notification = document.querySelector('favorites-notification');
        }
        if (!notification) {
            console.warn('Favorites notification element not found in DOM');
            return;
        }

        // Ensure the custom element is defined
        if (!customElements.get('favorites-notification')) {
            console.warn('Favorites notification custom element not defined');
            return;
        }

        try {
            // Try to get product data from Shopify object first (fastest)
            let productData = null;
            if (window.Shopify?.product && Number(window.Shopify.product.id) === productId) {
                productData = window.Shopify.product;
            }

            // If we have product data, use it directly
            if (productData) {
                const productHtml = this.buildProductNotificationHTML(productData);
                notification.renderContents({
                    id: productId,
                    html: `<div class="shopify-section">${productHtml}</div>`
                });
                return;
            }

            // Otherwise, fetch from server using handle
            if (!handle) {
                console.warn('Cannot show notification: missing product handle');
                return;
            }

            const response = await fetch(
                `/products/${handle}?section_id=favorites-notification-product`,
                {
                    method: 'GET',
                    headers: {
                        'Accept': 'text/html'
                    }
                }
            );

            if (!response.ok) {
                console.warn('Failed to fetch product data for notification');
                return;
            }

            const html = await response.text();
            notification.renderContents({
                id: productId,
                html: html
            });
        } catch (error) {
            console.error('Error showing favorites notification:', error);
        }
    }

    /**
     * Builds product notification HTML from Shopify product object
     * @param {Object} product - Shopify product object
     * @returns {string} HTML string
     * @private
     */
    buildProductNotificationHTML(product) {
        const image = product.featured_image || product.images?.[0];
        // Resize image URL to 70px width if it's a Shopify CDN URL
        let imageUrl = '';
        if (image) {
            if (typeof image === 'string') {
                // If it's already a URL string, try to resize it
                if (image.includes('cdn.shopify.com') || image.includes('/cdn/shop/')) {
                    // Replace existing size or add new size
                    imageUrl = image.replace(/_(\d+x\d+|\d+x|x\d+)?\.(jpg|jpeg|png|gif|webp)/i, '_70x.$2') || image.replace(/\.(jpg|jpeg|png|gif|webp)/i, '_70x.$1');
                } else {
                    imageUrl = image;
                }
            } else if (image.src) {
                // If it's an object with src property
                imageUrl = image.src;
                if (imageUrl.includes('cdn.shopify.com') || imageUrl.includes('/cdn/shop/')) {
                    imageUrl = imageUrl.replace(/_(\d+x\d+|\d+x|x\d+)?\.(jpg|jpeg|png|gif|webp)/i, '_70x.$2') || imageUrl.replace(/\.(jpg|jpeg|png|gif|webp)/i, '_70x.$1');
                }
            }
        }
        const imageAlt = (product.title || '').replace(/"/g, '&quot;');
        const vendor = product.vendor || '';
        const showVendor = window.theme?.settings?.show_vendor !== false;
        const productTitle = (product.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const vendorEscaped = vendor.replace(/</g, '&lt;').replace(/>/g, '&gt;');

        return `
            <div id="favorites-notification-product-${product.id}" class="favorites-item">
                ${imageUrl ? `
                <div class="favorites-notification-product__image global-media-settings">
                    <img
                        src="${imageUrl}"
                        alt="${imageAlt}"
                        width="70"
                        height="70"
                        loading="lazy"
                    >
                </div>
                ` : ''}
                <div>
                    ${showVendor && vendor ? `
                    <p class="caption-with-letter-spacing light">${vendorEscaped}</p>
                    ` : ''}
                    <h3 class="favorites-notification-product__name h4">
                        <a href="/products/${product.handle}" class="link">
                            ${productTitle}
                        </a>
                    </h3>
                </div>
            </div>
        `;
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

