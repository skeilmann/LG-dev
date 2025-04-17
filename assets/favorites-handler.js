/**
 * Handles favorite product functionality for both logged-in and non-logged-in users
 * Manages favorites storage, UI updates, and modal interactions
 */
class FavoritesHandler {
    constructor() {
        // Initialize core properties
        this.isLoggedIn = !!(window.Shopify && window.Shopify.customerId);
        this.favorites = this.loadFavorites();
        this.createModal();
        this.initializeUI();
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
            </div>
        `;
        document.body.appendChild(modal);
        this.modal = modal;
        this.modalGrid = modal.querySelector('.favorites-modal__grid');

        // Set up modal event listeners
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
            const favIcon = headerIcon.querySelector('.header__icon--favorites');
            if (heartEmpty) {
                headerIcon.style.removeProperty('display');
                headerIcon.classList.toggle('hidden', !this.isLoggedIn);
            }
            if (favIcon) {
                favIcon.style.removeProperty('display');
                favIcon.classList.toggle('hidden', this.isLoggedIn);
            }
        });

        // Show .header__icon--favorites cfor non-logged-in users
        // root.querySelectorAll('.header__icon').forEach(headerIcon => {
        //     const heartEmpty = headerIcon.querySelector('.heart-empty');
        //     if (heartEmpty) {
        //         headerIcon.style.removeProperty('display');
        //         headerIcon.classList.toggle('hidden', !this.isLoggedIn);
        //     }
        // });

        // Handle favorite icons for non-logged-in users
        root.querySelectorAll('.favorite-icon').forEach(icon => {
            icon.style.removeProperty('display');
            icon.classList.toggle('hidden', this.isLoggedIn);

            if (!this.isLoggedIn && icon.dataset.productId) {
                const isFavorite = this.favorites.has(parseInt(icon.dataset.productId, 10));
                // const isFavorite = this.favorites.has(icon.dataset.productId);
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
                console.log('We cant Load favorites from Shopify customer data');
            }

            const stored = localStorage.getItem('favorites');
            if (!stored) return new Map();

            const parsed = JSON.parse(stored);
            if (!Array.isArray(parsed)) return new Map();

            return new Map(parsed.map(([id, data]) => [
                parseInt(id, 10),
                { ...(data || { id: parseInt(id, 10) }) }
            ]));
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
                localStorage.setItem('favorites', JSON.stringify(Array.from(this.favorites.entries())));
            } catch (e) {
                console.error('Error saving favorites:', e);
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

            if (e.target.closest('.header__icon--favorites')) {
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
     * Updates the content of the favorites modal
     * @private
     */
    updateModalContent() {
        this.modalGrid.innerHTML = this.favorites.size === 0
            ? `<div class="favorites-modal__empty">
                <p>${window.translations?.customer?.favorites?.empty || 'No favorites yet'}</p>
               </div>`
            : Array.from(this.favorites.entries())
                .map(([productId, data]) => this.createProductCard(productId, data))
                .join('');
    }

    /**
     * Creates a product card HTML for the modal
     * @private
     * @param {number} productId
     * @param {Object} productData
     * @returns {string}
     */
    createProductCard(productId, productData) {
        const parsedId = parseInt(productId, 10);
        return `
            <div class="favorites-modal__product card card--standard">
                <div class="card-wrapper product-card-wrapper underline-links-hover">
                    <div class="card card--product card--media">
                        <div class="card__inner">
                            <div class="favorite-icon active" data-product-id="${parsedId}">
                                <svg class="icon-heart" viewBox="0 0 512 512" width="24" height="24">
                                    <path fill="rgba(244, 184, 221, 0.4)" stroke="#F4B8DD" stroke-width="32" d="M352.92,80C288,80,256,144,256,144s-32-64-96.92-64C106.32,80,64.54,124.14,64,176.81c-1.1,109.33,86.73,187.08,183,252.42a16,16,0,0,0,18,0c96.26-65.34,184.09-143.09,183-252.42C447.46,124.14,405.68,80,352.92,80Z" />
                                </svg>
                            </div>
                            ${this.renderProductMedia(productData)}
                            ${this.renderProductInfo(productData)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Toggles a product's favorite status
     * @param {number|string} productId
     */
    toggleFavorite(productId) {
        if (this.isLoggedIn) return;

        const parsedId = parseInt(productId, 10);
        if (this.favorites.has(parsedId)) {
            console.log('Removing from favorites:', parsedId);
            this.favorites.delete(parsedId);
        } else {
            const productData = this.extractProductData(productId);
            if (productData) {
                productData.id = parsedId;
                this.favorites.set(parsedId, productData);
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
     * @param {number|string} productId
     * @returns {Object|null}
     */
    extractProductData(productId) {
        const parsedId = parseInt(productId, 10);
        const product = document.querySelector(`[data-product-id="${productId}"]`)?.closest('.card-wrapper');
        if (!product) return null;

        return {
            id: parsedId,
            title: product.querySelector('.card__heading a')?.textContent?.trim(),
            url: product.querySelector('.card__heading a')?.href,
            featured_image: product.querySelector('.card__media img')?.src,
            vendor: product.querySelector('.caption-with-letter-spacing')?.textContent?.trim(),
            price: product.querySelector('.price-item--regular')?.textContent?.trim()
        };
    }

    /**
     * Renders product media HTML
     * @private
     * @param {Object} productData
     * @returns {string}
     */
    renderProductMedia(productData) {
        return productData.featured_image ? `
            <div class="card__media">
                <div class="media media--transparent">
                    <img src="${productData.featured_image}"
                         alt="${productData.title}"
                         loading="lazy"
                         class="motion-reduce">
                </div>
            </div>
        ` : '';
    }

    /**
     * Renders product information HTML
     * @private
     * @param {Object} productData
     * @returns {string}
     */
    renderProductInfo(productData) {
        return `
            <div class="card__content">
                <div class="card__information">
                    <h3 class="card__heading h5">
                        <a href="${productData.url}" class="full-unstyled-link">
                            ${productData.title}
                        </a>
                    </h3>
                    ${productData.vendor ? `
                        <div class="card-information">
                            <span class="visually-hidden">Vendor</span>
                            <div class="caption-with-letter-spacing light">${productData.vendor}</div>
                        </div>
                    ` : ''}
                    ${productData.price ? `
                        <div class="price">
                            <div class="price__regular">
                                <span class="price-item price-item--regular">
                                    ${productData.price}
                                </span>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
}

// Initialize the favorites handler when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.favoritesHandler = new FavoritesHandler();
});