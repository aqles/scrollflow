#!/usr/bin/env node
/**
 * scrollflow migrate — rewrite AOS markup to ScrollFlow markup.
 *
 *   scrollflow migrate [paths...] [--write]
 *
 * Dry-run by default: prints what would change, per file, and writes
 * nothing. Scans .html/.htm/.jsx/.tsx/.vue/.php files (skipping
 * node_modules, dist and .git) and warns about package.json files
 * that still depend on aos. Zero dependencies, plain Node.
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const SF_CSS_URL = 'https://cdn.jsdelivr.net/gh/aqles/scrollflow@3.0.0/dist/scrollflow.css';
const SF_JS_URL = 'https://cdn.jsdelivr.net/gh/aqles/scrollflow@3.0.0/dist/scrollflow.min.js';
const SCAN_EXTS = new Set(['.html', '.htm', '.jsx', '.tsx', '.vue', '.php']);
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git']);

// Same table as ScrollFlow.mapAosAnimation in the library. Duplicated
// on purpose: the CLI must run with no build step and no imports from
// the package it ships in.
const AOS_ANIMATIONS = {
  'fade': 'fade-in',
  'fade-up': 'fade-up',
  'fade-down': 'fade-down',
  'fade-left': 'slide-right',
  'fade-right': 'slide-left',
  'fade-up-left': 'fade-up',
  'fade-up-right': 'fade-up',
  'fade-down-left': 'fade-down',
  'fade-down-right': 'fade-down',
  'zoom-in': 'zoom-in',
  'zoom-out': 'zoom-out'
};

function mapAosAnimation(name) {
  const key = String(name == null ? '' : name).trim().toLowerCase();
  if (AOS_ANIMATIONS[key]) return AOS_ANIMATIONS[key];
  if (key.startsWith('zoom-in')) return 'zoom-in';
  if (key.startsWith('zoom-out')) return 'zoom-out';
  if (key.startsWith('slide-')) return 'fade-up';
  if (key.startsWith('flip-')) return 'fade-in';
  return 'fade-in';
}

/** Run one replacement pass, returning [newText, replacementCount]. */
function swap(text, regex, replacement) {
  let count = 0;
  const out = text.replace(regex, (...args) => {
    count++;
    return typeof replacement === 'function' ? replacement(...args) : replacement;
  });
  return [out, count];
}

function migrateText(source) {
  let text = source;
  let changes = 0;
  const removed = [];
  let n;

  // AOS CDN links (unpkg / jsDelivr / cdnjs, any version) -> ScrollFlow 3.
  [text, n] = swap(text, /(?:https?:)?\/\/(?:unpkg\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com)\/[^"'\s]*?aos[^"'\s]*?\.css/g, SF_CSS_URL);
  changes += n;
  [text, n] = swap(text, /(?:https?:)?\/\/(?:unpkg\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com)\/[^"'\s]*?aos[^"'\s]*?\.js/g, SF_JS_URL);
  changes += n;

  // Imports.
  [text, n] = swap(text, /import\s+AOS\s+from\s*(['"])aos\1/g, (m, q) => `import ScrollFlow from ${q}@aqles/scrollflow${q}`);
  changes += n;
  [text, n] = swap(text, /import\s*(['"])aos\/dist\/aos\.css\1/g, (m, q) => `import ${q}@aqles/scrollflow/dist/scrollflow.css${q}`);
  changes += n;

  // AOS.init( -> new ScrollFlow(
  [text, n] = swap(text, /AOS\.init\(/g, 'new ScrollFlow(');
  changes += n;

  // data-aos="name" -> data-sf-reveal="mapped name"
  [text, n] = swap(text, /data-aos=(['"])([^'"]*)\1/g, (m, q, value) => `data-sf-reveal=${q}${mapAosAnimation(value)}${q}`);
  changes += n;

  // Straight renames.
  for (const attr of ['delay', 'duration', 'easing']) {
    [text, n] = swap(text, new RegExp(`data-aos-${attr}=`, 'g'), `data-sf-${attr}=`);
    changes += n;
  }

  // Anything data-aos-* still standing has no ScrollFlow attribute:
  // these are constructor options now, so the attribute goes away.
  text = text.replace(/\s+(data-aos(?:-[a-z0-9-]+)?)(=("[^"]*"|'[^']*'|\{[^{}]*\}))?/g, (m, name) => {
    removed.push(name);
    changes++;
    return '';
  });

  return { text, changes, removed, leftoverAos: /AOS\./.test(text) };
}

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) yield* walk(path);
    } else {
      yield path;
    }
  }
}

function collect(paths) {
  const files = [];
  const manifests = [];
  for (const path of paths) {
    if (!existsSync(path)) {
      console.error(`scrollflow: no such path: ${path}`);
      process.exitCode = 1;
      continue;
    }
    const candidates = statSync(path).isDirectory() ? walk(path) : [path];
    for (const file of candidates) {
      if (file.endsWith('package.json')) manifests.push(file);
      else if (SCAN_EXTS.has(extname(file).toLowerCase())) files.push(file);
    }
  }
  return { files, manifests };
}

function main() {
  const args = process.argv.slice(2);
  if (args[0] !== 'migrate' || args.includes('--help')) {
    console.log('Usage: scrollflow migrate [paths...] [--write]');
    console.log('Rewrites AOS markup to ScrollFlow markup. Dry-run unless --write is given.');
    if (args[0] !== 'migrate' && args.length > 0) process.exitCode = 1;
    return;
  }

  const write = args.includes('--write');
  const paths = args.slice(1).filter((a) => a !== '--write');
  if (paths.length === 0) paths.push('.');

  const { files, manifests } = collect(paths);
  let touched = 0;
  let totalChanges = 0;

  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const { text, changes, removed, leftoverAos } = migrateText(source);
    if (changes === 0 && !leftoverAos) continue;
    touched++;
    totalChanges += changes;
    console.log(`${file} — ${changes} change${changes === 1 ? '' : 's'}`);
    if (removed.length > 0) {
      const names = [...new Set(removed)].join(', ');
      console.log(`  note: removed ${names} — ScrollFlow takes these as constructor options (new ScrollFlow({ ... }))`);
    }
    if (leftoverAos) {
      console.log('  note: other AOS.* calls remain in this file — check them by hand');
    }
    if (write && text !== source) writeFileSync(file, text);
  }

  for (const file of manifests) {
    if (/"aos"\s*:/.test(readFileSync(file, 'utf8'))) {
      console.log(`warning: ${file} still depends on "aos" — remove it once the markup is migrated (npm uninstall aos)`);
    }
  }

  if (touched === 0) {
    console.log('Nothing to migrate.');
  } else if (write) {
    console.log(`Done: ${totalChanges} changes written across ${touched} file${touched === 1 ? '' : 's'}.`);
  } else {
    console.log(`Dry run: ${totalChanges} changes in ${touched} file${touched === 1 ? '' : 's'}. Nothing was written — re-run with --write to apply.`);
  }
}

main();
