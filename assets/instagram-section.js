class InstagramSlider {
    constructor() {
        this.init();
    }

    init() {
        const sliders = document.querySelectorAll('.video-slider');

        sliders.forEach(slider => {
            const slidesToShow = slider.dataset.slidesToShow || 4;
            slider.style.setProperty('--slides-to-show', slidesToShow);
        });
    }
}

// Initialize slider when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new InstagramSlider();
});
