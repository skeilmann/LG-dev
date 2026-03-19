/**
 * === ARCHITECTURE OVERVIEW ===
 * 
 * 1. **Universal .is-visible Class**
 *    - Single CSS class controls opacity, visibility, and pointer-events
 *    - Replaces multiple custom visibility classes (.mega-menu-visible, .mega-menu-hidden, .active)
 *    - Reduces CSS complexity and prevents class proliferation
 *    - Applied via JavaScript for consistent behavior across all components
 * 
 * 2. **DRY Helper Functions**
 *    - resetVisibility(): Removes .is-visible from element groups
 *    - showElements(): Adds .is-visible and manages ARIA attributes
 *    - Eliminates repetitive DOM manipulation code
 *    - Provides single source of truth for visibility management
 * 
 * 3. **Data-Driven Approach**
 *    - data-target-list: Specifies which subcategory/sub-subcategory list to show
 *    - data-target-image: Specifies which image to display
 *    - Eliminates hardcoded selectors and makes system flexible
 *    - Easy to extend without modifying JavaScript logic
 * 
 * === USAGE EXAMPLES ===
 * 
 * HTML Structure Requirements:
 * ```html
 * <a href="/category" class="mega-menu-category" 
 *    data-target-list="[data-parent-category='category-handle']"
 *    data-target-image="[data-category-image='category-handle']">
 *   Category Name
 * </a>
 * 
 * <ul class="mega-menu-subcategories" data-parent-category="category-handle">
 *   <li>
 *     <a href="/subcategory" class="mega-menu-sublink"
 *        data-target-list="[data-parent-subcategory='subcategory-handle']"
 *        data-target-image="[data-subcategory-image='subcategory-handle']">
 *       Subcategory Name
 *     </a>
 *   </li>
 * </ul>
 * ```
 * 
 * === PERFORMANCE FEATURES ===
 * 
 * - RAF-based transitions for smooth animations
 * - GPU acceleration via transform3d
 * - Lazy image loading for mobile accordions
 * - Hover timeout delays to prevent flicker
 * - Memory cleanup on destroy
 * 
 * === ACCESSIBILITY FEATURES ===
 * 
 * - Full keyboard navigation support
 * - ARIA attributes for screen readers
 * - Focus management
 * - Escape key handling
 * - Loading states with proper announcements
 */
class CustomHeader {
  constructor() {
    this.init();
  }

  init() {
    this.mobileMenuToggle = document.querySelector('.header__mobile-menu-toggle');
    this.mobileMenu = document.querySelector('.header__mobile-menu');
    this.mobileMenuBackdrop = document.querySelector('.header__mobile-menu-backdrop');
    this.mobileMenuClose = document.querySelector('.header__mobile-menu-close');
    this.dropdownButtons = document.querySelectorAll('.header__menu-item--dropdown');
    this.dropdownMenus = document.querySelectorAll('.header__dropdown-menu');
    
    // Mega menu elements - updated for 4-zone structure
    this.megaMenuWrapper = document.querySelector('.mega-menu-wrapper');
    this.megaMenuDropdown = document.querySelector('.mega-menu-dropdown');
    this.megaMenuTrigger = document.querySelector('.header__menu-item--mega');
    this.zone1 = document.querySelector('.mega-menu-zone-1'); // Categories
    this.zone2 = document.querySelector('.mega-menu-zone-2'); // Subcategories
    this.zone3 = document.querySelector('.mega-menu-zone-3'); // Sub-subcategories
    this.zone4 = document.querySelector('.mega-menu-zone-4'); // Images
    this.imageContainer = document.querySelector('.mega-menu-featured-image');

    // State variables for mega menu management
    this.currentActiveCategory = null;
    this.currentActiveSubcategory = null;
    // Performance optimization flags
    this.rafId = null;

    // Separate timeout IDs to prevent race conditions between zones
    this.menuLeaveTimeout = null;
    this.zone1LeaveTimeout = null;
    this.zone2LeaveTimeout = null;
    this.zone3LeaveTimeout = null;
    this.hoverIntentTimeout = null;
    this.HOVER_INTENT_DELAY = 50; // ms - imperceptible but filters accidental hovers
    
    // Mobile menu swipe state
    this.isMobileMenuDragging = false;
    this.touchStartY = 0;
    this.touchStartX = 0;
    this.touchStartTime = 0;

    // Create all bound handlers as named references for proper cleanup
    this._boundToggleMobileMenu = this.toggleMobileMenu.bind(this);
    this._boundCloseMobileMenu = this.closeMobileMenu.bind(this);
    this._boundHandleTouchStart = this.handleMobileMenuTouchStart.bind(this);
    this._boundHandleTouchMove = this.handleMobileMenuTouchMove.bind(this);
    this._boundHandleTouchEnd = this.handleMobileMenuTouchEnd.bind(this);
    this._boundHandleAnchorDropdown = this.handleAnchorDropdown.bind(this);
    this._boundToggleDropdown = this.toggleDropdown.bind(this);
    this._boundHandleDropdownKeydown = this.handleDropdownKeydown.bind(this);
    this._boundHandleDropdownFocusIn = this.handleDropdownFocusIn.bind(this);
    this._boundHandleDropdownFocusOut = this.handleDropdownFocusOut.bind(this);
    this._boundHandleResize = debounce(this.handleResize.bind(this), 150);
    this._boundDocumentClick = this._handleDocumentClick.bind(this);
    this._boundDocumentKeydown = this._handleDocumentKeydown.bind(this);

    // AbortController for fetch requests
    this.fetchController = new AbortController();

    this.bindEvents();
    this.initMegaMenu();
    this.initMobileAccordion();
  }

