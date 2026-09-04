import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';

const script = readFileSync(new URL('../public/dubai-template.js', import.meta.url), 'utf8');
const selectorScript = script.slice(script.indexOf('  const amenityData ='), script.indexOf('  document.querySelectorAll("[data-gallery-filter]")'));

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
  const fields = Object.fromEntries(['amenity-title', 'amenity-copy', 'spec-area', 'spec-rooms', 'spec-view'].map(key => [`[data-${key}]`, node()]));
  fields['[data-amenity-title]'].textContent = 'Infinity Pool';
  let image = node();
  image.src = 'media/images/dubai/03-amenity-infinity-pool-sunset.png';
  const attach = (next) => {
    next.replaceWith = replacement => { image = replacement; attach(image); };
  };
  attach(image);
  const tabs = ['pool', 'spa', 'lounge'].map(key => ({...node(), dataset: {amenity: key}, addEventListener(type, callback) { this.click = callback; }}));
  tabs[0].classList.add('is-active');
  const timeline = ['spa', 'pool', 'lounge'].map(key => ({...node(), dataset: {amenity: key}, addEventListener(type, callback) { this.click = callback; }}));
  let lastClick;
  tabs.forEach(tab => { const listen = tab.addEventListener; tab.addEventListener = function(type, callback) { listen.call(this, type, () => (lastClick = callback())); }; });
  let error = null;
  const selector = {
    ...node(),
    querySelectorAll: () => tabs,
    scrollIntoView() {},
    querySelector(key) {
      const match = key.match(/^\[data-amenity="(.+)"\]$/);
      if (match) return tabs.find(tab => tab.dataset.amenity === match[1]);
      if (key === '[data-amenity-image]') return image;
      if (key === '[data-amenity-error]') return error;
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
    document: {querySelector: () => selector, createElement: node, querySelectorAll: key => key.startsWith('.time-tabs') ? timeline : [...tabs, ...timeline]}
  });
  const load = async key => {
    const entry = [...pending].find(([url]) => url.includes(key));
    await entry[1].onload();
  };
  return {tabs, timeline, lastClick: () => lastClick, fields, selector, pending, load, image: () => image, error: () => error};
}

test('each amenity commits its distinct, existing image and matching details', async () => {
  const state = setup();
  const hashes = new Set();
  for (const [index, key, title] of [[0, '03-', 'Infinity Pool'], [1, '10-', 'Wellness Spa'], [2, '04-', 'Sky Lounge'], [0, '03-', 'Infinity Pool']]) {
    const selection = state.tabs[index].click();
    await state.load(key);
    await selection;
    assert.equal(state.fields['[data-amenity-title]'].textContent, title);
    assert.ok(state.image().src.includes(key));
    assert.equal(state.image().alt, `${title} at Desert Pearl`);
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
  assert.equal(state.fields['[data-amenity-title]'].textContent, 'Infinity Pool');
  assert.ok(state.image().src.includes('03-'));
  assert.equal(state.tabs[0].attrs['aria-pressed'], 'true');
  assert.equal(state.selector.attrs['aria-busy'], 'true');
  await state.load('10-');
  await selection;
  assert.equal(state.fields['[data-amenity-title]'].textContent, 'Wellness Spa');
  assert.ok(state.image().src.includes('10-'));
  assert.equal(state.selector.attrs['aria-busy'], 'false');
});

test('rapid selections keep the latest choice even when loads finish out of order', async () => {
  const state = setup();
  const older = state.tabs[1].click();
  const latest = state.tabs[2].click();
  await state.load('04-');
  await latest;
  await state.load('10-');
  await older;
  assert.equal(state.fields['[data-amenity-title]'].textContent, 'Sky Lounge');
  assert.ok(state.image().src.includes('04-'));
  assert.equal(state.tabs[2].attrs['aria-pressed'], 'true');
});

test('failed image loads retain consistent content and permit retry', async () => {
  const state = setup();
  const selection = state.tabs[1].click();
  [...state.pending].find(([url]) => url.includes('10-'))[1].onerror();
  await selection;
  assert.equal(state.fields['[data-amenity-title]'].textContent, 'Infinity Pool');
  assert.ok(state.image().src.includes('03-'));
  assert.ok(state.error());
  assert.equal(state.selector.attrs['aria-busy'], 'false');
  const retry = state.tabs[1].click();
  await state.load('10-');
  await retry;
  assert.equal(state.fields['[data-amenity-title]'].textContent, 'Wellness Spa');
  assert.equal(state.error(), null);
});


test('day schedule controls select the correct image and stay in sync with main tabs', async () => {
  const state = setup();
  state.timeline[0].click();
  await state.load('10-');
  await state.lastClick();
  assert.equal(state.fields['[data-amenity-title]'].textContent, 'Wellness Spa');
  assert.ok(state.image().src.includes('10-'));
  assert.equal(state.timeline[0].attrs['aria-pressed'], 'true');
  assert.equal(state.tabs[1].attrs['aria-pressed'], 'true');
  const selection = state.tabs[2].click();
  await state.load('04-');
  await selection;
  assert.equal(state.timeline[2].attrs['aria-pressed'], 'true');
  assert.equal(state.timeline[0].attrs['aria-pressed'], 'false');
});
