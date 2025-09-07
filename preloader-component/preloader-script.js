/**
 * Modular Preloader Component
 * Dependencies: GSAP (optional but recommended for advanced animations)
 */

class PreloaderComponent {
    constructor(options = {}) {
        // Default configuration
        this.config = {
            autoStart: true,
            duration: 4,
            useGSAP: typeof gsap !== 'undefined',
            customText: {
                title: 'Loading...',
                description: 'Spaces unfold in light and shadow, where structure finds its quiet rhythm, and time align in harmony.'
            },
            onComplete: null,
            onProgress: null,
            ...options
        };

        this.isActive = false;
        this.splits = {};
        this.timeline = null;

        // Initialize
        this.init();
    }

    /**
     * Initialize the preloader
     */
    init() {
        this.injectHTML();
        this.setupElements();
        
        if (this.config.autoStart) {
            this.show();
        }
    }

    /**
     * Inject preloader HTML into the page
     */
    injectHTML() {
        const preloaderHTML = `
            <div class="preloader-overlay" id="preloader-overlay">
                <div class="preloader-progress">
                    <div class="preloader-progress-bar"></div>
                    <div class="preloader-logo">
                        <h1 class="preloader-title">${this.config.customText.title}</h1>
                    </div>
                </div>

                <div class="preloader-mask"></div>

                <div class="preloader-content">
                    <div class="preloader-footer">
                        <p class="preloader-description">${this.config.customText.description}</p>
                    </div>
                </div>
            </div>
        `;

        // Remove existing preloader if any
        const existing = document.getElementById('preloader-overlay');
        if (existing) {
            existing.remove();
        }

        // Inject new preloader
        document.body.insertAdjacentHTML('afterbegin', preloaderHTML);
    }

    /**
     * Setup DOM elements and references
     */
    setupElements() {
        this.elements = {
            overlay: document.getElementById('preloader-overlay'),
            progress: document.querySelector('.preloader-progress'),
            progressBar: document.querySelector('.preloader-progress-bar'),
            logo: document.querySelector('.preloader-logo'),
            title: document.querySelector('.preloader-title'),
            footer: document.querySelector('.preloader-footer'),
            description: document.querySelector('.preloader-description'),
            mask: document.querySelector('.preloader-mask')
        };
    }

    /**
     * Create GSAP SplitText animations (if GSAP is available)
     */
    createSplitTexts() {
        if (!this.config.useGSAP || typeof SplitText === 'undefined') {
            return false;
        }

        try {
            const splitElements = [
                { key: "titleChars", selector: ".preloader-title", type: "chars" },
                { key: "descriptionLines", selector: ".preloader-description", type: "lines" }
            ];

            splitElements.forEach(({ key, selector, type }) => {
                const config = { type, mask: type };
                if (type === "chars") config.charsClass = "preloader-char";
                if (type === "lines") config.linesClass = "preloader-line";
                
                this.splits[key] = SplitText.create(selector, config);
            });

            // Set initial positions
            gsap.set(this.splits.titleChars?.chars || [], { x: "100%" });
            gsap.set(this.splits.descriptionLines?.lines || [], { y: "100%" });

            return true;
        } catch (error) {
            console.warn('GSAP SplitText setup failed:', error);
            return false;
        }
    }

    /**
     * Animate progress bar
     */
    animateProgress(duration = 4) {
        const progressBar = this.elements.progressBar;
        
        if (this.config.useGSAP && typeof gsap !== 'undefined') {
            const tl = gsap.timeline();
            const steps = 5;
            let currentProgress = 0;

            for (let i = 0; i < steps; i++) {
                const isLastStep = i === steps - 1;
                const targetProgress = isLastStep 
                    ? 1 
                    : Math.min(currentProgress + Math.random() * 0.3 + 0.1, 0.9);
                currentProgress = targetProgress;

                tl.to(progressBar, {
                    scaleX: targetProgress,
                    duration: duration / steps,
                    ease: "power2.out",
                    onUpdate: () => {
                        if (this.config.onProgress) {
                            this.config.onProgress(targetProgress);
                        }
                    }
                });
            }
            return tl;
        } else {
            // Fallback CSS animation
            return this.animateProgressFallback(duration);
        }
    }

    /**
     * Fallback progress animation without GSAP
     */
    animateProgressFallback(duration = 4) {
        return new Promise((resolve) => {
            const progressBar = this.elements.progressBar;
            let progress = 0;
            const steps = 50;
            const stepDuration = (duration * 1000) / steps;

            const interval = setInterval(() => {
                progress += (100 / steps) * (0.8 + Math.random() * 0.4);
                progress = Math.min(progress, 100);
                
                progressBar.style.transform = `translateX(-50%) scaleX(${progress / 100})`;
                
                if (this.config.onProgress) {
                    this.config.onProgress(progress / 100);
                }

                if (progress >= 100) {
                    clearInterval(interval);
                    resolve();
                }
            }, stepDuration);
        });
    }

