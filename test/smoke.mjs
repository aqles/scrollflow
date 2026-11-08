#!/usr/bin/env node
/**
 * Smoke tests for ScrollFlow. No test framework, no jsdom:
 * just enough DOM stubs for the class to construct, plus
 * assertions on the two pure helpers the library is built on.
 * Run with: npm test  (build first with: npm run build)
 */
import assert from 'node:assert/strict';

// ---------- minimal DOM stubs (must exist before importing the library) ----------
function makeClassList() {
  const set = new Set();
  return {
    add: (...names) => names.forEach((n) => set.add(n)),
    remove: (...names) => names.forEach((n) => set.delete(n)),
    contains: (n) => set.has(n)
  };
}
function makeStyle() {
  const style = { setProperty() {} };
  return style;
}
function makeElement() {
  return {
    classList: makeClassList(),
    style: makeStyle(),
    className: '',
    children: [],
    setAttribute() {},
    getAttribute() { return null; },
    appendChild(child) { this.children.push(child); },
    prepend() {},
    remove() {},
    querySelector() { return makeElement(); },
    getBoundingClientRect() { return { top: 0, height: 0 }; }
  };
}

const documentElement = makeElement();
documentElement.scrollTop = 0;
documentElement.scrollHeight = 0;
documentElement.clientHeight = 800;

globalThis.window = globalThis;
globalThis.innerHeight = 800;
globalThis.pageYOffset = 0;
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.matchMedia = () => ({ matches: false });
globalThis.requestAnimationFrame = (cb) => { cb(); return 1; };
globalThis.cancelAnimationFrame = () => {};
globalThis.IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
globalThis.document = {
  documentElement,
  body: makeElement(),
  currentScript: null,
  createElement: () => makeElement(),
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {}
};

const { default: ScrollFlow } = await import('../dist/scrollflow.esm.js');

// ---------- parallaxOffset ----------
assert.equal(ScrollFlow.parallaxOffset(300, 200, 800, 0.5), 0, 'element at viewport centre => 0 offset');
assert.equal(ScrollFlow.parallaxOffset(0, 200, 800, 0.5), 150, 'element above centre => positive offset');
assert.equal(ScrollFlow.parallaxOffset(600, 200, 800, 0.5), -150, 'element below centre => opposite sign');
assert.equal(ScrollFlow.parallaxOffset(600, 200, 800, 0.25), -75, 'offset scales with speed');
assert.equal(ScrollFlow.parallaxOffset(600, 200, 800, 0), 0, 'speed 0 => no movement');
assert.equal(ScrollFlow.parallaxOffset(5000, 200, 800, 0.5), -200, 'far below: distance capped at half the viewport');
assert.equal(ScrollFlow.parallaxOffset(-5000, 200, 800, 0.5), 200, 'far above: capped the other way');

// ---------- progressFraction ----------
assert.equal(ScrollFlow.progressFraction(0, 1000, 200), 0);
assert.equal(ScrollFlow.progressFraction(400, 1000, 200), 0.5);
assert.equal(ScrollFlow.progressFraction(800, 1000, 200), 1);
assert.equal(ScrollFlow.progressFraction(9999, 1000, 200), 1, 'clamps at 1');
assert.equal(ScrollFlow.progressFraction(-50, 1000, 200), 0, 'clamps at 0');
assert.equal(ScrollFlow.progressFraction(10, 500, 500), 0, 'nothing scrollable => 0');
assert.equal(ScrollFlow.progressFraction(10, 0, 0), 0, 'zero-height page => 0, never NaN');

// ---------- constructor defaults ----------
const sf = new ScrollFlow({ progressBar: false, smoothScroll: false });
assert.equal(sf.options.revealThreshold, 0.1);
assert.equal(sf.options.rootMargin, '0px 0px -50px 0px');
assert.equal(sf.options.parallaxSpeed, 0.5);
assert.equal(sf.options.once, true);
assert.equal(sf.options.progressBar, false);
assert.equal(typeof sf.refresh, 'function');
assert.equal(typeof sf.destroy, 'function');
sf.refresh();
sf.destroy();

const sf2 = new ScrollFlow();
assert.equal(sf2.options.progressBar, true, 'progress bar on by default');
assert.equal(sf2.options.smoothScroll, true, 'smooth scroll on by default');
sf2.destroy();

// ---------- v3: defaults ----------
const sf3 = new ScrollFlow({ progressBar: false });
assert.equal(sf3.options.engine, 'auto', 'engine defaults to auto');
assert.equal(sf3.engine, 'js', 'no CSS global in Node => JS engine');
sf3.destroy();

