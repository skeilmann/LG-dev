/**
 * MobileBottomNav Web Component
 * 
 * Manages mobile bottom navigation bar and catalog drawer
 * 
 * Features:
 * - Fixed translucent bottom bar (iOS style)
 * - Bottom sheet catalog drawer
 * - Active page detection
 * - Integration with existing header components
 * - Touch gesture support
 * - Full accessibility support
 * 
 * Usage:
 * Automatically initialized on DOMContentLoaded for mobile devices
 * 
 * Architecture:
 * - Web Component pattern for encapsulation
 * - Event delegation for performance
 * - RAF-based animations for smoothness
 * - Memory cleanup on destroy
 */

class MobileBottomNav extends HTMLElement {
  constructor() {
    super();
    
    // Cache DOM references
    this.buttons = null;
    this.drawer = null;
    this.backdrop = null;
    this.closeButton = null;
    this.handle = null;
    this.body = document.body;
    
    // State management
    this.isDrawerOpen = false;
    this.touchStartY = 0;
    this.touchStartTime = 0;
    this.isDragging = false;
    this.accordionImagesInitialized = false;
    
    // Performance optimization
    this.rafId = null;
    this.resizeObserver = null;
    
    // Settings from data attributes
    this.buttonOrder = this.dataset.buttonOrder || 'default';
    this.animationStyle = this.dataset.animationStyle || 'scale';
    this.drawerSpeed = parseInt(this.dataset.drawerSpeed) || 300;
    
    this.init();
  }

  /**
   * Initialize the component
   * Sets up DOM references, event listeners, and initial state
   */
  init() {
    // Only initialize on mobile devices
    if (window.innerWidth >= 750) {
      return;
    }
    
    this.cacheElements();
    this.bindEvents();
    this.setInitialState();
    this.setupResizeObserver();
    this.setBodyPadding();
    
    // Mark as initialized
    this.setAttribute('data-initialized', 'true');
  }

  /**
   * Cache DOM element references for performance
   */
  cacheElements() {
    this.buttons = this.querySelectorAll('.mobile-bottom-nav__button');
    this.drawer = document.getElementById('mobile-catalog-drawer');
    this.backdrop = this.drawer?.querySelector('.mobile-catalog-drawer__backdrop');
    this.closeButton = this.drawer?.querySelector('.mobile-catalog-drawer__close');
    this.handle = this.drawer?.querySelector('.mobile-catalog-drawer__handle');
  }

  /**
   * Bind all event listeners
   * Uses event delegation and passive listeners for performance
   */
  bindEvents() {
    // Button click handlers
    this.buttons.forEach(button => {
      button.addEventListener('click', this.handleButtonClick.bind(this));
    });

    // Drawer management
    if (this.drawer) {
      // Backdrop click to close
      this.backdrop?.addEventListener('click', this.closeDrawer.bind(this));
      
      // Close button
      this.closeButton?.addEventListener('click', this.closeDrawer.bind(this));
      
      // Handle for swipe gestures
      this.handle?.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
      this.handle?.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: true });
      this.handle?.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
      
