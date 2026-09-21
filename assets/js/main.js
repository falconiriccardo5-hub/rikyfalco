/* =========================================================
   Riky Falco — comportamenti UI
   Nessuna animazione decorativa: solo stato, form e il
   progresso di scroll che pilotera' l'animazione 3D.
   ========================================================= */
(function () {
  'use strict';

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ---------------------------------------------------------
     Header: stato "scrolled"
     --------------------------------------------------------- */
  var header = $('#header');

  /* ---------------------------------------------------------
     Menu mobile (accessibile: aria-expanded, Esc, focus)
     --------------------------------------------------------- */
  var nav = $('#nav');
  var toggle = $('#navToggle');

  function setMenu(open) {
    if (!nav || !toggle) return;
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Chiudi il menu' : 'Apri il menu');
    var use = toggle.querySelector('use');
    if (use) use.setAttribute('href', open ? '#i-close' : '#i-menu');
  }

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      setMenu(!nav.classList.contains('is-open'));
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        setMenu(false);
        toggle.focus();
      }
    });
  }

  /* ---------------------------------------------------------
     Link di navigazione attivo
     --------------------------------------------------------- */
  var sections = $$('main section[id]');
  var navLinks = $$('.nav a');

  /* ---------------------------------------------------------
     HERO 3D — progresso di scroll 0 -> 1
     Lo stage e' sticky dentro un blocco alto 260vh.
     Esposto in due modi:
       1) CSS custom property  --hero-progress  su .hero
       2) evento  'hero3d:progress'  (event.detail.progress)
     --------------------------------------------------------- */
  var hero = $('#hero');
  var stage = $('#hero3d');
  var lastProgress = -1;

  function updateHeroProgress() {
    if (!hero || !stage) return;
    var scrollable = hero.offsetHeight - window.innerHeight;
    if (scrollable <= 0) return;
    var p = Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / scrollable));
    if (Math.abs(p - lastProgress) < 0.001) return;
    lastProgress = p;
    hero.style.setProperty('--hero-progress', p.toFixed(4));
    stage.dispatchEvent(new CustomEvent('hero3d:progress', {
      detail: { progress: p },
      bubbles: true
    }));
  }

  /* ---------------------------------------------------------
     Un solo listener di scroll, throttled con rAF
     --------------------------------------------------------- */
  var ticking = false;

  function onFrame() {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 8);

    var y = window.scrollY + 140;
    var current = '';
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].offsetTop <= y) current = sections[i].id;
    }
    navLinks.forEach(function (a) {
      a.classList.toggle('is-active', a.getAttribute('href') === '#' + current);
    });

    updateHeroProgress();
    ticking = false;
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(onFrame);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onFrame();

  /* ---------------------------------------------------------
     Pricing: mensile / trimestrale
     --------------------------------------------------------- */
  var btnMonthly = $('#billMonthly');
  var btnQuarterly = $('#billQuarterly');
  var prices = $$('[data-price-monthly]');

  function setBilling(mode) {
    if (!btnMonthly || !btnQuarterly) return;
    var quarterly = mode === 'quarterly';
    btnMonthly.setAttribute('aria-pressed', String(!quarterly));
    btnQuarterly.setAttribute('aria-pressed', String(quarterly));
    prices.forEach(function (el) {
      el.textContent = el.getAttribute(quarterly ? 'data-price-quarterly' : 'data-price-monthly');
    });
  }

  if (btnMonthly && btnQuarterly) {
    btnMonthly.addEventListener('click', function () { setBilling('monthly'); });
    btnQuarterly.addEventListener('click', function () { setBilling('quarterly'); });
  }

  /* ---------------------------------------------------------
     Form — validazione con messaggi vicino al campo
     Nessun invio reale: collegare qui il proprio endpoint.
     --------------------------------------------------------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function setFieldError(fieldId, errorId, message) {
    var field = document.getElementById(fieldId);
    var error = document.getElementById(errorId);
    if (field) field.classList.toggle('field--error', Boolean(message));
    if (error) error.textContent = message || '';
  }

  function fakeSubmit(button, statusEl, okMessage) {
    var label = button ? button.textContent : '';
    if (button) { button.disabled = true; button.textContent = 'Invio in corso...'; }
    if (statusEl) statusEl.textContent = '';
    window.setTimeout(function () {
      if (button) { button.disabled = false; button.textContent = label; }
      if (statusEl) statusEl.textContent = okMessage;
    }, 700);
  }

  /* CTA finale */
  var ctaForm = $('#ctaForm');
  if (ctaForm) {
    ctaForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var nome = $('#nome');
      var email = $('#email');
      var privacy = $('#privacy');
      var status = $('#formStatus');
      var ok = true;

      if (!nome.value.trim()) { setFieldError('fieldNome', 'errNome', 'Inserisci il tuo nome.'); ok = false; }
      else setFieldError('fieldNome', 'errNome', '');

      if (!EMAIL_RE.test(email.value.trim())) { setFieldError('fieldEmail', 'errEmail', 'Inserisci un indirizzo email valido.'); ok = false; }
      else setFieldError('fieldEmail', 'errEmail', '');

      if (!privacy.checked) {
        if (status) status.textContent = 'Devi accettare l’informativa privacy per proseguire.';
        privacy.focus();
        return;
      }

      if (!ok) {
        var firstError = ctaForm.querySelector('.field--error input');
        if (firstError) firstError.focus();
        return;
      }

      fakeSubmit($('#ctaSubmit'), status, 'Richiesta registrata. Collega qui il tuo servizio di invio.');
      ctaForm.reset();
    });
  }

  /* Lead magnet + newsletter */
  function bindSimpleForm(formId, inputId, statusId, okMessage) {
    var form = document.getElementById(formId);
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = document.getElementById(inputId);
      var status = document.getElementById(statusId);
      if (!EMAIL_RE.test(input.value.trim())) {
        if (status) status.textContent = 'Inserisci un indirizzo email valido.';
        input.focus();
        return;
      }
      fakeSubmit(form.querySelector('button'), status, okMessage);
      form.reset();
    });
  }

  bindSimpleForm('leadForm', 'leadEmail', 'leadStatus', 'Fatto. Collega qui l’invio del PDF.');
  bindSimpleForm('newsForm', 'newsEmail', 'newsStatus', 'Iscrizione registrata. Collega qui il tuo servizio email.');

  /* ---------------------------------------------------------
     Anno corrente nel footer
     --------------------------------------------------------- */
  var year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