  // Centralized document click handler (replaces multiple anonymous listeners)
  _handleDocumentClick(e) {
    // Close mobile menu when clicking outside
    if (this.mobileMenu && this.mobileMenu.getAttribute('aria-hidden') === 'false' &&
        !this.mobileMenu.contains(e.target) && !this.mobileMenuToggle.contains(e.target)) {
      this.closeMobileMenu();
    }
    // Close dropdowns when clicking outside
    if (!e.target.closest('.header__menu-item-wrapper')) {
      this.closeAllDropdowns();
    }
  }

  // Centralized document keydown handler (replaces multiple anonymous listeners)
  _handleDocumentKeydown(e) {
    if (e.key === 'Escape') {
      this.closeMobileMenu();
      this.closeAllDropdowns();
      if (this.megaMenuDropdown && this.megaMenuDropdown.getAttribute('aria-hidden') === 'false') {
        this.closeMegaMenu();
        this.megaMenuTrigger?.focus();
      }
    }
  }

  bindEvents() {
    if (this.mobileMenuToggle) {
      this.mobileMenuToggle.addEventListener('click', this._boundToggleMobileMenu);
    }

    if (this.mobileMenuClose) {
      this.mobileMenuClose.addEventListener('click', this._boundCloseMobileMenu);
    }

    if (this.mobileMenuBackdrop) {
      this.mobileMenuBackdrop.addEventListener('click', this._boundCloseMobileMenu);
    }

    // Single document click handler for all outside-click behaviors
    document.addEventListener('click', this._boundDocumentClick);

    // Add touch event listeners for swipe gesture
    if (this.mobileMenu) {
      this.mobileMenu.addEventListener('touchstart', this._boundHandleTouchStart, { passive: true });
      this.mobileMenu.addEventListener('touchmove', this._boundHandleTouchMove, { passive: true });
      this.mobileMenu.addEventListener('touchend', this._boundHandleTouchEnd, { passive: true });
    }

    // Handle dropdown menus
    this.dropdownButtons.forEach(button => {
      if (button.tagName === 'A') {
        button.addEventListener('click', this._boundHandleAnchorDropdown);
      } else {
        button.addEventListener('click', this._boundToggleDropdown);
      }
      button.addEventListener('keydown', this._boundHandleDropdownKeydown);
    });

    // Handle focus management for dropdowns
    this.dropdownMenus.forEach(menu => {
      menu.addEventListener('focusin', this._boundHandleDropdownFocusIn);
      menu.addEventListener('focusout', this._boundHandleDropdownFocusOut);
    });

    // Single document keydown handler for Escape
    document.addEventListener('keydown', this._boundDocumentKeydown);

    // Handle window resize
    window.addEventListener('resize', this._boundHandleResize);
  }

  // ===== MEGA MENU FUNCTIONALITY =====
  initMegaMenu() {
    if (!this.megaMenuWrapper || !this.megaMenuDropdown) return;

    // Store mega menu handlers for cleanup
    this._boundMegaMenuEnter = () => {
      clearTimeout(this.menuLeaveTimeout);
      if (this.megaMenuDropdown.getAttribute('aria-hidden') === 'true') {
        this.openMegaMenu();
      }
    };

    this._boundMegaMenuLeave = (e) => {
      const relatedTarget = e.relatedTarget;
      if (
        relatedTarget &&
        (this.megaMenuWrapper.contains(relatedTarget) ||
         this.megaMenuDropdown.contains(relatedTarget) ||
         relatedTarget.closest('.mega-menu-wrapper') ||
         relatedTarget.closest('.mega-menu-dropdown'))
      ) {
        return;
      }

      this.menuLeaveTimeout = setTimeout(() => {
        const mouseElement = document.elementFromPoint(e.clientX, e.clientY);
        if (
          mouseElement &&
          (this.megaMenuWrapper.contains(mouseElement) ||
           this.megaMenuDropdown.contains(mouseElement))
        ) {
          return;
        }
        this.closeMegaMenu();
      }, 75);
    };

    this.megaMenuWrapper.addEventListener('mouseenter', this._boundMegaMenuEnter);
    this.megaMenuWrapper.addEventListener('mouseleave', this._boundMegaMenuLeave);

    if (this.megaMenuDropdown) {
      this.megaMenuDropdown.addEventListener('mouseenter', this._boundMegaMenuEnter);
      this.megaMenuDropdown.addEventListener('mouseleave', this._boundMegaMenuLeave);
    }

    // Initialize hover events for all menu levels
    this.initCategoryHovers();
    this.initSubcategoryHovers();
    this.initSubSubcategoryHovers();

    // Keyboard accessibility for mega menu
    this.initKeyboardNavigation();
  }

