// Tree-shakeable entry: the caller imports glyphs by name, so a bundler keeps only those and
// the rest are never emitted. Nothing is fetched, so there is no flash.
//
//   lettrine({ glyphs: { A1, M2 } });
//
// Two things follow from the bundler having to see what is wanted: elements name the glyph
// (data-lettrine="A1") rather than a variant, since a hashed variant is unknowable at build
// time; and nothing auto-starts, since the glyphs have to arrive first.
import { create } from './core.js';

export { reset } from './core.js';

const warned = new Set();

function lookup(key, glyphs) {
  const glyph = glyphs?.[key];
  if (!glyph && !warned.has(key)) {
    warned.add(key);
    console.warn(
      `[lettrine] no glyph registered for "${key}" — import it and pass it in:\n` +
      `  import { ${key} } from 'lettrine/glyphs';\n` +
      `  lettrine({ glyphs: { ${key} } });`,
    );
  }
  return glyph;
}

export const { decorate, lettrine, observe } = create({
  viewBox: (key, opts) => lookup(key, opts.glyphs)?.[0],
  inner: (key, opts) => lookup(key, opts.glyphs)[1],
});
