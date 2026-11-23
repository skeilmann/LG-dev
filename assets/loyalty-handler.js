/**
 * Loyalty Handler
 * Shows loyalty points (header badge, cart widget, account block) and handles
 * redemption, using the VEV server.
 *
 * Loaded only for logged-in customers when the "VEV app" theme setting has a
 * server address (layout/theme.liquid). Auth: window.VEV.token, a signed
 * customer token rendered by Liquid — no API key or customer ID is sent.
 * Text: window.theme.strings.loyalty (locales customer.loyalty.*).
 */
class LoyaltyHandler {
  constructor() {
    this.apiUrl = (window.VEV && window.VEV.apiUrl) || '';
    this.token = (window.VEV && window.VEV.token) || '';
    this.strings = (window.theme && window.theme.strings && window.theme.strings.loyalty) || {};

    this.balance = 0;
    this.tier = 'bronze';
    this.tierConfig = null;
    this.lifetimeSpend = 0;
    this.nextTier = null;
    this.spendToNextTier = 0;
    this.redemption = null;
    this.history = [];
    this.isLoading = true;
    this.loadFailed = false;

    if (!this.apiUrl || !this.token) {
      this.isLoading = false;
      this.loadFailed = true;
      this.initializeUI();
      return;
    }

    this.loadLoyaltyData().then(() => this.initializeUI());
  }

  t(key, fallback, values = {}) {
    let text = this.strings[key] || fallback;
    Object.keys(values).forEach((name) => {
      text = text.split(`[${name}]`).join(values[name]);
    });
    return text;
  }

  tierName(tier) {
    return (this.strings.tiers && this.strings.tiers[tier]) || tier;
  }

