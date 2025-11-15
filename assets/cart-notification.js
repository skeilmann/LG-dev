if (!customElements.get('cart-notification')) {
  const BaseClass = window.BaseNotification || class extends HTMLElement {};
  class CartNotification extends BaseClass {
    constructor() {
      super('cart-notification', 'cart-notification');
    }

    renderContents(parsedState) {
      this.cartItemKey = parsedState.key;
      this.getSectionsToRender().forEach((section) => {
        const element = document.getElementById(section.id);
        if (element) {
          element.innerHTML = this.getSectionInnerHTML(
            parsedState.sections[section.id],
            section.selector
          );
        }
      });

      if (this.header) this.header.reveal();
      this.open();
    }

    getSectionsToRender() {
      return [
        {
          id: 'cart-notification-product',
          selector: `[id="cart-notification-product-${this.cartItemKey}"]`,
        },
        {
          id: 'cart-notification-button',
        },
        {
          id: 'cart-icon-bubble',
        },
      ];
    }
  }

  customElements.define('cart-notification', CartNotification);
}
