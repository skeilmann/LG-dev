/**
 * Handles favorite product functionality for both logged-in and non-logged-in users
 * Manages favorites storage, UI updates, and modal interactions
 */
class FavoritesHandler {
    constructor() {
        this.isLoggedIn = !!(window.Shopify && window.Shopify.customerId);
        this.favorites = new Map(); // id -> {id, handle}
        this.idToHandle = new Map(); // id -> handle
        this.handleToId = new Map(); // handle -> id

        this.loadFavorites().then(favorites => {
            this.favorites = favorites;
            for (const [id, data] of this.favorites.entries()) {
                this.idToHandle.set(id, data.handle);
                this.handleToId.set(data.handle, id);
            }
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
                        (window.translations?.customer?.favorites?.remove || 'Remove from Favorites') :
                        (window.translations?.customer?.favorites?.add || 'Add to Favorites')
                );
            }
        });
    }

    /**
     * Loads favorites from localStorage or Shopify customer data
     * @returns {Map} Map of favorite products
     */
    async loadFavorites() {
        try {
            if (this.isLoggedIn) {
                return new Map(); // Or consider loading from customer metafields if needed
            }
            const stored = localStorage.getItem('guestFavorites');
            if (!stored) return new Map();
            const parsed = JSON.parse(stored);
            if (!Array.isArray(parsed)) return new Map();
            // parsed is array of {id, handle}
            const favorites = new Map();
            parsed.forEach(obj => {
                if (obj && obj.id) {
                    favorites.set(parseInt(obj.id, 10), { id: parseInt(obj.id, 10), handle: obj.handle });
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
                // Save array of {id, handle}
                const favoritesArray = Array.from(this.favorites.values());
                localStorage.setItem('guestFavorites', JSON.stringify(favoritesArray));
            } catch (e) {
                // Silently fail if localStorage is not available
            }
        }
    }

    /**
     * Sets up event listeners for favorites functionality
     * @private
     */
    setupEventListeners() {
        if (this.isLoggedIn) return;

        // Handle favorite toggle and modal open
        document.addEventListener('click', (e) => {
            const favoriteButton = e.target.closest('.favorite-icon');
            if (favoriteButton?.dataset.productId) {
                this.toggleFavorite(favoriteButton.dataset.productId);
            }

            const favoritesHeaderIcon = e.target.closest('.header__icon');
            if (favoritesHeaderIcon) {
                e.preventDefault();
                // Get favorites from localStorage (array of {id, handle})
                let favorites = [];
                try {
                    const stored = localStorage.getItem('guestFavorites');
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        favorites = parsed;
                    }
                } catch (e) { }
                if (favorites.length) {
                    // Render favorites page using handles
                    window.location.href = '/pages/favorites?favorites=' + favorites.map(f => f.handle).join(',');
                } else {
                    window.location.href = '/pages/favorites';
                }
            }
        });

        // Handle dynamically added elements
        new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.updateButtons(mutation.target);
                    }
                });
            });
        }).observe(document.body, { childList: true, subtree: true });
    }

    /**
     * Toggles favorite status for a product
     * @param {string|number} productId - Product ID to toggle
     */
    toggleFavorite(productId) {
        const id = parseInt(productId, 10);
        let handle = null, title = '', price = '', vendor = '', image = '';
        // Try to get handle and info from global Shopify object if on product page
        if (window.Shopify && window.Shopify.product) {
            const shopifyProduct = window.Shopify.product;

            // Use data only if we're on the product page and productId matches
            if (id === Number(shopifyProduct.id)) {
                handle = shopifyProduct.handle;
                title = shopifyProduct.title;
                if (shopifyProduct.selected_or_first_available_variant) {
                    price = shopifyProduct.selected_or_first_available_variant.price;
                } else if (shopifyProduct.price) {
                    price = shopifyProduct.price;
                }
                vendor = shopifyProduct.vendor;
                image = shopifyProduct.featured_image || shopifyProduct.featuredImage || (shopifyProduct.images && shopifyProduct.images[0]) || '';
            }

            // Fallback: if handle is still null but we're clearly on a product page
            if (!handle && shopifyProduct.handle) {
                handle = shopifyProduct.handle;
                title ||= shopifyProduct.title;
                price ||= shopifyProduct.selected_or_first_available_variant?.price || shopifyProduct.price;
                vendor ||= shopifyProduct.vendor;
                image ||= shopifyProduct.featured_image || shopifyProduct.featuredImage || (shopifyProduct.images && shopifyProduct.images[0]) || '';
            }
        }
        if (!handle) {
            // Try to get product info from DOM
            const el = document.querySelector(`[data-product-id='${id}']`);
            if (el) {
                // Try to find parent with product info (card for collections, or product page info wrapper)
                let card = el.closest('.card, .product-card-wrapper');
                if (!card) {
                    // On product page, look for info wrapper
                    card = document.querySelector('.product__info-wrapper, .product__info-container');
                }
                if (card) {
                    // Try to get handle from link (for cards)
                    let link = card.querySelector('a[href*="/products/"]');
                    if (!link) {
                        // On product page, try canonical link
                        link = document.querySelector('link[rel="canonical"]');
                    }
                    if (link) {
                        let href = link.getAttribute('href') || link.getAttribute('href') || link.getAttribute('content');
                        const match = href && href.match(/\/products\/([^/?#]+)/);
                        if (match) handle = match[1];
                    }
                    // Title
                    let titleEl = card.querySelector('.product__title, .product__title h1, .product__info-title, .card__heading, .card__heading.h5, .card__heading.h2, .card__heading.h3');
                    if (!titleEl) titleEl = document.querySelector('h1.product__title, h1.product__info-title');
                    if (titleEl) title = titleEl.textContent.trim();
                    // Price: get only the regular price (not compare-at)
                    let priceEl = card.querySelector('.price-item--regular, .price__regular .price-item, .product__price, .price');
                    if (!priceEl) priceEl = document.querySelector('.product__price, .price');
                    if (priceEl) price = priceEl.textContent.trim();
                    // Vendor
                    let vendorEl = card.querySelector('.caption-with-letter-spacing, .product-card-vendor, .product__vendor');
                    if (!vendorEl) vendorEl = document.querySelector('.product__vendor');
                    if (vendorEl) vendor = vendorEl.textContent.trim();
                    // Image: prefer featured image
                    let imgEl = card.querySelector('.card__media img, .product__media img, img');
                    if (!imgEl) imgEl = document.querySelector('.product__media img, .product__image, img');
                    if (imgEl) image = imgEl.getAttribute('src');
                }
            }
        }
        if (this.favorites.has(id)) {
            this.favorites.delete(id);
            if (this.isLoggedIn) {
                this.removeFavoriteFromServer(id);
            }
        } else {
            this.favorites.set(id, { id, handle, title, price, vendor, image });
            this.idToHandle.set(id, handle);
            this.handleToId.set(handle, id);
            if (this.isLoggedIn) {
                this.addFavoriteToServer(id);
            }
        }
        this.saveFavorites();
        this.updateButtons();
        this.notifyStateChange();
    }

    async addFavoriteToServer(productId) {
        try {
            await fetch('/api/favorites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customerId: window.Shopify.customerId, productId })
            });
        } catch (e) {
            console.error('Error adding favorite to server:', e);
        }
    }

    async removeFavoriteFromServer(productId) {
        try {
            await fetch('/api/favorites', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customerId: window.Shopify.customerId, productId })
            });
        } catch (e) {
            console.error('Error removing favorite from server:', e);
        }
    }

    /**
     * Notifies listeners of favorites state changes
     * @private
     */
    notifyStateChange() {
        window.dispatchEvent(new CustomEvent('favorites:changed', {
            detail: { favorites: Array.from(this.favorites.keys()) }
        }));
    }

    /**
     * Migrates guest favorites to user favorites after login
     * @param {Array} guestFavorites - Array of guest favorite products
     * @private
     */
    async migrateGuestFavorites(guestFavorites) {
        // guestFavorites is now array of {id, handle}
        if (!Array.isArray(guestFavorites) || !guestFavorites.length) {
            console.log('migrateGuestFavorites: No guest favorites data to migrate.');
            return;
        }
        const customerId = window.Shopify?.customerId;
        if (!customerId) {
            console.log('migrateGuestFavorites: No customer ID found. Cannot migrate guest favorites.');
            return;
        }
        // Map to IDs for server sync
        const ids = guestFavorites.map(obj => obj.id ? obj.id.toString() : null).filter(Boolean);
        try {
            const payload = {
                customerId: window.Shopify.customerId,
                favorites: ids
            };
            console.log('Sending favorites to backend:', payload);
            const response = await fetch('https://vev-app.onrender.com/api/sync-favorites', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': 'Gheorghe2025VeV'
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const text = await response.text();
                console.error('Sync failed. Server response:', text);
            } else {
                localStorage.removeItem('guestFavorites');
            }
        } catch (error) {
            console.error('Error migrating guest favorites:', error);
        }
    }

    /**
     * Only return the ID, no extra info
     * @param {string|number} productId - Product ID to extract data from
     * @returns {{id: (string|number)}}
     */
    extractProductData(productId) {
        // Only return the ID, no extra info
        return { id: productId };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired. Initializing FavoritesHandler and login click listener.');

    window.favoritesHandler = new FavoritesHandler();

    document.addEventListener('pointerdown', (e) => {
        const loginLink = e.target.closest('.header__icon--account');
        if (loginLink) {
            console.log('[Wake-Up] Login link was pressed. Sending backend wake-up ping...');
            fetch('https://vev-app.onrender.com/api/ping')
                .then(() => console.log('[Wake-Up] Backend ping successful.'))
                .catch(err => console.warn('[Wake-Up] Ping failed:', err));
        }
    });
});