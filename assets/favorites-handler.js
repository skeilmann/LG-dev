/**
 * Handles favorite product functionality for both logged-in and non-logged-in users
 * Manages favorites storage, UI updates, and navigation to favorites page
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
                const guestData = localStorage.getItem('guestFavorites');
                if (guestData) {
                    try {
                        const parsed = JSON.parse(guestData);
                        if (parsed && parsed.saved && Array.isArray(parsed.saved)) {
                            this.migrateGuestFavorites(parsed.saved);
                        }
                    } catch (e) {
                        console.error('Error parsing guest favorites:', e);
                    }
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
        root.querySelectorAll('.favorite-icon').forEach(icon => {
            icon.style.removeProperty('display');
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

        this.updateFavoritesBubble();
    }

    /**
     * Loads favorites from customer metafields (logged-in users) or localStorage (guests)
     * Expected format: {saved: [{id, handle}, ...]}
     * @returns {Promise<Map>} Map of favorite products
     */
    async loadFavorites() {
        try {
            if (this.isLoggedIn) {
                return this.loadFavoritesFromMetafield();
            } else {
                return this.loadFavoritesFromLocalStorage();
            }
        } catch (e) {
            console.error('Error loading favorites:', e);
            return new Map();
        }
    }

    /**
     * Loads favorites from customer metafield (logged-in users)
     * Expected format: {saved: [{id, handle}, ...]}
     * @returns {Map} Map of favorite products
     * @private
     */
    loadFavoritesFromMetafield() {
        if (!window.Shopify || !window.Shopify.favorites) {
            return new Map();
        }

        let metafieldData = window.Shopify.favorites;

        // Handle null, undefined, or empty
        if (!metafieldData || metafieldData === 'null' || metafieldData === '') {
            return new Map();
        }

        // Parse JSON string if needed
        if (typeof metafieldData === 'string') {
            try {
                metafieldData = JSON.parse(metafieldData);
            } catch (e) {
                console.error('Error parsing favorites metafield:', e);
                return new Map();
            }
        }

        // Handle expected format: {saved: [{id, handle}, ...]}
        if (metafieldData && typeof metafieldData === 'object' && metafieldData.saved && Array.isArray(metafieldData.saved)) {
            const favorites = new Map();
            metafieldData.saved.forEach(item => {
                if (item && item.id) {
                    const id = typeof item.id === 'number' ? item.id : parseInt(item.id, 10);
                    const handle = item.handle || '';
                    if (id && !isNaN(id)) {
                        favorites.set(id, {
                            id: id,
                            handle: handle.includes('%') ? decodeURIComponent(handle) : handle
                        });
                    }
                }
            });
            return favorites;
        }

        console.warn('Favorites metafield format not recognized. Expected: {saved: [{id, handle}, ...]}');
        return new Map();
    }

    /**
     * Loads favorites from localStorage (guests)
     * Expected format: {saved: [{id, handle}, ...]}
     * @returns {Map} Map of favorite products
     * @private
     */
    loadFavoritesFromLocalStorage() {
        try {
            const stored = localStorage.getItem('guestFavorites');
            if (!stored) return new Map();

            const parsed = JSON.parse(stored);
            if (!parsed || !parsed.saved || !Array.isArray(parsed.saved)) {
                return new Map();
            }

            const favorites = new Map();
            parsed.saved.forEach(item => {
                if (item && item.id) {
                    const id = typeof item.id === 'number' ? item.id : parseInt(item.id, 10);
                    const handle = item.handle || '';
                    if (id && !isNaN(id)) {
                        favorites.set(id, {
                            id: id,
                            handle: handle.includes('%') ? decodeURIComponent(handle) : handle
                        });
                    }
                }
            });
            return favorites;
        } catch (e) {
            console.error('Error loading favorites from localStorage:', e);
            return new Map();
        }
    }

    /**
     * Saves favorites to localStorage (for guests only)
     * Format: {saved: [{id, handle}, ...]}
     * @private
     */
    saveFavorites() {
        if (this.isLoggedIn) {
            return; // Logged-in users sync to server, not localStorage
        }

        try {
            const favoritesArray = Array.from(this.favorites.values());
            const data = { saved: favoritesArray };
            localStorage.setItem('guestFavorites', JSON.stringify(data));
        } catch (e) {
            console.warn('localStorage is not available:', e);
        }
    }

    /**
     * Sets up event listeners for favorites functionality
     * @private
     */
    setupEventListeners() {
        document.addEventListener('click', (e) => {
            const favoriteButton = e.target.closest('.favorite-icon');
            if (favoriteButton?.dataset.productId) {
                this.toggleFavorite(favoriteButton.dataset.productId);
                return;
            }

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
     * For logged-in users: syncs to metafield via app
     * For guests: saves to localStorage
     * @param {string|number} productId - Product ID to toggle
     */
    toggleFavorite(productId) {
        const id = parseInt(productId, 10);
        const wasFavorite = this.favorites.has(id);

        if (wasFavorite) {
            this.favorites.delete(id);
        } else {
            const handle = this.extractProductHandle(id);
            if (!handle) {
                console.warn('Could not extract handle for product ID:', id);
            }
            this.favorites.set(id, { id, handle: handle || '' });
            this.showFavoritesNotification(id, handle);
        }

        if (this.isLoggedIn) {
            this.syncFavoritesToServer();
        } else {
            this.saveFavorites();
        }

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

        let container = element.closest('.card-wrapper, .card, .product-card-wrapper');
        if (!container) {
            container = document.querySelector('.product__info-wrapper, .product__info-container');
        }
        if (!container) {
            return null;
        }

        let link = container.querySelector('a[href*="/products/"]');
        if (!link) {
            link = element.closest('a[href*="/products/"]');
        }
        if (!link) {
            link = document.querySelector('link[rel="canonical"]');
        }

        if (link) {
            const href = link.getAttribute('href') || link.getAttribute('content');
            const match = href?.match(/\/products\/([^/?#]+)/);
            if (match) {
                return decodeURIComponent(match[1]);
            }
        }

        return null;
    }

    /**
     * Sync favorites to server/metafield (for logged-in users)
     * Sends: {customerId, favorites: [{id, handle}, ...]}
     * @private
     */
    async syncFavoritesToServer() {
        if (!this.isLoggedIn || !window.Shopify?.customerId) {
            return;
        }

        try {
            const favoritesArray = Array.from(this.favorites.values());
            console.log('Syncing favorites to server:', favoritesArray.length, 'items');

            const response = await fetch('http://31.97.184.19:3000/api/sync-favorites', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': 'Gheorghe2025VeV'
                },
                body: JSON.stringify({
                    customerId: window.Shopify.customerId,
                    favorites: favoritesArray
                })
            });

            if (response.ok) {
                console.log('Favorites synced successfully to metafield');
            } else {
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
     * Reads from localStorage format: {saved: [{id, handle}, ...]}
     * Sends to app: {customerId, favorites: [{id, handle}, ...]}
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

        const favoritesToSync = guestFavorites
            .filter(obj => obj && obj.id)
            .map(obj => ({
                id: typeof obj.id === 'number' ? obj.id : parseInt(obj.id, 10),
                handle: obj.handle || ''
            }))
            .filter(fav => fav.id && !isNaN(fav.id));

        if (favoritesToSync.length === 0) {
            return;
        }

        try {
            console.log('Migrating guest favorites to metafield:', favoritesToSync.length, 'items');
            const response = await fetch('http://31.97.184.19:3000/api/sync-favorites', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': 'Gheorghe2025VeV'
                },
                body: JSON.stringify({
                    customerId: customerId,
                    favorites: favoritesToSync
                })
            });

            if (response.ok) {
                console.log('Guest favorites migrated successfully to metafield');
                localStorage.removeItem('guestFavorites');
                // Reload favorites from metafield after migration
                this.favorites = await this.loadFavorites();
                this.updateButtons();
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
        let notification = document.querySelector('favorites-notification');
        if (!notification) {
            await new Promise(resolve => setTimeout(resolve, 200));
            notification = document.querySelector('favorites-notification');
        }
        if (!notification || !customElements.get('favorites-notification')) {
            console.warn('Favorites notification element not found');
            return;
        }

        try {
            // Try to get product data from Shopify object first
            if (window.Shopify?.product && Number(window.Shopify.product.id) === productId) {
                const productHtml = this.buildProductNotificationHTML(window.Shopify.product);
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
        let imageUrl = '';
        if (image) {
            if (typeof image === 'string') {
                if (image.includes('cdn.shopify.com') || image.includes('/cdn/shop/')) {
                    imageUrl = image.replace(/_(\d+x\d+|\d+x|x\d+)?\.(jpg|jpeg|png|gif|webp)/i, '_70x.$2') || image.replace(/\.(jpg|jpeg|png|gif|webp)/i, '_70x.$1');
                } else {
                    imageUrl = image;
                }
            } else if (image.src) {
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
});
