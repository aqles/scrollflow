/**
 * ScrollFlow v3.0.0
 * A lightweight, zero-dependency library for scroll interactions:
 * reveal on scroll, parallax, and a reading progress bar.
 *
 * Two engines, one markup: where the browser supports CSS scroll-driven
 * animations the effects run on the compositor with no per-frame JS;
 * everywhere else the IntersectionObserver engine from v2 takes over.
 * AOS markup (data-aos and friends) is understood in both engines.
 *
 * (c) 2021-2026 aqles — MIT License
 * https://github.com/aqles/scrollflow
 */

// AOS animation names we translate, where a lookup is enough. Anything
// starting with zoom-in / zoom-out / slide- / flip- is handled by prefix
// in mapAosAnimation; everything unknown lands on fade-in.
const AOS_ANIMATIONS = {
  'fade': 'fade-in',
  'fade-up': 'fade-up',
  'fade-down': 'fade-down',
  'fade-left': 'slide-right', // AOS fade-left starts offset +X, entering from the right
  'fade-right': 'slide-left',
  'fade-up-left': 'fade-up',
  'fade-up-right': 'fade-up',
  'fade-down-left': 'fade-down',
  'fade-down-right': 'fade-down',
  'zoom-in': 'zoom-in',
  'zoom-out': 'zoom-out'
};

// AOS easing names that are not plain CSS, with their cubic-bezier values.
const AOS_EASINGS = {
  'ease-in-sine': 'cubic-bezier(0.12, 0, 0.39, 0)',
  'ease-out-sine': 'cubic-bezier(0.61, 1, 0.88, 1)',
  'ease-in-out-sine': 'cubic-bezier(0.37, 0, 0.63, 1)',
  'ease-in-quad': 'cubic-bezier(0.11, 0, 0.5, 0)',
  'ease-out-quad': 'cubic-bezier(0.5, 1, 0.89, 1)',
  'ease-in-out-quad': 'cubic-bezier(0.45, 0, 0.55, 1)',
  'ease-in-cubic': 'cubic-bezier(0.32, 0, 0.67, 0)',
  'ease-out-cubic': 'cubic-bezier(0.33, 1, 0.68, 1)',
  'ease-in-out-cubic': 'cubic-bezier(0.65, 0, 0.35, 1)',
  'ease-in-quart': 'cubic-bezier(0.5, 0, 0.75, 0)',
  'ease-out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
  'ease-in-out-quart': 'cubic-bezier(0.76, 0, 0.24, 1)',
  'ease-in-back': 'cubic-bezier(0.36, 0, 0.66, -0.56)',
  'ease-out-back': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  'ease-in-out-back': 'cubic-bezier(0.68, -0.6, 0.32, 1.6)'
};

const REVEAL_SELECTOR = '[data-sf-reveal], [data-aos]';

class ScrollFlow {
  constructor(options = {}) {
    this.options = Object.assign({
      engine: 'auto',
      revealThreshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
      parallaxSpeed: 0.5,
      progressBar: true,
      smoothScroll: true,
      once: true,
      duration: null,
      easing: null
    }, options);

    this._observed = new Set();
    this._revealEls = [];
    this._parallaxEls = [];
    this._observer = null;
    this._progressBar = null;
    this._progressIndicator = null;
    this._progressCreated = false;
    this._rafId = null;
    this._destroyed = false;
    this.reducedMotion = typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 'auto' picks the native engine when the browser can run it and the
    // visitor has not asked for reduced motion; 'native' forces it.
    const requested = this.options.engine;
    this.engine = 'js';
    if (requested === 'native') {
      this.engine = 'native';
    } else if (requested !== 'js' && !this.reducedMotion && ScrollFlow.supportsNative()) {
      this.engine = 'native';
    }

    this._onScroll = () => this._requestUpdate();
    this._update = () => {
      this._rafId = null;
      this._applyScroll();
    };

    this.init();
  }

  /**
   * Parallax offset for one element.
   * Formula: offset = (element centre - viewport centre) * -speed.
   * An element exactly at the centre gets 0; elements above and below
   * the centre get opposite offsets, so a positive speed makes the
   * element lag behind the scroll instead of racing ahead of it.
   * The centre distance is capped at half the viewport: elements far
   * off-screen saturate instead of being flung away from their slot,
   * and the offset is unchanged while an element is actually visible.
   */
  static parallaxOffset(rectTop, rectHeight, viewportHeight, speed) {
    const half = viewportHeight / 2;
    const distance = Math.max(-half, Math.min(half, rectTop + rectHeight / 2 - half));
    const offset = distance * -speed;
    return offset === 0 ? 0 : offset; // normalise -0
  }

  /** Reading progress as a fraction between 0 and 1. */
  static progressFraction(scrollTop, scrollHeight, viewportHeight) {
    const scrollable = scrollHeight - viewportHeight;
    if (scrollable <= 0) return 0;
    return Math.min(1, Math.max(0, scrollTop / scrollable));
  }

  /** Can this browser run the native (CSS scroll-driven) engine? */
  static supportsNative() {
    return typeof CSS !== 'undefined' && typeof CSS.supports === 'function' &&
      CSS.supports('animation-timeline: view()');
  }

