# Changelog

All notable changes to ScrollFlow are recorded here.

## 3.0.0 — 2026-11-08

Two engines and a way in for AOS users. The markup from v2 keeps working unchanged.

### Added

- **Native engine.** Where the browser supports CSS scroll-driven animations (Chrome/Edge 115+, Safari 26+), reveals, parallax, and the progress bar now run as `animation-timeline` animations on the compositor — no per-frame JavaScript. The v2 IntersectionObserver engine remains as the fallback everywhere else (Firefox today). Pick with the new `engine` option (`'auto'`, `'native'`, `'js'`; default `'auto'`), or `data-sf-engine` on the auto-init script tag. The active engine is visible as the `sf-native` class on `<html>`, and `ScrollFlow.supportsNative()` reports support. Native animations are scroll-linked — they progress and reverse with your scroll — so `once`, `duration`, and `easing` remain JS-engine concepts there; a native `data-sf-delay` becomes an entry-range offset instead of a wait. All of this is spelled out in the README's "Two engines" section.
- **AOS compatibility.** Elements marked up with `data-aos`, `data-aos-delay`, `data-aos-duration`, and `data-aos-easing` work as they are: the animation name is translated to the closest ScrollFlow one (`fade-left` → `slide-right`, diagonals collapse to straight fades, `flip-*` → `fade-in`, `slide-*` → `fade-up`) and written back as `data-sf-reveal`; AOS easing names are translated to cubic-bezier values. The translation table is public as `ScrollFlow.mapAosAnimation()` / `ScrollFlow.mapAosEasing()`.
- **`scrollflow migrate` command.** A zero-dependency CLI shipped in the package: it rewrites AOS markup to `data-sf-*` attributes across `.html`/`.jsx`/`.tsx`/`.vue`/`.php` files, swaps AOS CDN links and imports, turns `AOS.init(` into `new ScrollFlow(`, and removes attributes that are constructor options in ScrollFlow — dry-run by default, `--write` to apply.
- **Per-element `data-sf-duration` and `data-sf-easing`** for the JS engine, joining `data-sf-delay`.
- **TypeScript definitions** (`scrollflow.d.ts`), covering the options (including `engine`), `refresh()`/`destroy()`, and the static helpers.

### Changed

- The library grew: 3,928 bytes gzipped in total (2,598 JS + 1,330 CSS), up from 2,400 in v2. The second engine and the AOS translation layer are where the bytes went.
- `destroy()` also removes the `sf-native` class and the inline styles the v3 prep pass sets.

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
