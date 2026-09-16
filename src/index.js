// Default entry: glyphs are fetched as needed, so a page downloads only the letters it shows.
// dims.js ships every viewBox eagerly, about 1KB, so an ornament's box is the right size
// before its glyph arrives. See ./static.js to bundle only the glyphs you name instead.
import DIMS from './dims.js';
import GLYPHS from './glyphs/index.js';
import { create } from './core.js';

export { reset } from './core.js';
export const { decorate, lettrine, observe } = create({
  viewBox: (key) => DIMS[key],
  inner: (key) => GLYPHS[key]().then((glyph) => glyph.default[1]),
});

// Importing the package is the whole setup.
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', () => observe(), { once: true });
  else observe();
}
