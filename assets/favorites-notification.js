if (!customElements.get('favorites-notification')) {
  const BaseClass = window.BaseNotification || class extends HTMLElement {};
  class FavoritesNotification extends BaseClass {
    constructor() {
      super('favorites-notification', 'favorites-notification');
    }

    renderContents(productData) {
      this.productId = productData.id;
      this.getSectionsToRender().forEach((section) => {
        const element = document.getElementById(section.id);
        if (element) {
          element.innerHTML = this.getSectionInnerHTML(
            productData.html,
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
          id: 'favorites-notification-product',
          selector: `[id="favorites-notification-product-${this.productId}"]`,
        },
      ];
    }
  }

  customElements.define('favorites-notification', FavoritesNotification);
}
