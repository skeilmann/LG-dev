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
    this.hoverTimeout = null;
    this.currentActiveCategory = null;
    this.currentActiveSubcategory = null;
    this.imageCache = new Map();
    
    // Performance optimization flags
    this.rafId = null;

    this.bindEvents();
    this.initMegaMenu();
    this.initMobileAccordion();
  }

  bindEvents() {
    if (this.mobileMenuToggle) {
      this.mobileMenuToggle.addEventListener('click', this.toggleMobileMenu.bind(this));
    }

    if (this.mobileMenuClose) {
      this.mobileMenuClose.addEventListener('click', this.closeMobileMenu.bind(this));
    }

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
      if (this.mobileMenu && !this.mobileMenu.contains(e.target) && !this.mobileMenuToggle.contains(e.target)) {
        this.closeMobileMenu();
      }
    });

    // Handle dropdown menus
    this.dropdownButtons.forEach(button => {
      // For anchor-based dropdowns, prevent default navigation and show dropdown
      if (button.tagName === 'A') {
        button.addEventListener('click', this.handleAnchorDropdown.bind(this));
      } else {
        button.addEventListener('click', this.toggleDropdown.bind(this));
      }
      
      // Add keyboard support for dropdowns
      button.addEventListener('keydown', this.handleDropdownKeydown.bind(this));
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.header__menu-item-wrapper')) {
        this.closeAllDropdowns();
      }
    });

    // Handle focus management for dropdowns
    this.dropdownMenus.forEach(menu => {
      menu.addEventListener('focusin', this.handleDropdownFocusIn.bind(this));
      menu.addEventListener('focusout', this.handleDropdownFocusOut.bind(this));
    });

    // Handle escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeMobileMenu();
        this.closeAllDropdowns();
        if (this.megaMenuDropdown && this.megaMenuDropdown.getAttribute('aria-hidden') === 'false') {
          this.closeMegaMenu();
          this.megaMenuTrigger?.focus();
        }
      }
    });

    // Handle window resize
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  // ===== MEGA MENU FUNCTIONALITY =====
  initMegaMenu() {
    if (!this.megaMenuWrapper || !this.megaMenuDropdown) return;

    // Hover events for mega menu wrapper - controls dropdown visibility
    this.megaMenuWrapper.addEventListener('mouseenter', () => {
      clearTimeout(this.hoverTimeout);
      this.openMegaMenu();
    });

    this.megaMenuWrapper.addEventListener('mouseleave', () => {
      this.hoverTimeout = setTimeout(() => {
        this.closeMegaMenu();
      }, 300); // Increased delay for better UX
    });

    // Also handle hover events on the dropdown itself to prevent closing
    if (this.megaMenuDropdown) {
      this.megaMenuDropdown.addEventListener('mouseenter', () => {
        clearTimeout(this.hoverTimeout);
      });

      this.megaMenuDropdown.addEventListener('mouseleave', () => {
        this.hoverTimeout = setTimeout(() => {
          this.closeMegaMenu();
        }, 200);
      });
    }

    // Initialize hover events for all menu levels
    this.initCategoryHovers();
    this.initSubcategoryHovers();
    this.initSubSubcategoryHovers();

    // Keyboard accessibility for mega menu
    this.initKeyboardNavigation();
  }

  // Initialize Category (Column 1) hover events
  initCategoryHovers() {
    if (!this.zone1) return;

      const categoryLinks = this.zone1.querySelectorAll('.mega-menu-category');
      
      categoryLinks.forEach((link) => {
        link.addEventListener('mouseenter', () => {
          this.handleCategoryHover(link);
        });
      });

    // Reset to default state when leaving column 1 (with delay)
      this.zone1.addEventListener('mouseleave', () => {
      this.hoverTimeout = setTimeout(() => {
        // Only reset if mouse hasn't moved to another zone
        if (!this.zone2.matches(':hover') && !this.zone3.matches(':hover') && !this.zone4.matches(':hover')) {
          this.resetToDefaultState();
        }
      }, 100);
    });
  }

  // Initialize Subcategory (Column 2) hover events  
  initSubcategoryHovers() {
    if (!this.zone2) return;

    // Use event delegation since subcategory content is dynamically shown/hidden
    this.zone2.addEventListener('mouseover', (e) => {
      console.log('Zone 2 mouseover event:', e.target, e.target.classList);
      if (e.target.classList.contains('mega-menu-sublink')) {
        console.log('Subcategory link hovered:', e.target);
        this.handleSubcategoryHover(e.target);
      }
    });

    // When leaving column 2, hide column 3 and reset images to category level (with delay)
      this.zone2.addEventListener('mouseleave', () => {
      this.hoverTimeout = setTimeout(() => {
        // Only hide if mouse hasn't moved to column 3
        if (!this.zone3.matches(':hover')) {
          this.resetVisibility(document.querySelectorAll('.mega-menu-sub-subcategories'));
          this.showCategoryImage();
        }
      }, 100);
    });
  }

  // Initialize Sub-subcategory (Column 3) hover events
  initSubSubcategoryHovers() {
    if (!this.zone3) return;

    // Debug: Check if sub-subcategory elements exist
    const allSubSubcategories = document.querySelectorAll('.mega-menu-sub-subcategories');
    console.log('Found sub-subcategory lists:', allSubSubcategories.length);
    allSubSubcategories.forEach((list, index) => {
      console.log(`Sub-subcategory list ${index}:`, list.getAttribute('data-parent-subcategory'), list);
    });

    // Use event delegation since sub-subcategory content is dynamically shown/hidden
    this.zone3.addEventListener('mouseover', (e) => {
      if (e.target.classList.contains('mega-menu-sub-sublink')) {
        this.handleSubSubcategoryHover(e.target);
      }
    });

    // When leaving column 3, reset image to subcategory level (with delay)
    this.zone3.addEventListener('mouseleave', () => {
      this.hoverTimeout = setTimeout(() => {
        this.showSubcategoryImage();
      }, 100);
    });
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
    
    // Show default image (column 4)
    this.showDefaultImage();
  }

  // Universal helper to clear all images before showing a new one
  clearAllImages() {
    // Hide all image types using our DRY helper
    this.resetVisibility(document.querySelectorAll('.mega-menu-category-image, .mega-menu-subcategory-image, .mega-menu-sub-subcategory-image, .mega-menu-default-image, .mega-menu-no-image'), false);
  }

  // Show default fallback image in column 4
  showDefaultImage() {
    // Clear all images first
    this.clearAllImages();
    
    // Show default image
    const defaultImages = document.querySelectorAll('.mega-menu-default-image, .mega-menu-no-image');
    this.showElements(defaultImages);
  }

  // Show category image in column 4
  showCategoryImage() {
    if (!this.currentActiveCategory) return;
    
    // Use data-target-image attribute for cleaner logic
    const targetImageSelector = this.currentActiveCategory.getAttribute('data-target-image');
    if (!targetImageSelector) return;
    
    const categoryImage = document.querySelector(targetImageSelector);
    
    if (categoryImage) {
      // Clear all images first to prevent switching bugs
      this.clearAllImages();
      
      // Show target image
      this.showElements([categoryImage]);
    } else {
      this.showDefaultImage();
    }
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
    
    const subcategoryImage = document.querySelector(targetImageSelector);
    
    if (subcategoryImage) {
      // Clear all images first to prevent switching bugs
      this.clearAllImages();
      
      // Show target image
      this.showElements([subcategoryImage]);
    } else {
      this.showCategoryImage(); // Fallback to category image
    }
  }

  // ===== HOVER HANDLER METHODS =====

  // Handle category (column 1) hover - show subcategories in column 2
  handleCategoryHover(categoryLink) {
    // Skip if mega menu is closed
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
        console.log('Looking for subcategories with selector:', targetListSelector);
        console.log('Found subcategories list:', subcategoriesList);
        
        if (subcategoriesList) {
          console.log('Showing subcategories for category:', categoryLink.textContent.trim());
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
    // Skip if mega menu is closed
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
    console.log('Subcategory hovered:', subcategoryLink.textContent.trim());
    
    // Hide all sub-subcategories first using our DRY helper
    this.resetVisibility(document.querySelectorAll('.mega-menu-sub-subcategories'));
    
    // Show target sub-subcategories if specified
    if (targetListSelector) {
      const subSubcategoriesList = document.querySelector(targetListSelector);
      console.log('Looking for sub-subcategories with selector:', targetListSelector);
      console.log('Found sub-subcategories list:', subSubcategoriesList);
      
      if (subSubcategoriesList) {
        console.log('Showing sub-subcategories for:', subcategoryLink.textContent.trim());
        this.showElements([subSubcategoriesList]);
      } else {
        console.log('No sub-subcategories found for selector:', targetListSelector);
      }
    }
    
    // Show subcategory image using data-driven approach
    this.showSubcategoryImage();
  }

  // Handle sub-subcategory (column 3) hover - show sub-subcategory image in column 4
  handleSubSubcategoryHover(subSubcategoryLink) {
    // Skip if mega menu is closed
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
      const subSubcategoryImage = document.querySelector(targetImageSelector);
      
      if (subSubcategoryImage) {
        // Clear all images first to prevent switching bugs
        this.clearAllImages();
        
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
    // Global escape key handler
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.megaMenuDropdown.getAttribute('aria-hidden') === 'false') {
        this.closeMegaMenu();
        this.megaMenuTrigger?.focus();
      }
    });

    // Mega menu trigger keyboard support
    if (this.megaMenuTrigger) {
      this.megaMenuTrigger.addEventListener('keydown', (e) => {
        switch (e.key) {
          case 'Enter':
          case ' ':
            e.preventDefault();
            if (this.megaMenuDropdown.getAttribute('aria-hidden') === 'true') {
              this.openMegaMenu();
              // Focus first category link
              const firstCategory = this.zone1?.querySelector('.mega-menu-category');
              if (firstCategory) {
                setTimeout(() => firstCategory.focus(), 100);
              }
            } else {
              this.closeMegaMenu();
            }
            break;
          case 'ArrowDown':
            e.preventDefault();
            this.openMegaMenu();
            const firstCategory = this.zone1?.querySelector('.mega-menu-category');
            if (firstCategory) {
              setTimeout(() => firstCategory.focus(), 100);
            }
            break;
        }
      });
    }

    // Category navigation (Column 1)
    if (this.zone1) {
      this.zone1.addEventListener('keydown', (e) => {
        this.handleCategoryKeyNavigation(e);
      });
    }

    // Subcategory navigation (Column 2)
    if (this.zone2) {
      this.zone2.addEventListener('keydown', (e) => {
        this.handleSubcategoryKeyNavigation(e);
      });
    }

    // Sub-subcategory navigation (Column 3)
    if (this.zone3) {
      this.zone3.addEventListener('keydown', (e) => {
        this.handleSubSubcategoryKeyNavigation(e);
      });
    }
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
    const mobileAccordions = document.querySelectorAll('.mobile-subcategory-accordion');

    mobileAccordions.forEach((accordion) => {
      const summary = accordion.querySelector('.mobile-category-title');
      const imageContainer = accordion.querySelector('.mobile-category-image');

      summary?.addEventListener('click', () => {
        // Lazy load image when accordion opens
        if (!accordion.hasAttribute('open')) {
          setTimeout(() => {
            this.loadMobileImage(imageContainer);
          }, 300);
        }
      });
    });
  }

  loadMobileImage(container) {
    if (!container || container.querySelector('img')) return;

    const categoryHandle = container.getAttribute('data-category');
    const placeholder = container.querySelector('.mobile-image-placeholder');

    if (!categoryHandle) return;

    // Get first subcategory link to determine collection
    const firstSublink = container
      .closest('.mobile-subcategory-content')
      ?.querySelector('.mobile-subcategory-link[data-collection-handle]');

    if (!firstSublink) return;

    const collectionHandle = firstSublink.getAttribute('data-collection-handle');

    fetch(`/collections/${collectionHandle}.js`)
      .then((response) => (response.ok ? response.json() : null))
      .then((collection) => {
        if (collection && collection.image) {
          const img = document.createElement('img');
          img.src = collection.image;
          img.alt = collection.title || firstSublink.textContent.trim();
          img.loading = 'lazy';

          img.onload = () => {
            img.classList.add('loaded');
            if (placeholder) {
              placeholder.style.display = 'none';
            }
          };

          container.appendChild(img);
        } else if (placeholder) {
          // Use translation passed from Liquid template via data attribute or global variable
          const noImageText = document.documentElement.getAttribute('data-no-image-text') || 'No image available';
          placeholder.innerHTML = `<span class="mobile-loading-text">${noImageText}</span>`;
        }
      })
      .catch(() => {
        if (placeholder) {
          // Use translation passed from Liquid template via data attribute or global variable
          const noImageText = document.documentElement.getAttribute('data-no-image-text') || 'No image available';
          placeholder.innerHTML = `<span class="mobile-loading-text">${noImageText}</span>`;
        }
      });
  }

  // ===== MOBILE MENU FUNCTIONALITY =====
  toggleMobileMenu() {
    const isHidden = this.mobileMenu.getAttribute('aria-hidden') === 'true';
    this.mobileMenu.setAttribute('aria-hidden', !isHidden);
    this.mobileMenuToggle.setAttribute('aria-expanded', isHidden);
    
    if (isHidden) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  closeMobileMenu() {
    this.mobileMenu.setAttribute('aria-hidden', 'true');
    this.mobileMenuToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
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
    if (window.innerWidth >= 990 && this.mobileMenu.getAttribute('aria-hidden') === 'false') {
      this.closeMobileMenu();
    }
    
    // Close mega menu on mobile
    if (window.innerWidth < 990 && this.megaMenuDropdown?.getAttribute('aria-hidden') === 'false') {
      this.closeMegaMenu();
    }
  }

  // Cleanup method to prevent memory leaks
  destroy() {
    // Cancel any pending timeouts or RAF calls
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
    }
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    
    // Clear image cache
    this.imageCache.clear();
    
    // Reset state
    this.currentActiveCategory = null;
    this.currentActiveSubcategory = null;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new CustomHeader();
});

