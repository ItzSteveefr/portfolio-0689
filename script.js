// script.js — Preloader + GSAP animations + Asset Preloading + Shader Warm-up

console.log("Preloader script loaded ✅");

gsap.registerPlugin(SplitText);

// ✅ Preload assets before running preloader animations
function preloadAssets() {
  const assets = ["logo_01.png", "mask.svg"];
  const promises = assets.map(src => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = resolve;
      img.onerror = reject;
      img.src = src;
    });
  });

  return Promise.all(promises);
}

let gradientModule;

// Warm-up gradient after 1.5s while preloader is running
function warmupGradient() {
  import("./gradient-script.js").then(mod => {
    gradientModule = mod;
    mod.initGradient();
    console.log("🌈 Gradient warmed up in background");
  });
}

document.fonts.ready.then(() => {
  preloadAssets().then(() => {
    console.log("✅ All assets preloaded");

    function createSplitTexts(elements) {
      const splits = {};
      elements.forEach(({ key, selector, type }) => {
        const config = { type, mask: type };
        if (type === "chars") config.charsClass = "char";
        if (type === "lines") config.linesClass = "line";
        splits[key] = SplitText.create(selector, config);
      });
      return splits;
    }

    const splitElements = [
      { key: "logoChars", selector: ".preloader-logo h1", type: "chars" },
      { key: "footerLines", selector: ".preloader-footer p", type: "lines" },
      { key: "heroFooter", selector: ".hero-footer p", type: "lines" },
    ];

    const splits = createSplitTexts(splitElements);

    // Initial GSAP set state
    gsap.set([splits.logoChars.chars], { x: "100%" });
    gsap.set([splits.footerLines.lines, splits.heroFooter.lines], { y: "100%" });

    function animateProgress(duration = 3) {
      const tl = gsap.timeline();
      const counterSteps = 5;
      let currentProgress = 0;
      for (let i = 0; i < counterSteps; i++) {
        const finalStep = i === counterSteps - 1;
        const targetProgress = finalStep
          ? 1
          : Math.min(currentProgress + Math.random() * 0.3 + 0.1, 0.9);
        currentProgress = targetProgress;
        tl.to(".preloader-progress-bar", {
          scaleX: targetProgress,
          duration: duration / counterSteps,
          ease: "power2.out",
        });
      }
      return tl;
    }

    const tl = gsap.timeline({ delay: 0.5 });

    tl.to(splits.logoChars.chars, {
      x: "0%",
      stagger: 0.05,
      duration: 1,
      ease: "power4.inOut",
    })
      .to(
        splits.footerLines.lines,
        {
          y: "0%",
          stagger: 0.1,
          duration: 1,
          ease: "power4.inOut",
        },
        "0.25",
      )
      .add(animateProgress(), "<")
      .set(".preloader-progress", { backgroundColor: "var(--base-300)" })
      .call(() => {
        // Warm up gradient in background after ~1.5s
        setTimeout(warmupGradient, 1500);
      })
      .to(
        splits.logoChars.chars,
        {
          x: "-100%",
          stagger: 0.05,
          duration: 1,
          ease: "power4.inOut",
        },
        "-=0.5",
      )
      .to(
        splits.footerLines.lines,
        {
          y: "-100%",
          stagger: 0.1,
          duration: 1,
          ease: "power4.inOut",
        },
        "<",
      )
      .to(
        ".preloader-progress",
        {
          opacity: 0,
          duration: 0.5,
          ease: "power3.out",
        },
        "-=0.25",
      )
      .to(
        ".preloader-mask",
        {
          scale: 5,
          duration: 2.5,
          ease: "power3.out",
        },
        "<",
      )
      .to(
        splits.heroFooter.lines,
        {
          y: 0,
          stagger: 0.1,
          duration: 1,
          ease: "power4.out",
        },
        "-=0.8", // slight delay for smoother feel
      )
      // ✅ Reveal gradient (already running) after preloader
      .call(() => {
        if (gradientModule) gradientModule.startGradient();
      });
  });
});
