# Lettrine

Ornamental drop caps from real books. 26 letters, five variants each, as inline SVG.  
Works with any framework, accessible and customizable.

<img width="959" height="385" alt="image" src="https://github.com/user-attachments/assets/193e965d-3bc5-4e9b-a794-0e46732b349b" />

Comes in two builds:
- Default dynamic version for builds with dynamic content
- Tree-shakable version for static builds
Same attribute, same styling, same behaviour. See [Choosing a build](#choosing-a-build).

<br>

## Install

```bash
npm install lettrine
```

<br>

## Usage

Import it once, anywhere in your app, then tag any element:

```js
import 'lettrine';
```

```html
<p data-lettrine>Lorem ipsum dolor sit amet, consectetur adipiscing elit</p>
```

Without a bundler:

```html
<script type="module" src="node_modules/lettrine/src/index.js"></script>
```

<br>

## Choosing a variant

Every letter comes in five variants. A random variant is used by default, choose one by passing a number from 1 to 5:

```html
<p data-lettrine>Chosen for you, and stable across reloads.</p>
<p data-lettrine="3">Always variant three.</p>
```

You can also name the glyph directly (needed for the tree-shakeable build):

```html
<p data-lettrine="A1">Arms and the man I sing…</p>
```

Variant `0` is a special case, it uses the first letter of the text as the drop cap:
```html
<p data-lettrine="0">Plain V, no ornament.</p>
```

<br>

## Styling

Everything is a CSS custom property, so it cascades like any other style:

| Property | Default | |
| --- | --- | --- |
| `--lettrine-lines` | `3` | how many lines tall the ornament is |
| `--lettrine-line-height` | `1.5` | set this to your body `line-height` |
| `--lettrine-color` | unset | ornament colour; inherits the text colour by default |
| `--lettrine-background` | `transparent` | fills the ornament's box, behind the glyph |
| `--lettrine-gap-right` | `.5em` | space between ornament and text |
| `--lettrine-gap-bottom` | `.1em` | space below the ornament |

Example usage:
```css
:root         { --lettrine-lines: 3; --lettrine-line-height: 1.6 }
.chapter-open { --lettrine-lines: 5; --lettrine-color: #7a3b12 }
.reversed     { --lettrine-background: #7a3b12; --lettrine-color: #f9f6ef }
```

<br>

## Choosing a build

|  | `lettrine` | `lettrine/static` |
| --- | --- | --- |
| setup | import it, done | declare the glyphs you use and pass them in |
| works with | any text, including dynamically changing text | letters known when you build |
| in the build | every glyph, as separate chunks | only the glyphs you need |

**Use the default** unless you have a reason not to. It has no setup, it copes with whatever
text turns up, and it is the only one that works when content comes from a CMS, a search
result, user input, or anything else you can't enumerate in advance.

**Use the static build** when you know your letters at build time: a book, fixed chapters, a
marketing site, and you want the smallest possible output.

### The static build

Name the glyphs you use. A bundler keeps only those; the other glyphs are never emitted:

```js
import { lettrine, observe } from 'lettrine/static';
import { A1, M2 } from 'lettrine/glyphs';

const glyphs = { A1, M2 };
await lettrine({ glyphs });
```

```html
<p data-lettrine="A1">Arms and the man I sing…</p>
```

> [!IMPORTANT]
> In the static build, you need to name the specific glyph in the attribute, not just the variant.

<br>

## API

Only needed if you want manual control.

```js
import { lettrine, decorate, reset, observe } from 'lettrine';

await lettrine();                // decorate everything now; resolves to how many it changed
await lettrine({ root, attr });  // limit to a subtree, or use a different attribute
await decorate(el, { variant: 2 });  // a single element
reset(el);                       // put the original text back
const stop = observe({ root });  // watch a subtree for any data-lettrine attribute; call stop() when done
```

<br>

## Good to know

- Accents are handled: `École` gets the `E` ornament.
- Opening quotes and brackets are swallowed by the ornament, the way print does it —
  `« Élan »`, `¿Qué tal?`.
- Elements that don't start with a letter are left alone.
- The original text stays in the page, so screen readers and copy-paste are unaffected.

<br>

## Development

```bash
make play     # serve playground examples
make build    # rebuild the glyph data from letters/*.svg
```