  // Initialize Category (Column 1) hover events using event delegation
  initCategoryHovers() {
    if (!this.zone1) return;

    // Event delegation: single listener on zone1 instead of per-category listeners
    this._boundZone1MouseOver = (e) => {
      const categoryLink = e.target.closest('.mega-menu-category');
      if (!categoryLink) return;
      clearTimeout(this.hoverIntentTimeout);
      this.hoverIntentTimeout = setTimeout(() => {
        this.handleCategoryHover(categoryLink);
      }, this.HOVER_INTENT_DELAY);
    };

    this._boundZone1MouseOut = (e) => {
      const categoryLink = e.target.closest('.mega-menu-category');
      if (!categoryLink) return;
      // Only clear if mouse is leaving the category (not entering a child)
      if (!categoryLink.contains(e.relatedTarget)) {
        clearTimeout(this.hoverIntentTimeout);
      }
    };

    this._boundZone1Leave = () => {
      clearTimeout(this.zone1LeaveTimeout);
      this.zone1LeaveTimeout = setTimeout(() => {
        if (!this.zone2?.matches(':hover') && !this.zone3?.matches(':hover') && !this.zone4?.matches(':hover')) {
          this.resetToDefaultState();
        }
      }, 75);
    };

    this.zone1.addEventListener('mouseover', this._boundZone1MouseOver);
    this.zone1.addEventListener('mouseout', this._boundZone1MouseOut);
    this.zone1.addEventListener('mouseleave', this._boundZone1Leave);
  }

  // Initialize Subcategory (Column 2) hover events
  initSubcategoryHovers() {
    if (!this.zone2) return;

    this._boundZone2MouseOver = (e) => {
      if (e.target.classList.contains('mega-menu-sublink')) {
        this.handleSubcategoryHover(e.target);
      }
    };

    this._boundZone2Leave = () => {
      clearTimeout(this.zone2LeaveTimeout);
      this.zone2LeaveTimeout = setTimeout(() => {
        if (!this.zone3?.matches(':hover')) {
          this.resetVisibility(document.querySelectorAll('.mega-menu-sub-subcategories'));
          this.showCategoryImage();
        }
      }, 75);
    };

    this.zone2.addEventListener('mouseover', this._boundZone2MouseOver);
    this.zone2.addEventListener('mouseleave', this._boundZone2Leave);
  }

  // Initialize Sub-subcategory (Column 3) hover events
  initSubSubcategoryHovers() {
    if (!this.zone3) return;

    this._boundZone3MouseOver = (e) => {
      if (e.target.classList.contains('mega-menu-sub-sublink')) {
        this.handleSubSubcategoryHover(e.target);
      }
    };

    this._boundZone3Leave = () => {
      clearTimeout(this.zone3LeaveTimeout);
      this.zone3LeaveTimeout = setTimeout(() => {
        if (!this.zone4?.matches(':hover')) {
          this.showSubcategoryImage();
        }
      }, 75);
    };

    this.zone3.addEventListener('mouseover', this._boundZone3MouseOver);
    this.zone3.addEventListener('mouseleave', this._boundZone3Leave);
  }

  openMegaMenu() {
    this.megaMenuTrigger?.setAttribute('aria-expanded', 'true');
    this.megaMenuDropdown.setAttribute('aria-hidden', 'false');
    
    // Reset to default state when opening
    this.resetToDefaultState();
  }

  closeMegaMenu() {
    this.megaMenuTrigger?.setAttribute('aria-expanded', 'false');
    this.megaMenuDropdown.setAttribute('aria-hidden', 'true');

    // Reset all states when closing
    this.resetToDefaultState();
    this.currentActiveCategory = null;
    this.currentActiveSubcategory = null;
  }

  // ===== DRY HELPER METHODS =====
  
  /**
   * Universal helper to reset visibility of multiple elements
   * Why this approach? Eliminates code duplication and provides a single source of truth
   * for visibility management. Makes the system more maintainable and consistent.
   * @param {NodeList|Array} elements - Elements to hide
   * @param {boolean} setAriaHidden - Whether to set aria-hidden="true"
   */
  resetVisibility(elements, setAriaHidden = true) {
    elements.forEach((element) => {
      element.classList.remove('is-visible');
      if (setAriaHidden) {
        element.setAttribute('aria-hidden', 'true');
      }
    });
  }

  /**
   * Universal helper to show specific elements
   * Complements resetVisibility() by providing a clean way to show targeted content
   * @param {NodeList|Array} elements - Elements to show
   */
  showElements(elements) {
    elements.forEach((element) => {
      element.classList.add('is-visible');
      element.setAttribute('aria-hidden', 'false');
    });
  }

  // ===== STATE MANAGEMENT METHODS =====
  
  // Reset to default state - show only column 1, hide columns 2&3, show default image
  resetToDefaultState() {
    // Clear active states from category links
    this.resetVisibility(document.querySelectorAll('.mega-menu-category.is-visible'), false);

    // Hide all subcategories (column 2)
    this.resetVisibility(document.querySelectorAll('.mega-menu-subcategories'));

    // Hide all sub-subcategories (column 3)
    this.resetVisibility(document.querySelectorAll('.mega-menu-sub-subcategories'));

    // Clear all images (column 4) - no default placeholder shown
    this.clearAllImages();

    // Clear active tracking so re-hovering the same item works after reset
    this.currentActiveCategory = null;
    this.currentActiveSubcategory = null;
  }

  // Universal helper to clear all images before showing a new one
  // Pass excludeElement to skip it during clear (enables smooth crossfade transitions)
  clearAllImages(excludeElement = null) {
    const scope = this.imageContainer || this.megaMenuDropdown || document;
    const images = scope.querySelectorAll(
      '.mega-menu-category-image, .mega-menu-subcategory-image, .mega-menu-sub-subcategory-image'
    );
    images.forEach((img) => {
      if (img !== excludeElement) {
        img.classList.remove('is-visible');
      }
    });
  }



