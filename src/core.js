// Shared by both entry points. They differ only in where a glyph comes from: index.js
// fetches it, static.js takes one the caller imported by name.

const ATTR = 'data-lettrine';
const VARIANTS = 5;

// The first character an ornament can use: whitespace and opening punctuation are swallowed.
const LEAD = /[^\s"'«‹„‚“‘¿¡([{]/;
const DIACRITICS = /[\u0300-\u036f]/g;
// data-lettrine="A1" names a glyph outright — greppable by a build plugin, and what the
// static entry needs. data-lettrine="1" still means a variant. Variant 0 is no ornament at
// all, the letter itself set at ornament size, and has to be named (A0): a bare number is
// always one of the real variants, and the hash only ever picks from those.
const EXPLICIT = /^([A-Za-z])([0-9])$/;
const PLAIN = '0';

// The float's margin box has to come out just under --lettrine-lines tall. Taller and it
// blocks the next line, leaving a blank indented gap — and at exactly N line boxes it still
// does, hence the 1px. So --lettrine-gap-bottom is taken out of the ink's height and handed
// back as margin, and the .08em top nudge that aligns the ornament with the first line's cap
// height is cancelled in the same sum.
//
// The letter — shown while a glyph loads, or permanently for variant 0 — is drawn by ::before
// rather than a text node, because a text node would land in el.textContent, which the
// variant hash reads and which must not change.
const CSS = `
.lettrine-host{display:flow-root}
.lettrine{float:left;line-height:1;position:relative;
  margin:.08em var(--lettrine-gap-right,.5em)
         calc(var(--lettrine-gap-bottom,.1em) - .08em - 1px) 0}
.lettrine-pending::before,.lettrine-plain::before{content:attr(data-letter);position:absolute;inset:0;
  color:var(--lettrine-color,inherit);line-height:1;
  display:flex;align-items:center;justify-content:center;
  font-size:calc((var(--lettrine-lines,3) * var(--lettrine-line-height,1.5) * 1em
                  - var(--lettrine-gap-bottom,.1em)) / .72)}
.lettrine>svg{display:block;width:auto;color:var(--lettrine-color,inherit);
  background:var(--lettrine-background,transparent);
  height:calc(var(--lettrine-lines,3) * var(--lettrine-line-height,1.5) * 1em
              - var(--lettrine-gap-bottom,.1em))}
.lettrine>span{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
`;

function injectCSS(doc) {
  if (doc.getElementById('lettrine-css')) return;
  const style = doc.createElement('style');
  style.id = 'lettrine-css';
  style.textContent = CSS;
  doc.head.appendChild(style);
}

// Stable per-text variant: a paragraph keeps the same ornament across reloads.
function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

/** `char` as a glyph letter, or '' if it isn't one. É → E; digits, CJK and emoji give ''. */
function letterOf(char) {
  const up = char.normalize('NFD').replace(DIACRITICS, '').toUpperCase();
  return up >= 'A' && up <= 'Z' ? up : '';
}

function firstTextNode(el) {
  const walker = el.ownerDocument.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) if (node.data.trim()) return node;
  return null;
}

/** Undo `decorate`, restoring the original text so the element can be decorated again. */
export function reset(el) {
  for (const span of el.querySelectorAll('.lettrine'))
    span.replaceWith(el.ownerDocument.createTextNode(span.querySelector('span').textContent));
  el.classList.remove('lettrine-host');
  el.normalize(); // merge the split text nodes back together
}

/** Which glyph `el` should show, or null if there is nothing to do. Clears a stale one. */
function analyse(el, { variant, attr = ATTR } = {}) {
  const value = el.getAttribute(attr) ?? '';
  const explicit = EXPLICIT.exec(value);

  // Decorating moves the letter into the hidden span but leaves textContent alone, so the
  // letter and the hash below answer the same before and after — which is what lets a rescan
  // decide whether to redraw without first taking the ornament apart.
  const text = el.textContent;
  const at = text.search(LEAD);
  if (at < 0) return null;
  const letter = explicit ? explicit[1].toUpperCase() : letterOf(text[at]);
  if (!letter) return null;

  const pinned = Math.trunc(variant || Number(value));
  const key = letter + (explicit ? explicit[2]
    : pinned >= 1 && pinned <= VARIANTS ? pinned
    : (hash(text) % VARIANTS) + 1);

  // Read off the DOM, never a flag: a framework that overwrites the text takes the ornament
  // with it, and a flag would go on claiming the element was done.
  const current = el.querySelector('.lettrine');
  if (current) {
    if (current.dataset.v === key) return null;
    reset(el);
  }

  const node = firstTextNode(el);
  if (!node) return null;
  const start = node.data.search(/\S/);
  const offset = node.data.search(LEAD);
  if (offset < 0) return null;
  return { key, node, start, offset, lead: node.data.slice(start, offset + 1) };
}

