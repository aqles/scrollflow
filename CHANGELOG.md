# Changelog

All notable changes to ScrollFlow are recorded here.

## 2.0.0 — 2026-11-08

A full rewrite. The markup you already have keeps working; the behaviour underneath it is corrected.

### Fixed

- **Parallax** was calculated from the page's total scroll position, so an element far down the page could be thrown hundreds of pixels from where it belonged. It is now calculated from the element's own position against the centre of the viewport: offset zero at the centre, no jumps, no runaway elements. The distance is capped at half the viewport so distant elements saturate instead of flying away.
- **`data-sf-delay`** only worked for 100, 200, 300, 400, and 500, because the delays lived in CSS classes. Any number of milliseconds now works; the delay is applied by the library itself.
- **Progress bar** could produce `NaN` on pages too short to scroll. It now returns 0 there, and is drawn with `transform: scaleX()` instead of `width`, so updating it never triggers layout.
- The author line in the source header named the wrong author. It is aqles, as it should have been.

### Added

- `refresh()` — pick up elements added to the page after init.
- `destroy()` — disconnect the observer, remove the listeners and the progress bar, and undo the styles the instance set.
- `once` option (default `true`). Set it to `false` and elements hide again when they leave the viewport.
- `rootMargin`, `duration`, and `easing` options.
- Two more reveal animations: `fade-down` and `zoom-out`.
- ES module build (`dist/scrollflow.esm.js`) and CommonJS support, plus a minified build (`dist/scrollflow.min.js`). `package.json` included — ScrollFlow can be installed from npm.
- Reduced-motion support: with `prefers-reduced-motion`, everything is shown immediately and parallax and smooth scrolling stay off.
- No-JavaScript safety: hidden start states now only apply after the library adds an `sf-js` class to `<html>`, so content stays visible if the script never runs.
- Smoke tests (`npm test`) covering the parallax and progress maths and the constructor defaults.
- A real `LICENSE` file. Version 1.0.0 claimed MIT in the README but never shipped one.
- Standalone examples in `examples/`.

### Changed

- **Smooth scrolling no longer intercepts clicks.** Version 1.0.0 attached a handler to every anchor link and called `preventDefault()`, which broke URL history for those links. Version 2.0.0 sets CSS `scroll-behavior: smooth` on the page instead (the `sf-smooth` class) and leaves your links alone. This is a deliberate behaviour change: if you depended on the old handlers, you did not — they were a bug with good PR.
- Scroll and resize handling is throttled through `requestAnimationFrame`, with passive listeners.
- Reveal elements are unobserved after they reveal (with the default `once: true`) instead of being watched forever.
- Creating a second ScrollFlow instance no longer creates a second progress bar.
- The `dist/scrollflow.zip` download is gone. The dist files themselves, GitHub Releases, the CDN, and npm are the distribution now.
- The demo page was rebuilt: no more 507 KB hero image, glass panels, or gradient blobs.

### Repository

- The repository was renamed from `scroll-test` to `scrollflow`. Old links redirect.

## 1.0.0 — 2025-12-27

First release under the ScrollFlow name: reveal animations (fade-up, fade-in, slide-left, slide-right, zoom-in), parallax, reading progress bar, smooth scrolling for anchors, `data-auto-init`, and a demo page. The project began in 2021 as a set of scroll experiments (`gulung.js`).
