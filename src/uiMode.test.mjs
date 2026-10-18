import assert from 'node:assert/strict';
import test from 'node:test';
import {
  UI_MODE_FULL,
  UI_MODE_SIMPLE,
  UI_MODE_STORAGE_KEY,
  UI_SIMPLE_CLASS,
  applyUiMode,
  currentUiMode,
  hasShareLinkHash,
  isSimpleUiActive,
  normalizeUiMode,
  readStoredUiMode,
  resolveInitialUiMode,
  writeStoredUiMode,
} from './uiMode.js';

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    map,
  };
}

function documentStub() {
  const classes = new Set();
  return {
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
  };
}

test('normalizeUiMode accepts the two modes, an alias, and nothing else', () => {
  assert.equal(normalizeUiMode('simple'), UI_MODE_SIMPLE);
  assert.equal(normalizeUiMode(' FULL '), UI_MODE_FULL);
  assert.equal(normalizeUiMode('advanced'), UI_MODE_FULL);
  assert.equal(normalizeUiMode('cockpit'), null);
  assert.equal(normalizeUiMode(undefined), null);
});

test('hasShareLinkHash needs a finite latitude and longitude', () => {
  assert.equal(hasShareLinkHash('#lat=18.4&lon=-66.1&alt=800'), true);
  assert.equal(hasShareLinkHash('lat=18.4&lon=-66.1'), true);
  assert.equal(hasShareLinkHash('#lat=abc&lon=-66.1'), false);
  assert.equal(hasShareLinkHash('#style=retro'), false);
  assert.equal(hasShareLinkHash(''), false);
  assert.equal(hasShareLinkHash(undefined), false);
});

test('resolveInitialUiMode: query beats share link beats stored beats default', () => {
  assert.equal(resolveInitialUiMode(), UI_MODE_SIMPLE);
  assert.equal(resolveInitialUiMode({ stored: 'full' }), UI_MODE_FULL);
  assert.equal(
    resolveInitialUiMode({ stored: 'simple', hash: '#lat=1&lon=2' }),
    UI_MODE_FULL,
  );
  assert.equal(
    resolveInitialUiMode({
      stored: 'full',
      hash: '#lat=1&lon=2',
      search: '?ui=simple',
    }),
    UI_MODE_SIMPLE,
  );
  assert.equal(resolveInitialUiMode({ search: 'ui=full' }), UI_MODE_FULL);
  assert.equal(
    resolveInitialUiMode({ search: '?ui=bogus', stored: 'garbage' }),
    UI_MODE_SIMPLE,
  );
});

test('stored mode round-trips through storage and tolerates a hostile area', () => {
  const storage = memoryStorage();
  assert.equal(readStoredUiMode(storage), null);
  assert.equal(writeStoredUiMode(storage, 'full'), true);
  assert.equal(storage.map.get(UI_MODE_STORAGE_KEY), 'full');
  assert.equal(readStoredUiMode(storage), UI_MODE_FULL);
  assert.equal(writeStoredUiMode(storage, 'nonsense'), false);
  assert.equal(readStoredUiMode(null), null);
  const throwing = {
    getItem() {
      throw new Error('SecurityError');
    },
    setItem() {
      throw new Error('SecurityError');
    },
  };
  assert.equal(readStoredUiMode(throwing), null);
  assert.equal(writeStoredUiMode(throwing, 'simple'), false);
});

test('applyUiMode drives the body class and reports the current mode', () => {
  const doc = documentStub();
  assert.equal(applyUiMode(doc, 'simple'), UI_MODE_SIMPLE);
  assert.equal(doc.body.classList.contains(UI_SIMPLE_CLASS), true);
  assert.equal(doc.body.dataset.uiMode, 'simple');
  assert.equal(isSimpleUiActive(doc), true);
  assert.equal(applyUiMode(doc, 'full'), UI_MODE_FULL);
  assert.equal(doc.body.classList.contains(UI_SIMPLE_CLASS), false);
  assert.equal(currentUiMode(doc), UI_MODE_FULL);
  assert.equal(applyUiMode(doc, 'what'), UI_MODE_SIMPLE);
  assert.doesNotThrow(() => applyUiMode(null, 'simple'));
  assert.equal(currentUiMode(null), UI_MODE_FULL);
});