  // Show category image in column 4
  showCategoryImage() {
    if (!this.currentActiveCategory) return;
    
    // Use data-target-image attribute for cleaner logic
    const targetImageSelector = this.currentActiveCategory.getAttribute('data-target-image');
    if (!targetImageSelector) return;
    
    // Resolve the target within the image container scope (avoid document.querySelector without scoping)
    const scope = this.imageContainer || this.megaMenuDropdown || document;
    const categoryImage = scope.querySelector(targetImageSelector);
    
    if (categoryImage) {
      // Clear other images (exclude target for smooth crossfade)
      this.clearAllImages(categoryImage);

      // Show target image
      this.showElements([categoryImage]);
    }
    // If not found, do nothing (leave zone4 empty; no fallbacks)
  }

  // Show subcategory image in column 4
  showSubcategoryImage() {
    if (!this.currentActiveSubcategory) return;
    
    // Use data-target-image attribute for cleaner logic
    const targetImageSelector = this.currentActiveSubcategory.getAttribute('data-target-image');
    if (!targetImageSelector) {
      this.showCategoryImage(); // Fallback to category image
      return;
    }
    
    // Resolve the target within the image container scope (avoid document.querySelector without scoping)
    const scope = this.imageContainer || this.megaMenuDropdown || document;
    const subcategoryImage = scope.querySelector(targetImageSelector);
    
    if (subcategoryImage) {
      // Clear other images (exclude target for smooth crossfade)
      this.clearAllImages(subcategoryImage);

      // Show target image
      this.showElements([subcategoryImage]);
    } else {
      this.showCategoryImage(); // Fallback to category image
    }
  }

  // ===== HOVER HANDLER METHODS =====

  // Handle category (column 1) hover - show subcategories in column 2
  handleCategoryHover(categoryLink) {
    // Visibility gate on hover handlers
    if (!this.megaMenuDropdown || this.megaMenuDropdown.getAttribute('aria-hidden') === 'true') return;
    
    // Skip if this is already the active category to prevent unnecessary work
    if (this.currentActiveCategory === categoryLink) return;
    
    // Cancel any pending RAF
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    
    // Use RAF for smooth transitions
    this.rafId = requestAnimationFrame(() => {
      // Update active category using our DRY approach
      this.resetVisibility(document.querySelectorAll('.mega-menu-category.is-visible'), false);
      categoryLink.classList.add('is-visible');
      this.currentActiveCategory = categoryLink;
      this.currentActiveSubcategory = null;

      /**
       * Data-driven approach using data-target-list attribute
       * Why this works: Instead of hardcoding logic for each category, we use
       * data attributes to specify which subcategory list to show. This makes
       * the system flexible and reduces repetitive code.
       */
      const targetListSelector = categoryLink.getAttribute('data-target-list');
      
      // Hide all subcategories first using our DRY helper
      this.resetVisibility(document.querySelectorAll('.mega-menu-subcategories'));
      
      // Show target subcategories if specified
      if (targetListSelector) {
        const subcategoriesList = document.querySelector(targetListSelector);
        
        if (subcategoriesList) {
          this.showElements([subcategoriesList]);
        }
      }
      
      // Hide all sub-subcategories using our DRY helper
      this.resetVisibility(document.querySelectorAll('.mega-menu-sub-subcategories'));
      
      // Show category image using data-driven approach
      this.showCategoryImage();
    });
  }

  // Handle subcategory (column 2) hover - show sub-subcategories in column 3
  handleSubcategoryHover(subcategoryLink) {
    // Visibility gate on hover handlers
    if (!this.megaMenuDropdown || this.megaMenuDropdown.getAttribute('aria-hidden') === 'true') return;
    
    // Update active subcategory using our DRY approach
    this.resetVisibility(document.querySelectorAll('.mega-menu-sublink.is-visible'), false);
    subcategoryLink.classList.add('is-visible');
    this.currentActiveSubcategory = subcategoryLink;

    /**
     * Data-driven approach for sub-subcategories
     * Uses data-target-list to specify which sub-subcategory list to show
     * This eliminates hardcoded selectors and makes the system more flexible
     */
    const targetListSelector = subcategoryLink.getAttribute('data-target-list');
    
    // Hide all sub-subcategories first using our DRY helper
    this.resetVisibility(document.querySelectorAll('.mega-menu-sub-subcategories'));
    
    // Show target sub-subcategories if specified
    if (targetListSelector) {
      const subSubcategoriesList = document.querySelector(targetListSelector);
      
      if (subSubcategoriesList) {
        this.showElements([subSubcategoriesList]);
      }
    }
    
    // Show subcategory image using data-driven approach
    this.showSubcategoryImage();
  }

  // Handle sub-subcategory (column 3) hover - show sub-subcategory image in column 4
  handleSubSubcategoryHover(subSubcategoryLink) {
    // Visibility gate on hover handlers
    if (!this.megaMenuDropdown || this.megaMenuDropdown.getAttribute('aria-hidden') === 'true') return;
    
    // Update active sub-subcategory using our DRY approach
    this.resetVisibility(document.querySelectorAll('.mega-menu-sub-sublink.is-visible'), false);
    subSubcategoryLink.classList.add('is-visible');

    /**
     * Data-driven image handling for sub-subcategories
     * Uses data-target-image attribute to specify which image to show
     * Provides clean fallback chain: sub-subcategory → subcategory → category → default
     */
    const targetImageSelector = subSubcategoryLink.getAttribute('data-target-image');
    
    if (targetImageSelector) {
      // Resolve the target within the image container scope (avoid document.querySelector without scoping)
      const scope = this.imageContainer || this.megaMenuDropdown || document;
      const subSubcategoryImage = scope.querySelector(targetImageSelector);
      
      if (subSubcategoryImage) {
        // Clear other images (exclude target for smooth crossfade)
        this.clearAllImages(subSubcategoryImage);

        // Show target image
        this.showElements([subSubcategoryImage]);
      } else {
        // Fallback to subcategory image
        this.showSubcategoryImage();
      }
    } else {
      // No target image specified, fallback to subcategory image
      this.showSubcategoryImage();
    }
  }

