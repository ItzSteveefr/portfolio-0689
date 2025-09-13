/* ===================== */
/* IMPORTS & SHADERS     */
/* ===================== */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.178.0/build/three.module.js";
import { vertexShader, fluidShader, displayShader } from "./shaders.js";

/* ===================== */
/* PRELOADER ANIMATION   */
/* ===================== */
class PreloaderAnimation {
  constructor(options = {}) {
    this.preloader = document.getElementById(options.preloaderId || "preloader");
    this.mainContent = document.getElementById(options.mainContentId || "mainContent");
    this.onComplete = options.onComplete || (() => {});
    this.timeline = gsap.timeline();

    this.init();
  }

  init() {
    if (!this.preloader) {
      console.error("Preloader element not found");
      return;
    }

    this.setupAnimation();
  }

  setupAnimation() {
    const windowWidth = window.innerWidth;
    const wrapperWidth = 180;
    const finalPosition = windowWidth - wrapperWidth;
    const stepDistance = finalPosition / 6;

    this.timeline.to(".count", {
      x: -900,
      duration: 0.85,
      delay: 0.5,
      ease: "power4.inOut",
    });

    for (let i = 1; i <= 6; i++) {
      const xPosition = -900 + i * 180;
      this.timeline.to(".count", {
        x: xPosition,
        duration: 0.85,
        ease: "power4.inOut",
        onStart: () => {
          gsap.to(".count-wrapper", {
            x: stepDistance * i,
            duration: 0.85,
            ease: "power4.inOut",
          });
        },
      });
    }

    gsap.set(".revealer svg", { scale: 0 });

    const delays = [6, 6.5, 7];
    document.querySelectorAll(".revealer svg").forEach((el, i) => {
      gsap.to(el, {
        scale: 45,
        duration: 1.5,
        ease: "power4.inOut",
        delay: delays[i],
        onComplete: () => {
          if (i === delays.length - 1) {
            this.completeAnimation();
          }
        },
      });
    });
  }

  completeAnimation() {
    if (this.preloader) {
      // Smooth fade-out
      this.preloader.classList.add("hidden");

      setTimeout(() => {
        this.preloader.remove();
      }, 900); // match CSS fade
    }

    if (this.mainContent) {
      this.mainContent.classList.add("loaded");
      document.body.style.overflow = "auto";
    }

    this.onComplete();
  }

  skipAnimation() {
    this.timeline.kill();
    gsap.killTweensOf(".count, .count-wrapper, .revealer svg");
    this.completeAnimation();
  }
}

/* ===================== */
/* FLUID GRADIENT HERO   */
/* ===================== */
class FluidGradient {
  constructor() {
    this.config = {
      brushSize: 25.0,
      brushStrength: 0.5,
      distortionAmount: 2.5,
      fluidDecay: 0.98,
      trailLength: 0.8,
      stopDecay: 0.85,
      color1: "#000000",
      color2: "#111111",
      color3: "#222222",
      color4: "#333333",
      colorIntensity: 1.0,
      softness: 1.0,
    };

    this.mouseX = 0;
    this.mouseY = 0;
    this.prevMouseX = 0;
    this.prevMouseY = 0;
    this.lastMoveTime = 0;
    this.frameCount = 0;
    this.isInitialized = false;
  }

  hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return [r, g, b];
  }

  init() {
    if (this.isInitialized) return;

    const gradientCanvas = document.querySelector(".gradient-canvas");
    if (!gradientCanvas) return;

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    gradientCanvas.appendChild(this.renderer.domElement);

    this.setupRenderTargets();
    this.setupMaterials();
    this.setupGeometry();
    this.setupEventListeners();

    this.isInitialized = true;
    this.animate();
  }

  setupRenderTargets() {
    const rtOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
    };

    this.fluidTarget1 = new THREE.WebGLRenderTarget(
      window.innerWidth,
      window.innerHeight,
      rtOptions
    );
    this.fluidTarget2 = new THREE.WebGLRenderTarget(
      window.innerWidth,
      window.innerHeight,
      rtOptions
    );

    this.currentFluidTarget = this.fluidTarget1;
    this.previousFluidTarget = this.fluidTarget2;
  }

  setupMaterials() {
    this.fluidMaterial = new THREE.ShaderMaterial({
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        iMouse: { value: new THREE.Vector4(0, 0, 0, 0) },
        iFrame: { value: 0 },
        iPreviousFrame: { value: null },
        uBrushSize: { value: this.config.brushSize },
        uBrushStrength: { value: this.config.brushStrength },
        uFluidDecay: { value: this.config.fluidDecay },
        uTrailLength: { value: this.config.trailLength },
        uStopDecay: { value: this.config.stopDecay },
      },
      vertexShader: vertexShader,
      fragmentShader: fluidShader,
    });

    this.displayMaterial = new THREE.ShaderMaterial({
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        iFluid: { value: null },
        uDistortionAmount: { value: this.config.distortionAmount },
        uColor1: { value: new THREE.Vector3(...this.hexToRgb(this.config.color1)) },
        uColor2: { value: new THREE.Vector3(...this.hexToRgb(this.config.color2)) },
        uColor3: { value: new THREE.Vector3(...this.hexToRgb(this.config.color3)) },
        uColor4: { value: new THREE.Vector3(...this.hexToRgb(this.config.color4)) },
        uColorIntensity: { value: this.config.colorIntensity },
        uSoftness: { value: this.config.softness },
      },
      vertexShader: vertexShader,
      fragmentShader: displayShader,
    });
  }

  setupGeometry() {
    this.geometry = new THREE.PlaneGeometry(2, 2);
    this.fluidPlane = new THREE.Mesh(this.geometry, this.fluidMaterial);
    this.displayPlane = new THREE.Mesh(this.geometry, this.displayMaterial);
  }

  setupEventListeners() {
    const gradientCanvas = document.querySelector(".gradient-canvas");

    document.addEventListener("mousemove", (e) => {
      const rect = gradientCanvas.getBoundingClientRect();
      this.prevMouseX = this.mouseX;
      this.prevMouseY = this.mouseY;
      this.mouseX = e.clientX - rect.left;
      this.mouseY = rect.height - (e.clientY - rect.top);
      this.lastMoveTime = performance.now();

      this.fluidMaterial.uniforms.iMouse.value.set(
        this.mouseX,
        this.mouseY,
        this.prevMouseX,
        this.prevMouseY
      );
    });

    document.addEventListener("mouseleave", () => {
      this.fluidMaterial.uniforms.iMouse.value.set(0, 0, 0, 0);
    });

    window.addEventListener("resize", () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      this.renderer.setSize(width, height);
      this.fluidMaterial.uniforms.iResolution.value.set(width, height);
      this.displayMaterial.uniforms.iResolution.value.set(width, height);

      this.fluidTarget1.setSize(width, height);
      this.fluidTarget2.setSize(width, height);
      this.frameCount = 0;
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const time = performance.now() * 0.001;
    this.fluidMaterial.uniforms.iTime.value = time;
    this.displayMaterial.uniforms.iTime.value = time;
    this.fluidMaterial.uniforms.iFrame.value = this.frameCount;

    if (performance.now() - this.lastMoveTime > 100) {
      this.fluidMaterial.uniforms.iMouse.value.set(0, 0, 0, 0);
    }

    this.fluidMaterial.uniforms.iPreviousFrame.value = this.previousFluidTarget.texture;

    this.renderer.setRenderTarget(this.currentFluidTarget);
    this.renderer.render(this.fluidPlane, this.camera);

    this.displayMaterial.uniforms.iFluid.value = this.currentFluidTarget.texture;
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.displayPlane, this.camera);

    const temp = this.currentFluidTarget;
    this.currentFluidTarget = this.previousFluidTarget;
    this.previousFluidTarget = temp;

    this.frameCount++;
  }
}

/* ===================== */
/* TEXT ANIMATION CLASS  */
/* ===================== */
class TextAnimation {
  constructor() {
    this.wordHighlightBgColor = "60, 60, 60";
    this.keywords = [
      "vibrant",
      "living",
      "clarity",
      "expression",
      "shape",
      "intuitive",
      "storytelling",
      "interactive",
      "vision",
    ];
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;

    // Register ScrollTrigger
    gsap.registerPlugin(ScrollTrigger);

    // Initialize Lenis for smooth scrolling
    this.initSmoothScrolling();

    // Setup text processing
    this.processTextElements();

    // Setup scroll animations
    this.setupScrollAnimations();

    this.isInitialized = true;
  }

