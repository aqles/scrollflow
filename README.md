# ScrollFlow

ScrollFlow is a tiny JavaScript library for the scroll effects most sites actually need: elements that reveal as they enter the viewport, a bit of parallax, smooth anchor scrolling, and a reading progress bar. Nothing else. No dependencies, no build step, works from a plain script tag.

**Live demo:** https://aqles.github.io/scrollflow/
**Repository:** https://github.com/aqles/scrollflow

Size, measured on the v2.0.0 dist files with `gzip -c`: **2,400 bytes gzipped in total** — 1,640 bytes for the minified JS and 760 bytes for the CSS.

## Features

- Reveal animations on scroll, powered by IntersectionObserver: fade, slide, and zoom in seven flavours.
- Parallax calculated from each element's own position, so elements behave the same wherever they sit on the page.
- Reading progress bar, flat colour, driven by `transform` so it never triggers layout.
- Any delay you like, in milliseconds — not a fixed menu of steps.
- Respects `prefers-reduced-motion`: content appears straight away, parallax and smooth scrolling switch off.
- Safe without JavaScript: elements are only hidden once the library has actually started, so a failed script never blanks your page.
- `refresh()` for content added later, `destroy()` to remove everything again.
- Ships as a classic script, a CommonJS module, and an ES module.

## Install

### CDN

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/aqles/scrollflow@2.0.0/dist/scrollflow.css">
<script src="https://cdn.jsdelivr.net/gh/aqles/scrollflow@2.0.0/dist/scrollflow.min.js" data-auto-init></script>
```

The `data-auto-init` attribute starts ScrollFlow with the default options as soon as the page is ready. That is all most sites need.

### npm

```bash
npm install @aqles/scrollflow
```

```js
import ScrollFlow from '@aqles/scrollflow';
import '@aqles/scrollflow/dist/scrollflow.css';

new ScrollFlow();
```

### Plain files

Download `dist/scrollflow.js` (or `scrollflow.min.js`) and `dist/scrollflow.css` from this repository, put them next to your pages, and include them like the CDN snippet above.

## Quick start

```html
<link rel="stylesheet" href="scrollflow.css">
<script src="scrollflow.js" data-auto-init></script>

<h2 data-sf-reveal="fade-up">I fade up into view</h2>
<p data-sf-reveal="fade-up" data-sf-delay="150">I follow 150 ms later</p>
<div data-sf-parallax="0.2">I drift gently against the scroll</div>
```

Prefer to start it yourself, with options?

```js
const flow = new ScrollFlow({
  revealThreshold: 0.2,
  progressBar: true,
  once: true
});

// Later, after adding content to the page:
flow.refresh();

// When the page (or component) goes away:
flow.destroy();
```

## Reveal animations

Add `data-sf-reveal` to any element:

| Value         | Effect                    |
| ------------- | ------------------------- |
| `fade-in`     | Fades in                  |
| `fade-up`     | Fades in, moving up       |
| `fade-down`   | Fades in, moving down     |
| `slide-left`  | Slides in from the left   |
| `slide-right` | Slides in from the right  |
| `zoom-in`     | Scales up from 95%        |
| `zoom-out`    | Scales down from 105%     |

Add `data-sf-delay` with any number of milliseconds to stagger elements:

```html
<div data-sf-reveal="fade-up" data-sf-delay="275">275 ms — yes, that exact number works.</div>
```

Change the feel for the whole page with two CSS variables:

```css
:root {
  --sf-duration: 600ms;
  --sf-easing: cubic-bezier(0.25, 1, 0.5, 1);
  --sf-progress-color: #2c3620;
  --sf-progress-height: 4px;
}
```

## Parallax

Add `data-sf-parallax` with a speed:

```html
<div data-sf-parallax="0.3">Slower drift</div>
<div data-sf-parallax="0.1">Subtle drift</div>
```

How it works, in one line: the offset is *(the element's centre minus the viewport's centre) × −speed*, so an element sitting exactly at the centre of the screen has an offset of zero and nothing ever jumps. The distance is capped at half the viewport, so elements far off-screen wait at a fixed offset instead of being flung away.

One warning: a parallax element moves. Give its parent extra room — a taller background layer, a section with overflow hidden — or the element can overlap its neighbours at the extremes.

## Progress bar

On by default. It is a fixed bar at the very top of the page that fills as the reader scrolls. Turn it off with `progressBar: false`, restyle it with `--sf-progress-color` and `--sf-progress-height` above. If two ScrollFlow instances run on one page, they share a single bar.

## Options

| Option           | Default                | What it does                                                                 |
| ---------------- | ---------------------- | ---------------------------------------------------------------------------- |
| `revealThreshold` | `0.1`                 | How much of an element must be visible before it reveals (0 to 1).           |
| `rootMargin`      | `"0px 0px -50px 0px"` | IntersectionObserver root margin for reveals.                                |
| `parallaxSpeed`   | `0.5`                 | Fallback speed for parallax elements with no valid `data-sf-parallax` value. |
| `progressBar`     | `true`                | Show the reading progress bar.                                               |
| `smoothScroll`    | `true`                | Smooth anchor scrolling, done with CSS `scroll-behavior`. ScrollFlow never intercepts clicks, so browser history and the back button keep working. |
| `once`            | `true`                | Reveal each element once, then stop watching it. With `false`, elements hide again when they leave the viewport. |
| `duration`        | `null`                | Reveal duration in ms; overrides `--sf-duration` when set.                   |
| `easing`          | `null`                | Reveal easing; overrides `--sf-easing` when set.                             |

## Methods

| Method      | What it does                                                                                          |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| `refresh()` | Re-scan the page and start watching any matching elements added since init.                            |
| `destroy()` | Disconnect the observer, remove the scroll/resize listeners and the progress bar, and undo the inline styles this instance set. |

## Accessibility

- If the visitor's system requests reduced motion, ScrollFlow shows every element immediately and disables parallax and smooth scrolling. The CSS does the same on its own via a `prefers-reduced-motion` media query.
- Hidden start states only apply once the library has added an `sf-js` class to the `<html>` element. If the script fails to load, or JavaScript is off, your content is simply visible. No snippet needed on your side.
- The progress bar is decorative and is created with `aria-hidden="true"`.

## Browser support

Any browser with IntersectionObserver and ES6 classes — in practice, every browser released since roughly 2017. On a browser without IntersectionObserver, ScrollFlow shows all elements immediately instead of animating them.

## Examples

Standalone pages you can open in a browser, in the [`examples/`](examples/) folder:

- [`reveal.html`](examples/reveal.html) — every reveal animation, with delays.
- [`parallax.html`](examples/parallax.html) — elements drifting at different speeds.
- [`progress-and-smooth.html`](examples/progress-and-smooth.html) — a long article with the progress bar and smooth anchor links.

## Contributing

Small is the point of this project, so contributions that keep it small are the most welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE). Use it anywhere, including commercial projects.

---

*This project was previously published under the repository name `scroll-test`; old links redirect to `scrollflow`.*
