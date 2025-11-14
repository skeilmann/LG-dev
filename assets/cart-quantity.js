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
        
        // Update button badge
        this.updateButtonBadge(card, productId, quantity);
        
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
    
    // Also update buttons directly by product ID
    const buttons = document.querySelectorAll('.quick-add__submit[data-product-id]');
    buttons.forEach(button => {
      const productId = button.dataset.productId;
      if (productId) {
        const cartItem = cartItems.find(item => item.product_id.toString() === productId);
        const quantity = cartItem ? cartItem.quantity : 0;
        this.updateButtonBadge(null, productId, quantity, button);
      }
    });
  }

  updateButtonBadge(card, productId, quantity, button = null) {
    // Find the button if not provided
    if (!button) {
      if (card) {
        button = card.querySelector(`.quick-add__submit[data-product-id="${productId}"]`);
      } else {
        button = document.querySelector(`.quick-add__submit[data-product-id="${productId}"]`);
      }
    }
    
    if (!button) return;
    
    let badge = button.querySelector('.button__cart-count');
    const iconWrap = button.querySelector('.button__icon');
    
    if (quantity > 0) {
      // Show badge
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'button__cart-count cart-count-bubble';
        badge.setAttribute('data-cart-count', quantity);
        badge.setAttribute('aria-hidden', 'true');
        const countNumber = document.createElement('span');
        countNumber.className = 'cart-count-number';
        countNumber.textContent = quantity;
        badge.appendChild(countNumber);
        
        const buttonContent = button.querySelector('.button__content');
        if (buttonContent) {
          buttonContent.appendChild(badge);
        }
      } else {
        const countNumber = badge.querySelector('.cart-count-number');
        if (countNumber) {
          countNumber.textContent = quantity;
        }
        badge.setAttribute('data-cart-count', quantity);
      }
      badge.classList.remove('hidden');
      
      // Update icon to filled cart
      if (iconWrap) {
        const iconSvg = iconWrap.querySelector('svg');
        if (iconSvg) {
          // Replace with filled cart icon
          const cartIconSvg = this.getCartIconSvg(true);
          if (cartIconSvg) {
            iconWrap.innerHTML = cartIconSvg;
          }
        }
      }
    } else {
      // Hide badge
      if (badge) {
        badge.classList.add('hidden');
      }
      
      // Update icon to empty cart
      if (iconWrap) {
        const iconSvg = iconWrap.querySelector('svg');
        if (iconSvg) {
          // Replace with empty cart icon
          const cartIconSvg = this.getCartIconSvg(false);
          if (cartIconSvg) {
            iconWrap.innerHTML = cartIconSvg;
          }
        }
      }
    }
  }

  getCartIconSvg(filled = false) {
    // Return SVG string for cart icon
    // This will be replaced by actual SVG content from assets
    if (filled) {
      return '<svg xmlns="http://www.w3.org/2000/svg" fill="none" class="icon icon-cart" viewBox="0 0 40 40"><path fill="currentColor" fill-rule="evenodd" d="M20.5 6.5a4.75 4.75 0 0 0-4.75 4.75v.56h-3.16l-.77 11.6a5 5 0 0 0 4.99 5.34h7.38a5 5 0 0 0 4.99-5.33l-.77-11.6h-3.16v-.57A4.75 4.75 0 0 0 20.5 6.5m3.75 5.31v-.56a3.75 3.75 0 1 0-7.5 0v.56zm-7.5 1h7.5v.56a3.75 3.75 0 1 1-7.5 0zm-1 0v.56a4.75 4.75 0 1 0 9.5 0v-.56h2.22l.71 10.67a4 4 0 0 1-3.99 4.27h-7.38a4 4 0 0 1-4-4.27l.72-10.67z"/></svg>';
    } else {
      return '<svg xmlns="http://www.w3.org/2000/svg" fill="none" class="icon icon-cart-empty" viewBox="0 0 40 40"><path fill="currentColor" fill-rule="evenodd" d="M15.75 11.8h-3.16l-.77 11.6a5 5 0 0 0 4.99 5.34h7.38a5 5 0 0 0 4.99-5.33L28.4 11.8zm0 1h-2.22l-.71 10.67a4 4 0 0 0 3.99 4.27h7.38a4 4 0 0 0 4-4.27l-.72-10.67h-2.22v.63a4.75 4.75 0 1 1-9.5 0zm8.5 0h-7.5v.63a3.75 3.75 0 1 0 7.5 0z"/></svg>';
    }
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
