/**
 * Loyalty Handler
 * Manages loyalty points display, redemption, and sync with VPS app
 */
class LoyaltyHandler {
  constructor() {
    this.isLoggedIn = !!(window.Shopify && window.Shopify.customerId);
    this.customerId = window.Shopify?.customerId;
    this.apiUrl = 'http://31.97.184.19:3000'; // Your VPS app URL
    this.apiKey = 'Gheorghe2025VeV';

    // Loyalty state
    this.balance = 0;
    this.tier = 'bronze';
    this.tierConfig = null;
    this.nextTier = null;
    this.spendToNextTier = 0;
    this.redemption = null;
    this.history = [];
    this.isLoading = true;

    if (this.isLoggedIn) {
      this.loadLoyaltyData().then(() => {
        this.initializeUI();
      });
    } else {
      this.isLoading = false;
      this.initializeUI();
    }
  }

  /**
   * Load loyalty data from VPS app
   */
  async loadLoyaltyData() {
    try {
      const response = await fetch(
        `${this.apiUrl}/api/loyalty/balance?customerId=${this.customerId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        this.balance = data.points_balance || 0;
        this.tier = data.tier || 'bronze';
        this.tierConfig = data.tier_config || null;
        this.nextTier = data.next_tier || null;
        this.spendToNextTier = data.spend_to_next_tier || 0;
        this.redemption = data.redemption || null;
        this.history = data.history || [];
      }
    } catch (error) {
      console.error('Error loading loyalty data:', error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Load loyalty config (for non-logged-in users info display)
   */
  async loadConfig() {
    try {
      const response = await fetch(`${this.apiUrl}/api/loyalty/config`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.error('Error loading loyalty config:', error);
    }
    return null;
  }

  /**
   * Initialize UI elements
   */
  initializeUI() {
    this.updatePointsBadge();
    this.updateCartWidget();
    this.updateAccountSection();
    this.setupEventListeners();
  }

  /**
   * Update points badge in header
   */
  updatePointsBadge() {
    const badge = document.getElementById('loyalty-points-badge');
    const balanceEl = document.getElementById('loyalty-points-balance');

    if (!badge) return;

    if (this.isLoggedIn && !this.isLoading) {
      badge.style.display = 'flex';
      if (balanceEl) {
        balanceEl.textContent = this.formatPoints(this.balance);
      }
    } else if (!this.isLoggedIn) {
      badge.style.display = 'none';
    }
  }

  /**
   * Update cart widget with redemption option
   */
  updateCartWidget() {
    const widget = document.querySelector('.loyalty-cart-widget');
    if (!widget) return;

    if (!this.isLoggedIn) {
      widget.innerHTML = this.renderGuestMessage();
      return;
    }

    if (this.isLoading) {
      widget.innerHTML = '<div class="loyalty-loading">Loading rewards...</div>';
      return;
    }

    widget.innerHTML = this.renderCartWidget();
    this.attachRedeemHandler(widget);
  }

  /**
   * Update account page section
   */
  updateAccountSection() {
    const section = document.querySelector('.loyalty-account-section');
    if (!section) return;

    if (!this.isLoggedIn) {
      section.innerHTML = this.renderGuestMessage();
      return;
    }

    if (this.isLoading) {
      section.innerHTML = '<div class="loyalty-loading">Loading your rewards...</div>';
      return;
    }

    section.innerHTML = this.renderAccountSection();
  }

  /**
   * Render cart widget HTML
   */
  renderCartWidget() {
    const canRedeem = this.redemption && this.balance >= this.redemption.points_required;
    const pointsNeeded = this.redemption
      ? Math.max(0, this.redemption.points_required - this.balance)
      : 0;

    return `
      <div class="loyalty-cart-content">
        <div class="loyalty-cart-balance">
          <span class="loyalty-icon">⭐</span>
          <span class="loyalty-balance-text">
            You have <strong>${this.formatPoints(this.balance)}</strong> points
          </span>
        </div>
        ${
          canRedeem
            ? `
          <button class="loyalty-redeem-btn button button--secondary" data-points="${this.redemption.points_required}">
            Redeem ${this.redemption.points_required} pts for $${this.redemption.discount_value} off
          </button>
        `
            : `
          <p class="loyalty-earn-more">
            Earn ${pointsNeeded} more points to redeem $${this.redemption?.discount_value || 5} off
          </p>
        `
        }
      </div>
    `;
  }

  /**
   * Render account section HTML
   */
  renderAccountSection() {
    const tierLabels = {
      bronze: 'Bronze',
      silver: 'Silver',
      gold: 'Gold',
    };

    const progressPercent = this.nextTier
      ? Math.min(100, ((this.tierConfig?.min_spend || 0) / (this.tierConfig?.min_spend + this.spendToNextTier)) * 100)
      : 100;

    return `
      <div class="loyalty-account-content">
        <div class="loyalty-account-header">
          <h3>My Rewards</h3>
          <a href="/pages/rewards" class="loyalty-view-all">View Details →</a>
        </div>

        <div class="loyalty-account-stats">
          <div class="loyalty-stat">
            <span class="loyalty-stat-value">${this.formatPoints(this.balance)}</span>
            <span class="loyalty-stat-label">Points</span>
          </div>
          <div class="loyalty-stat">
            <span class="loyalty-stat-value loyalty-tier-${this.tier}">${tierLabels[this.tier] || this.tier}</span>
            <span class="loyalty-stat-label">Tier</span>
          </div>
        </div>

        ${
          this.nextTier
            ? `
          <div class="loyalty-progress">
            <div class="loyalty-progress-bar">
              <div class="loyalty-progress-fill" style="width: ${progressPercent}%"></div>
            </div>
            <p class="loyalty-progress-text">
              Spend $${this.spendToNextTier.toFixed(0)} more to reach ${tierLabels[this.nextTier]}
            </p>
          </div>
        `
            : `
          <p class="loyalty-max-tier">🎉 You've reached the highest tier!</p>
        `
        }

        ${
          this.redemption && this.balance >= this.redemption.points_required
            ? `
          <button class="loyalty-redeem-btn button" data-points="${this.redemption.points_required}">
            Redeem ${this.redemption.points_required} pts for $${this.redemption.discount_value} off
          </button>
        `
            : ''
        }
      </div>
    `;
  }

  /**
   * Render guest message
   */
  renderGuestMessage() {
    return `
      <div class="loyalty-guest-message">
        <p>
          <a href="/account/login">Log in</a> or <a href="/account/register">create an account</a>
          to earn rewards on every purchase!
        </p>
      </div>
    `;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for cart updates to refresh widget
    document.addEventListener('cart:updated', () => {
      this.updateCartWidget();
    });

    // Handle dynamically added elements
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.classList?.contains('loyalty-cart-widget')) {
              this.updateCartWidget();
            }
            if (node.classList?.contains('loyalty-account-section')) {
              this.updateAccountSection();
            }
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  /**
   * Attach redeem button handler
   */
  attachRedeemHandler(container) {
    const btn = container.querySelector('.loyalty-redeem-btn');
    if (!btn) return;

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const points = parseInt(btn.dataset.points, 10);
      await this.redeemPoints(points, btn);
    });
  }

  /**
   * Redeem points for discount code
   */
  async redeemPoints(points, button) {
    if (!this.isLoggedIn || !this.customerId) {
      alert('Please log in to redeem points');
      return;
    }

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Redeeming...';

    try {
      const response = await fetch(`${this.apiUrl}/api/loyalty/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify({
          customerId: this.customerId,
          points: points,
        }),
      });

      const data = await response.json();

      if (data.success) {
        this.balance = data.remaining_points;
        this.showDiscountCode(data.discount_code, data.discount_value);
        this.updatePointsBadge();
        this.updateCartWidget();
        this.updateAccountSection();
      } else {
        alert(data.error || 'Failed to redeem points. Please try again.');
        button.disabled = false;
        button.textContent = originalText;
      }
    } catch (error) {
      console.error('Error redeeming points:', error);
      alert('Failed to redeem points. Please try again.');
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  /**
   * Show discount code modal/notification
   */
  showDiscountCode(code, value) {
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'loyalty-discount-modal';
    modal.innerHTML = `
      <div class="loyalty-discount-modal-content">
        <button class="loyalty-modal-close">&times;</button>
        <div class="loyalty-modal-icon">🎉</div>
        <h3>Congratulations!</h3>
        <p>You've redeemed your points for a $${value} discount!</p>
        <div class="loyalty-discount-code">
          <code>${code}</code>
          <button class="loyalty-copy-btn" data-code="${code}">Copy</button>
        </div>
        <p class="loyalty-modal-note">Use this code at checkout. Valid for 90 days.</p>
      </div>
    `;

    document.body.appendChild(modal);

    // Handle close
    modal.querySelector('.loyalty-modal-close').addEventListener('click', () => {
      modal.remove();
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    // Handle copy
    modal.querySelector('.loyalty-copy-btn').addEventListener('click', (e) => {
      navigator.clipboard.writeText(code).then(() => {
        e.target.textContent = 'Copied!';
        setTimeout(() => {
          e.target.textContent = 'Copy';
        }, 2000);
      });
    });
  }

  /**
   * Format points for display
   */
  formatPoints(points) {
    return points.toLocaleString();
  }

  /**
   * Get translation with fallback
   */
  getTranslation(key, fallback) {
    const keys = key.split('.');
    let value = window.translations || {};

    for (const k of keys) {
      value = value[k];
      if (!value) return fallback;
    }

    return value || fallback;
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  window.loyaltyHandler = new LoyaltyHandler();
});
