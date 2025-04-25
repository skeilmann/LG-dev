/**
 * Handles favorite product functionality for both logged-in and non-logged-in users
 * Manages favorites storage, UI updates, and modal interactions
 */
class FavoritesHandler {
    constructor() {
        this.isLoggedIn = !!(window.Shopify && window.Shopify.customerId);
        this.favorites = new Map(); // temporarily initialize with empty Map

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
                const isFavorite = this.favorites.has(parseInt(icon.dataset.productId, 10));
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
                console.log('Skipping server fetch of favorites (handled by sync)');
                return new Map(); // Or consider loading from customer metafields if needed
            }

            const stored = localStorage.getItem('guestFavorites');
            if (!stored) return new Map();
            const parsed = JSON.parse(stored);
            if (!Array.isArray(parsed)) return new Map();
            return new Map(parsed.map(id => [parseInt(id, 10), { id: parseInt(id, 10) }]));
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
                // Only save array of IDs
                const favoritesArray = Array.from(this.favorites.keys());
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
                // Get favorites from localStorage (array of product IDs)
                let favorites = [];
                try {
                    const stored = localStorage.getItem('guestFavorites');
                    if (stored) {
                        // Support both array of IDs and array of [id, data] pairs
                        const parsed = JSON.parse(stored);
                        if (Array.isArray(parsed) && typeof parsed[0] === 'object' && Array.isArray(parsed[0])) {
                            favorites = parsed.map(pair => pair[0]);
                        } else {
                            favorites = parsed;
                        }
                    }
                } catch (e) { }
                if (favorites.length) {
                    window.location.href = '/pages/favorites?favorites=' + favorites.join(',');
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
        if (this.favorites.has(id)) {
            this.favorites.delete(id);
            if (this.isLoggedIn) {
                this.removeFavoriteFromServer(id);
            }
        } else {
            this.favorites.set(id, { id });
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
        // Check if guestFavorites is valid
        if (!Array.isArray(guestFavorites) || !guestFavorites.length) {
            console.log('migrateGuestFavorites: No guest favorites data to migrate.');
            return;
        }

        // ---> ADD THIS CHECK <---
        // Check if we have a customer ID to associate these favorites with
        const customerId = window.Shopify?.customerId; // Use optional chaining for safety
        if (!customerId) {
            console.log('migrateGuestFavorites: No customer ID found. Cannot migrate guest favorites.');
            // Decide what to do here. Usually, you just stop.
            // You might keep the guest favorites in localStorage until login,
            // but don't try to sync them without an ID.
            return;
        }

        try {
            const payload = {
                customerId: window.Shopify.customerId,
                favorites: guestFavorites.map(id => ({
                    productId: id.toString(),
                    variantId: null
                }))
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

// Initialize the favorites handler when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.favoritesHandler = new FavoritesHandler();
});