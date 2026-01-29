/**
 * Instagram Circles Web Component
 * Displays circular Instagram video thumbnails with modal playback
 */
if (!customElements.get('instagram-circles')) {
  customElements.define(
    'instagram-circles',
    class InstagramCircles extends HTMLElement {
      constructor() {
        super();
        this.modal = null;
        this.video = null;
        this.track = null;
        this.resizeHandler = null;
      }

      connectedCallback() {
        this.track = this.querySelector('[data-instagram-track]');
        this.modal = this.querySelector('[data-instagram-modal]');
        this.video = this.modal?.querySelector('[data-instagram-video]');

        if (this.track) {
          this.loadFeed();
          this.setupNavigation();
          this.setupModal();
        }
      }

      disconnectedCallback() {
        this.resetVideo();
        if (this.resizeHandler) {
          window.removeEventListener('resize', this.resizeHandler);
        }
      }

      get token() {
        return this.dataset.instagramToken || '';
      }

      get videoCount() {
        return parseInt(this.dataset.videoCount, 10) || 8;
      }

      get desktopCount() {
        return parseInt(this.dataset.desktopCount, 10) || 6;
      }

      get mobileCount() {
        return parseInt(this.dataset.mobileCount, 10) || 3;
      }

      get slidesToShow() {
        return window.innerWidth < 750 ? this.mobileCount : this.desktopCount;
      }

      getLabel(key, fallback) {
        const dataKey = `label${key.charAt(0).toUpperCase() + key.slice(1)}`;
        return this.dataset[dataKey] || fallback;
      }

      async loadFeed() {
        if (!this.token) {
          this.showMessage('token', 'Instagram access token required');
          return;
        }

        this.showMessage('loading', 'Loading...');

        try {
          const url = `https://graph.instagram.com/me/media?fields=media_type,media_url,thumbnail_url,permalink,caption&access_token=${encodeURIComponent(this.token)}&limit=${this.videoCount}`;
          const response = await fetch(url);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const payload = await response.json();

          if (!payload?.data?.length) {
            this.showMessage('empty', 'No videos available');
            return;
          }

          const videos = payload.data.filter((item) => item.media_type === 'VIDEO');

          if (!videos.length) {
            this.showMessage('empty', 'No videos available');
            return;
          }

          this.renderVideos(videos);
          this.setupResize();
        } catch (error) {
          console.error('Instagram feed error:', error);
          this.showMessage('error', 'Error loading feed');
        }
      }

      renderVideos(videos) {
        this.track.innerHTML = videos
          .map((video, index) => {
            const alt = this.escapeHtml(video.caption || `Instagram video ${index + 1}`);
            const playLabel = this.getLabel('play', `Play video ${index + 1}`);

            return `
              <button
                type="button"
                class="instagram-circles__item"
                data-media-url="${this.escapeAttr(video.media_url)}"
                data-permalink="${this.escapeAttr(video.permalink)}"
                aria-label="${this.escapeAttr(playLabel)}"
              >
                <img
                  class="instagram-circles__thumb"
                  src="${this.escapeAttr(video.thumbnail_url)}"
                  alt="${alt}"
                  loading="lazy"
                />
                <span class="instagram-circles__overlay">
                  <span class="instagram-circles__play" aria-hidden="true"></span>
                </span>
              </button>
            `;
          })
          .join('');

        this.track.querySelectorAll('.instagram-circles__item').forEach((item) => {
          item.addEventListener('click', () => {
            const mediaUrl = item.dataset.mediaUrl;
            if (mediaUrl) {
              this.openModal(mediaUrl);
            }
          });
        });

        this.updateSlidesPerView();
      }

      setupNavigation() {
        const prevBtn = this.querySelector('[data-instagram-prev]');
        const nextBtn = this.querySelector('[data-instagram-next]');

        prevBtn?.addEventListener('click', () => this.scroll('prev'));
        nextBtn?.addEventListener('click', () => this.scroll('next'));
      }

      scroll(direction) {
        if (!this.track) return;

        const scrollAmount = this.track.offsetWidth * 0.8;
        this.track.scrollBy({
          left: direction === 'next' ? scrollAmount : -scrollAmount,
          behavior: 'smooth',
        });
      }

      setupResize() {
        this.resizeHandler = () => this.updateSlidesPerView();
        window.addEventListener('resize', this.resizeHandler, { passive: true });
      }

      updateSlidesPerView() {
        this.style.setProperty('--ig-slides', this.slidesToShow);
      }

      setupModal() {
        if (!this.modal) return;

        const closeBtn = this.querySelector('[data-instagram-modal-close]');

        this.modal.addEventListener('close', () => this.resetVideo());
        this.modal.addEventListener('cancel', (event) => {
          event.preventDefault();
          this.modal.close();
        });

        closeBtn?.addEventListener('click', () => this.modal.close());
      }

      openModal(mediaUrl) {
        if (!this.modal || !this.video || !mediaUrl) return;

        this.video.muted = true;
        this.video.src = mediaUrl;
        this.video.load();

        if (typeof this.modal.showModal === 'function') {
          this.modal.showModal();
        } else {
          this.modal.setAttribute('open', 'true');
        }

        this.video.play().catch(() => {
          /* Autoplay may be blocked by browser */
        });
      }

      resetVideo() {
        if (!this.video) return;
        this.video.pause();
        this.video.removeAttribute('src');
        this.video.load();
      }

      showMessage(type, fallback) {
        const message = this.getLabel(type, fallback);
        const className = type === 'loading' ? 'status' : type === 'empty' ? 'empty' : 'error';
        this.track.innerHTML = `<div class="instagram-circles__${className}">${this.escapeHtml(message)}</div>`;
      }

      escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
      }

      escapeAttr(str) {
        return String(str || '')
          .replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      }
    }
  );
}
