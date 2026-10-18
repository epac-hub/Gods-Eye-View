import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SIMPLE_LAYERS,
  describeLayerState,
  initSimpleBar,
  simpleLayerRows,
} from './simpleBar.js';
import { UI_SIMPLE_CLASS } from '../uiMode.js';

test('simpleLayerRows keeps curated order, skips absent layers, and reads state', () => {
  const rows = simpleLayerRows([
    { id: 'radio', enabled: false, lifecycleState: 'idle' },
    { id: 'flights', enabled: true, lifecycleState: 'ready' },
    { id: 'traffic', enabled: true },
    {
      id: 'local-firms',
      enabled: false,
      lifecycleState: 'idle',
      stats: { keyRequired: true },
    },
    { id: 'satellites', enabled: false, lifecycleState: 'enabling' },
  ]);
  assert.deepEqual(
    rows.map((row) => row.id),
    ['flights', 'satellites', 'local-firms', 'radio'],
  );
  assert.equal(rows[0].label, 'Aircraft');
  assert.equal(rows[0].enabled, true);
  assert.equal(rows[1].busy, true);
  assert.equal(rows[2].keyRequired, true);
  assert.equal(simpleLayerRows().length, 0);
  assert.ok(SIMPLE_LAYERS.every((entry) => entry.label && entry.hint));
});

test('describeLayerState prefers the key requirement, then busy, then on/off', () => {
  assert.equal(
    describeLayerState({ enabled: false, keyRequired: true, busy: false }),
    'Needs key',
  );
  assert.equal(
    describeLayerState({ enabled: true, keyRequired: true, busy: false }),
    'On',
  );
  assert.equal(
    describeLayerState({ enabled: false, keyRequired: false, busy: true }),
    'Loading',
  );
  assert.equal(
    describeLayerState({ enabled: false, keyRequired: false, busy: false }),
    'Off',
  );
});

function element(tag = 'div') {
  const attrs = new Map();
  const listeners = new Map();
  const node = {
    tag,
    children: [],
    dataset: {},
    hidden: false,
    value: '',
    textContent: '',
    className: '',
    type: '',
    setAttribute: (name, value) => attrs.set(name, String(value)),
    getAttribute: (name) => (attrs.has(name) ? attrs.get(name) : null),
    addEventListener(name, callback) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(callback);
    },
    removeEventListener(name, callback) {
      listeners.get(name)?.delete(callback);
    },
    async fire(name, event = {}) {
      for (const callback of listeners.get(name) || []) await callback(event);
    },
    append(...nodes) {
      node.children.push(...nodes);
    },
    replaceChildren() {
      node.children = [];
    },
    focus() {
      node.focused = true;
    },
    querySelector: () => null,
    listenerCount: () =>
      [...listeners.values()].reduce((n, s) => n + s.size, 0),
  };
  return node;
}

