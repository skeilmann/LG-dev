/**
 * InstagramFeed Class
 * Handles fetching and displaying Instagram videos in a slider
 * 
 * Features:
 * - Fetches videos from Instagram Graph API
 * - Filters for video content only
 * - Creates responsive slider interface
 * - Handles loading states and errors
 */
class InstagramFeed {
    constructor() {
        this.init();
    }

    /**
     * Initialize the Instagram feed
     * Finds all Instagram feed sections on the page and initializes them
     */
    init() {
        const sections = document.querySelectorAll('[data-instagram-feed]');
        if (!sections.length) return;

        sections.forEach(section => {
            this.loadInstagramFeed(section);
        });
    }

    /**
     * Fetch Instagram feed data
     * @param {HTMLElement} section - The section element containing the feed
     * Uses Instagram Graph API to fetch media items
     */
    async loadInstagramFeed(section) {
        const slider = section.querySelector('.video-slider');
        const token = section.getAttribute('data-instagram-token');
        const count = parseInt(section.getAttribute('data-video-count')) || 4;

        if (!token) {
            console.warn('Instagram access token is required');
            return;
        }

        try {
            const response = await fetch(`https://graph.instagram.com/me/media?fields=media_type,thumbnail_url,media_url,permalink&access_token=${token}&limit=${count}`);
            const data = await response.json();

            if (data.data) {
                const videos = data.data.filter(item => item.media_type === 'VIDEO');
                this.renderVideos(videos, slider);
            }
        } catch (error) {
            console.error('Error loading Instagram feed:', error);
            slider.innerHTML = '<p>Error loading Instagram feed</p>';
        }
    }

    /**
     * Render videos in the slider
     * @param {Array} videos - Array of video data from Instagram
     * @param {HTMLElement} slider - The slider container element
     * 
     * Creates slider items with:
     * - Thumbnail images
     * - Links to original posts
     * - Proper ARIA labels for accessibility
     */
    renderVideos(videos, slider) {
        slider.innerHTML = videos.map((video, index) => `
            <div class="video-item slider__slide"
                 id="Slide-${index}"
                 role="group"
                 aria-roledescription="slide"
                 aria-label="${index + 1} of ${videos.length}">
                <a href="${video.permalink}" target="_blank">
                    <img src="${video.thumbnail_url}" alt="Instagram video thumbnail">
                </a>
            </div>
        `).join('');

        const slidesToShow = slider.dataset.slidesToShow || 4;
        slider.style.setProperty('--slides-to-show', slidesToShow);

        // Initialize slider after content is loaded
        if (typeof Slider === 'function') {
            new Slider(slider.closest('slider-component'));
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new InstagramFeed();
});
