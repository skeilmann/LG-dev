class FavoritesHandler {
    constructor() {
        this.favorites = new Set(this.loadFavorites());
        this.isLoggedIn = window.Shopify && window.Shopify.customerId;
        this.createModal();
        this.handleAppHeartIcons();
        this.bindEvents();
        this.updateAllButtons();
    }

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

        // Close button handler
        modal.querySelector('.favorites-modal__close').addEventListener('click', () => this.closeModal());

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal();
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
                this.closeModal();
            }
        });
    }

    showModal() {
        this.updateModalContent();
        this.modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        this.modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    async updateModalContent() {
        this.modalGrid.innerHTML = '';
        if (this.favorites.size === 0) {
            this.modalGrid.innerHTML = `
                <div class="favorites-modal__empty">
                    <p>${window.translations?.customer?.favorites?.empty || 'No favorites yet'}</p>
                </div>
            `;
            return;
        }

        // Fetch product data for favorites
        const products = await this.fetchFavoriteProducts(Array.from(this.favorites));
        for (const product of products) {
            const card = await this.createProductCard(product);
            this.modalGrid.appendChild(card);
        }
    }

    async fetchFavoriteProducts(productIds) {
        const products = [];
        const isDevelopment = window.location.port === '9292';

        for (const id of productIds) {
            try {
                // Construct base URL based on environment
                const baseUrl = isDevelopment ? '' : '/products/';

                // Try the product JSON view first
                let response = await fetch(`${baseUrl}${id}?view=json`);

                if (!response.ok && isDevelopment) {
                    // In development, try without the view parameter
                    response = await fetch(`${baseUrl}${id}`);
                }

                if (!response.ok) {
                    // Try the .js endpoint as fallback
                    response = await fetch(`${baseUrl}${id}.js`);
                }

                if (!response.ok) {
                    console.warn(`Could not fetch product ${id}. It may have been deleted or unpublished.`);
                    continue;
                }

                const product = await response.json();
                products.push(product);
            } catch (e) {
                console.error(`Error fetching product ${id}:`, e);
            }
        }
        return products;
    }

    async createProductCard(product) {
        try {
            // Fetch the rendered template
            const response = await fetch(`?section_id=favorite-product-card&product_id=${product.id}`);
            if (!response.ok) throw new Error('Failed to fetch card template');

            const html = await response.text();
            const temp = document.createElement('div');
            temp.innerHTML = html;

            // Extract just the card element
            const card = temp.querySelector('.favorites-modal__product');
            if (!card) throw new Error('Card template not found in response');

            return card;
        } catch (error) {
            console.error('Error creating product card:', error);

            // Fallback to basic card if template fetch fails
            const card = document.createElement('div');
            card.className = 'favorites-modal__product card card--standard';
            card.innerHTML = `
                <div class="card__inner">
                    <div class="card__media">
                        <img src="${product.featured_image}" alt="${product.title}" loading="lazy">
                    </div>
                    <div class="favorite-icon active" data-product-id="${product.id}">
                        <svg class="icon-heart" viewBox="0 0 24 24" width="24" height="24">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6.5 3.5 5 5.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5 18.5 5 20 6.5 20 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                    </div>
                    <div class="card__content">
                        <h3 class="card__heading">
                            <a href="${product.url}" class="full-unstyled-link">${product.title}</a>
                        </h3>
                        <div class="card__information">
                            <div class="price">${this.formatMoney(product.price)}</div>
                        </div>
                    </div>
                </div>
            `;
            return card;
        }
    }

    formatMoney(cents) {
        return (cents / 100).toLocaleString('en-US', {
            style: 'currency',
            currency: Shopify.currency.active || 'USD'
        });
    }

    loadFavorites() {
        try {
            // If logged in, use app's favorites, otherwise use localStorage
            if (this.isLoggedIn && window.Shopify.favorites) {
                return window.Shopify.favorites || [];
            }
            const stored = localStorage.getItem('favorites');
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error('Error loading favorites:', e);
            return [];
        }
    }

    handleAppHeartIcons() {
        // Only update icons if their current state doesn't match what we want
        document.querySelectorAll('.heart-icon').forEach(heart => {
            const currentDisplay = heart.style.display;
            const newDisplay = this.isLoggedIn ? 'block' : 'none';
            if (currentDisplay !== newDisplay) {
                heart.style.display = newDisplay;
            }
        });

        document.querySelectorAll('.favorite-icon').forEach(heart => {
            const currentDisplay = heart.style.display;
            const newDisplay = this.isLoggedIn ? 'none' : 'block';
            if (currentDisplay !== newDisplay) {
                heart.style.display = newDisplay;
            }
        });
    }

    saveFavorites() {
        if (!this.isLoggedIn) {
            try {
                localStorage.setItem('favorites', JSON.stringify(Array.from(this.favorites)));
            } catch (e) {
                console.error('Error saving favorites:', e);
            }
        }
    }

    toggleFavorite(productId) {
        if (this.isLoggedIn) {
            // Let the app handle favorites for logged-in users
            return;
        }

        if (this.favorites.has(productId)) {
            this.favorites.delete(productId);
        } else {
            this.favorites.add(productId);
        }
        this.saveFavorites();
        this.updateAllButtons();
        this.publishStateChange();
    }

    updateAllButtons() {
        if (this.isLoggedIn) return;

        document.querySelectorAll('.favorite-icon').forEach(button => {
            const productId = button.dataset.productId;
            this.updateButton(button, this.favorites.has(productId));
        });
    }

    updateButton(button, isFavorite) {
        if (this.isLoggedIn) return;

        button.classList.toggle('active', isFavorite);
        button.setAttribute('aria-label',
            isFavorite ?
                window.translations?.customer?.favorites?.remove || 'Remove from Favorites' :
                window.translations?.customer?.favorites?.add || 'Add to Favorites'
        );
    }

    publishStateChange() {
        window.dispatchEvent(new CustomEvent('favorites:changed', {
            detail: {
                favorites: Array.from(this.favorites)
            }
        }));
    }

    bindEvents() {
        if (!this.isLoggedIn) {
            document.addEventListener('click', (e) => {
                const button = e.target.closest('.favorite-icon');
                if (button) {
                    const productId = button.dataset.productId;
                    if (productId) {
                        this.toggleFavorite(productId);
                    }
                }

                // Handle header favorites icon click
                if (e.target.closest('.header__icon--favorites')) {
                    e.preventDefault();
                    this.showModal();
                }
            });
        }

        // In case new favorite buttons are added to the DOM dynamically
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Handle newly added heart icons
                        if (!this.isLoggedIn) {
                            const buttons = node.querySelectorAll('.favorite-icon');
                            buttons.forEach(button => {
                                const productId = button.dataset.productId;
                                if (productId) {
                                    this.updateButton(button, this.favorites.has(productId));
                                }
                            });
                        }
                        // Update visibility of app vs local heart icons
                        this.handleAppHeartIcons();
                    }
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
}

// Initialize the handler when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.favoritesHandler = new FavoritesHandler();
});