function harness() {
  const byId = new Map();
  const actions = new Map();
  for (const name of ['search', 'layers', 'locate', 'globe', 'full']) {
    actions.set(name, element('button'));
  }
  const root = element('nav');
  root.querySelector = (selector) => {
    const match = /data-simple-action="([^"]+)"/.exec(selector);
    return match ? actions.get(match[1]) || null : null;
  };
  const closeButton = element('button');
  const sheet = element('section');
  sheet.hidden = true;
  sheet.querySelector = (selector) =>
    /close-layers/.test(selector) ? closeButton : null;
  const list = element('div');
  const form = element('form');
  form.hidden = true;
  const input = element('input');
  const toggle = element('button');
  byId.set('simple-bar', root);
  byId.set('simple-layers', sheet);
  byId.set('simple-layers-list', list);
  byId.set('simple-search-form', form);
  byId.set('simple-search-input', input);
  byId.set('simple-view-toggle', toggle);
  const classes = new Set([UI_SIMPLE_CLASS]);
  const doc = {
    body: {
      dataset: {},
      classList: {
        contains: (name) => classes.has(name),
        toggle(name, force) {
          const on = force ?? !classes.has(name);
          if (on) classes.add(name);
          else classes.delete(name);
          return on;
        },
      },
    },
    getElementById: (id) => byId.get(id) || null,
    createElement: (tag) => element(tag),
    addEventListener() {},
    removeEventListener() {},
  };
  const calls = [];
  const styleManager = {
    searchLocation: (query) => calls.push(['search', query]),
    flyToDeviceLocation: async (options) =>
      calls.push(['locate', options.origin]),
    resetToGlobeView: () => calls.push(['globe']),
  };
  const layers = [
    { id: 'flights', enabled: false, lifecycleState: 'idle' },
    { id: 'earthquakes', enabled: true, lifecycleState: 'ready' },
  ];
  const dataManager = {
    getAll: () => layers,
    isEnabled: (id) => layers.find((l) => l.id === id)?.enabled === true,
    setEnabled: async (id, enabled, options) => {
      calls.push(['setEnabled', id, enabled, options.origin]);
      layers.find((l) => l.id === id).enabled = enabled;
    },
    subscribe: () => () => {},
  };
  const storage = {
    items: new Map(),
    getItem: (k) => storage.items.get(k) ?? null,
    setItem: (k, v) => storage.items.set(k, v),
  };
  const bar = initSimpleBar({
    styleManager,
    dataManager,
    documentRef: doc,
    storage,
  });
  return {
    bar,
    actions,
    sheet,
    list,
    form,
    input,
    toggle,
    closeButton,
    doc,
    calls,
    classes,
    storage,
  };
}

test('the bar routes search, location and globe actions to the shell seams', async () => {
  const h = harness();
  await h.actions.get('search').fire('click');
  assert.equal(h.form.hidden, false);
  assert.equal(h.input.focused, true);
  h.input.value = '  San Juan  ';
  await h.form.fire('submit', { preventDefault() {} });
  assert.deepEqual(h.calls, [['search', 'San Juan']]);
  assert.equal(h.form.hidden, true);
  await h.actions.get('locate').fire('click');
  assert.equal(h.actions.get('locate').getAttribute('aria-busy'), 'false');
  await h.actions.get('globe').fire('click');
  assert.deepEqual(h.calls.slice(1), [['locate', 'user'], ['globe']]);
});

test('the layers sheet lists curated rows and toggles through the data manager', async () => {
  const h = harness();
  await h.actions.get('layers').fire('click');
  assert.equal(h.sheet.hidden, false);
  assert.equal(h.list.children.length, 2);
  const [flightsRow] = h.list.children;
  assert.equal(flightsRow.dataset.layerId, 'flights');
  const toggle = flightsRow.children[1];
  assert.equal(toggle.getAttribute('aria-checked'), 'false');
  await toggle.fire('click');
  assert.deepEqual(h.calls, [['setEnabled', 'flights', true, 'user']]);
  assert.equal(
    h.list.children[0].children[1].getAttribute('aria-checked'),
    'true',
  );
  await h.closeButton.fire('click');
  assert.equal(h.sheet.hidden, true);
});

test('switching modes flips the body class and persists the choice', async () => {
  const h = harness();
  await h.actions.get('full').fire('click');
  assert.equal(h.classes.has(UI_SIMPLE_CLASS), false);
  assert.equal(h.storage.items.get('gev:ui-mode:v1'), 'full');
  await h.toggle.fire('click');
  assert.equal(h.classes.has(UI_SIMPLE_CLASS), true);
  assert.equal(h.storage.items.get('gev:ui-mode:v1'), 'simple');
});

test('destroy detaches every listener and init is a no-op without markup', async () => {
  const h = harness();
  h.bar.destroy();
  h.bar.destroy();
  await h.actions.get('globe').fire('click');
  assert.deepEqual(h.calls, []);
  assert.equal(h.actions.get('globe').listenerCount(), 0);
  assert.equal(
    initSimpleBar({ documentRef: { getElementById: () => null } }),
    null,
  );
});