  // ===== KEYBOARD NAVIGATION =====
  initKeyboardNavigation() {
    // Note: Escape key is handled globally in bindEvents()

    // Mega menu trigger keyboard support
    if (this.megaMenuTrigger) {
      this._boundTriggerKeydown = (e) => {
        switch (e.key) {
          case 'Enter':
          case ' ':
            e.preventDefault();
            if (this.megaMenuDropdown.getAttribute('aria-hidden') === 'true') {
              this.openMegaMenu();
              const firstCat = this.zone1?.querySelector('.mega-menu-category');
              if (firstCat) setTimeout(() => firstCat.focus(), 100);
            } else {
              this.closeMegaMenu();
            }
            break;
          case 'ArrowDown':
            e.preventDefault();
            this.openMegaMenu();
            const firstCategory = this.zone1?.querySelector('.mega-menu-category');
            if (firstCategory) setTimeout(() => firstCategory.focus(), 100);
            break;
        }
      };
      this.megaMenuTrigger.addEventListener('keydown', this._boundTriggerKeydown);
    }

    // Zone keyboard navigation (event delegation)
    this._boundZone1Keydown = this.handleCategoryKeyNavigation.bind(this);
    this._boundZone2Keydown = this.handleSubcategoryKeyNavigation.bind(this);
    this._boundZone3Keydown = this.handleSubSubcategoryKeyNavigation.bind(this);

    if (this.zone1) this.zone1.addEventListener('keydown', this._boundZone1Keydown);
    if (this.zone2) this.zone2.addEventListener('keydown', this._boundZone2Keydown);
    if (this.zone3) this.zone3.addEventListener('keydown', this._boundZone3Keydown);
  }

  // Handle keyboard navigation within categories (Column 1)
  handleCategoryKeyNavigation(e) {
    const categories = Array.from(this.zone1.querySelectorAll('.mega-menu-category'));
    const currentIndex = categories.indexOf(e.target);
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextCategory = categories[currentIndex + 1] || categories[0];
        nextCategory.focus();
        this.handleCategoryHover(nextCategory);
        break;
      case 'ArrowUp':
        e.preventDefault();
        const prevCategory = categories[currentIndex - 1] || categories[categories.length - 1];
        prevCategory.focus();
        this.handleCategoryHover(prevCategory);
        break;
      case 'ArrowRight':
        e.preventDefault();
        // Move to first subcategory if available
        const visibleSubcategories = this.zone2?.querySelector('.mega-menu-subcategories.is-visible');
        if (visibleSubcategories) {
          const firstSubcategory = visibleSubcategories.querySelector('.mega-menu-sublink');
          if (firstSubcategory) {
            firstSubcategory.focus();
          }
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        // Navigate to category URL
        window.location.href = e.target.href;
        break;
      case 'Escape':
        e.preventDefault();
        this.closeMegaMenu();
        this.megaMenuTrigger?.focus();
        break;
    }
  }

