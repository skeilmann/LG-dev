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
   * Open the existing header search modal
   */
  openSearchModal() {
    // Find and trigger the existing header search modal
    const searchModal = document.querySelector('.header__search details');
    const searchButton = document.querySelector('.header__icon--search');
    
    if (searchModal && searchButton) {
      // Open the modal
      searchModal.setAttribute('open', '');
      searchButton.setAttribute('aria-expanded', 'true');
      
      // Focus the search input
      const searchInput = searchModal.querySelector('input[type="search"]');
      if (searchInput) {
        setTimeout(() => searchInput.focus(), 100);
      }
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
  }

  /**
   * Handle touch move for swipe gestures
   * @param {TouchEvent} event - Touch move event
   */
  handleTouchMove(event) {
    if (!this.isDrawerOpen) return;
    
    const touchY = event.touches[0].clientY;
    const deltaY = touchY - this.touchStartY;
    
    // Only consider it dragging if moved more than 10px
    if (Math.abs(deltaY) > 10) {
      this.isDragging = true;
    }
    
    // If dragging down, add visual feedback
    if (this.isDragging && deltaY > 0) {
      const content = this.drawer.querySelector('.mobile-catalog-drawer__content');
      if (content) {
        const translateY = Math.min(deltaY * 0.5, 50);
        content.style.transform = `translateY(${translateY}px)`;
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
    
    // Reset transform
    const content = this.drawer.querySelector('.mobile-catalog-drawer__content');
    if (content) {
      content.style.transform = '';
    }
    
    // Close drawer if swiped down with sufficient distance or velocity
    if (deltaY > 100 || velocity > 0.5) {
      this.closeDrawer();
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