/** Insert the ornament's final-sized box, showing the plain letter until the glyph is in. */
function insert(el, plan, viewBox) {
  const doc = el.ownerDocument;
  const span = doc.createElement('span');
  span.className = 'lettrine lettrine-pending';
  span.dataset.v = plan.key;
  span.dataset.letter = plan.lead.at(-1);
  span.innerHTML =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" aria-hidden="true"></svg>`;

  // The original characters stay in the DOM, hidden, so the text is still read aloud and
  // copied whole.
  const text = doc.createElement('span');
  text.textContent = plan.lead;
  span.appendChild(text);

  plan.node.splitText(plan.offset + 1);
  plan.node.data = plan.node.data.slice(0, plan.start); // keep indentation, drop punctuation
  plan.node.parentNode.insertBefore(span, plan.node.nextSibling);

  injectCSS(doc);
  el.classList.add('lettrine-host');
  return span;
}

/**
 * Build the public API around a glyph source. `viewBox(key, opts)` must answer synchronously
 * so the box can be sized before the ink is known; `inner(key, opts)` may return a promise.
 */
export function create({ viewBox, inner }) {
  /** Decorate one element. Resolves to whether it changed. */
  async function decorate(el, opts = {}) {
    const plan = analyse(el, opts);
    if (!plan) return false;

    // Variant 0 is the letter on its own, so there is no glyph to look up and nothing to
    // wait for. A square box keeps it the same height as an ornament would be.
    const plain = plan.key.at(-1) === PLAIN;
    const box = plain ? '0 0 1 1' : viewBox(plan.key, opts);
    if (!box) return false;

    // Inserted before any await, so a concurrent scan sees a decorated element and cannot
    // start a second load for the same paragraph.
    const span = insert(el, plan, box);
    if (plain) {
      span.classList.replace('lettrine-pending', 'lettrine-plain');
      return true;
    }

    let ink;
    try {
      ink = await inner(plan.key, opts);
    } catch {
      return false; // glyph unavailable; the placeholder letter stays, which still reads
    }

    // If a text change reset the element while the glyph was in flight, a fresh decorate has
    // taken over and this span is no longer the one to fill. Asking the element rather than
    // the document also lets offscreen DOM be decorated before it is inserted.
    if (el.querySelector('.lettrine') !== span) return false;
    span.firstElementChild.innerHTML = ink;
    span.classList.remove('lettrine-pending');
    delete span.dataset.letter;
    return true;
  }

  /** Decorate every `[attr]` element under `root`. Resolves to how many it changed. */
  async function lettrine({ root = document, ...opts } = {}) {
    const els = [...root.querySelectorAll(`[${opts.attr ?? ATTR}]`)];
    const done = await Promise.all(els.map((el) => decorate(el, opts)));
    return done.filter(Boolean).length;
  }

  /** Keep `root` decorated as its content changes. Returns a function that stops observing. */
  function observe({ root = document, ...opts } = {}) {
    // No debounce: MutationObserver already batches a task's mutations into one callback, and
    // a rescan is ~0.01ms over 2000 elements, nearly all of it the querySelectorAll.
    const mo = new MutationObserver(() => lettrine({ root, ...opts }));
    // The filter stops our own class toggle from feeding the observer back into itself.
    mo.observe(root === document ? root.documentElement : root, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: [opts.attr ?? ATTR],
    });
    lettrine({ root, ...opts });
    return () => mo.disconnect();
  }

  return { decorate, lettrine, observe };
}