  // Handle keyboard navigation within subcategories (Column 2)
  handleSubcategoryKeyNavigation(e) {
    if (!e.target.classList.contains('mega-menu-sublink')) return;
    
    const visibleList = e.target.closest('.mega-menu-subcategories.is-visible');
    if (!visibleList) return;
    
    const subcategories = Array.from(visibleList.querySelectorAll('.mega-menu-sublink'));
    const currentIndex = subcategories.indexOf(e.target);
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextSubcategory = subcategories[currentIndex + 1] || subcategories[0];
        nextSubcategory.focus();
        this.handleSubcategoryHover(nextSubcategory);
        break;
      case 'ArrowUp':
        e.preventDefault();
        const prevSubcategory = subcategories[currentIndex - 1] || subcategories[subcategories.length - 1];
        prevSubcategory.focus();
        this.handleSubcategoryHover(prevSubcategory);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        // Move back to active category
        const activeCategory = this.zone1?.querySelector('.mega-menu-category.is-visible');
        if (activeCategory) {
          activeCategory.focus();
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        // Move to first sub-subcategory if available
        const visibleSubSubcategories = this.zone3?.querySelector('.mega-menu-sub-subcategories.is-visible');
        if (visibleSubSubcategories) {
          const firstSubSubcategory = visibleSubSubcategories.querySelector('.mega-menu-sub-sublink');
          if (firstSubSubcategory) {
            firstSubSubcategory.focus();
          }
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        window.location.href = e.target.href;
        break;
      case 'Escape':
        e.preventDefault();
        this.closeMegaMenu();
        this.megaMenuTrigger?.focus();
        break;
    }
  }

  // Handle keyboard navigation within sub-subcategories (Column 3)
  handleSubSubcategoryKeyNavigation(e) {
    if (!e.target.classList.contains('mega-menu-sub-sublink')) return;
    
    const visibleList = e.target.closest('.mega-menu-sub-subcategories.is-visible');
    if (!visibleList) return;
    
    const subSubcategories = Array.from(visibleList.querySelectorAll('.mega-menu-sub-sublink'));
    const currentIndex = subSubcategories.indexOf(e.target);
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextSubSubcategory = subSubcategories[currentIndex + 1] || subSubcategories[0];
        nextSubSubcategory.focus();
        this.handleSubSubcategoryHover(nextSubSubcategory);
        break;
      case 'ArrowUp':
        e.preventDefault();
        const prevSubSubcategory = subSubcategories[currentIndex - 1] || subSubcategories[subSubcategories.length - 1];
        prevSubSubcategory.focus();
        this.handleSubSubcategoryHover(prevSubSubcategory);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        // Move back to active subcategory
        const activeSubcategory = this.zone2?.querySelector('.mega-menu-sublink.is-visible');
        if (activeSubcategory) {
          activeSubcategory.focus();
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        window.location.href = e.target.href;
        break;
      case 'Escape':
        e.preventDefault();
        this.closeMegaMenu();
        this.megaMenuTrigger?.focus();
        break;
    }
  }

  // ===== MOBILE ACCORDION FUNCTIONALITY =====
  initMobileAccordion() {
    // Use event delegation on the mobile menu to handle all accordion clicks
    // This prevents duplicate listeners when initMobileAccordion is called multiple times
    if (!this.mobileMenu) return;

    this._boundAccordionClick = (e) => {
      // Handle subcategory accordion clicks (second level)
      const categoryTitle = e.target.closest('.mobile-category-title');
      if (categoryTitle) {
        const accordion = categoryTitle.closest('.mobile-subcategory-accordion');
        if (accordion && !accordion.hasAttribute('open')) {
          const categoryImageContainer = accordion.querySelector('.mobile-category-image--category');
          setTimeout(() => {
            const nestedAccordions = accordion.querySelectorAll('.mobile-sub-subcategory-accordion');
            if (nestedAccordions.length === 0 && categoryImageContainer) {
              this.loadMobileImage(categoryImageContainer);
            } else if (categoryImageContainer) {
              categoryImageContainer.style.display = 'none';
            }
          }, 300);
        }
        return;
      }

      // Handle sub-subcategory accordion clicks (third level)
      const subTitle = e.target.closest('.mobile-sub-subcategory-title');
      if (subTitle) {
        const accordion = subTitle.closest('.mobile-sub-subcategory-accordion');
        if (!accordion) return;
        const subcategoryImageContainer = accordion.querySelector('.mobile-category-image--subcategory');
        const parentCategoryImage = accordion.closest('.mobile-subcategory-content')?.querySelector('.mobile-category-image--category');

        if (!accordion.hasAttribute('open')) {
          setTimeout(() => {
            if (subcategoryImageContainer) {
              this.loadMobileImage(subcategoryImageContainer);
            }
            if (parentCategoryImage) {
              parentCategoryImage.style.display = 'none';
            }
          }, 300);
        } else {
          if (parentCategoryImage && !parentCategoryImage.querySelector('img')) {
            parentCategoryImage.style.display = '';
            this.loadMobileImage(parentCategoryImage);
          }
        }
      }
    };

    this.mobileMenu.addEventListener('click', this._boundAccordionClick);
  }

  loadMobileImage(container) {
    if (!container || container.querySelector('img')) return;

    const categoryHandle = container.getAttribute('data-category');

    if (!categoryHandle) return;

    // Priority: Get collection handle from last level (sub-subcategory) first
    let collectionHandle = null;
    let firstSublink = null;

    // Check if this is a subcategory image container (last level)
    if (container.classList.contains('mobile-category-image--subcategory')) {
      // Get first sub-subcategory link (last level)
      firstSublink = container
        .closest('.mobile-sub-subcategory-content')
        ?.querySelector('.mobile-sub-subcategory-link[data-collection-handle]');
      
      if (firstSublink) {
        collectionHandle = firstSublink.getAttribute('data-collection-handle');
      }
    }

    // Fallback: If no sub-subcategory link, get from subcategory link
    if (!collectionHandle) {
      firstSublink = container
        .closest('.mobile-subcategory-content')
        ?.querySelector('.mobile-subcategory-link[data-collection-handle]');

      if (firstSublink) {
        collectionHandle = firstSublink.getAttribute('data-collection-handle');
      }
    }

    if (!collectionHandle) return;

    fetch(`/collections/${collectionHandle}.js`, { signal: this.fetchController.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((collection) => {
        if (collection && collection.image) {
          const img = document.createElement('img');
          img.src = collection.image;
          img.alt = collection.title || (firstSublink?.textContent?.trim()) || '';
          img.loading = 'lazy';

          img.onload = () => {
            img.classList.add('loaded');
          };

          container.appendChild(img);
        }
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return;
        // Silent fail - no fallback images
      });
  }

  // ===== MOBILE MENU FUNCTIONALITY =====
  toggleMobileMenu() {
    const isHidden = this.mobileMenu.getAttribute('aria-hidden') === 'true';
    this.mobileMenu.setAttribute('aria-hidden', !isHidden);
    this.mobileMenuToggle.setAttribute('aria-expanded', isHidden);

    // Show/hide backdrop
    if (this.mobileMenuBackdrop) {
      this.mobileMenuBackdrop.setAttribute('aria-hidden', isHidden);
    }

    if (isHidden) {
      document.body.style.overflow = 'hidden';
      this._enableFocusTrap();
    } else {
      document.body.style.overflow = '';
      this._disableFocusTrap();
    }
  }

  _enableFocusTrap() {
    this._boundFocusTrap = (e) => {
      if (e.key !== 'Tab') return;
      const focusableElements = this.mobileMenu.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length === 0) return;

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };
    this.mobileMenu.addEventListener('keydown', this._boundFocusTrap);
  }

  _disableFocusTrap() {
    if (this._boundFocusTrap) {
      this.mobileMenu.removeEventListener('keydown', this._boundFocusTrap);
      this._boundFocusTrap = null;
    }
  }

  closeMobileMenu() {
    this.mobileMenu.setAttribute('aria-hidden', 'true');
    this.mobileMenuToggle.setAttribute('aria-expanded', 'false');

    // Hide backdrop
    if (this.mobileMenuBackdrop) {
      this.mobileMenuBackdrop.setAttribute('aria-hidden', 'true');
    }

    document.body.style.overflow = '';
    this._disableFocusTrap();
    
    // Remove any swipe class and reset transforms
    this.mobileMenu.classList.remove('swiping');
    this.mobileMenu.style.transform = '';
    this.mobileMenu.style.opacity = '';
    this.mobileMenu.style.transition = '';
    
    // Reset backdrop styles
    if (this.mobileMenuBackdrop) {
      this.mobileMenuBackdrop.style.opacity = '';
      this.mobileMenuBackdrop.style.transition = '';
    }
  }
  
  // ===== MOBILE MENU SWIPE GESTURES =====
  handleMobileMenuTouchStart(event) {
    if (!this.mobileMenu || this.mobileMenu.getAttribute('aria-hidden') === 'true') return;
    
    this.touchStartY = event.touches[0].clientY;
    this.touchStartX = event.touches[0].clientX;
    this.touchStartTime = Date.now();
    this.isMobileMenuDragging = false;
    
    // Add swiping class for visual feedback
    this.mobileMenu.classList.add('swiping');
  }
  
  handleMobileMenuTouchMove(event) {
    if (!this.mobileMenu || this.mobileMenu.getAttribute('aria-hidden') === 'true') return;
    
    const touchX = event.touches[0].clientX;
    const touchY = event.touches[0].clientY;
    const deltaX = touchX - this.touchStartX;
    const deltaY = touchY - this.touchStartY;
    
    // Only consider it dragging if moved more than 5px
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      this.isMobileMenuDragging = true;
    }
    
    // If dragging left (swipe left to close), add visual feedback
    if (this.isMobileMenuDragging && deltaX < 0) {
      // Calculate opacity and transform based on drag distance
      const translateX = Math.max(deltaX, -this.mobileMenu.offsetWidth);
      const opacity = Math.max(0.2, 1 + (deltaX / 300));
      
      this.mobileMenu.style.transform = `translateX(${translateX}px)`;
      this.mobileMenu.style.opacity = opacity;
      
      // Update backdrop opacity
      if (this.mobileMenuBackdrop) {
        const backdropOpacity = Math.max(0.1, 0.5 + (deltaX / 400));
        this.mobileMenuBackdrop.style.opacity = backdropOpacity;
      }
    }
  }
  
  handleMobileMenuTouchEnd(event) {
    if (!this.mobileMenu || this.mobileMenu.getAttribute('aria-hidden') === 'true') return;
    if (!this.isMobileMenuDragging) {
      this.mobileMenu.classList.remove('swiping');
      return;
    }
    
    const touchEndX = event.changedTouches[0].clientX;
    const deltaX = touchEndX - this.touchStartX;
    const deltaTime = Date.now() - this.touchStartTime;
    const velocity = Math.abs(deltaX) / deltaTime;
    
    // Remove swiping class
    this.mobileMenu.classList.remove('swiping');
    
    // Close menu if swiped left with sufficient distance or velocity
    if (deltaX < -80 || velocity > 0.3) {
      // Close immediately
      this.closeMobileMenu();
    } else {
      // Reset transform with smooth animation
      this.mobileMenu.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
      this.mobileMenu.style.transform = '';
      this.mobileMenu.style.opacity = '';
      
      // Reset backdrop
      if (this.mobileMenuBackdrop) {
        this.mobileMenuBackdrop.style.transition = 'opacity 0.3s ease-out';
        this.mobileMenuBackdrop.style.opacity = '';
      }
      
      // Remove transition after animation
      setTimeout(() => {
        this.mobileMenu.style.transition = '';
        if (this.mobileMenuBackdrop) {
          this.mobileMenuBackdrop.style.transition = '';
        }
      }, 300);
    }
    
    this.isMobileMenuDragging = false;
  }

  // ===== DROPDOWN MENU FUNCTIONALITY =====
  toggleDropdown(event) {
    const button = event.currentTarget;
    const isExpanded = button.getAttribute('aria-expanded') === 'true';
    const dropdownId = button.getAttribute('aria-controls');
    const dropdown = document.getElementById(dropdownId);

    if (dropdown) {
      button.setAttribute('aria-expanded', !isExpanded);
      dropdown.setAttribute('aria-hidden', isExpanded);
    }
  }

  handleAnchorDropdown(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const dropdownId = button.getAttribute('aria-controls');
    const dropdown = document.getElementById(dropdownId);

    if (dropdown) {
      const isExpanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', !isExpanded);
      dropdown.setAttribute('aria-hidden', isExpanded);
    }
  }

  closeAllDropdowns() {
    this.dropdownButtons.forEach(button => {
      button.setAttribute('aria-expanded', 'false');
    });
    
    this.dropdownMenus.forEach(menu => {
      menu.setAttribute('aria-hidden', 'true');
    });
  }

  handleDropdownKeydown(event) {
    const button = event.currentTarget;
    const dropdownId = button.getAttribute('aria-controls');
    const dropdown = document.getElementById(dropdownId);

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (button.tagName === 'A') {
          this.handleAnchorDropdown(event);
        } else {
          this.toggleDropdown(event);
        }
        break;
      case 'Escape':
        this.closeAllDropdowns();
        button.focus();
        break;
      case 'ArrowDown':
        if (dropdown && dropdown.getAttribute('aria-hidden') === 'false') {
          event.preventDefault();
          const firstItem = dropdown.querySelector('a, button');
          if (firstItem) firstItem.focus();
        }
        break;
    }
  }

