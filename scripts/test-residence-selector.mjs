import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';

const script = readFileSync(new URL('../public/dubai-template.js', import.meta.url), 'utf8');
const selectorScript = script.slice(script.indexOf('  const residenceData ='), script.indexOf('  const amenityData ='));

function setup() {
  const pending = new Map();
  const node = () => ({
    attrs: {}, textContent: '',
    setAttribute(key, value) { this.attrs[key] = value; },
    classList: {
      values: new Set(),
      add(value) { this.values.add(value); },
      remove(value) { this.values.delete(value); },
      contains(value) { return this.values.has(value); },
      toggle(value, on) { on ? this.add(value) : this.remove(value); }
    }
  });
  const fields = Object.fromEntries(['residence-title', 'residence-copy', 'spec-area', 'spec-rooms', 'spec-view'].map(key => [`[data-${key}]`, node()]));
  fields['[data-residence-title]'].textContent = 'One Bedroom';
  let image = node();
  image.src = 'media/images/dubai/06-interior-living-dining-golden-hour.png';
  const attach = (next) => {
    next.replaceWith = replacement => { image = replacement; attach(image); };
  };
  attach(image);
  const tabs = ['one', 'two', 'three'].map(key => ({...node(), dataset: {residence: key}, addEventListener(type, callback) { this.click = callback; }}));
  tabs[0].classList.add('is-active');
  let error = null;
  const selector = {
    ...node(),
    querySelectorAll: () => tabs,
    querySelector(key) {
      if (key === '[data-residence-image]') return image;
      if (key === '[data-residence-error]') return error;
      if (key === '.selector-tabs') return {after(status) { error = status; error.remove = () => { error = null; }; }};
      return fields[key];
    }
  };
  class FakeImage {
    constructor() { Object.assign(this, node()); }
    set src(value) { this.url = value; pending.set(value, this); }
    get src() { return this.url; }
    decode() { return Promise.resolve(); }
  }
  runInNewContext(selectorScript, {
    Image: FakeImage, reducedMotion: true,
    window: {setTimeout: callback => callback()},
    document: {querySelector: () => selector, createElement: node}
  });
  const load = async key => {
    const entry = [...pending].find(([url]) => url.includes(key));
    await entry[1].onload();
  };
  return {tabs, fields, selector, pending, load, image: () => image, error: () => error};
}

test('each residence commits its distinct, existing image and matching details', async () => {
  const state = setup();
  const hashes = new Set();
  for (const [index, key, title] of [[0, '06-', 'One Bedroom'], [1, '07-', 'Two Bedroom'], [2, '12-', 'Three Bedroom'], [0, '06-', 'One Bedroom']]) {
    const selection = state.tabs[index].click();
    await state.load(key);
    await selection;
    assert.equal(state.fields['[data-residence-title]'].textContent, title);
    assert.equal(state.fields['[data-spec-rooms]'].textContent, String(index + 1));
    assert.ok(state.image().src.includes(key));
    assert.equal(state.image().alt, `${title} residence at Desert Pearl`);
    assert.equal(state.tabs[index].attrs['aria-pressed'], 'true');
    const path = new URL(`../public/${state.image().src}`, import.meta.url);
    assert.ok(existsSync(path));
    hashes.add(createHash('sha256').update(readFileSync(path)).digest('hex'));
  }
  assert.equal(hashes.size, 3);
});

test('slow image loads cannot show new details alongside the previous image', async () => {
  const state = setup();
  const selection = state.tabs[1].click();
  await Promise.resolve();
  assert.equal(state.fields['[data-residence-title]'].textContent, 'One Bedroom');
  assert.ok(state.image().src.includes('06-'));
  assert.equal(state.tabs[0].attrs['aria-pressed'], 'true');
  assert.equal(state.selector.attrs['aria-busy'], 'true');
  await state.load('07-');
  await selection;
  assert.equal(state.fields['[data-residence-title]'].textContent, 'Two Bedroom');
  assert.ok(state.image().src.includes('07-'));
  assert.equal(state.selector.attrs['aria-busy'], 'false');
});

test('rapid selections keep the latest choice even when loads finish out of order', async () => {
  const state = setup();
  const older = state.tabs[1].click();
  const latest = state.tabs[2].click();
  await state.load('12-');
  await latest;
  await state.load('07-');
  await older;
  assert.equal(state.fields['[data-residence-title]'].textContent, 'Three Bedroom');
  assert.ok(state.image().src.includes('12-'));
  assert.equal(state.tabs[2].attrs['aria-pressed'], 'true');
});

test('failed image loads retain consistent content and permit retry', async () => {
  const state = setup();
  const selection = state.tabs[1].click();
  [...state.pending].find(([url]) => url.includes('07-'))[1].onerror();
  await selection;
  assert.equal(state.fields['[data-residence-title]'].textContent, 'One Bedroom');
  assert.ok(state.image().src.includes('06-'));
  assert.ok(state.error());
  assert.equal(state.selector.attrs['aria-busy'], 'false');
  const retry = state.tabs[1].click();
  await state.load('07-');
  await retry;
  assert.equal(state.fields['[data-residence-title]'].textContent, 'Two Bedroom');
  assert.equal(state.error(), null);
});
