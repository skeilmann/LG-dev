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
        this.modalRecommendations.innerHTML = ''; // Clear existing recommendations

        // Add a loading indicator
        this.modalGrid.innerHTML = `<div class="loading-overlay gradient"></div>`; 
        this.modalRecommendations.innerHTML = `<div class="loading-overlay gradient"></div>`;

        if (this.favorites.size === 0) {
            this.modalGrid.innerHTML = `<div class="favorites-modal__empty">
                <p>${window.translations?.customer?.favorites?.empty || 'No favorites yet'}</p>
               </div>`;
        } else {
            // Fetch and render favorite product cards
            const favoritePromises = Array.from(this.favorites.values())
                .map(data => this.fetchAndRenderProductCard(data, this.modalGrid));
            
            try {
                await Promise.all(favoritePromises);
                // Remove loading indicator after all cards are loaded or failed
                const loadingIndicator = this.modalGrid.querySelector('.loading-overlay');
                if (loadingIndicator) loadingIndicator.remove();

            } catch (error) {
                console.error("Error loading favorite product cards:", error);
                // Optionally show an error message in the grid
                const loadingIndicator = this.modalGrid.querySelector('.loading-overlay');
                if (loadingIndicator) loadingIndicator.remove();
                this.modalGrid.innerHTML = `<p>Error loading favorites.</p>`; 
            }
        }

        // Fetch and render recommendations
        try {
            await this.fetchAndRenderRecommendations();
             // Remove loading indicator after recommendations are loaded or failed
            const loadingIndicator = this.modalRecommendations.querySelector('.loading-overlay');
            if (loadingIndicator) loadingIndicator.remove();
        } catch (error) {
            console.error("Error loading recommendations:", error);
             // Optionally show an error message for recommendations
             const loadingIndicator = this.modalRecommendations.querySelector('.loading-overlay');
             if (loadingIndicator) loadingIndicator.remove();
            this.modalRecommendations.innerHTML = `<p>Error loading recommendations.</p>`;
        }
    }

    /**
     * Fetches product data and renders its card HTML using Shopify's card view.
     * Appends the card to the specified container.
     * @private
     * @param {Object} productData - Product data containing at least 'url'.
     * @param {HTMLElement} containerElement - The element to append the card to.
     * @returns {Promise<void>}
     */
    async fetchAndRenderProductCard(productData, containerElement) {
        if (!productData?.url) {
            console.warn('Product data missing URL, cannot fetch card:', productData);
            return; // Skip if URL is missing
        }

        try {
            // Extract handle from URL: https://shop.com/products/product-handle -> product-handle
            const urlObject = new URL(productData.url, window.location.origin);
            const pathParts = urlObject.pathname.split('/');
            const handle = pathParts[pathParts.length - 1];

            if (!handle) {
                console.warn('Could not extract handle from URL:', productData.url);
                return;
            }

            // Fetch the product card HTML using a 'card' view (adjust view name if needed)
            // Common practice is to have a product template suffix like 'product.card.liquid'
            // which responds to '?view=card'
            const response = await fetch(`${urlObject.pathname}?view=card`); 
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const cardHtml = await response.text();

            // Append the fetched HTML. We might need to wrap it or adjust structure.
            // Assuming the fetched HTML is a complete card.
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = cardHtml;
            
            // Append the actual card element(s) from the fetched HTML
            // This handles cases where the fetched HTML might have extra whitespace or wrapper elements
             if (tempDiv.firstElementChild) {
                // Append all top-level elements from the fetched HTML
                Array.from(tempDiv.children).forEach(child => {
                    // Re-attach favorite toggle listener if needed, assuming the card uses the same structure
                    const favoriteIcon = child.querySelector(`.favorite-icon[data-product-id="${productData.id}"]`);
                    if (favoriteIcon) {
                        favoriteIcon.classList.add('active'); // Ensure it shows as active
                         favoriteIcon.setAttribute('aria-label', window.translations?.customer?.favorites?.remove || 'Remove from Favorites');
                        // Note: The main click listener on document should handle toggling
                    }
                    containerElement.appendChild(child);
                 });

            } else {
                console.warn('Fetched card HTML seems empty for handle:', handle);
            }

        } catch (error) {
            console.error(`Error fetching product card for URL ${productData.url}:`, error);
            // Optionally append an error message or placeholder card
             const errorElement = document.createElement('div');
             errorElement.innerHTML = `<p>Could not load product: ${productData.title || productData.id}</p>`;
             containerElement.appendChild(errorElement);
        }
    }

    /**
     * Fetches product recommendations using Shopify's recommendations endpoint
     * and renders them in the modal.
     * @private
     * @returns {Promise<void>}
     */
    async fetchAndRenderRecommendations() {
        try {
            // Standard Shopify endpoint. Section ID might vary by theme.
            // 'product-recommendations' is common for the section on product pages.
            // We might need a different section_id for general recommendations if available.
            const recommendationsUrl = `/recommendations/products.json?section_id=product-recommendations&limit=4`; 
            const response = await fetch(recommendationsUrl);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const recommendations = await response.json();

            if (recommendations?.products) {
                 // The response usually contains pre-rendered HTML
                this.modalRecommendations.innerHTML = recommendations.products;
                // Re-initialize favorite buttons within the recommendations
                this.updateButtons(this.modalRecommendations); 
            } else {
                this.modalRecommendations.innerHTML = `<p>${window.translations?.customer?.favorites?.no_recommendations || 'No recommendations available.'}</p>`;
            }
        } catch (error) {
            console.error('Error fetching recommendations:', error);
            this.modalRecommendations.innerHTML = `<p>Could not load recommendations.</p>`;
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