  handleDropdownFocusIn(event) {
    const menu = event.currentTarget;
    const button = document.querySelector(`[aria-controls="${menu.id}"]`);
    if (button) {
      button.setAttribute('aria-expanded', 'true');
      menu.setAttribute('aria-hidden', 'false');
    }
  }

  handleDropdownFocusOut(event) {
    const menu = event.currentTarget;
    const button = document.querySelector(`[aria-controls="${menu.id}"]`);
    
    // Check if focus is moving to another element within the dropdown
    if (!menu.contains(event.relatedTarget)) {
      button.setAttribute('aria-expanded', 'false');
      menu.setAttribute('aria-hidden', 'true');
    }
  }

  // ===== UTILITY FUNCTIONS =====
  handleResize() {
    // Close mobile menu on resize to desktop
    if (window.innerWidth >= 990 && this.mobileMenu?.getAttribute('aria-hidden') === 'false') {
      this.closeMobileMenu();
    }
    
    // Close mega menu on mobile
    if (window.innerWidth < 990 && this.megaMenuDropdown?.getAttribute('aria-hidden') === 'false') {
      this.closeMegaMenu();
    }
  }

  // Cleanup method to prevent memory leaks
  destroy() {
    // Cancel any pending timeouts and RAFs
    clearTimeout(this.menuLeaveTimeout);
    clearTimeout(this.hoverIntentTimeout);
    cancelAnimationFrame(this.rafId);
    clearTimeout(this.zone1LeaveTimeout);
    clearTimeout(this.zone2LeaveTimeout);
    clearTimeout(this.zone3LeaveTimeout);

    // Abort pending fetch requests
    this.fetchController?.abort();

    // Remove document-level listeners
    document.removeEventListener('click', this._boundDocumentClick);
    document.removeEventListener('keydown', this._boundDocumentKeydown);
    window.removeEventListener('resize', this._boundHandleResize);

    // Remove mobile menu listeners
    if (this.mobileMenuToggle) {
      this.mobileMenuToggle.removeEventListener('click', this._boundToggleMobileMenu);
    }
    if (this.mobileMenuClose) {
      this.mobileMenuClose.removeEventListener('click', this._boundCloseMobileMenu);
    }
    if (this.mobileMenuBackdrop) {
      this.mobileMenuBackdrop.removeEventListener('click', this._boundCloseMobileMenu);
    }
    if (this.mobileMenu) {
      this.mobileMenu.removeEventListener('touchstart', this._boundHandleTouchStart);
      this.mobileMenu.removeEventListener('touchmove', this._boundHandleTouchMove);
      this.mobileMenu.removeEventListener('touchend', this._boundHandleTouchEnd);
      this.mobileMenu.removeEventListener('click', this._boundAccordionClick);
    }
    this._disableFocusTrap();

    // Remove dropdown listeners
    this.dropdownButtons.forEach(button => {
      button.removeEventListener('click', this._boundHandleAnchorDropdown);
      button.removeEventListener('click', this._boundToggleDropdown);
      button.removeEventListener('keydown', this._boundHandleDropdownKeydown);
    });
    this.dropdownMenus.forEach(menu => {
      menu.removeEventListener('focusin', this._boundHandleDropdownFocusIn);
      menu.removeEventListener('focusout', this._boundHandleDropdownFocusOut);
    });

    // Remove mega menu listeners
    if (this.megaMenuWrapper) {
      this.megaMenuWrapper.removeEventListener('mouseenter', this._boundMegaMenuEnter);
      this.megaMenuWrapper.removeEventListener('mouseleave', this._boundMegaMenuLeave);
    }
    if (this.megaMenuDropdown) {
      this.megaMenuDropdown.removeEventListener('mouseenter', this._boundMegaMenuEnter);
      this.megaMenuDropdown.removeEventListener('mouseleave', this._boundMegaMenuLeave);
    }
    if (this.megaMenuTrigger) {
      this.megaMenuTrigger.removeEventListener('keydown', this._boundTriggerKeydown);
    }

    // Remove zone listeners
    if (this.zone1) {
      this.zone1.removeEventListener('mouseover', this._boundZone1MouseOver);
      this.zone1.removeEventListener('mouseout', this._boundZone1MouseOut);
      this.zone1.removeEventListener('mouseleave', this._boundZone1Leave);
      this.zone1.removeEventListener('keydown', this._boundZone1Keydown);
    }
    if (this.zone2) {
      this.zone2.removeEventListener('mouseover', this._boundZone2MouseOver);
      this.zone2.removeEventListener('mouseleave', this._boundZone2Leave);
      this.zone2.removeEventListener('keydown', this._boundZone2Keydown);
    }
    if (this.zone3) {
      this.zone3.removeEventListener('mouseover', this._boundZone3MouseOver);
      this.zone3.removeEventListener('mouseleave', this._boundZone3Leave);
      this.zone3.removeEventListener('keydown', this._boundZone3Keydown);
    }

    // Reset state
    this.currentActiveCategory = null;
    this.currentActiveSubcategory = null;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Mark header as loaded to enable transitions
  requestAnimationFrame(() => {
    document.querySelector('.header-wrapper')?.classList.add('loaded');
  });
  
  new CustomHeader();
});

