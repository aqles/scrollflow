/**
 * ScrollFlow v3.0.0 — type definitions.
 * https://github.com/aqles/scrollflow
 */

export interface ScrollFlowOptions {
  /**
   * Which engine renders the effects. 'auto' (default) uses the native
   * CSS scroll-driven engine where the browser supports it and the
   * visitor has not requested reduced motion, the JS engine elsewhere.
   */
  engine?: 'auto' | 'native' | 'js';
  /** How much of an element must be visible before it reveals (0 to 1). Default 0.1. */
  revealThreshold?: number;
  /** IntersectionObserver root margin for reveals. Default "0px 0px -50px 0px". */
  rootMargin?: string;
  /** Fallback speed for parallax elements with no valid `data-sf-parallax` value. Default 0.5. */
  parallaxSpeed?: number;
  /** Show the reading progress bar. Default true. */
  progressBar?: boolean;
  /** Smooth anchor scrolling via CSS `scroll-behavior`. Default true. */
  smoothScroll?: boolean;
  /** Reveal each element once (JS engine). Default true. */
  once?: boolean;
  /** Reveal duration in ms; overrides the `--sf-duration` CSS variable. */
  duration?: number | null;
  /** Reveal easing; overrides the `--sf-easing` CSS variable. */
  easing?: string | null;
}

export default class ScrollFlow {
  constructor(options?: ScrollFlowOptions);

  /** The options in effect, merged over the defaults. */
  readonly options: Required<ScrollFlowOptions>;
  /** The engine this instance is running: 'native' or 'js'. */
  readonly engine: 'native' | 'js';
  /** True when the visitor's system requests reduced motion. */
  readonly reducedMotion: boolean;

  /** Re-scan the DOM for elements added after init. */
  refresh(): void;
  /** Remove everything this instance added: listeners, observer, bar, styles. */
  destroy(): void;

  /** Parallax offset for one element: (element centre − viewport centre) × −speed, capped at half the viewport. */
  static parallaxOffset(rectTop: number, rectHeight: number, viewportHeight: number, speed: number): number;
  /** Reading progress as a fraction between 0 and 1. */
  static progressFraction(scrollTop: number, scrollHeight: number, viewportHeight: number): number;
  /** Can this browser run the native (CSS scroll-driven) engine? */
  static supportsNative(): boolean;
  /** Translate an AOS animation name to the closest ScrollFlow one. */
  static mapAosAnimation(name: string): string;
  /** Translate an AOS easing name to CSS, or null when it is neither an AOS name nor a CSS easing. */
  static mapAosEasing(name: string): string | null;
}