// ---------- mapAosAnimation ----------
assert.equal(ScrollFlow.mapAosAnimation('fade'), 'fade-in');
assert.equal(ScrollFlow.mapAosAnimation('fade-up'), 'fade-up');
assert.equal(ScrollFlow.mapAosAnimation('fade-down'), 'fade-down');
assert.equal(ScrollFlow.mapAosAnimation('fade-left'), 'slide-right', 'AOS fade-left enters from the right');
assert.equal(ScrollFlow.mapAosAnimation('fade-right'), 'slide-left');
assert.equal(ScrollFlow.mapAosAnimation('fade-up-left'), 'fade-up');
assert.equal(ScrollFlow.mapAosAnimation('fade-up-right'), 'fade-up');
assert.equal(ScrollFlow.mapAosAnimation('fade-down-left'), 'fade-down');
assert.equal(ScrollFlow.mapAosAnimation('fade-down-right'), 'fade-down');
assert.equal(ScrollFlow.mapAosAnimation('zoom-in'), 'zoom-in');
assert.equal(ScrollFlow.mapAosAnimation('zoom-in-up'), 'zoom-in');
assert.equal(ScrollFlow.mapAosAnimation('zoom-out-down'), 'zoom-out');
assert.equal(ScrollFlow.mapAosAnimation('slide-up'), 'fade-up');
assert.equal(ScrollFlow.mapAosAnimation('slide-left'), 'fade-up');
assert.equal(ScrollFlow.mapAosAnimation('flip-left'), 'fade-in');
assert.equal(ScrollFlow.mapAosAnimation('flip-up'), 'fade-in');
assert.equal(ScrollFlow.mapAosAnimation('spin-somehow'), 'fade-in', 'unknown names fall back to fade-in');
assert.equal(ScrollFlow.mapAosAnimation(''), 'fade-in');
assert.equal(ScrollFlow.mapAosAnimation(null), 'fade-in');
assert.equal(ScrollFlow.mapAosAnimation(' Fade-Up '), 'fade-up', 'names are trimmed and lowercased');

// ---------- mapAosEasing ----------
assert.equal(ScrollFlow.mapAosEasing('ease-out-back'), 'cubic-bezier(0.34, 1.56, 0.64, 1)');
assert.equal(ScrollFlow.mapAosEasing('ease-in-quad'), 'cubic-bezier(0.11, 0, 0.5, 0)');
assert.equal(ScrollFlow.mapAosEasing('ease'), 'ease', 'plain CSS easings pass through');
assert.equal(ScrollFlow.mapAosEasing('ease-in-out'), 'ease-in-out');
assert.equal(ScrollFlow.mapAosEasing('cubic-bezier(0.1, 0.2, 0.3, 0.4)'), 'cubic-bezier(0.1, 0.2, 0.3, 0.4)');
assert.equal(ScrollFlow.mapAosEasing('not-an-easing'), null, 'junk is rejected');
assert.equal(ScrollFlow.mapAosEasing(42), null);

// ---------- supportsNative + engine resolution ----------
assert.equal(typeof ScrollFlow.supportsNative(), 'boolean');
assert.equal(ScrollFlow.supportsNative(), false, 'no CSS global => not native');
globalThis.CSS = { supports: (prop) => prop.includes('animation-timeline') };
assert.equal(ScrollFlow.supportsNative(), true, 'stubbed CSS.supports => native available');
const sfNative = new ScrollFlow({ progressBar: false });
assert.equal(sfNative.engine, 'native', 'auto picks native when supported');
sfNative.destroy();
const sfForcedJs = new ScrollFlow({ progressBar: false, engine: 'js' });
assert.equal(sfForcedJs.engine, 'js', 'engine: "js" wins over auto');
sfForcedJs.destroy();
delete globalThis.CSS;
assert.equal(ScrollFlow.supportsNative(), false, 'stub removed => back to false');

// ---------- AOS markup prep (JS engine) ----------
function makeAttrElement(attrs) {
  const map = new Map(Object.entries(attrs));
  return {
    classList: makeClassList(),
    style: { setProperty() {}, removeProperty() {} },
    className: '',
    children: [],
    setAttribute(name, value) { map.set(name, String(value)); },
    getAttribute(name) { return map.has(name) ? map.get(name) : null; },
    hasAttribute(name) { return map.has(name); },
    appendChild(child) { this.children.push(child); },
    prepend() {},
    remove() {},
    querySelector() { return makeElement(); },
    getBoundingClientRect() { return { top: 0, height: 0 }; }
  };
}

