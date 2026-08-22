/* ==========================================================================
   motion.js — orchestrazione della hero.
   Anima esclusivamente transform, opacity e clip-path.
   Durate, ritardi e ampiezze non sono scritti qui: vengono letti da
   tokens.css a runtime, cosi il design system resta l'unica fonte.
   ========================================================================== */

(function () {
  "use strict";

  var root = document.documentElement;
  var hero = document.querySelector(".hero");
  if (!hero) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var desktop = window.matchMedia("(min-width: 768px)");

  /* ------------------------------------------------------- lettura token -- */
  var styles = getComputedStyle(root);

  function token(name) {
    return styles.getPropertyValue(name).trim();
  }

  function ms(name) {
    var v = token(name);
    return v.endsWith("ms") ? parseFloat(v) : parseFloat(v) * 1000;
  }

  var EASE_ENTER = token("--ease-enter");

  var D = {
    narrative: ms("--dur-narrative"),
    enter: ms("--dur-enter"),
    reveal: ms("--dur-reveal"),
    panel: ms("--dur-panel"),
    short: ms("--dur-short"),
  };

  var T = {
    bg: ms("--delay-bg"),
    panel: ms("--delay-panel"),
    eyebrow: ms("--delay-eyebrow"),
    line: ms("--delay-line"),
    sub: ms("--delay-sub"),
    cta: ms("--delay-cta"),
    overlay: ms("--delay-overlay"),
    stagger: ms("--stagger"),
  };

  var S = {
    panel: token("--shift-panel"),
    sm: token("--shift-sm"),
    md: token("--shift-md"),
    line: token("--shift-line"),
    backScale: token("--depth-back-scale"),
    backScaleIn: token("--depth-back-scale-in"),
    frontScale: token("--depth-front-scale"),
  };

  /* ------------------------------------------------------------ elementi -- */
  var el = {
    bg: hero.querySelector(".hero__bg"),
    panel: hero.querySelector(".hero__panel"),
    eyebrow: hero.querySelector(".hero__eyebrow"),
    lines: hero.querySelectorAll(".hero__headline .line__inner"),
    sub: hero.querySelector(".hero__sub"),
    actions: hero.querySelector(".hero__actions"),
    overlay: hero.querySelector(".hero__overlay"),
  };

  /* -------------------------------------------------------- disarmo pieno -
     Rimuove gli stati di partenza: il contenuto resta nella sua posizione
     naturale, definita solo dal CSS.                                       */
  function disarm() {
    root.removeAttribute("data-motion");
  }

  /* ------------------------------------------------ sequenza di apertura -- */
  function play() {
    var running = [];

    function animate(node, keyframes, duration, delay) {
      if (!node) return;
      var a = node.animate(keyframes, {
        duration: duration,
        delay: delay,
        easing: EASE_ENTER,
        fill: "both",
      });
      running.push(a.finished);
    }

    /* 1 — sfondo */
    animate(
      el.bg,
      [
        { opacity: 0, transform: "scale(" + S.backScaleIn + ")" },
        { opacity: 1, transform: "scale(" + S.backScale + ")" },
      ],
      D.narrative,
      T.bg
    );

    /* 2 — pannello in vetro */
    animate(
      el.panel,
      [
        { opacity: 0, transform: "translateY(" + S.panel + ")" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      D.panel,
      T.panel
    );

    /* 3 — occhiello */
    animate(
      el.eyebrow,
      [
        { opacity: 0, transform: "translateY(" + S.sm + ")" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      D.short,
      T.eyebrow
    );

    /* 4-6 — headline, rivelazione riga per riga.
       Solo transform: la maschera e' l'overflow:hidden statico di .line.
       Un clip-path animato qui, dentro il pannello con backdrop-filter,
       produce un artefatto di compositing in Chromium (vedi hero.css). */
    Array.prototype.forEach.call(el.lines, function (line, i) {
      animate(
        line,
        [
          { transform: "translateY(" + S.line + ")" },
          { transform: "translateY(0)" },
        ],
        D.reveal,
        T.line + i * T.stagger
      );
    });

    /* 7 — sottotitolo */
    animate(
      el.sub,
      [
        { opacity: 0, transform: "translateY(" + S.md + ")" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      D.enter,
      T.sub
    );

    /* 8 — CTA */
    animate(
      el.actions,
      [
        { opacity: 0, transform: "translateY(" + S.md + ")" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      D.enter,
      T.cta
    );

    /* 9 — overlay tecnico: wipe a clip-path, non stroke-dashoffset */
    animate(
      el.overlay,
      [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0 0 0)" }],
      D.narrative,
      T.overlay
    );

    Promise.all(running)
      .then(disarm)
      .catch(disarm);
  }

  /* --------------------------------------------------------- rivelazione --
     IntersectionObserver, threshold 0.2, once. Lo scroll nativo non viene
     mai intercettato, rallentato o riprodotto.                             */
  function arm() {
    if (!("IntersectionObserver" in window)) {
      disarm();
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          io.unobserve(entry.target);
          io.disconnect();
          play();
        });
      },
      { threshold: 0.2 }
    );
    io.observe(hero);
  }

  /* ---------------------------------------------------------- parallasse --
     Legge scrollY, non lo controlla. Solo transform, via custom property.  */
  var layers = [];

  function collectLayers() {
    layers = [];
    ["back", "figure", "front"].forEach(function (name) {
      var node = hero.querySelector('[data-depth="' + name + '"]');
      if (!node) return;
      var speed = parseFloat(token("--depth-" + name + "-speed")) || 0;
      layers.push({ node: node, speed: speed });
    });
  }

  var ticking = false;

  function onFrame() {
    ticking = false;
    var y = window.scrollY || window.pageYOffset || 0;
    for (var i = 0; i < layers.length; i++) {
      layers[i].node.style.setProperty(
        "--py",
        (y * layers[i].speed).toFixed(2) + "px"
      );
    }
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(onFrame);
  }

  function clearParallax() {
    layers.forEach(function (l) {
      l.node.style.removeProperty("--py");
    });
  }

  function syncParallax() {
    window.removeEventListener("scroll", onScroll);
    if (reduce.matches || !desktop.matches) {
      clearParallax();
      return;
    }
    collectLayers();
    window.addEventListener("scroll", onScroll, { passive: true });
    onFrame();
  }

  /* ------------------------------------------------------------- avvio ---- */
  if (reduce.matches) {
    disarm();
  } else {
    arm();
  }

  syncParallax();

  function onPreferenceChange() {
    if (reduce.matches) disarm();
    syncParallax();
  }

  if (typeof reduce.addEventListener === "function") {
    reduce.addEventListener("change", onPreferenceChange);
    desktop.addEventListener("change", syncParallax);
  } else if (typeof reduce.addListener === "function") {
    reduce.addListener(onPreferenceChange);
    desktop.addListener(syncParallax);
  }
})();
