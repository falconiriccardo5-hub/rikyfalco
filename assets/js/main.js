/* =========================================================
   Riky Falco — interazioni base (nessuna animazione grafica)
   ========================================================= */
(function () {
  'use strict';

  /* ---- Header: stato "scrolled" ---- */
  var header = document.getElementById('header');
  function onScrollHeader() {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  }

  /* ---- Menu mobile ---- */
  var toggle = document.getElementById('navToggle');
  var nav = document.getElementById('nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---- Link di navigazione attivo ---- */
  var sections = Array.prototype.slice.call(document.querySelectorAll('main section[id]'));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav a'));
  function onScrollActive() {
    var y = window.scrollY + 120;
    var current = '';
    sections.forEach(function (s) {
      if (s.offsetTop <= y) current = s.id;
    });
    navLinks.forEach(function (a) {
      a.classList.toggle('is-active', a.getAttribute('href') === '#' + current);
    });
  }

  /* =========================================================
     HERO 3D — progress di scroll
     Lo stage è sticky dentro un blocco alto 240vh: qui calcolo
     un valore 0 → 1 che l'animazione 3D potrà leggere.

     Disponibile in due modi:
       1) CSS custom property   --hero-progress  su .hero
       2) evento                'hero3d:progress' (detail.progress)
     ========================================================= */
  var hero = document.getElementById('hero');
  var stage = document.getElementById('hero3d');
  var lastProgress = -1;

  function onScrollHero() {
    if (!hero || !stage) return;
    var rect = hero.getBoundingClientRect();
    var scrollable = hero.offsetHeight - window.innerHeight;
    var p = scrollable > 0 ? (-rect.top) / scrollable : 0;
    p = Math.min(1, Math.max(0, p));
    if (Math.abs(p - lastProgress) < 0.001) return;
    lastProgress = p;
    hero.style.setProperty('--hero-progress', p.toFixed(4));
    stage.dispatchEvent(new CustomEvent('hero3d:progress', {
      detail: { progress: p },
      bubbles: true
    }));
  }

  /* ---- Un solo listener di scroll, throttled via rAF ---- */
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      onScrollHeader();
      onScrollActive();
      onScrollHero();
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---- Form CTA finale (placeholder, nessun invio reale) ---- */
  var form = document.getElementById('ctaForm');
  var feedback = document.getElementById('formFeedback');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        if (feedback) feedback.textContent = 'Compila nome ed email per continuare.';
        return;
      }
      if (feedback) feedback.textContent = 'Richiesta registrata. Collega qui il tuo servizio di invio.';
      form.reset();
    });
  }

  /* ---- Anno nel footer ---- */
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
