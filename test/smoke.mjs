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

console.log('smoke: all assertions passed');
