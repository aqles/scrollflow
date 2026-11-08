/**
 * ScrollFlow v2.0.0
 * A lightweight, zero-dependency library for scroll interactions:
 * reveal on scroll, parallax, and a reading progress bar.
 *
 * (c) 2021-2026 aqles — MIT License
 * https://github.com/aqles/scrollflow
 */
class ScrollFlow {
  constructor(options = {}) {
    this.options = Object.assign({
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

  init() {
    const doc = document;
    doc.documentElement.classList.add('sf-js');

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

    window.addEventListener('scroll', this._onScroll, { passive: true });
    window.addEventListener('resize', this._onScroll, { passive: true });
    this._applyScroll();
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
    const els = Array.from(document.querySelectorAll('[data-sf-reveal]'));
    this._revealEls = els;
    for (const el of els) this._prepareReveal(el);

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

  _prepareReveal(el) {
    const delay = parseFloat(el.getAttribute('data-sf-delay'));
    if (!Number.isNaN(delay) && delay >= 0) {
      el.style.transitionDelay = `${delay}ms`;
    }
  }

  _collectParallax() {
    if (this.reducedMotion) {
      this._parallaxEls = [];
      return;
    }
    this._parallaxEls = Array.from(document.querySelectorAll('[data-sf-parallax]'));
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
    if (this._destroyed) return;

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
    for (const el of document.querySelectorAll('[data-sf-reveal]')) {
      if (!this._revealEls.includes(el)) this._revealEls.push(el);
      this._prepareReveal(el);
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
    }
    for (const el of this._parallaxEls) {
      el.style.transform = '';
      el._sfOffset = 0;
    }
    document.documentElement.classList.remove('sf-smooth');
  }
}

// Auto-initialize when the classic script tag carries data-auto-init.
if (typeof document !== 'undefined' && document.currentScript &&
    document.currentScript.hasAttribute('data-auto-init')) {
  document.addEventListener('DOMContentLoaded', () => {
    window.scrollFlow = new ScrollFlow();
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ScrollFlow;
}
if (typeof window !== 'undefined') {
  window.ScrollFlow = ScrollFlow;
}

export default ScrollFlow;