const aosEl = makeAttrElement({
  'data-aos': 'fade-left',
  'data-aos-delay': '150',
  'data-aos-duration': '600',
  'data-aos-easing': 'ease-out-back'
});
const originalQueryAll = globalThis.document.querySelectorAll;
globalThis.document.querySelectorAll = (selector) =>
  selector.includes('data-aos') ? [aosEl] : [];
const sfAos = new ScrollFlow({ progressBar: false });
assert.equal(aosEl.getAttribute('data-sf-reveal'), 'slide-right', 'prep writes the mapped name back to data-sf-reveal');
assert.equal(aosEl.style.transitionDelay, '150ms', 'data-aos-delay becomes the transition delay');
assert.equal(aosEl.style.transitionDuration, '600ms', 'data-aos-duration becomes the transition duration');
assert.equal(aosEl.style.transitionTimingFunction, 'cubic-bezier(0.34, 1.56, 0.64, 1)', 'data-aos-easing is translated');
sfAos.refresh();
sfAos.destroy();
globalThis.document.querySelectorAll = originalQueryAll;

// ---------- migrate CLI ----------
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const cliPath = fileURLToPath(new URL('../bin/scrollflow.mjs', import.meta.url));
const fixtureDir = mkdtempSync(join(tmpdir(), 'scrollflow-migrate-'));
const fixtureHtml = `<!DOCTYPE html>
<html>
<head>
  <link href="https://unpkg.com/aos@2.3.1/dist/aos.css" rel="stylesheet">
</head>
<body>
  <h2 data-aos="fade-up" data-aos-delay="150">Hello</h2>
  <div data-aos="fade-left" data-aos-duration="600" data-aos-once="true" data-aos-offset="120">Side</div>
  <script src="https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.js"></script>
  <script>AOS.init({ once: true });</script>
</body>
</html>
`;
const fixtureJsx = `import AOS from 'aos';
import 'aos/dist/aos.css';
export const Card = () => <div data-aos="zoom-in" data-aos-easing="ease-out-back">x</div>;
`;
writeFileSync(join(fixtureDir, 'index.html'), fixtureHtml);
writeFileSync(join(fixtureDir, 'card.jsx'), fixtureJsx);

const dryRun = execFileSync(process.execPath, [cliPath, 'migrate', fixtureDir], { encoding: 'utf8' });
assert.ok(dryRun.includes('Dry run'), 'CLI defaults to dry-run');
assert.equal(readFileSync(join(fixtureDir, 'index.html'), 'utf8'), fixtureHtml, 'dry run leaves files untouched');
assert.equal(readFileSync(join(fixtureDir, 'card.jsx'), 'utf8'), fixtureJsx, 'dry run leaves files untouched');

execFileSync(process.execPath, [cliPath, 'migrate', fixtureDir, '--write'], { encoding: 'utf8' });
const migratedHtml = readFileSync(join(fixtureDir, 'index.html'), 'utf8');
assert.ok(migratedHtml.includes('data-sf-reveal="fade-up"'), 'data-aos becomes data-sf-reveal');
assert.ok(migratedHtml.includes('data-sf-reveal="slide-right"'), 'fade-left is mapped to slide-right');
assert.ok(migratedHtml.includes('data-sf-delay="150"'), 'data-aos-delay is renamed');
assert.ok(migratedHtml.includes('data-sf-duration="600"'), 'data-aos-duration is renamed');
assert.ok(!migratedHtml.includes('data-aos'), 'no data-aos attributes remain');
assert.ok(migratedHtml.includes('new ScrollFlow('), 'AOS.init( becomes new ScrollFlow(');
assert.ok(migratedHtml.includes('https://cdn.jsdelivr.net/gh/aqles/scrollflow@3.0.0/dist/scrollflow.css'), 'CSS CDN link is swapped');
assert.ok(migratedHtml.includes('https://cdn.jsdelivr.net/gh/aqles/scrollflow@3.0.0/dist/scrollflow.min.js'), 'JS CDN link is swapped');
const migratedJsx = readFileSync(join(fixtureDir, 'card.jsx'), 'utf8');
assert.ok(migratedJsx.includes("import ScrollFlow from '@aqles/scrollflow'"), 'AOS import is swapped');
assert.ok(migratedJsx.includes("import '@aqles/scrollflow/dist/scrollflow.css'"), 'AOS CSS import is swapped');
assert.ok(migratedJsx.includes('data-sf-reveal="zoom-in"'), 'JSX data-aos is migrated');
assert.ok(migratedJsx.includes('data-sf-easing="ease-out-back"'), 'data-aos-easing is renamed, value kept for the library to translate');
rmSync(fixtureDir, { recursive: true, force: true });

console.log('smoke: all assertions passed');