  /**
   * Translate an AOS animation name to the closest ScrollFlow one.
   * AOS-only shapes collapse onto their nearest neighbour: diagonal
   * fades become straight fades, slides and flips become fade-up /
   * fade-in. Unknown names get fade-in.
   */
  static mapAosAnimation(name) {
    const key = String(name == null ? '' : name).trim().toLowerCase();
    if (AOS_ANIMATIONS[key]) return AOS_ANIMATIONS[key];
    if (key.startsWith('zoom-in')) return 'zoom-in';
    if (key.startsWith('zoom-out')) return 'zoom-out';
    if (key.startsWith('slide-')) return 'fade-up';
    if (key.startsWith('flip-')) return 'fade-in';
    return 'fade-in';
  }

  /**
   * Translate an easing value from AOS markup. AOS compound names
   * (ease-out-back and friends) become cubic-bezier curves; anything
   * that is already a CSS easing passes through; anything else is
   * rejected with null so the caller can ignore it.
   */
  static mapAosEasing(name) {
    if (typeof name !== 'string') return null;
    const key = name.trim().toLowerCase();
    if (AOS_EASINGS[key]) return AOS_EASINGS[key];
    if (key === 'ease' || key === 'linear' || key === 'ease-in' ||
        key === 'ease-out' || key === 'ease-in-out' ||
        key === 'step-start' || key === 'step-end' || key.includes('(')) {
      return name.trim();
    }
    return null;
  }

  init() {
    const doc = document;
    doc.documentElement.classList.add('sf-js');
    if (this.engine === 'native') doc.documentElement.classList.add('sf-native');

    if (this.options.duration != null) {
      doc.documentElement.style.setProperty('--sf-duration', `${this.options.duration}ms`);
    }
    if (this.options.easing != null) {
      doc.documentElement.style.setProperty('--sf-easing', this.options.easing);
    }

    if (this.options.smoothScroll && !this.reducedMotion) {
      doc.documentElement.classList.add('sf-smooth');
    }

    if (this.options.progressBar) this._createProgressBar();

    this._initReveal();
    this._collectParallax();

    // In native mode CSS owns the scroll work; JS only built the DOM.
    if (this.engine !== 'native') {
      window.addEventListener('scroll', this._onScroll, { passive: true });
      window.addEventListener('resize', this._onScroll, { passive: true });
      this._applyScroll();
    }
  }

  _createProgressBar() {
    const existing = document.querySelector('.sf-progress-bar');
    if (existing) {
      this._progressBar = existing;
      this._progressIndicator = existing.querySelector('.sf-progress-indicator');
      return;
    }
    const bar = document.createElement('div');
    bar.className = 'sf-progress-bar';
    bar.setAttribute('aria-hidden', 'true');
    const indicator = document.createElement('div');
    indicator.className = 'sf-progress-indicator';
    bar.appendChild(indicator);
    document.body.prepend(bar);
    this._progressBar = bar;
    this._progressIndicator = indicator;
    this._progressCreated = true;
  }

