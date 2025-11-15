/**
 * Base notification class for cart and favorites notifications
 * Shared functionality to minimize code duplication
 */
if (typeof window !== 'undefined') {
  window.BaseNotification = class BaseNotification extends HTMLElement {
  constructor(notificationId, customElementName) {
    super();
    
    this.notificationId = notificationId;
    this.customElementName = customElementName;
    this.notification = document.getElementById(notificationId);
    this.header = document.querySelector('sticky-header');
    this.onBodyClick = this.handleBodyClick.bind(this);
    this.autoHideTimer = null;
    this.hovered = false;

    if (this.notification) {
      this.notification.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
      this.querySelectorAll('button[type="button"]').forEach((closeButton) =>
        closeButton.addEventListener('click', this.close.bind(this))
      );
      
      this.notification.addEventListener('mouseenter', () => {
        this.hovered = true;
        this.clearAutoHideTimer();
      });
      
      this.notification.addEventListener('mouseleave', () => {
        this.hovered = false;
        this.startAutoHideTimer();
      });
    }
  }

  open() {
    if (!this.notification) return;
    
    this.notification.classList.add('animate', 'active');

    this.notification.addEventListener(
      'transitionend',
      () => {
        trapFocus(this.notification);
        this.startAutoHideTimer();
      },
      { once: true }
    );

    document.body.addEventListener('click', this.onBodyClick);
  }
  
  startAutoHideTimer() {
    this.clearAutoHideTimer();
    if (!this.hovered) {
      this.autoHideTimer = setTimeout(() => this.close(), 7000);
    }
  }
  
  clearAutoHideTimer() {
    if (this.autoHideTimer) {
      clearTimeout(this.autoHideTimer);
      this.autoHideTimer = null;
    }
  }

  close() {
    this.clearAutoHideTimer();
    if (this.notification) {
      this.notification.classList.remove('active');
    }
    document.body.removeEventListener('click', this.onBodyClick);
    removeTrapFocus(this.activeElement);
  }

  getSectionInnerHTML(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector)?.innerHTML || '';
  }

  handleBodyClick(evt) {
    const target = evt.target;
    if (target !== this.notification && !target.closest(this.customElementName)) {
      const disclosure = target.closest('details-disclosure, header-menu');
      this.activeElement = disclosure ? disclosure.querySelector('summary') : null;
      this.close();
    }
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
  };
}