  initSmoothScrolling() {
    this.lenis = new Lenis();

    this.lenis.on("scroll", ScrollTrigger.update);

    gsap.ticker.add((time) => {
      this.lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);
  }

  processTextElements() {
    const animeTextParagraphs = document.querySelectorAll(".anime-text p");

    animeTextParagraphs.forEach((paragraph) => {
      const text = paragraph.textContent;
      const words = text.split(/\s+/);
      paragraph.innerHTML = "";

      words.forEach((word) => {
        if (word.trim()) {
          const wordContainer = document.createElement("div");
          wordContainer.className = "word";

          const wordText = document.createElement("span");
          wordText.textContent = word;

          const normalizedWord = word.toLowerCase().replace(/[.,!?;:"]/g, "");
          if (this.keywords.includes(normalizedWord)) {
            wordContainer.classList.add("keyword-wrapper");
            wordText.classList.add("keyword", normalizedWord);
          }

          wordContainer.appendChild(wordText);
          paragraph.appendChild(wordContainer);
        }
      });
    });
  }

  setupScrollAnimations() {
    const animeTextContainers = document.querySelectorAll(".anime-text-container");

    animeTextContainers.forEach((container) => {
      // Set initial visibility for all words
      const words = Array.from(container.querySelectorAll(".anime-text .word"));
      words.forEach((word) => {
        const wordText = word.querySelector("span");
        word.style.opacity = "0.3"; // Start with low visibility instead of 0
        wordText.style.opacity = "0.5"; // Text starts slightly visible
      });

      ScrollTrigger.create({
        trigger: container,
        pin: container,
        start: "top top",
        end: `+=${window.innerHeight * 3}`, // Reduced from 4 to 3 for faster progression
        pinSpacing: true,
        onUpdate: (self) => {
          const progress = self.progress;
          const totalWords = words.length;

          words.forEach((word, index) => {
            const wordText = word.querySelector("span");

            if (progress < 0.8) {
              // Reveal phase - made more responsive
              const revealProgress = progress / 0.8;

              const overlapWords = 8; // Reduced overlap for faster animation
              const wordStart = index / totalWords;
              const wordEnd = wordStart + overlapWords / totalWords;

              const wordProgress = revealProgress < wordStart ? 0 :
                revealProgress > wordEnd ? 1 :
                (revealProgress - wordStart) / (wordEnd - wordStart);

              // Ensure minimum visibility
              const minOpacity = 0.1;
              const finalOpacity = Math.max(minOpacity, wordProgress);
              word.style.opacity = finalOpacity;

              // Background highlight
              const backgroundOpacity = wordProgress > 0.7 ? 
                Math.max(0, 1 - (wordProgress - 0.7) / 0.3) : 0;
              word.style.backgroundColor = `rgba(${this.wordHighlightBgColor}, ${backgroundOpacity})`;

              // Text reveal - starts earlier and more gradually
              const textRevealProgress = wordProgress > 0.3 ? 
                (wordProgress - 0.3) / 0.7 : 0;
              wordText.style.opacity = Math.max(0.2, Math.pow(textRevealProgress, 0.3));

            } else {
              // Exit phase - simplified
              const exitProgress = (progress - 0.8) / 0.2;
              const fadeOut = 1 - exitProgress;
              
              word.style.opacity = Math.max(0.1, fadeOut);
              wordText.style.opacity = Math.max(0.1, fadeOut);
              word.style.backgroundColor = `rgba(${this.wordHighlightBgColor}, ${exitProgress * 0.5})`;
            }
          });
        },
      });
    });
  }
}

/* ===================== */
/* APP INITIALIZATION    */
/* ===================== */
document.addEventListener("DOMContentLoaded", () => {
  const fluidGradient = new FluidGradient();
  const textAnimation = new TextAnimation();

  const preloader = new PreloaderAnimation({
    preloaderId: "preloader",
    mainContentId: "mainContent",
    onComplete: () => {
      console.log("Preloader complete! Initializing components...");
      
      // Initialize WebGL gradient after short delay
      setTimeout(() => {
        fluidGradient.init();
      }, 200);
      
      // Initialize text animation after content is loaded
      setTimeout(() => {
        textAnimation.init();
      }, 500);
    },
  });

  // Skip preloader with Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      preloader.skipAnimation();
      setTimeout(() => {
        fluidGradient.init();
        textAnimation.init();
      }, 100);
    }
  });
});