  _initReveal() {
    const els = Array.from(document.querySelectorAll(REVEAL_SELECTOR));
    this._revealEls = els;
    for (const el of els) this._prepareReveal(el);

    if (this.engine === 'native') return; // CSS animations do the rest

    if (this.reducedMotion || typeof IntersectionObserver !== 'function') {
      for (const el of els) el.classList.add('sf-visible');
      return;
    }

    this._observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('sf-visible');
          if (this.options.once) {
            this._observer.unobserve(entry.target);
            this._observed.delete(entry.target);
          }
        } else if (!this.options.once) {
          entry.target.classList.remove('sf-visible');
        }
      }
    }, { threshold: this.options.revealThreshold, rootMargin: this.options.rootMargin });

    for (const el of els) {
      this._observer.observe(el);
      this._observed.add(el);
    }
  }

  /** First of several attributes holding a usable non-negative number. */
  _numAttr(el, ...names) {
    for (const name of names) {
      const raw = el.getAttribute(name);
      if (raw === null) continue;
      const value = parseFloat(raw);
      if (!Number.isNaN(value) && value >= 0) return value;
    }
    return null;
  }

  /**
   * One prep pass per reveal element, shared by both engines.
   * Normalises AOS markup (the mapped name is written back to
   * data-sf-reveal so the CSS selectors match), resolves delay,
   * duration and easing from data-sf-* first, data-aos-* second, then
   * applies them in the shape the active engine understands: inline
   * transition values for the JS engine, an animation-range entry
   * offset for the native one.
   */
  _prepareReveal(el) {
    if (!el.hasAttribute('data-sf-reveal')) {
      const aos = el.getAttribute('data-aos');
      if (aos !== null) el.setAttribute('data-sf-reveal', ScrollFlow.mapAosAnimation(aos));
    }

    const delay = this._numAttr(el, 'data-sf-delay', 'data-aos-delay');

    if (this.engine === 'native') {
      // Native delay is not a clock, it is a position: the reveal
      // starts partway through the element's entry instead of at 0%.
      if (delay !== null && delay > 0) {
        const start = Math.min(45, Math.round(delay / 20));
        el.style.animationRange = `entry ${start}% entry 100%`;
      }
      return;
    }

    const duration = this._numAttr(el, 'data-sf-duration', 'data-aos-duration');
    const easingRaw = el.getAttribute('data-sf-easing') ?? el.getAttribute('data-aos-easing');
    const easing = easingRaw === null ? null : ScrollFlow.mapAosEasing(easingRaw);

    if (delay !== null) el.style.transitionDelay = `${delay}ms`;
    if (duration !== null) el.style.transitionDuration = `${duration}ms`;
    if (easing !== null) el.style.transitionTimingFunction = easing;
  }

  _collectParallax() {
    if (this.reducedMotion) {
      this._parallaxEls = [];
      return;
    }
    this._parallaxEls = Array.from(document.querySelectorAll('[data-sf-parallax]'));

    if (this.engine === 'native') {
      // The native keyframes travel from -(--sf-pd) to +(--sf-pd) over
      // the element's whole pass through the viewport, which approximates
      // the JS formula with a total travel of speed * half the viewport.
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      for (const el of this._parallaxEls) {
        const parsed = parseFloat(el.getAttribute('data-sf-parallax'));
        const speed = Number.isNaN(parsed) ? this.options.parallaxSpeed : parsed;
        el.style.setProperty('--sf-pd', `${Math.round(speed * viewportHeight * 0.25)}px`);
      }
    }
  }

  _requestUpdate() {
    if (this._destroyed || this._rafId != null) return;
    if (typeof requestAnimationFrame === 'function') {
      this._rafId = requestAnimationFrame(this._update);
    } else {
      this._applyScroll();
    }
  }

  _applyScroll() {
    if (this._destroyed || this.engine === 'native') return;

    if (this._progressIndicator) {
      const doc = document.documentElement;
      const fraction = ScrollFlow.progressFraction(
        window.pageYOffset || doc.scrollTop || 0,
        doc.scrollHeight || 0,
        window.innerHeight || doc.clientHeight || 0
      );
      this._progressIndicator.style.transform = `scaleX(${fraction})`;
    }

    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    for (const el of this._parallaxEls) {
      const parsed = parseFloat(el.getAttribute('data-sf-parallax'));
      const speed = Number.isNaN(parsed) ? this.options.parallaxSpeed : parsed;
      const rect = el.getBoundingClientRect();
      // getBoundingClientRect includes the transform we already applied;
      // subtract it so the offset is computed from the natural position.
      const prev = el._sfOffset || 0;
      const offset = ScrollFlow.parallaxOffset(rect.top - prev, rect.height, viewportHeight, speed);
      el._sfOffset = offset;
      el.style.transform = `translate3d(0, ${offset}px, 0)`;
    }
  }

  /** Re-scan the DOM for elements added after init. Safe to call any time. */
  refresh() {
    if (this._destroyed) return;
    for (const el of document.querySelectorAll(REVEAL_SELECTOR)) {
      if (!this._revealEls.includes(el)) this._revealEls.push(el);
      this._prepareReveal(el);
      if (this.engine === 'native') continue;
      if (this.reducedMotion || typeof IntersectionObserver !== 'function') {
        el.classList.add('sf-visible');
      } else if (this._observer && !this._observed.has(el) && !el.classList.contains('sf-visible')) {
        this._observer.observe(el);
        this._observed.add(el);
      }
    }
    this._collectParallax();
    this._applyScroll();
  }

  /** Remove everything this instance added: listeners, observer, bar, styles. */
  destroy() {
    this._destroyed = true;
    window.removeEventListener('scroll', this._onScroll);
    window.removeEventListener('resize', this._onScroll);
    if (this._rafId != null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
    if (this._progressBar && this._progressCreated) {
      this._progressBar.remove();
    }
    this._progressBar = null;
    this._progressIndicator = null;
    for (const el of this._revealEls) {
      el.classList.remove('sf-visible');
      el.style.transitionDelay = '';
      el.style.transitionDuration = '';
      el.style.transitionTimingFunction = '';
      el.style.animationRange = '';
    }
    for (const el of this._parallaxEls) {
      el.style.transform = '';
      if (el.style.removeProperty) el.style.removeProperty('--sf-pd');
      el._sfOffset = 0;
    }
    document.documentElement.classList.remove('sf-smooth');
    document.documentElement.classList.remove('sf-native');
  }
}

// Auto-initialize when the classic script tag carries data-auto-init.
// The script element is captured now: document.currentScript is long
// gone by the time DOMContentLoaded fires.
const autoInitScript = typeof document !== 'undefined' && document.currentScript &&
  document.currentScript.hasAttribute('data-auto-init') ? document.currentScript : null;
if (autoInitScript) {
  document.addEventListener('DOMContentLoaded', () => {
    const engine = autoInitScript.getAttribute('data-sf-engine');
    window.scrollFlow = new ScrollFlow(engine ? { engine } : {});
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ScrollFlow;
}
if (typeof window !== 'undefined') {
  window.ScrollFlow = ScrollFlow;
}
