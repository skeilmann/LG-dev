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

    this.bindEvents();
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
      button.addEventListener('click', this.toggleDropdown.bind(this));
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.header__menu-item-wrapper')) {
        this.closeAllDropdowns();
      }
    });

    // Handle escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeMobileMenu();
        this.closeAllDropdowns();
      }
    });

    // Handle window resize
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  toggleMobileMenu() {
    const isExpanded = this.mobileMenuToggle.getAttribute('aria-expanded') === 'true';
    
    if (isExpanded) {
      this.closeMobileMenu();
    } else {
      this.openMobileMenu();
    }
  }

  openMobileMenu() {
    this.mobileMenuToggle.setAttribute('aria-expanded', 'true');
    this.mobileMenu.setAttribute('aria-hidden', 'false');
    document.body.classList.add('overflow-hidden');
    
    // Focus management
    this.mobileMenuClose.focus();
    
    // Prevent body scroll
    this.scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${this.scrollY}px`;
    document.body.style.width = '100%';
  }

  closeMobileMenu() {
    this.mobileMenuToggle.setAttribute('aria-expanded', 'false');
    this.mobileMenu.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('overflow-hidden');
    
    // Restore body scroll
    if (this.scrollY !== undefined) {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, this.scrollY);
    }
    
    // Return focus to toggle button
    this.mobileMenuToggle.focus();
  }

  toggleDropdown(event) {
    const button = event.currentTarget;
    const dropdown = button.nextElementSibling;
    const isExpanded = button.getAttribute('aria-expanded') === 'true';

    // Close all other dropdowns
    this.closeAllDropdowns();

    if (!isExpanded) {
      button.setAttribute('aria-expanded', 'true');
      dropdown.setAttribute('aria-hidden', 'false');
    }
  }

  closeAllDropdowns() {
    this.dropdownButtons.forEach(button => {
      button.setAttribute('aria-expanded', 'false');
      const dropdown = button.nextElementSibling;
      if (dropdown) {
        dropdown.setAttribute('aria-hidden', 'true');
      }
    });
  }

  handleResize() {
    // Close mobile menu on desktop breakpoint
    if (window.innerWidth >= 990) {
      this.closeMobileMenu();
    }
  }

  // Public method to close mobile menu (can be called from outside)
  closeMenu() {
    this.closeMobileMenu();
  }
}

// Initialize custom header when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.customHeader = new CustomHeader();
  });
} else {
  window.customHeader = new CustomHeader();
}

// Export for potential use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CustomHeader;
}
