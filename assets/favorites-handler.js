/**
 * Handles favorite product functionality for both logged-in and non-logged-in users
 * Manages favorites storage, UI updates, and modal interactions
 */
class FavoritesHandler {
    constructor() {
        // Initialize core properties and check for guest favorites migration
        this.isLoggedIn = !!(window.Shopify && window.Shopify.customerId);
        this.favorites = this.loadFavorites();
        this.createModal();
        this.initializeUI();

        // Migrate guest favorites to user account on login
        if (this.isLoggedIn) {
            const guestFavorites = localStorage.getItem('favorites');
            if (guestFavorites) {
                this.migrateGuestFavorites(JSON.parse(guestFavorites));
            }
        }
    }

    /**
     * Creates and sets up the favorites modal
     * @private
     */
    createModal() {
        const modal = document.createElement('div');
        modal.className = 'favorites-modal global-settings-popup';
        modal.innerHTML = `
            <div class="favorites-modal__content">
                <button type="button" class="favorites-modal__close" aria-label="${window.translations?.accessibility?.close || 'Close'}">
                    <svg class="icon icon-close" aria-hidden="true" focusable="false">
                        <use href="#icon-close"/>
                    </svg>
                </button>
                <h2 class="favorites-modal__heading">${window.translations?.customer?.favorites?.title || 'My Favorites'}</h2>
                <div class="favorites-modal__grid"></div>
                <div class="favorites-modal__recommendations-container">
                    <h3 class="favorites-modal__recommendations-heading">${window.translations?.customer?.favorites?.recommendations_title || 'You might also like'}</h3>
                    <div class="favorites-modal__recommendations"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        this.modal = modal;
        this.modalGrid = modal.querySelector('.favorites-modal__grid');
        this.modalRecommendations = modal.querySelector('.favorites-modal__recommendations');
        this.setupModalEvents();
    }

    /**
     * Sets up modal related event listeners
     * @private
     */
    setupModalEvents() {
        this.modal.querySelector('.favorites-modal__close').addEventListener('click', () => this.closeModal());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.closeModal();
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
    loadFavorites() {
        try {
            if (this.isLoggedIn) {
                // return new Map(window.Shopify.favorites.map(id => [parseInt(id, 10), { id: parseInt(id, 10) }]));
                // console.log('We cant Load favorites from Shopify customer data');
            }

            const stored = localStorage.getItem('favorites');
            if (!stored) return new Map();

            const parsed = JSON.parse(stored);
            if (!Array.isArray(parsed)) return new Map();

            return new Map(parsed.map(([id, data]) => [
                parseInt(id, 10),
                { 
                    id: parseInt(id, 10),
                    title: data.title,
                    url: data.url,
                    featured_image: data.featured_image,
                    vendor: data.vendor,
                    price: data.price
                }
            ]));
        } catch (e) {
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
                const favoritesArray = Array.from(this.favorites.entries()).map(([id, data]) => [
                    id,
                    {
                        id: data.id,
                        title: data.title,
                        url: data.url,
                        featured_image: data.featured_image,
                        vendor: data.vendor,
                        price: data.price
                    }
                ]);
                localStorage.setItem('favorites', JSON.stringify(favoritesArray));
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
                // Ping the server to wake it up
                fetch('https://vev-app.onrender.com/api/ping').catch(error => {
                    // Optional: Log error silently or handle it if needed
                    console.error('Ping failed:', error); 
                });

                e.preventDefault();
                this.showModal();
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
     * Shows the favorites modal
     */
    showModal() {
        this.updateModalContent();
        this.modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Closes the favorites modal
     */
    closeModal() {
        this.modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    /**
     * Updates the content of the favorites modal asynchronously
     * Fetches product cards and recommendations from Shopify.
     * @private
     */
    async updateModalContent() {
        this.modalGrid.innerHTML = ''; // Clear existing grid

        // Add a loading indicator for the main content area (Shopify Page)
        this.modalGrid.innerHTML = `<div class="loading-overlay gradient"></div>`; 
        // Add a loading indicator for recommendations
        this.modalRecommendations.innerHTML = `<div class="loading-overlay gradient"></div>`;

        // Fetch and render the Shopify page content
        try {
            // *** Replace '/pages/favorites' with the actual URL/handle of your Shopify page ***
            const pageUrl = '/pages/favorites'; 
            const response = await fetch(pageUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const pageHtml = await response.text();

            // Extract the main content if necessary (depends on your theme structure)
            // This example assumes the fetched HTML contains the desired content directly.
            // You might need to parse pageHtml and select a specific element's content.
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = pageHtml;
            // Example: If your page content is inside a <main> tag or a specific div#MainContent
            const mainContent = tempDiv.querySelector('#MainContent') || tempDiv.querySelector('main') || tempDiv; 
            
            this.modalGrid.innerHTML = mainContent.innerHTML; // Inject the content

            // Re-initialize favorite buttons within the loaded content
            this.updateButtons(this.modalGrid);

        } catch (error) {
            console.error("Error loading Shopify page content:", error);
            // Remove loading indicator on error
            const loadingIndicator = this.modalGrid.querySelector('.loading-overlay');
            if (loadingIndicator) loadingIndicator.remove();
            // Show an error message
            this.modalGrid.innerHTML = `<p>${window.translations?.customer?.favorites?.load_error || 'Error loading content.'}</p>`;
        }
    }

    /**
     * Toggles favorite status for a product
     * @param {string|number} productId - Product ID to toggle
     */
    toggleFavorite(productId) {
        const id = parseInt(productId, 10);
        if (this.favorites.has(id)) {
            this.favorites.delete(id);
        } else {
            const productData = this.extractProductData(id);
            if (productData) {
                this.favorites.set(id, productData);
            }
        }
        this.saveFavorites();
        this.updateButtons();
        this.notifyStateChange();
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
     * Extracts product data from the DOM
     * @private
     * @param {number} productId
     * @returns {Object|null}
     */
    extractProductData(productId) {
        const productElement = document.querySelector(`[data-product-id="${productId}"]`);
        if (!productElement) return null;

        const productCard = productElement.closest('.card');
        if (!productCard) return null;

        return {
            id: productId,
            title: productCard.querySelector('.card__heading')?.textContent.trim() || '',
            url: productCard.querySelector('a')?.href || '',
            featured_image: productCard.querySelector('img')?.src || '',
            vendor: productCard.querySelector('.card__vendor')?.textContent.trim() || '',
            price: productCard.querySelector('.price')?.textContent.trim() || ''
        };
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

        try {
            const response = await fetch('https://vev-app.onrender.com/api/sync-favorites', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': 'Gheorghe2025VeV'
                },
                body: JSON.stringify({
                    customerId: window.Shopify.customerId,
                    favorites: guestFavorites.map(([id, data]) => ({
                        productId: id.toString(),
                        variantId: data?.variantId?.toString() || ''
                    }))
                })
            });

            if (response.ok) {
                const updatedFavorites = await response.json();
                const mergedFavorites = new Map(guestFavorites);
                
                if (updatedFavorites.favorites) {
                    updatedFavorites.favorites.forEach(fav => {
                        const productId = parseInt(fav.productId, 10);
                        const variantId = fav.variantId ? parseInt(fav.variantId, 10) : undefined;
                        
                        if (mergedFavorites.has(productId)) {
                            const existingData = mergedFavorites.get(productId);
                            mergedFavorites.set(productId, {
                                ...existingData,
                                variantId: variantId || existingData.variantId
                            });
                        } else {
                            mergedFavorites.set(productId, {
                                id: productId,
                                variantId: variantId,
                                title: fav.title || '',
                                url: fav.url || '',
                                featured_image: fav.featured_image || '',
                                vendor: fav.vendor || '',
                                price: fav.price || ''
                            });
                        }
                    });
                }

                localStorage.setItem('favorites', JSON.stringify(Array.from(mergedFavorites.entries())));
                this.favorites = mergedFavorites;
                this.updateButtons();
                this.updateModalContent();
            }
        } catch (error) {
            // Silently fail if migration fails
        }
    }
}

// Initialize the favorites handler when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.favoritesHandler = new FavoritesHandler();
});