    /**
     * Show preloader with animations
     */
    async show() {
        if (this.isActive) return;
        
        this.isActive = true;
        this.elements.overlay.classList.remove('hidden', 'fade-out');
        
        // Wait for fonts to load
        await document.fonts.ready;
        
        const hasGSAP = this.createSplitTexts();

        if (hasGSAP) {
            this.showWithGSAP();
        } else {
            this.showWithoutGSAP();
        }
    }

    /**
     * Show preloader with GSAP animations
     */
    showWithGSAP() {
        const tl = gsap.timeline({ delay: 0.5 });

        // Animate title characters
        if (this.splits.titleChars) {
            tl.to(this.splits.titleChars.chars, {
                x: "0%",
                stagger: 0.05,
                duration: 1,
                ease: "power4.inOut"
            });
        }

        // Animate description lines
        if (this.splits.descriptionLines) {
            tl.to(this.splits.descriptionLines.lines, {
                y: "0%",
                stagger: 0.1,
                duration: 1,
                ease: "power4.inOut"
            }, "0.25");
        }

        // Add progress animation
        tl.add(this.animateProgress(this.config.duration), "<");

        // Change background and hide text
        tl.set(this.elements.progress, { backgroundColor: "var(--preloader-text-color)" })
          .to(this.splits.titleChars?.chars || [], {
                x: "-100%",
                stagger: 0.05,
                duration: 1,
                ease: "power4.inOut"
            }, "-=0.5")
          .to(this.splits.descriptionLines?.lines || [], {
                y: "-100%",
                stagger: 0.1,
                duration: 1,
                ease: "power4.inOut"
            }, "<")
          .to(this.elements.progress, {
                opacity: 0,
                duration: 0.5,
                ease: "power3.out"
            }, "-=0.25")
          .to(this.elements.mask, {
                scale: 5,
                duration: 2.5,
                ease: "power3.out",
                onComplete: () => this.handleComplete()
            }, "<");

        this.timeline = tl;
    }

    /**
     * Show preloader without GSAP (fallback)
     */
    async showWithoutGSAP() {
        // Simple fade-in animation
        this.elements.overlay.style.opacity = '1';
        
        // Run progress animation
        await this.animateProgress(this.config.duration);
        
        // Simple fade-out
        setTimeout(() => {
            this.handleComplete();
        }, 500);
    }

    /**
     * Hide preloader
     */
    hide(immediate = false) {
        if (!this.isActive) return;

        if (immediate) {
            this.elements.overlay.classList.add('hidden');
            this.isActive = false;
            return;
        }

        if (this.config.useGSAP && this.timeline) {
            // GSAP timeline handles the hide animation
            return;
        }

        // Fallback hide animation
        this.elements.overlay.classList.add('fade-out');
        setTimeout(() => {
            this.elements.overlay.classList.add('hidden');
            this.isActive = false;
        }, 500);
    }

    /**
     * Handle preloader completion
     */
    handleComplete() {
        this.isActive = false;
        this.elements.overlay.classList.add('hidden');
        
        if (this.config.onComplete) {
            this.config.onComplete();
        }

        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('preloaderComplete'));
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        // Update text if changed
        if (newConfig.customText) {
            if (this.elements.title) {
                this.elements.title.textContent = this.config.customText.title;
            }
            if (this.elements.description) {
                this.elements.description.textContent = this.config.customText.description;
            }
        }
    }

    /**
     * Destroy preloader instance
     */
    destroy() {
        if (this.timeline) {
            this.timeline.kill();
        }
        
        if (this.elements.overlay) {
            this.elements.overlay.remove();
        }
        
        this.isActive = false;
        this.splits = {};
        this.elements = {};
    }
}

// Global functions for easy integration
window.PreloaderComponent = PreloaderComponent;

// Convenience functions
window.showPreloader = function(options = {}) {
    if (window.preloaderInstance) {
        window.preloaderInstance.destroy();
    }
    
    window.preloaderInstance = new PreloaderComponent({
        autoStart: true,
        ...options
    });
    
    return window.preloaderInstance;
};

window.hidePreloader = function(immediate = false) {
    if (window.preloaderInstance) {
        window.preloaderInstance.hide(immediate);
    }
};

// Auto-initialize if no configuration is needed
document.addEventListener('DOMContentLoaded', function() {
    // Check if preloader should auto-start
    const preloaderConfig = window.preloaderConfig || {};
    
    if (preloaderConfig.autoInit !== false) {
        window.preloaderInstance = new PreloaderComponent(preloaderConfig);
    }
});