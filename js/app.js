/* ═══════════════════════════════════════════════════════════════════
   MAHARI — app.js
   Lenis smooth scroll + GSAP ScrollTrigger + Canvas frame scrubbing
═══════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  // ─── Config ──────────────────────────────────────────────────────
  const FRAME_DIR    = "frames/";
  const FRAME_EXT    = ".webp";
  const FRAME_SPEED  = 1.26;  // last frame lands when section 3 is centred in viewport
  const IMAGE_SCALE  = 1.0;   // true cover — no gaps

  // Marquee visibility window
  const MARQUEE_ENTER = 0.10;
  const MARQUEE_LEAVE = 0.90;

  // Hero overlay fades out over first 8% of scroll
  const HERO_FADE_END = 0.08;

  // ─── DOM refs ────────────────────────────────────────────────────
  const loader          = document.getElementById("loader");
  const loaderBar       = document.getElementById("loader-bar");
  const loaderPercent   = document.getElementById("loader-percent");
  const heroOverlay     = document.getElementById("hero-overlay");
  const canvasWrap      = document.getElementById("canvas-wrap");
  const canvas          = document.getElementById("canvas");
  const ctx             = canvas.getContext("2d");
  const scrollContainer = document.getElementById("scroll-container");
  const marqueeWrap     = document.getElementById("marquee-locations");
  const marqueeText     = marqueeWrap.querySelector(".marquee-text");

  // ─── State ───────────────────────────────────────────────────────
  let frames       = [];
  let frameCount   = 0;
  let currentFrame = 0;
  let bgColor      = "#0A0906";
  let lenis        = null;

  // ─── Utilities ───────────────────────────────────────────────────
  function pad(n, len) { return String(n).padStart(len, "0"); }
  function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

  // ─── Canvas resize ───────────────────────────────────────────────
  let canvasReady = false;
  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = window.innerWidth  * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width  = window.innerWidth  + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    canvasReady = true;
    if (frames[currentFrame]) drawFrame(currentFrame);
  }
  window.addEventListener("resize", resizeCanvas);

  // ─── Sample background color from frame corner ────────────────────
  function sampleBgColor(img) {
    const oc = document.createElement("canvas");
    oc.width = oc.height = 4;
    oc.getContext("2d").drawImage(img, 0, 0, 4, 4);
    const d = oc.getContext("2d").getImageData(0, 0, 1, 1).data;
    bgColor = "rgb(" + d[0] + "," + d[1] + "," + d[2] + ")";
  }

  // ─── Draw a single frame ──────────────────────────────────────────
  function drawFrame(index) {
    const img = frames[index];
    if (!img) return;
    const cw = window.innerWidth, ch = window.innerHeight;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const scale = Math.max(cw / iw, ch / ih) * IMAGE_SCALE;
    const dw = iw * scale, dh = ih * scale;
    const dx = (cw - dw) / 2, dy = (ch - dh) / 2;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  // ─── Two-phase frame loader ───────────────────────────────────────
  function loadFrames(total, onProgress, onComplete) {
    frames = new Array(total).fill(null);
    let loaded = 0;

    function markLoaded(i, img) {
      frames[i] = img;
      loaded++;
      onProgress(loaded / total);
      if (loaded === total) onComplete();
    }

    // Phase 1: first 12 frames — show first frame as soon as it's ready
    const phase1 = Math.min(12, total);
    for (let i = 0; i < phase1; i++) {
      (function (idx) {
        const img = new Image();
        img.onload = function () {
          if (idx === 0) { sampleBgColor(img); drawFrame(0); }
          markLoaded(idx, img);
        };
        img.onerror = function () { markLoaded(idx, null); };
        img.src = FRAME_DIR + "frame_" + pad(idx + 1, 4) + FRAME_EXT;
      })(i);
    }

    // Phase 2: remaining frames in background
    setTimeout(function () {
      for (let i = phase1; i < total; i++) {
        (function (idx) {
          const img = new Image();
          img.onload = function () {
            if (idx % 20 === 0) sampleBgColor(img);
            markLoaded(idx, img);
          };
          img.onerror = function () { markLoaded(idx, null); };
          img.src = FRAME_DIR + "frame_" + pad(idx + 1, 4) + FRAME_EXT;
        })(i);
      }
    }, 100);
  }

  // ─── Detect frame count by probing ────────────────────────────────
  function detectFrameCount(callback) {
    const probes = [193, 150, 100, 50, 1];
    let found = 0, checked = 0;
    probes.forEach(function (n) {
      const img = new Image();
      img.onload = function () { if (n > found) found = n; if (++checked === probes.length) callback(found || 1); };
      img.onerror = function () { if (++checked === probes.length) callback(found || 1); };
      img.src = FRAME_DIR + "frame_" + pad(n, 4) + FRAME_EXT;
    });
  }

  // ─── Hero entrance animation ──────────────────────────────────────
  function animateHero() {
    const label     = heroOverlay.querySelector(".hero-label");
    const words     = heroOverlay.querySelectorAll(".hero-word");
    const tagline   = heroOverlay.querySelector(".hero-tagline");
    const indicator = heroOverlay.querySelector(".hero-scroll-indicator");

    gsap.timeline({ delay: 0.3 })
      .to(label,     { opacity: 1, duration: 0.8, ease: "power2.out" })
      .to(words,     { opacity: 1, y: 0, duration: 1.1, stagger: 0.18, ease: "power4.out" }, "-=0.4")
      .to(tagline,   { opacity: 1, duration: 0.9, ease: "power2.out" }, "-=0.5")
      .to(indicator, { opacity: 1, duration: 0.8, ease: "power2.out" }, "-=0.3");
  }

  // ─── Lenis smooth scroll ──────────────────────────────────────────
  function initLenis() {
    lenis = new Lenis({
      duration: 1.2,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true
    });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);

    // Route anchor clicks through Lenis for smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener("click", function (e) {
        var id = anchor.getAttribute("href");
        var target = id === "#" ? document.documentElement : document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: 0, duration: 1.4 });
      });
    });
  }

  // ─── Hero overlay fades out as user begins scrolling ─────────────
  function initHeroOverlayFade() {
    ScrollTrigger.create({
      trigger: scrollContainer,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: function (self) {
        const p = self.progress;
        const opacity = clamp(1 - p / HERO_FADE_END, 0, 1);
        heroOverlay.style.opacity = opacity;
        heroOverlay.style.pointerEvents = opacity < 0.05 ? "none" : "auto";
      }
    });
  }

  // ─── Frame scrubbing ─────────────────────────────────────────────
  function initFrameScrubbing() {
    ScrollTrigger.create({
      trigger: scrollContainer,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: function (self) {
        const accelerated = Math.min(self.progress * FRAME_SPEED, 1);
        const index = Math.min(Math.floor(accelerated * frameCount), frameCount - 1);
        if (index !== currentFrame) {
          currentFrame = index;
          requestAnimationFrame(function () { drawFrame(currentFrame); });
        }
      }
    });
  }

  // ─── Marquee scroll-drive ─────────────────────────────────────────
  function initMarquee() {
    gsap.to(marqueeText, {
      xPercent: -22,
      ease: "none",
      scrollTrigger: {
        trigger: scrollContainer,
        start: "top top",
        end: "bottom bottom",
        scrub: true
      }
    });

    ScrollTrigger.create({
      trigger: scrollContainer,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: function (self) {
        const p = self.progress;
        const fd = 0.04;
        let o = 0;
        if (p >= MARQUEE_ENTER && p <= MARQUEE_ENTER + fd) o = (p - MARQUEE_ENTER) / fd;
        else if (p > MARQUEE_ENTER + fd && p < MARQUEE_LEAVE - fd) o = 1;
        else if (p >= MARQUEE_LEAVE - fd && p <= MARQUEE_LEAVE) o = 1 - (p - (MARQUEE_LEAVE - fd)) / fd;
        marqueeWrap.style.opacity = clamp(o, 0, 1).toString();
      }
    });
  }

  // ─── Counter animations ───────────────────────────────────────────
  function initCounters() {
    document.querySelectorAll(".stat-number").forEach(function (el) {
      const decimals = parseInt(el.dataset.decimals || "0");
      const trigger = el.closest(".scroll-section") || el.closest(".stats-static") || el;
      gsap.from(el, {
        textContent: 0,
        duration: 2.2,
        ease: "power1.out",
        snap: { textContent: decimals === 0 ? 1 : Math.pow(10, -decimals) },
        scrollTrigger: {
          trigger: trigger,
          start: "top 85%",
          toggleActions: "play none none none"
        },
        onUpdate: function () {
          el.textContent = parseFloat(el.textContent).toFixed(decimals);
        }
      });
    });
  }

  // ─── Post-scroll reveal ───────────────────────────────────────────
  function initRevealItems() {
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add("revealed"); observer.unobserve(e.target); }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal-item").forEach(function (el) { observer.observe(el); });
  }

  // ─── Pool fly-over canvas frame scrubbing ────────────────────────
  function initPoolVideo() {
    const poolCanvas  = document.getElementById("pool-canvas");
    const section     = document.getElementById("pool-video-section");
    if (!poolCanvas || !section) return;

    const POOL_DIR   = "frames-pool/";
    const POOL_EXT   = ".jpg";
    const poolCtx    = poolCanvas.getContext("2d");
    let poolFrames   = [];
    let poolCount    = 0;
    let poolCurrent  = 0;

    function resizePoolCanvas() {
      const dpr = window.devicePixelRatio || 1;
      poolCanvas.width  = window.innerWidth  * dpr;
      poolCanvas.height = window.innerHeight * dpr;
      poolCanvas.style.width  = window.innerWidth  + "px";
      poolCanvas.style.height = window.innerHeight + "px";
      poolCtx.setTransform(1, 0, 0, 1, 0, 0);
      poolCtx.scale(dpr, dpr);
      if (poolFrames[poolCurrent]) drawPoolFrame(poolCurrent);
    }
    window.addEventListener("resize", resizePoolCanvas);
    resizePoolCanvas();

    function drawPoolFrame(index) {
      const img = poolFrames[index];
      if (!img) return;
      const cw = window.innerWidth, ch = window.innerHeight;
      const iw = img.naturalWidth,  ih = img.naturalHeight;
      const scale = Math.max(cw / iw, ch / ih);
      poolCtx.drawImage(img, (cw - iw * scale) / 2, (ch - ih * scale) / 2, iw * scale, ih * scale);
    }

    function setupPoolScrubbing() {
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        onEnter:     function () { poolCanvas.style.opacity = "1"; },
        onEnterBack: function () { poolCanvas.style.opacity = "1"; },
        onLeaveBack: function () { poolCanvas.style.opacity = "0"; },
        // No onLeave — post-scroll-wrap (z-index 20) covers naturally
        onUpdate: function (self) {
          const idx = Math.min(Math.round(self.progress * (poolCount - 1)), poolCount - 1);
          if (idx !== poolCurrent) {
            poolCurrent = idx;
            drawPoolFrame(idx);
          }
        }
      });
    }

    // Detect total frame count then load all frames
    function detectPoolFrameCount(cb) {
      let n = 1;
      function tryNext() {
        const img = new Image();
        img.onload  = function () { n++; tryNext(); };
        img.onerror = function () { cb(n - 1); };
        img.src = POOL_DIR + "frame_" + pad(n, 4) + POOL_EXT;
      }
      tryNext();
    }

    detectPoolFrameCount(function (total) {
      if (total < 2) return;
      poolCount  = total;
      poolFrames = new Array(total).fill(null);
      let loaded = 0;
      for (let i = 0; i < total; i++) {
        (function (idx) {
          const img = new Image();
          img.onload = function () {
            poolFrames[idx] = img;
            loaded++;
            if (loaded === 1 && idx === 0) drawPoolFrame(0);
            if (loaded === total) setupPoolScrubbing();
          };
          img.src = POOL_DIR + "frame_" + pad(idx + 1, 4) + POOL_EXT;
        }(i));
      }
    });
  }

  // ─── Editorial image pan (horizontal drag to explore wide image) ──
  function initEditorialPan() {
    const wrap = document.querySelector(".editorial-image");
    const img  = wrap && wrap.querySelector("img");
    if (!wrap || !img) return;

    let isDragging = false;
    let pointerStartX = 0;
    let translateX = 0;

    function renderedImageWidth() {
      if (!img.naturalWidth || !img.naturalHeight) return wrap.offsetWidth;
      return img.naturalHeight > 0
        ? wrap.offsetHeight * (img.naturalWidth / img.naturalHeight)
        : wrap.offsetWidth;
    }

    function minTranslate() {
      return -(renderedImageWidth() - wrap.offsetWidth);
    }

    function clamp(v) {
      return Math.max(minTranslate(), Math.min(0, v));
    }

    function applyTranslate(x) {
      translateX = clamp(x);
      img.style.transform = "translateX(" + translateX + "px)";
    }

    function centre() {
      applyTranslate(minTranslate() / 2);
    }

    // Initialise once image dimensions are known
    if (img.complete && img.naturalWidth) {
      centre();
    } else {
      img.addEventListener("load", centre, { once: true });
    }

    window.addEventListener("resize", function () { applyTranslate(translateX); });

    wrap.addEventListener("pointerdown", function (e) {
      isDragging = true;
      pointerStartX = e.clientX - translateX;
      wrap.classList.add("dragging");
      wrap.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    wrap.addEventListener("pointermove", function (e) {
      if (!isDragging) return;
      applyTranslate(e.clientX - pointerStartX);
    });

    function endDrag() {
      if (!isDragging) return;
      isDragging = false;
      wrap.classList.remove("dragging");
      wrap.classList.add("explored"); // hides the hint permanently after first interaction
    }

    wrap.addEventListener("pointerup",     endDrag);
    wrap.addEventListener("pointercancel", endDrag);
  }

  // ─── Fallback: no frames ──────────────────────────────────────────
  function initWithoutFrames() {
    ctx.fillStyle = "#0A0906";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = "100 14px 'Jost', sans-serif";
    ctx.fillStyle = "rgba(201,168,76,0.3)";
    ctx.textAlign = "center";
    ctx.fillText("Place hero video frames in /frames/ directory", window.innerWidth / 2, window.innerHeight / 2);
    loader.classList.add("hidden");
    animateHero();
    initLenis();
    initHeroOverlayFade();
    initMarquee();
    initCounters();
    initRevealItems();
    initPoolVideo();
    initEditorialPan();
  }

  // ─── Bootstrap ───────────────────────────────────────────────────
  function bootstrap() {
    gsap.registerPlugin(ScrollTrigger);
    resizeCanvas();

    detectFrameCount(function (count) {
      if (count < 2) { initWithoutFrames(); return; }

      frameCount = count;
      loadFrames(
        frameCount,
        function (ratio) {
          const pct = Math.round(ratio * 100);
          loaderBar.style.width = pct + "%";
          loaderPercent.textContent = pct + "%";
        },
        function () {
          loader.classList.add("hidden");
          requestAnimationFrame(function () { drawFrame(0); });
          animateHero();
          initLenis();
          initHeroOverlayFade();
          initFrameScrubbing();
          initMarquee();
          initCounters();
          initRevealItems();
          initPoolVideo();
          initEditorialPan();
        }
      );
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }

})();
