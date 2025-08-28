/**
 * Cart Quantity Manager
 * Handles dynamic display of cart quantities across the site
 */

class CartQuantityManager {
  constructor() {
    this.cartData = null;
    this.cartUpdateUnsubscriber = null;
    this.init();
  }

  init() {
    // Subscribe to cart updates
    this.cartUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.cartUpdate, (event) => {
      if (event.source !== 'cart-quantity') {
        this.updateCartQuantities(event.cartData);
      }
    });

    // Initial cart fetch
    this.fetchCartData();
  }

  async fetchCartData() {
    try {
      const response = await fetch('/cart.js');
      if (response.ok) {
        this.cartData = await response.json();
        this.updateCartQuantities(this.cartData);
      }
    } catch (error) {
      console.error('Error fetching cart data:', error);
    }
  }

  updateCartQuantities(cartData) {
    this.cartData = cartData;
    
    // Update header cart count
    this.updateHeaderCartCount(cartData.item_count);
    
    // Update product card quantities
    this.updateProductCardQuantities(cartData.items);
  }

  updateHeaderCartCount(itemCount) {
    const cartIcon = document.getElementById('cart-icon-bubble');
    if (!cartIcon) return;

    let cartCountBubble = cartIcon.querySelector('.cart-count-bubble');
    
    if (itemCount > 0) {
      if (!cartCountBubble) {
        cartCountBubble = document.createElement('div');
        cartCountBubble.className = 'cart-count-bubble';
        cartIcon.appendChild(cartCountBubble);
      }
      
      cartCountBubble.innerHTML = `
        <span aria-hidden="true">${itemCount}</span>
        <span class="visually-hidden">${itemCount === 1 ? '1 item' : `${itemCount} items`}</span>
      `;
    } else if (cartCountBubble) {
      cartCountBubble.remove();
    }
  }

  updateProductCardQuantities(cartItems) {
    // Find all product cards on the page
    const productCards = document.querySelectorAll('[data-product-id]');
    
    productCards.forEach(card => {
      const productId = card.dataset.productId;
      const quantityDisplay = card.querySelector('.cart-quantity-display');
      
      if (productId) {
        const cartItem = cartItems.find(item => item.product_id.toString() === productId);
        const quantity = cartItem ? cartItem.quantity : 0;
        
        if (quantity > 0) {
          if (!quantityDisplay) {
            this.createQuantityDisplay(card, quantity);
          } else {
            const quantityNumber = quantityDisplay.querySelector('.cart-quantity-number');
            if (quantityNumber) {
              quantityNumber.textContent = quantity;
            }
            quantityDisplay.classList.remove('hidden');
          }
        } else if (quantityDisplay) {
          quantityDisplay.classList.add('hidden');
        }
      }
    });
  }

  createQuantityDisplay(card, quantity) {
    const quantityDisplay = document.createElement('div');
    quantityDisplay.className = 'cart-quantity-display';
    
    // Create the quantity number span
    const quantityNumber = document.createElement('span');
    quantityNumber.className = 'cart-quantity-number';
    quantityNumber.textContent = quantity;
    
    quantityDisplay.appendChild(quantityNumber);
    quantityDisplay.setAttribute('aria-label', `${quantity} in cart`);
    
    // Insert after the quick-add button
    const quickAddButton = card.querySelector('.quick-add__submit');
    if (quickAddButton) {
      quickAddButton.parentNode.insertBefore(quantityDisplay, quickAddButton.nextSibling);
    }
  }

  getProductQuantity(productId) {
    if (!this.cartData || !this.cartData.items) return 0;
    
    const cartItem = this.cartData.items.find(item => 
      item.product_id.toString() === productId.toString()
    );
    
    return cartItem ? cartItem.quantity : 0;
  }

  destroy() {
    if (this.cartUpdateUnsubscriber) {
      this.cartUpdateUnsubscriber();
    }
  }
}

// Initialize cart quantity manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.cartQuantityManager = new CartQuantityManager();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CartQuantityManager;
}
