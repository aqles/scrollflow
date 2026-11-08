#!/usr/bin/env node
/**
 * Build dist/ from src/. No runtime dependencies.
 * - dist/scrollflow.js     classic script / CommonJS (copy of src)
 * - dist/scrollflow.esm.js same source plus an ESM default export,
 *                          generated here so the two never drift apart
 * - dist/scrollflow.css    copy of src
 * - dist/scrollflow.min.js only when the terser devDependency is installed
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => join(root, 'src', p);
const dist = (p) => join(root, 'dist', p);

mkdirSync(join(root, 'dist'), { recursive: true });

copyFileSync(src('scrollflow.js'), dist('scrollflow.js'));
copyFileSync(src('scrollflow.css'), dist('scrollflow.css'));
// Legacy path: v1 shipped the stylesheet at css/scrollflow.css, keep it current.
copyFileSync(src('scrollflow.css'), join(root, 'css', 'scrollflow.css'));

const source = readFileSync(src('scrollflow.js'), 'utf8');
writeFileSync(dist('scrollflow.esm.js'), `${source}\nexport default ScrollFlow;\n`);

try {
  const { minify } = await import('terser');
  const result = await minify(source, { format: { comments: /^!/ } });
  if (!result.code) throw new Error('terser returned no code');
  writeFileSync(dist('scrollflow.min.js'), result.code + '\n');
  console.log('dist/scrollflow.min.js written (terser)');
} catch (err) {
  if (existsSync(dist('scrollflow.min.js'))) rmSync(dist('scrollflow.min.js'));
  console.log(`no .min.js: terser unavailable (${err.code || err.message}). Run "npm install" to enable it.`);
}

console.log('dist built: scrollflow.js, scrollflow.esm.js, scrollflow.css');
