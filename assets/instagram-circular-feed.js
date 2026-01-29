(function () {
  class InstagramCircularFeed {
    constructor() {
      this.initialized = new WeakSet();
      this.bind();
    }

    bind() {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.init());
      } else {
        this.init();
      }
    }

    init() {
      const sections = document.querySelectorAll('[data-instagram-circular]');
      if (!sections.length) return;

      sections.forEach((section) => {
        if (this.initialized.has(section)) return;
        this.initialized.add(section);
        this.loadFeed(section);
      });
    }

    async loadFeed(section) {
      const slider = section.querySelector('[data-instagram-slider]');
      const token = section.dataset.instagramToken;
      const count = parseInt(section.dataset.videoCount, 10) || 8;

      if (!slider || !token) {
        if (slider) {
          slider.innerHTML = `<div class="instagram-circular__error">${this.getLabel(
            'Token',
            section,
            'Token required'
          )}</div>`;
        }
        return;
      }

      this.updateSlidesPerView(section, slider);
      window.addEventListener('resize', () => this.updateSlidesPerView(section, slider), { passive: true });

      slider.innerHTML = `<div class="instagram-circular__status">${this.getLabel('Loading', section, 'Loading')}</div>`;

      try {
        const response = await fetch(
          `https://graph.instagram.com/me/media?fields=media_type,media_url,thumbnail_url,permalink,caption&access_token=${encodeURIComponent(
            token
          )}&limit=${count}`
        );

        const payload = await response.json();
        if (!payload || !payload.data || !payload.data.length) {
          slider.innerHTML = `<div class="instagram-circular__empty">${this.getLabel(
            'Empty',
            section,
            'No videos available'
          )}</div>`;
          return;
        }

        const videos = payload.data.filter((item) => item.media_type === 'VIDEO');

        if (!videos.length) {
          slider.innerHTML = `<div class="instagram-circular__empty">${this.getLabel(
            'Empty',
            section,
            'No videos available'
          )}</div>`;
          return;
        }

        this.renderVideos(section, slider, videos);
        this.initSlider(slider);
      } catch (error) {
        console.error('Error loading Instagram feed', error);
        slider.innerHTML = `<div class="instagram-circular__error">${this.getLabel(
          'Error',
          section,
          'Error loading feed'
        )}</div>`;
      }
    }

    renderVideos(section, slider, videos) {
      const slidesToShow = this.getSlidesToShow(section);
      slider.style.setProperty('--instagram-slides', slidesToShow);

      slider.innerHTML = videos
        .map((video, index) => {
          const alt = video.caption || `Instagram video ${index + 1}`;
          return `
            <button
              type="button"
              class="instagram-circular__item slider__slide"
              data-media-url="${video.media_url}"
              data-permalink="${video.permalink}"
              aria-label="${this.escapeAttr(`Play video ${index + 1}`)}"
            >
              <img
                class="instagram-circular__thumb"
                src="${video.thumbnail_url}"
                alt="${this.escapeAttr(alt)}"
                loading="lazy"
              />
              <span class="instagram-circular__overlay">
                <span class="instagram-circular__play" aria-hidden="true">▶</span>
              </span>
            </button>
          `;
        })
        .join('');

      slider.querySelectorAll('.instagram-circular__item').forEach((item) => {
        item.addEventListener('click', () => {
          const mediaUrl = item.getAttribute('data-media-url');
          if (!mediaUrl) return;
          this.openModal(section, mediaUrl);
        });
      });
    }

    initSlider(slider) {
      if (typeof Slider === 'function') {
        const sliderComponent = slider.closest('slider-component');
        if (sliderComponent) new Slider(sliderComponent);
      }
    }

    openModal(section, mediaUrl) {
      const modal = section.querySelector('[data-instagram-modal]');
      const videoEl = section.querySelector('[data-instagram-modal-video]');
      const closeBtn = section.querySelector('[data-instagram-modal-close]');

      if (!modal || !videoEl || !closeBtn) return;

      if (!modal.dataset.instagramBound) {
        modal.addEventListener('close', () => this.resetVideo(videoEl));
        modal.addEventListener('cancel', (event) => {
          event.preventDefault();
          modal.close();
        });
        closeBtn.addEventListener('click', () => modal.close());
        modal.dataset.instagramBound = 'true';
      }

      videoEl.muted = true;
      videoEl.autoplay = true;
      videoEl.src = mediaUrl;
      videoEl.load();

      if (typeof modal.showModal === 'function') {
        modal.showModal();
      } else {
        modal.setAttribute('open', 'true');
      }
      videoEl.play().catch(() => {
        /* ignore autoplay rejection */
      });
    }

    resetVideo(videoEl) {
      if (!videoEl) return;
      videoEl.pause();
      videoEl.removeAttribute('src');
      videoEl.load();
    }

    updateSlidesPerView(section, slider) {
      const slidesToShow = this.getSlidesToShow(section);
      slider.style.setProperty('--instagram-slides', slidesToShow);
    }

    getSlidesToShow(section) {
      const desktop = parseInt(section.dataset.desktopCount, 10) || 6;
      const mobile = parseInt(section.dataset.mobileCount, 10) || 3;
      return window.innerWidth < 750 ? mobile : desktop;
    }

    getLabel(key, section, fallback) {
      if (!section) return fallback;
      const dataKey = `label${key}`;
      return section.dataset[dataKey] || fallback;
    }

    escapeAttr(value) {
      return String(value).replace(/"/g, '&quot;');
    }
  }

  new InstagramCircularFeed();
})();