      // Add swipe support to the entire drawer content
      const drawerContent = this.drawer.querySelector('.mobile-catalog-drawer__content');
      if (drawerContent) {
        drawerContent.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        drawerContent.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: true });
        drawerContent.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
      }
      
      // Click outside drawer to close
      this.drawer.addEventListener('click', this.handleDrawerClick.bind(this));
      
      // Keyboard navigation
      this.drawer.addEventListener('keydown', this.handleDrawerKeydown.bind(this));
    }

    // Global events
    document.addEventListener('keydown', this.handleGlobalKeydown.bind(this));
    window.addEventListener('resize', this.handleResize.bind(this));
    
    // Cart and favorites count updates
    document.addEventListener('cart:updated', this.updateCartCount.bind(this));
    document.addEventListener('favorites:updated', this.updateFavoritesCount.bind(this));
  }

  /**
   * Set initial active state based on current page
   */
  setInitialState() {
    const currentPath = window.location.pathname;
    const currentPageType = this.detectPageType(currentPath);
    
    // Remove all active states
    this.buttons.forEach(button => {
      button.classList.remove('mobile-bottom-nav__button--active');
      button.removeAttribute('aria-current');
    });
    
    // Set active state based on page type
    const activeButton = this.getActiveButton(currentPageType);
    if (activeButton) {
      activeButton.classList.add('mobile-bottom-nav__button--active');
      activeButton.setAttribute('aria-current', 'page');
    }
  }

  /**
   * Detect current page type from URL path
   * @param {string} path - Current URL path
   * @returns {string} Page type
   */
  detectPageType(path) {
    if (path === '/' || path === '') return 'home';
    if (path.includes('/collections/')) return 'collection';
    if (path.includes('/products/')) return 'product';
    if (path.includes('/cart')) return 'cart';
    if (path.includes('/search')) return 'search';
    if (path.includes('/account')) return 'account';
    return 'other';
  }

  /**
   * Get the button that should be active for the given page type
   * @param {string} pageType - Current page type
   * @returns {HTMLElement|null} Active button element
   */
  getActiveButton(pageType) {
    const buttonMap = {
      'home': '[data-nav-type="home"]',
      'search': '[data-nav-type="search"]',
      'collection': '[data-nav-type="catalog"]',
      'product': '[data-nav-type="catalog"]',
      'cart': '[data-nav-type="cart"]',
      'account': '[data-nav-type="favorites"]'
    };
    
    const selector = buttonMap[pageType];
    return selector ? this.querySelector(selector) : null;
  }

  /**
   * Handle button click events
   * @param {Event} event - Click event
   */
  handleButtonClick(event) {
    const button = event.currentTarget;
    const navType = button.dataset.navType;
    
    // Add animation class if configured
    if (this.animationStyle !== 'none') {
      button.classList.add(`mobile-bottom-nav__button--${this.animationStyle}`);
      setTimeout(() => {
        button.classList.remove(`mobile-bottom-nav__button--${this.animationStyle}`);
      }, 300);
    }
    
    // Handle different button types
    switch (navType) {
      case 'search':
        event.preventDefault();
        this.openSearchModal();
        break;
      case 'catalog':
        event.preventDefault();
        this.openDrawer();
        break;
      case 'home':
      case 'favorites':
      case 'cart':
        // Let default link behavior handle navigation
        break;
    }
  }

  /**
   * Open the catalog drawer with animation
   */
  openDrawer() {
    if (!this.drawer || this.isDrawerOpen) return;
    
    this.isDrawerOpen = true;
    this.drawer.setAttribute('aria-hidden', 'false');
    
    // Lock body scroll
    this.body.style.overflow = 'hidden';
    
    // Focus management
    this.closeButton?.focus();
    
    // Initialize accordion image loading - DISABLED
    // this.initAccordionImageLoading();
    
    // Announce to screen readers
    this.announceToScreenReader('Catalog menu opened');
    
    // Set animation speed
    this.drawer.style.setProperty('--drawer-animation-speed', `${this.drawerSpeed}ms`);
  }

  /**
   * Close the catalog drawer with animation
   */
  closeDrawer() {
    if (!this.drawer || !this.isDrawerOpen) return;
    
    this.isDrawerOpen = false;
    this.drawer.setAttribute('aria-hidden', 'true');
    
    // Restore body scroll
    this.body.style.overflow = '';
    
    // Return focus to catalog button
    const catalogButton = this.querySelector('[data-nav-type="catalog"]');
    catalogButton?.focus();
    
    // Announce to screen readers
    this.announceToScreenReader('Catalog menu closed');
  }

  /**
   * Toggle the existing header search modal
   */
  openSearchModal() {
    const searchModalComponent = document.querySelector('details-modal.header__search');
    if (!searchModalComponent) return;

    const searchDetails = searchModalComponent.querySelector('details');
    if (!searchDetails) return;

    // Toggle: if already open, close it
    if (searchDetails.hasAttribute('open')) {
      searchDetails.removeAttribute('open');
      document.body.classList.remove('overflow-hidden');
      return;
    }

    // Open the details element
    searchDetails.setAttribute('open', '');
    document.body.classList.add('overflow-hidden');

    // Focus the search input
    requestAnimationFrame(() => {
      const searchInput = searchDetails.querySelector('input[type="search"]');
      if (searchInput) {
        searchInput.focus();
      }
    });
  }

  /**
   * Handle clicks inside the drawer
   * @param {Event} event - Click event
   */
  handleDrawerClick(event) {
    // Only close if clicking on the drawer itself (not its children)
    if (event.target === this.drawer) {
      this.closeDrawer();
    }
  }

  /**
   * Handle touch start for swipe gestures
   * @param {TouchEvent} event - Touch start event
   */
  handleTouchStart(event) {
    if (!this.isDrawerOpen) return;
    
    this.touchStartY = event.touches[0].clientY;
    this.touchStartTime = Date.now();
    this.isDragging = false;
    
    // Add swiping class for visual feedback
    const content = this.drawer.querySelector('.mobile-catalog-drawer__content');
    if (content) {
      content.classList.add('swiping');
    }
  }

  /**
   * Handle touch move for swipe gestures
   * @param {TouchEvent} event - Touch move event
   */
  handleTouchMove(event) {
    if (!this.isDrawerOpen) return;
    
    const touchY = event.touches[0].clientY;
    const deltaY = touchY - this.touchStartY;
    
    // Only consider it dragging if moved more than 5px
    if (Math.abs(deltaY) > 5) {
      this.isDragging = true;
    }
    
    // If dragging down, add visual feedback
    if (this.isDragging && deltaY > 0) {
      const content = this.drawer.querySelector('.mobile-catalog-drawer__content');
      if (content) {
        // More responsive translation with easing
        const translateY = Math.min(deltaY * 0.7, 100);
        const opacity = Math.max(0.3, 1 - (deltaY / 200));
        
        content.style.transform = `translateY(${translateY}px)`;
        content.style.opacity = opacity;
        
        // Add backdrop opacity change
        if (this.backdrop) {
          const backdropOpacity = Math.max(0.1, 0.5 - (deltaY / 300));
          this.backdrop.style.opacity = backdropOpacity;
        }
      }
    }
  }

  /**
   * Handle touch end for swipe gestures
   * @param {TouchEvent} event - Touch end event
   */
  handleTouchEnd(event) {
    if (!this.isDrawerOpen || !this.isDragging) return;
    
    const touchEndY = event.changedTouches[0].clientY;
    const deltaY = touchEndY - this.touchStartY;
    const deltaTime = Date.now() - this.touchStartTime;
    const velocity = deltaY / deltaTime;
    
    const content = this.drawer.querySelector('.mobile-catalog-drawer__content');
    
    // Remove swiping class
    if (content) {
      content.classList.remove('swiping');
    }
    
    // Close drawer if swiped down with sufficient distance or velocity
    if (deltaY > 80 || velocity > 0.3) {
      // Close immediately with animation
      this.closeDrawer();
    } else {
      // Reset transform with smooth animation
      if (content) {
        content.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
        content.style.transform = '';
        content.style.opacity = '';
        
        // Reset backdrop
        if (this.backdrop) {
          this.backdrop.style.transition = 'opacity 0.3s ease-out';
          this.backdrop.style.opacity = '';
        }
        
        // Remove transition after animation
        setTimeout(() => {
          if (content) {
            content.style.transition = '';
          }
          if (this.backdrop) {
            this.backdrop.style.transition = '';
          }
        }, 300);
      }
    }
    
    this.isDragging = false;
  }

  /**
   * Handle keyboard navigation in drawer
   * @param {KeyboardEvent} event - Keydown event
   */
  handleDrawerKeydown(event) {
    if (!this.isDrawerOpen) return;
    
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.closeDrawer();
        break;
      case 'Tab':
        // Trap focus within drawer
        this.trapFocus(event);
        break;
    }
  }

  /**
   * Handle global keyboard events
   * @param {KeyboardEvent} event - Keydown event
   */
  handleGlobalKeydown(event) {
    if (event.key === 'Escape' && this.isDrawerOpen) {
      this.closeDrawer();
    }
  }

  /**
   * Trap focus within the drawer
   * @param {KeyboardEvent} event - Tab key event
   */
  trapFocus(event) {
    const focusableElements = this.drawer.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }
  }

  /**
   * Handle window resize
   */
  handleResize() {
    // Close drawer and hide nav on desktop
    if (window.innerWidth >= 750) {
      this.closeDrawer();
      this.style.display = 'none';
      this.body.classList.add('mobile-nav-disabled');
    } else {
      this.style.display = 'block';
      this.body.classList.remove('mobile-nav-disabled');
      this.setBodyPadding();
    }
  }

  /**
   * Set up ResizeObserver for dynamic height changes
   */
  setupResizeObserver() {
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          if (entry.target === this) {
            this.setBodyPadding();
          }
        }
      });
      this.resizeObserver.observe(this);
    }
  }

  /**
   * Set body padding to prevent content hiding behind nav
   */
  setBodyPadding() {
    const navHeight = this.offsetHeight;
    document.documentElement.style.setProperty('--mobile-bottom-nav-height', `${navHeight}px`);
  }

  /**
   * Update cart count badge
   * @param {CustomEvent} event - Cart updated event
   */
  updateCartCount(event) {
    const cartCount = event.detail?.item_count || 0;
    const cartButton = this.querySelector('[data-nav-type="cart"]');
    const badge = cartButton?.querySelector('.mobile-bottom-nav__badge');
    
    if (badge) {
      const countSpan = badge.querySelector('span[aria-hidden="true"]');
      const screenReaderSpan = badge.querySelector('.visually-hidden');
      
      if (countSpan) countSpan.textContent = cartCount;
      if (screenReaderSpan) {
        screenReaderSpan.textContent = `Cart: ${cartCount} items`;
      }
      
      badge.style.display = cartCount > 0 ? 'flex' : 'none';
    }
  }

  /**
   * Update favorites count badge
   * @param {CustomEvent} event - Favorites updated event
   */
  updateFavoritesCount(event) {
    const favoritesCount = event.detail?.count || 0;
    const favoritesButton = this.querySelector('[data-nav-type="favorites"]');
    const badge = favoritesButton?.querySelector('.mobile-bottom-nav__badge');
    
    if (badge) {
      const countSpan = badge.querySelector('span[aria-hidden="true"]');
      const screenReaderSpan = badge.querySelector('.visually-hidden');
      
      if (countSpan) countSpan.textContent = favoritesCount;
      if (screenReaderSpan) {
        screenReaderSpan.textContent = `Favorites: ${favoritesCount} items`;
      }
      
      badge.style.display = favoritesCount > 0 ? 'flex' : 'none';
    }
  }

  /**
   * Initialize accordion image loading - DISABLED
   * Sets up listeners for accordion opens to lazy-load category/subcategory images
   */
  /* initAccordionImageLoading() {
    if (!this.drawer || this.accordionImagesInitialized) return;

    // Handle subcategory accordions (nested level)
    const subcategoryAccordions = this.drawer.querySelectorAll('.mobile-catalog-drawer__subcategory-accordion');

    subcategoryAccordions.forEach((accordion) => {
      const summary = accordion.querySelector('.mobile-catalog-drawer__subcategory-title');
      const subcategoryImageContainer = accordion.querySelector('.mobile-catalog-drawer__subcategory-image');
      const parentCategoryImage = accordion.closest('.mobile-catalog-drawer__subcategory-content')?.querySelector('.mobile-catalog-drawer__category-image');

      summary?.addEventListener('click', () => {
        // Use setTimeout to check state after browser toggles the details element
        setTimeout(() => {
          const isOpen = accordion.hasAttribute('open');
          
          if (isOpen) {
            // Accordion opened - load subcategory image
            if (subcategoryImageContainer) {
              this.loadCatalogImage(subcategoryImageContainer);
            }
            // Hide parent category image when nested subcategory is open
            if (parentCategoryImage) {
              parentCategoryImage.style.display = 'none';
            }
          } else {
            // Accordion closed - show category image again if needed
            if (parentCategoryImage && !parentCategoryImage.querySelector('img')) {
              parentCategoryImage.style.display = '';
              this.loadCatalogImage(parentCategoryImage);
            }
          }
        }, 100);
      });
    });

    // Handle category accordions (top level)
    const categoryAccordions = this.drawer.querySelectorAll('.mobile-catalog-drawer__category-accordion');

    categoryAccordions.forEach((accordion) => {
      const summary = accordion.querySelector('.mobile-catalog-drawer__category-title');
      const categoryImageContainer = accordion.querySelector('.mobile-catalog-drawer__category-image');

      summary?.addEventListener('click', () => {
        // Use setTimeout to check state after browser toggles the details element
        setTimeout(() => {
          const isOpen = accordion.hasAttribute('open');
          
          if (isOpen) {
            // Check if there are nested subcategories
            const nestedAccordions = accordion.querySelectorAll('.mobile-catalog-drawer__subcategory-accordion');
            if (nestedAccordions.length === 0 && categoryImageContainer) {
              // No nested subcategories, load category image
              this.loadCatalogImage(categoryImageContainer);
            } else if (categoryImageContainer) {
              // Has nested subcategories, hide category image initially
              categoryImageContainer.style.display = 'none';
            }
          }
        }, 100);
      });
    });

    // Mark as initialized to prevent duplicate listeners
    this.accordionImagesInitialized = true;
  } */

  /**
   * Load catalog image for a container - DISABLED
   * Fetches collection image based on collection handle from nearby links
   * @param {HTMLElement} container - Image container element
   */
  /* loadCatalogImage(container) {
    if (!container || container.querySelector('img')) return;

    const categoryHandle = container.getAttribute('data-category');
    if (!categoryHandle) return;

    // Priority: Get collection handle from last level (sub-subcategory) first
    let collectionHandle = null;
    let firstSublink = null;

    // Check if this is a subcategory image container (nested level)
    if (container.classList.contains('mobile-catalog-drawer__subcategory-image')) {
      // Get first sub-subcategory link (last level)
      firstSublink = container
        .closest('.mobile-catalog-drawer__sub-subcategory-content')
        ?.querySelector('.mobile-catalog-drawer__sub-subcategory-link[data-collection-handle]');
      
      if (firstSublink) {
        collectionHandle = firstSublink.getAttribute('data-collection-handle');
      }
    }

    // Fallback: If no sub-subcategory link, get from subcategory link
    if (!collectionHandle) {
      firstSublink = container
        .closest('.mobile-catalog-drawer__subcategory-content')
        ?.querySelector('.mobile-catalog-drawer__subcategory-link[data-collection-handle]');

      if (firstSublink) {
        collectionHandle = firstSublink.getAttribute('data-collection-handle');
      }
    }

    // Fallback: Try to get from category level links
    if (!collectionHandle) {
      const categoryGroup = container.closest('.mobile-catalog-drawer__category-group');
      firstSublink = categoryGroup?.querySelector('.mobile-catalog-drawer__subcategory-link[data-collection-handle]');
      
      if (firstSublink) {
        collectionHandle = firstSublink.getAttribute('data-collection-handle');
      }
    }

    if (!collectionHandle) return;

    fetch(`/collections/${collectionHandle}.js`)
      .then((response) => (response.ok ? response.json() : null))
      .then((collection) => {
        if (collection && collection.image) {
          const img = document.createElement('img');
          img.src = collection.image;
          img.alt = collection.title || (firstSublink?.textContent?.trim()) || '';
          img.loading = 'lazy';

          img.onload = () => {
            img.classList.add('loaded');
            // Hide placeholder when image loads
            const placeholder = container.querySelector('.mobile-catalog-drawer__image-placeholder');
            if (placeholder) {
              placeholder.style.display = 'none';
            }
          };

          container.appendChild(img);
        } else {
          // No image found, hide placeholder
          const placeholder = container.querySelector('.mobile-catalog-drawer__image-placeholder');
          if (placeholder) {
            placeholder.style.display = 'none';
          }
        }
      })
      .catch(() => {
        // Silent fail - hide placeholder on error
        const placeholder = container.querySelector('.mobile-catalog-drawer__image-placeholder');
        if (placeholder) {
          placeholder.style.display = 'none';
        }
      });
  } */

  /**
   * Announce message to screen readers
   * @param {string} message - Message to announce
   */
  announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'visually-hidden';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  /**
   * Cleanup method to prevent memory leaks
   */
  destroy() {
    // Cancel any pending RAF
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    
    // Disconnect resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    
    // Close drawer if open
    this.closeDrawer();
    
    // Reset body styles
    this.body.style.overflow = '';
    this.body.classList.remove('mobile-nav-disabled');
    
    // Remove data attribute
    this.removeAttribute('data-initialized');
  }

  /**
   * Handle component removal
   */
  disconnectedCallback() {
    this.destroy();
  }
}

// Register the custom element
if (!customElements.get('mobile-bottom-nav')) {
  customElements.define('mobile-bottom-nav', MobileBottomNav);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Only initialize on mobile devices
  if (window.innerWidth < 750) {
    const mobileNav = document.querySelector('mobile-bottom-nav');
    if (mobileNav && !mobileNav.hasAttribute('data-initialized')) {
      // Component will auto-initialize via constructor
    }
  }
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // Recalculate nav height when page becomes visible
    const mobileNav = document.querySelector('mobile-bottom-nav');
    if (mobileNav && mobileNav.hasAttribute('data-initialized')) {
      mobileNav.setBodyPadding();
    }
  }
});