  escape(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  async request(path, options = {}) {
    const response = await fetch(`${this.apiUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
        ...(options.headers || {}),
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || data.message || `HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return data;
  }

  async loadLoyaltyData() {
    try {
      const data = await this.request('/api/loyalty/balance');
      if (data.success) {
        this.balance = data.points_balance || 0;
        this.tier = data.tier || 'bronze';
        this.tierConfig = data.tier_config || null;
        this.lifetimeSpend = data.lifetime_spend || 0;
        this.nextTier = data.next_tier || null;
        this.spendToNextTier = data.spend_to_next_tier || 0;
        this.redemption = data.redemption || null;
        this.history = Array.isArray(data.history) ? data.history : [];
      } else {
        this.loadFailed = true;
      }
    } catch (error) {
      console.error('Error loading loyalty data:', error.message);
      this.loadFailed = true;
    } finally {
      this.isLoading = false;
    }
  }

  initializeUI() {
    this.updatePointsBadge();
    this.updateCartWidget();
    this.updateAccountSection();
    this.updateRewardsPage();
    this.observeNewWidgets();
  }

  updatePointsBadge() {
    const badge = document.getElementById('loyalty-points-badge');
    if (!badge) return;

    if (this.isLoading || this.loadFailed) {
      badge.hidden = true;
      return;
    }

    const balanceEl = badge.querySelector('.loyalty-badge-count');
    if (balanceEl) balanceEl.textContent = this.formatPoints(this.balance);
    badge.hidden = false;
  }

  updateCartWidget() {
    document.querySelectorAll('.loyalty-cart-widget[data-customer]').forEach((widget) => {
      if (this.isLoading) return;
      if (this.loadFailed) {
        widget.hidden = true;
        return;
      }
      widget.hidden = false;
      widget.innerHTML = this.renderCartWidget();
      this.attachRedeemHandler(widget);
    });
  }

  updateAccountSection() {
    const section = document.querySelector('.loyalty-account-section');
    if (!section || this.isLoading) return;

    if (this.loadFailed) {
      section.innerHTML = `<p class="loyalty-unavailable">${this.escape(this.t('unavailable', 'Rewards are temporarily unavailable.'))}</p>`;
      return;
    }

    const settings = {
      showTierProgress: section.dataset.showTierProgress !== 'false',
      showRedeem: section.dataset.showRedeem !== 'false',
      rewardsUrl: section.dataset.rewardsUrl || `${(window.Shopify?.routes?.root || '/')}pages/rewards`,
    };

    section.innerHTML = this.renderAccountSection(settings);
    this.attachRedeemHandler(section);
  }

  canRedeem() {
    return Boolean(this.redemption && this.balance >= this.redemption.points_required);
  }

  renderRedeemButton(extraClass) {
    const points = this.redemption.points_required;
    const label = this.t('redeemFor', 'Redeem [points] pts for [value] MDL off', {
      points,
      value: this.redemption.discount_value,
    });
    return `<button type="button" class="loyalty-redeem-btn button ${extraClass}" data-points="${this.escape(points)}">${this.escape(label)}</button>`;
  }

  renderCartWidget() {
    const youHave = this.t('youHave', 'You have [points] points', { points: this.formatPoints(this.balance) });
    let action = '';

    if (this.canRedeem()) {
      action = this.renderRedeemButton('button--secondary');
    } else if (this.redemption) {
      const needed = Math.max(0, this.redemption.points_required - this.balance);
      action = `<p class="loyalty-earn-more">${this.escape(this.t('earnMore', 'Earn [points] more points to redeem', { points: needed }))}</p>`;
    }

    return `
      <div class="loyalty-cart-content">
        <p class="loyalty-cart-balance">
          <span class="loyalty-icon" aria-hidden="true">⭐</span>
          <span class="loyalty-balance-text">${this.escape(youHave)}</span>
        </p>
        ${action}
      </div>
    `;
  }

  /** Share (0–100) of the way from the current tier's minimum to the next tier. */
  tierProgressPercent() {
    if (!this.nextTier) return 100;
    const currentMin = (this.tierConfig && this.tierConfig.min_spend) || 0;
    const nextMin = this.lifetimeSpend + this.spendToNextTier;
    const span = nextMin - currentMin;
    if (span <= 0) return 100;
    return Math.max(0, Math.min(100, ((this.lifetimeSpend - currentMin) / span) * 100));
  }

  renderAccountSection(settings) {
    let tierProgressHtml = '';
    if (settings.showTierProgress) {
      if (this.nextTier) {
        const text = this.t('spendToNext', 'Spend [amount] MDL more to reach [tier]', {
          amount: Math.ceil(this.spendToNextTier),
          tier: this.tierName(this.nextTier),
        });
        tierProgressHtml = `
          <div class="loyalty-progress">
            <div class="loyalty-progress-bar">
              <div class="loyalty-progress-fill" style="width: ${this.tierProgressPercent().toFixed(1)}%"></div>
            </div>
            <p class="loyalty-progress-text">${this.escape(text)}</p>
          </div>
        `;
      } else {
        tierProgressHtml = `<p class="loyalty-max-tier">${this.escape(this.t('maxTier', "You've reached the highest tier!"))}</p>`;
      }
    }

    const redeemHtml = settings.showRedeem && this.canRedeem() ? this.renderRedeemButton('') : '';
    const tierClass = ['bronze', 'silver', 'gold'].includes(this.tier) ? this.tier : 'bronze';

    return `
      <div class="loyalty-account-content">
        <div class="loyalty-account-header">
          <a href="${this.escape(settings.rewardsUrl)}" class="loyalty-view-all">${this.escape(this.t('viewDetails', 'View details'))} &rarr;</a>
        </div>

        <div class="loyalty-account-stats">
          <div class="loyalty-stat">
            <span class="loyalty-stat-value">${this.escape(this.formatPoints(this.balance))}</span>
            <span class="loyalty-stat-label">${this.escape(this.t('pointsLabel', 'Points'))}</span>
          </div>
          <div class="loyalty-stat">
            <span class="loyalty-stat-value loyalty-tier-${tierClass}">${this.escape(this.tierName(this.tier))}</span>
            <span class="loyalty-stat-label">${this.escape(this.t('tierLabel', 'Tier'))}</span>
          </div>
        </div>

        ${tierProgressHtml}
        ${redeemHtml}
      </div>
    `;
  }

  /**
   * Rewards page (sections/loyalty-rewards-page.liquid): balance, tier,
   * redeem button and recent activity for the logged-in customer.
   */
  updateRewardsPage() {
    const container = document.querySelector('[data-loyalty-rewards]');
    if (!container || this.isLoading) return;

    if (this.loadFailed) {
      container.innerHTML = `<p class="loyalty-unavailable">${this.escape(this.t('unavailable', 'Rewards are temporarily unavailable.'))}</p>`;
      return;
    }

    let action = '';
    if (this.canRedeem()) {
      action = this.renderRedeemButton('');
    } else if (this.redemption) {
      const needed = Math.max(0, this.redemption.points_required - this.balance);
      action = `<p class="loyalty-redeem-info">${this.escape(this.t('earnMore', 'Earn [points] more points to redeem', { points: needed }))}</p>`;
    }

    let progress = '';
    if (this.nextTier) {
      const text = this.t('spendToNext', 'Spend [amount] MDL more to reach [tier]', {
        amount: Math.ceil(this.spendToNextTier),
        tier: this.tierName(this.nextTier),
      });
      progress = `
        <div class="loyalty-tier-progress">
          <div class="loyalty-progress-bar"><div class="loyalty-progress-fill" style="width: ${this.tierProgressPercent().toFixed(1)}%"></div></div>
          <p>${this.escape(text)}</p>
        </div>`;
    } else {
      progress = `<p class="loyalty-max-tier">${this.escape(this.t('maxTier', "You've reached the highest tier!"))}</p>`;
    }

    const tierClass = ['bronze', 'silver', 'gold'].includes(this.tier) ? this.tier : 'bronze';
    const rate = this.tierConfig ? this.tierConfig.points_per_dollar : null;
    const labels = {
      earn: this.t('historyEarned', 'Earned from order'),
      redeem: this.t('historyRedeemed', 'Redeemed for discount'),
      reverse: this.t('historyReversed', 'Points reversed'),
      bonus: this.t('historyBonus', 'Welcome bonus'),
    };
    const icons = { earn: '➕', redeem: '🎁', reverse: '↩️', bonus: '⭐' };
    const dateFormat = new Intl.DateTimeFormat(document.documentElement.lang || undefined);

    const history = this.history.slice(0, 10).map((entry) => {
      const points = Number(entry.points) || 0;
      const date = entry.date ? dateFormat.format(new Date(entry.date)) : '';
      const code = entry.type === 'redeem' && entry.discount_code ? ` · <code>${this.escape(entry.discount_code)}</code>` : '';
      return `
        <li class="loyalty-history-item loyalty-history-${this.escape(entry.type)}">
          <span class="loyalty-history-icon" aria-hidden="true">${icons[entry.type] || '⭐'}</span>
          <span class="loyalty-history-details">
            <span class="loyalty-history-action">${this.escape(labels[entry.type] || entry.type)}${code}</span>
            <span class="loyalty-history-date">${this.escape(date)}</span>
          </span>
          <span class="loyalty-history-points ${points >= 0 ? 'positive' : 'negative'}">${points >= 0 ? '+' : ''}${this.escape(this.formatPoints(points))}</span>
        </li>`;
    }).join('');

    container.innerHTML = `
      <div class="loyalty-dashboard">
        <div class="loyalty-balance-card">
          <div class="loyalty-balance-main">
            <span class="loyalty-balance-icon" aria-hidden="true">⭐</span>
            <div class="loyalty-balance-info">
              <span class="loyalty-balance-points">${this.escape(this.formatPoints(this.balance))}</span>
              <span class="loyalty-balance-label">${this.escape(this.t('pointsAvailable', 'Points available'))}</span>
            </div>
          </div>
          ${action}
        </div>
        <div class="loyalty-tier-card-current">
          <h2 class="h3">${this.escape(this.t('yourTier', 'Your tier'))}</h2>
          <div class="loyalty-current-tier loyalty-tier-${tierClass}">
            <span class="loyalty-tier-badge">${this.escape(this.tierName(this.tier))}</span>
            ${rate !== null ? `<span class="loyalty-tier-rate">${this.escape(this.t('pointsPerMdl', '[rate] points per 1 MDL', { rate }))}</span>` : ''}
          </div>
          ${progress}
        </div>
      </div>
      <div class="loyalty-history-section">
        <h2 class="h3">${this.escape(this.t('recentActivity', 'Recent activity'))}</h2>
        ${history
          ? `<ul class="loyalty-history-list list-unstyled" role="list">${history}</ul>`
          : `<p class="loyalty-no-history">${this.escape(this.t('noActivity', 'No activity yet. Start shopping to earn points!'))}</p>`}
      </div>
    `;
    this.attachRedeemHandler(container);
  }

  /** Fill widgets that appear later, e.g. when the cart drawer is re-rendered. */
  observeNewWidgets() {
    if (this.observer) return;
    this.observer = new MutationObserver((mutations) => {
      let cart = false;
      let account = false;
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (node.matches('.loyalty-cart-widget') || node.querySelector('.loyalty-cart-widget')) cart = true;
          if (node.matches('.loyalty-account-section') || node.querySelector('.loyalty-account-section')) account = true;
        }
      }
      if (cart) this.updateCartWidget();
      if (account) this.updateAccountSection();
    });
    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  attachRedeemHandler(container) {
    const btn = container.querySelector('.loyalty-redeem-btn');
    if (!btn) return;

    btn.addEventListener('click', async (event) => {
      event.preventDefault();
      await this.redeemPoints(parseInt(btn.dataset.points, 10), btn);
    });
  }

  async redeemPoints(points, button) {
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = this.t('redeeming', 'Redeeming...');

    try {
      const data = await this.request('/api/loyalty/redeem', {
        method: 'POST',
        body: JSON.stringify({ points }),
      });

      if (!data.success) throw new Error(data.error || 'redeem failed');

      this.balance = data.remaining_points;
      this.history = [
        { type: 'redeem', points: -data.points_redeemed, discount_code: data.discount_code, date: new Date().toISOString() },
        ...this.history,
      ];
      this.showDiscountCode(data.discount_code, data.discount_value);
      this.updatePointsBadge();
      this.updateCartWidget();
      this.updateAccountSection();
      this.updateRewardsPage();
    } catch (error) {
      console.error('Error redeeming points:', error.message);
      button.disabled = false;
      button.textContent = originalText;
      window.alert(this.t('redeemFailed', 'Could not redeem points. Please try again.'));
    }
  }

  showDiscountCode(code, value) {
    const previousFocus = document.activeElement;
    const modal = document.createElement('div');
    modal.className = 'loyalty-discount-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'LoyaltyModalTitle');
    modal.innerHTML = `
      <div class="loyalty-discount-modal-content">
        <button type="button" class="loyalty-modal-close" aria-label="${this.escape(this.t('close', 'Close'))}">&times;</button>
        <div class="loyalty-modal-icon" aria-hidden="true">🎉</div>
        <h3 id="LoyaltyModalTitle">${this.escape(this.t('congratsTitle', 'Congratulations!'))}</h3>
        <p>${this.escape(this.t('discountReady', 'Your [value] MDL discount code is ready.', { value }))}</p>
        <div class="loyalty-discount-code">
          <code>${this.escape(code)}</code>
          <button type="button" class="loyalty-copy-btn">${this.escape(this.t('copy', 'Copy'))}</button>
        </div>
        <p class="loyalty-modal-note">${this.escape(this.t('codeNote', 'Use it at checkout. Valid for 90 days, for your account only.'))}</p>
      </div>
    `;

    const close = () => {
      modal.remove();
      document.removeEventListener('keydown', onKeydown);
      if (previousFocus && previousFocus.focus) previousFocus.focus();
    };
    const onKeydown = (event) => {
      if (event.key === 'Escape') close();
    };

    document.body.appendChild(modal);
    document.addEventListener('keydown', onKeydown);
    modal.querySelector('.loyalty-modal-close').addEventListener('click', close);
    modal.addEventListener('click', (event) => {
      if (event.target === modal) close();
    });

    const copyBtn = modal.querySelector('.loyalty-copy-btn');
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(code).then(() => {
        copyBtn.textContent = this.t('copied', 'Copied!');
        setTimeout(() => {
          copyBtn.textContent = this.t('copy', 'Copy');
        }, 2000);
      });
    });
    copyBtn.focus();
  }

  formatPoints(points) {
    return Number(points || 0).toLocaleString(document.documentElement.lang || undefined);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.loyaltyHandler = new LoyaltyHandler();
});
