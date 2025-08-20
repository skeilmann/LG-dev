// Custom Header Functionality
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
    this.isTransitioning = false;
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
      }, 150);
    });

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

    // Reset to default state when leaving column 1
    this.zone1.addEventListener('mouseleave', () => {
      this.resetToDefaultState();
    });
  }

  // Initialize Subcategory (Column 2) hover events  
  initSubcategoryHovers() {
    if (!this.zone2) return;

    // Use event delegation since subcategory content is dynamically shown/hidden
    this.zone2.addEventListener('mouseenter', (e) => {
      if (e.target.classList.contains('mega-menu-sublink')) {
        this.handleSubcategoryHover(e.target);
      }
    });

    // When leaving column 2, hide column 3 and reset images to category level
    this.zone2.addEventListener('mouseleave', () => {
      this.hideAllSubSubcategories();
      this.showCategoryImage();
    });
  }

  // Initialize Sub-subcategory (Column 3) hover events
  initSubSubcategoryHovers() {
    if (!this.zone3) return;

    // Use event delegation since sub-subcategory content is dynamically shown/hidden
    this.zone3.addEventListener('mouseenter', (e) => {
      if (e.target.classList.contains('mega-menu-sub-sublink')) {
        this.handleSubSubcategoryHover(e.target);
      }
    });

    // When leaving column 3, reset image to subcategory level
    this.zone3.addEventListener('mouseleave', () => {
      this.showSubcategoryImage();
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

  // ===== STATE MANAGEMENT METHODS =====
  
  // Reset to default state - show only column 1, hide columns 2&3, show default image
  resetToDefaultState() {
    // Clear active states
    document.querySelectorAll('.mega-menu-category.active').forEach((cat) => {
      cat.classList.remove('active');
    });
    
    // Hide all subcategories (column 2)
    this.hideAllSubcategories();
    
    // Hide all sub-subcategories (column 3)
    this.hideAllSubSubcategories();
    
    // Show default image (column 4)
    this.showDefaultImage();
  }

  // Hide all subcategory lists in column 2
  hideAllSubcategories() {
    document.querySelectorAll('.mega-menu-subcategories').forEach((list) => {
      list.classList.remove('mega-menu-visible');
      list.classList.add('mega-menu-hidden');
      list.setAttribute('aria-hidden', 'true');
    });
  }

  // Hide all sub-subcategory lists in column 3
  hideAllSubSubcategories() {
    document.querySelectorAll('.mega-menu-sub-subcategories').forEach((list) => {
      list.classList.remove('mega-menu-visible');
      list.classList.add('mega-menu-hidden');
      list.setAttribute('aria-hidden', 'true');
    });
  }

  // Show default fallback image in column 4
  showDefaultImage() {
    // Hide all specific images
    document.querySelectorAll('.mega-menu-category-image, .mega-menu-subcategory-image, .mega-menu-sub-subcategory-image').forEach((img) => {
      img.classList.remove('mega-menu-visible');
      img.classList.add('mega-menu-hidden');
    });
    
    // Show default image
    const defaultImage = document.querySelector('.mega-menu-default-image, .mega-menu-no-image');
    if (defaultImage) {
      defaultImage.classList.add('mega-menu-visible');
      defaultImage.classList.remove('mega-menu-hidden');
    }
  }

  // Show category image in column 4
  showCategoryImage() {
    if (!this.currentActiveCategory) return;
    
    const categoryHandle = this.currentActiveCategory.getAttribute('data-category-handle');
    const categoryImage = document.querySelector(`[data-category-image="${categoryHandle}"]`);
    
    // Hide other images first
    document.querySelectorAll('.mega-menu-subcategory-image, .mega-menu-sub-subcategory-image').forEach((img) => {
      img.classList.remove('mega-menu-visible');
      img.classList.add('mega-menu-hidden');
    });
    
    if (categoryImage) {
      // Hide default image
      document.querySelectorAll('.mega-menu-default-image, .mega-menu-no-image').forEach((img) => {
        img.classList.remove('mega-menu-visible');
        img.classList.add('mega-menu-hidden');
      });
      
      categoryImage.classList.add('mega-menu-visible');
      categoryImage.classList.remove('mega-menu-hidden');
    } else {
      this.showDefaultImage();
    }
  }

  // Show subcategory image in column 4
  showSubcategoryImage() {
    if (!this.currentActiveSubcategory) return;
    
    const subcategoryHandle = this.currentActiveSubcategory.getAttribute('data-subcategory-handle');
    const subcategoryImage = document.querySelector(`[data-subcategory-image="${subcategoryHandle}"]`);
    
    // Hide other images first
    document.querySelectorAll('.mega-menu-sub-subcategory-image').forEach((img) => {
      img.classList.remove('mega-menu-visible');
      img.classList.add('mega-menu-hidden');
    });
    
    if (subcategoryImage) {
      // Hide default and category images
      document.querySelectorAll('.mega-menu-default-image, .mega-menu-no-image, .mega-menu-category-image').forEach((img) => {
        img.classList.remove('mega-menu-visible');
        img.classList.add('mega-menu-hidden');
      });
      
      subcategoryImage.classList.add('mega-menu-visible');
      subcategoryImage.classList.remove('mega-menu-hidden');
    } else {
      this.showCategoryImage();
    }
  }

  // ===== HOVER HANDLER METHODS =====

  // Handle category (column 1) hover - show subcategories in column 2
  handleCategoryHover(categoryLink) {
    // Performance optimization: prevent excessive calls during rapid hovering
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    
    // Cancel any pending RAF
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    
    // Use RAF for smooth transitions
    this.rafId = requestAnimationFrame(() => {
      // Update active category
      document.querySelectorAll('.mega-menu-category.active').forEach((cat) => {
        cat.classList.remove('active');
      });
      categoryLink.classList.add('active');
      this.currentActiveCategory = categoryLink;
      this.currentActiveSubcategory = null;

      const categoryHandle = categoryLink.getAttribute('data-category-handle');
      
      // Hide all subcategories first
      this.hideAllSubcategories();
      
      // Show subcategories for this category
      const subcategoriesList = document.querySelector(`[data-parent-category="${categoryHandle}"]`);
      if (subcategoriesList) {
        subcategoriesList.classList.remove('mega-menu-hidden');
        subcategoriesList.classList.add('mega-menu-visible');
        subcategoriesList.setAttribute('aria-hidden', 'false');
      }
      
      // Hide all sub-subcategories
      this.hideAllSubSubcategories();
      
      // Show category image
      this.showCategoryImage();
      
      // Reset transition flag after a short delay
      setTimeout(() => {
        this.isTransitioning = false;
      }, 50);
    });
  }

  // Handle subcategory (column 2) hover - show sub-subcategories in column 3
  handleSubcategoryHover(subcategoryLink) {
    // Update active subcategory
    document.querySelectorAll('.mega-menu-sublink.active').forEach((link) => {
      link.classList.remove('active');
    });
    subcategoryLink.classList.add('active');
    this.currentActiveSubcategory = subcategoryLink;

    const subcategoryHandle = subcategoryLink.getAttribute('data-subcategory-handle');
    
    // Hide all sub-subcategories first
    this.hideAllSubSubcategories();
    
    // Show sub-subcategories for this subcategory
    const subSubcategoriesList = document.querySelector(`[data-parent-subcategory="${subcategoryHandle}"]`);
    if (subSubcategoriesList) {
      subSubcategoriesList.classList.remove('mega-menu-hidden');
      subSubcategoriesList.classList.add('mega-menu-visible');
      subSubcategoriesList.setAttribute('aria-hidden', 'false');
    }
    
    // Show subcategory image
    this.showSubcategoryImage();
  }

  // Handle sub-subcategory (column 3) hover - show sub-subcategory image in column 4
  handleSubSubcategoryHover(subSubcategoryLink) {
    // Update active sub-subcategory
    document.querySelectorAll('.mega-menu-sub-sublink.active').forEach((link) => {
      link.classList.remove('active');
    });
    subSubcategoryLink.classList.add('active');

    const subSubcategoryHandle = subSubcategoryLink.getAttribute('data-sub-subcategory-handle');
    const subSubcategoryImage = document.querySelector(`[data-sub-subcategory-image="${subSubcategoryHandle}"]`);
    
    if (subSubcategoryImage) {
      // Hide all other images
      document.querySelectorAll('.mega-menu-default-image, .mega-menu-no-image, .mega-menu-category-image, .mega-menu-subcategory-image').forEach((img) => {
        img.classList.remove('mega-menu-visible');
        img.classList.add('mega-menu-hidden');
      });
      
      // Hide other sub-subcategory images
      document.querySelectorAll('.mega-menu-sub-subcategory-image').forEach((img) => {
        img.classList.remove('mega-menu-visible');
        img.classList.add('mega-menu-hidden');
      });
      
      subSubcategoryImage.classList.add('mega-menu-visible');
      subSubcategoryImage.classList.remove('mega-menu-hidden');
    } else {
      // Fallback to subcategory image
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
        const visibleSubcategories = this.zone2?.querySelector('.mega-menu-subcategories.mega-menu-visible');
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
    
    const visibleList = e.target.closest('.mega-menu-subcategories.mega-menu-visible');
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
        const activeCategory = this.zone1?.querySelector('.mega-menu-category.active');
        if (activeCategory) {
          activeCategory.focus();
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        // Move to first sub-subcategory if available
        const visibleSubSubcategories = this.zone3?.querySelector('.mega-menu-sub-subcategories.mega-menu-visible');
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
    
    const visibleList = e.target.closest('.mega-menu-sub-subcategories.mega-menu-visible');
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
        const activeSubcategory = this.zone2?.querySelector('.mega-menu-sublink.active');
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
          placeholder.innerHTML = '<span class="mobile-loading-text">{{ "sections.header.no_image" | t }}</span>';
        }
      })
      .catch(() => {
        if (placeholder) {
          placeholder.innerHTML = '<span class="mobile-loading-text">{{ "sections.header.no_image" | t }}</span>';
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
    this.isTransitioning = false;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new CustomHeader();
});

