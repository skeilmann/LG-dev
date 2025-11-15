if (!customElements.get('product-form')) {
  customElements.define(
    'product-form',
    class ProductForm extends HTMLElement {
      constructor() {
        super();

        this.form = this.querySelector('form');
        this.variantIdInput.disabled = false;
        this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
        this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
        this.submitButton = this.querySelector('[type="submit"]');
        this.submitButtonText = this.submitButton.querySelector('span');

        if (document.querySelector('cart-drawer')) this.submitButton.setAttribute('aria-haspopup', 'dialog');

        this.hideErrors = this.dataset.hideErrors === 'true';
      }

      onSubmitHandler(evt) {
        evt.preventDefault();
        if (this.submitButton.getAttribute('aria-disabled') === 'true') return;

        this.handleErrorMessage();

        // Optimistically update cart count immediately
        this.updateCartCountOptimistically();

        this.submitButton.setAttribute('aria-disabled', true);
        this.submitButton.classList.add('loading');
        this.querySelector('.loading__spinner').classList.remove('hidden');

        const config = fetchConfig('javascript');
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        delete config.headers['Content-Type'];

        const formData = new FormData(this.form);
        if (this.cart) {
          formData.append(
            'sections',
            this.cart.getSectionsToRender().map((section) => section.id)
          );
          formData.append('sections_url', window.location.pathname);
          this.cart.setActiveElement(document.activeElement);
        }
        config.body = formData;

        fetch(`${routes.cart_add_url}`, config)
          .then((response) => response.json())
          .then((response) => {
            if (response.status) {
              // Revert optimistic update on error
              this.revertCartCountOptimistically();
              
              publish(PUB_SUB_EVENTS.cartError, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                errors: response.errors || response.description,
                message: response.message,
              });
              this.handleErrorMessage(response.description);

              const soldOutMessage = this.submitButton.querySelector('.sold-out-message');
              if (!soldOutMessage) return;
              this.submitButton.setAttribute('aria-disabled', true);
              this.submitButtonText.classList.add('hidden');
              soldOutMessage.classList.remove('hidden');
              this.error = true;
              return;
            } else if (!this.cart) {
              window.location = window.routes.cart_url;
              return;
            }

            if (!this.error)
              publish(PUB_SUB_EVENTS.cartUpdate, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                cartData: response,
              });
            this.error = false;
            const quickAddModal = this.closest('quick-add-modal');
            if (quickAddModal) {
              document.body.addEventListener(
                'modalClosed',
                () => {
                  setTimeout(() => {
                    this.cart.renderContents(response);
                  });
                },
                { once: true }
              );
              quickAddModal.hide(true);
            } else {
              this.cart.renderContents(response);
            }
          })
          .catch((e) => {
            console.error(e);
            // Revert optimistic update on fetch error
            this.revertCartCountOptimistically();
          })
          .finally(() => {
            this.submitButton.classList.remove('loading');
            if (this.cart && this.cart.classList.contains('is-empty')) this.cart.classList.remove('is-empty');
            if (!this.error) this.submitButton.removeAttribute('aria-disabled');
            this.querySelector('.loading__spinner').classList.add('hidden');
          });
      }

      handleErrorMessage(errorMessage = false) {
        if (this.hideErrors) return;

        this.errorMessageWrapper =
          this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
        if (!this.errorMessageWrapper) return;
        this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');

        this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

        if (errorMessage) {
          this.errorMessage.textContent = errorMessage;
        }
      }

      toggleSubmitButton(disable = true, text) {
        if (disable) {
          this.submitButton.setAttribute('disabled', 'disabled');
          if (text) this.submitButtonText.textContent = text;
        } else {
          this.submitButton.removeAttribute('disabled');
          this.submitButtonText.textContent = window.variantStrings.addToCart;
        }
      }

      get variantIdInput() {
        return this.form.querySelector('[name=id]');
      }

      /**
       * Optimistically update cart count immediately on button click
       * The server response will correct any discrepancies
       */
      updateCartCountOptimistically() {
        // Get quantity from form (default to 1 if not specified)
        const quantityInput = this.form.querySelector('[name="quantity"]');
        const quantity = quantityInput ? parseInt(quantityInput.value) || 1 : 1;
        
        // Store quantity for potential revert
        this._optimisticQuantity = quantity;

        // Update button badge count
        const buttonBadge = this.submitButton.querySelector('.btn-cart-count');
        if (buttonBadge) {
          const countNumber = buttonBadge.querySelector('.cart-count-number');
          if (countNumber) {
            const currentCount = parseInt(countNumber.textContent) || 0;
            const newCount = currentCount + quantity;
            countNumber.textContent = newCount;
            buttonBadge.setAttribute('data-cart-count', newCount);
            buttonBadge.classList.remove('hidden');
          }
        }

        // Update header cart count
        const cartIcon = document.getElementById('cart-icon-bubble');
        if (cartIcon) {
          let cartCountBubble = cartIcon.querySelector('.cart-count-bubble');
          if (cartCountBubble) {
            const currentCount = parseInt(cartCountBubble.textContent.trim()) || 0;
            const newCount = currentCount + quantity;
            cartCountBubble.innerHTML = `
              <span aria-hidden="true">${newCount}</span>
              <span class="visually-hidden">${newCount === 1 ? '1 item' : `${newCount} items`}</span>
            `;
          } else {
            // Create cart count bubble if it doesn't exist
            cartCountBubble = document.createElement('div');
            cartCountBubble.className = 'cart-count-bubble';
            cartCountBubble.innerHTML = `
              <span aria-hidden="true">${quantity}</span>
              <span class="visually-hidden">${quantity === 1 ? '1 item' : `${quantity} items`}</span>
            `;
            cartIcon.appendChild(cartCountBubble);
          }
        }

        // Update mobile bottom nav cart count
        const mobileBottomNav = document.querySelector('mobile-bottom-nav');
        if (mobileBottomNav) {
          const cartButton = mobileBottomNav.querySelector('[data-nav-type="cart"]');
          const badge = cartButton?.querySelector('.mobile-bottom-nav__badge');
          if (badge) {
            const countSpan = badge.querySelector('span[aria-hidden="true"]');
            if (countSpan) {
              const currentCount = parseInt(countSpan.textContent) || 0;
              const newCount = currentCount + quantity;
              countSpan.textContent = newCount;
              const screenReaderSpan = badge.querySelector('.visually-hidden');
              if (screenReaderSpan) {
                screenReaderSpan.textContent = `Cart: ${newCount} items`;
              }
              badge.style.display = newCount > 0 ? 'flex' : 'none';
            }
          }
        }
      }

      /**
       * Revert optimistic cart count update on error
       */
      revertCartCountOptimistically() {
        if (!this._optimisticQuantity) return;
        const quantity = this._optimisticQuantity;
        this._optimisticQuantity = null;

        // Revert button badge count
        const buttonBadge = this.submitButton.querySelector('.btn-cart-count');
        if (buttonBadge) {
          const countNumber = buttonBadge.querySelector('.cart-count-number');
          if (countNumber) {
            const currentCount = parseInt(countNumber.textContent) || 0;
            const newCount = Math.max(0, currentCount - quantity);
            if (newCount > 0) {
              countNumber.textContent = newCount;
              buttonBadge.setAttribute('data-cart-count', newCount);
            } else {
              buttonBadge.classList.add('hidden');
              countNumber.textContent = '0';
              buttonBadge.setAttribute('data-cart-count', '0');
            }
          }
        }

        // Revert header cart count
        const cartIcon = document.getElementById('cart-icon-bubble');
        if (cartIcon) {
          const cartCountBubble = cartIcon.querySelector('.cart-count-bubble');
          if (cartCountBubble) {
            const currentCount = parseInt(cartCountBubble.textContent.trim()) || 0;
            const newCount = Math.max(0, currentCount - quantity);
            if (newCount > 0) {
              cartCountBubble.innerHTML = `
                <span aria-hidden="true">${newCount}</span>
                <span class="visually-hidden">${newCount === 1 ? '1 item' : `${newCount} items`}</span>
              `;
            } else {
              cartCountBubble.remove();
            }
          }
        }

        // Revert mobile bottom nav cart count
        const mobileBottomNav = document.querySelector('mobile-bottom-nav');
        if (mobileBottomNav) {
          const cartButton = mobileBottomNav.querySelector('[data-nav-type="cart"]');
          const badge = cartButton?.querySelector('.mobile-bottom-nav__badge');
          if (badge) {
            const countSpan = badge.querySelector('span[aria-hidden="true"]');
            if (countSpan) {
              const currentCount = parseInt(countSpan.textContent) || 0;
              const newCount = Math.max(0, currentCount - quantity);
              countSpan.textContent = newCount;
              const screenReaderSpan = badge.querySelector('.visually-hidden');
              if (screenReaderSpan) {
                screenReaderSpan.textContent = `Cart: ${newCount} items`;
              }
              badge.style.display = newCount > 0 ? 'flex' : 'none';
            }
          }
        }
      }
    }
  );
}
