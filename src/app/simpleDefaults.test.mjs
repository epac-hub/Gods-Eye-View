import assert from 'node:assert/strict';
import test from 'node:test';
import { CONTEXT_ENTRY_LAYER_IDS } from '../contextModePolicy.js';
import { LAYER_STATE_REGISTRY } from '../data/layerState.js';
import { SIMPLE_LAYERS } from '../ui/simpleBar.js';
import {
  SIMPLE_DEFAULTS_APPLIED,
  SIMPLE_DEFAULTS_STORAGE_KEY,
  SIMPLE_DEFAULT_LAYER_IDS,
  applySimpleDefaults,
  rememberSimpleDefaultsApplied,
  shouldApplySimpleDefaults,
  simpleDefaultsApplied,
  startSimpleDefaults,
} from './simpleDefaults.js';

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    map,
  };
}

function managerSpy({
  ids = SIMPLE_DEFAULT_LAYER_IDS,
  result = () => true,
} = {}) {
  const calls = [];
  return {
    calls,
    getAll: () => ids.map((id) => ({ id })),
    async setEnabled(layerId, enabled, options) {
      calls.push({ layerId, enabled, origin: options?.origin });
      const outcome = result(layerId);
      if (outcome instanceof Error) throw outcome;
      return outcome;
    },
  };
}

test('every default layer is a simple-view row AND persists through the layer-state registry', () => {
  const rows = new Set(SIMPLE_LAYERS.map((row) => row.id));
  const durable = new Set(LAYER_STATE_REGISTRY.map((entry) => entry.id));
  for (const id of SIMPLE_DEFAULT_LAYER_IDS) {
    assert.ok(rows.has(id), `${id} must be offered in the simple view`);
    assert.ok(
      durable.has(id),
      `${id} must persist, or the second open would lose it`,
    );
  }
  // Keyless on purpose: a default that reads "Needs key" explains nothing.
  assert.ok(!SIMPLE_DEFAULT_LAYER_IDS.includes('local-firms'));
  // A Context entry layer enters its mode and clears everything outside it,
  // so a default that is one would switch the other defaults back off.
  for (const id of SIMPLE_DEFAULT_LAYER_IDS)
    assert.ok(
      !CONTEXT_ENTRY_LAYER_IDS.includes(id),
      `${id} enters a Context mode`,
    );
});

test('the defaults apply once, in the simple view, with no share and no saved layer state', () => {
  const fresh = memoryStorage();
  assert.equal(
    shouldApplySimpleDefaults({ simpleUiActive: true, storage: fresh }),
    true,
  );
  assert.equal(
    shouldApplySimpleDefaults({ simpleUiActive: false, storage: fresh }),
    false,
  );
  assert.equal(
    shouldApplySimpleDefaults({
      simpleUiActive: true,
      hasShareState: true,
      storage: fresh,
    }),
    false,
  );
  assert.equal(
    shouldApplySimpleDefaults({
      simpleUiActive: true,
      layerStateSource: 'local',
      storage: fresh,
    }),
    false,
  );
  const done = memoryStorage({
    [SIMPLE_DEFAULTS_STORAGE_KEY]: SIMPLE_DEFAULTS_APPLIED,
  });
  assert.equal(
    shouldApplySimpleDefaults({ simpleUiActive: true, storage: done }),
    false,
  );
});

test('the applied flag round-trips and a hostile storage fails open to "apply"', () => {
  const storage = memoryStorage();
  assert.equal(simpleDefaultsApplied(storage), false);
  assert.equal(rememberSimpleDefaultsApplied(storage), true);
  assert.equal(
    storage.map.get(SIMPLE_DEFAULTS_STORAGE_KEY),
    SIMPLE_DEFAULTS_APPLIED,
  );
  assert.equal(simpleDefaultsApplied(storage), true);
  const throwing = {
    getItem() {
      throw new Error('SecurityError');
    },
    setItem() {
      throw new Error('SecurityError');
    },
  };
  assert.equal(simpleDefaultsApplied(throwing), false);
  assert.equal(rememberSimpleDefaultsApplied(throwing), false);
  assert.equal(simpleDefaultsApplied(null), false);
});

test('applySimpleDefaults enables each known layer as a user tap would, and reports the rest', async () => {
  const storage = memoryStorage();
  const manager = managerSpy({
    ids: ['flights', 'military'],
    result: (id) => (id === 'military' ? false : true),
  });
  const outcome = await applySimpleDefaults({ dataManager: manager, storage });
  assert.deepEqual(outcome, {
    enabled: ['flights'],
    failed: ['military'],
    skipped: ['satellites'],
  });
  for (const call of manager.calls) {
    assert.equal(call.enabled, true);
    assert.equal(call.origin, 'user');
  }
  // One layer on is enough for this open to count as applied.
  assert.equal(simpleDefaultsApplied(storage), true);
});

test('an open that enables nothing leaves the flag unset so the next open retries', async () => {
  const storage = memoryStorage();
  const manager = managerSpy({ result: () => false });
  const outcome = await applySimpleDefaults({ dataManager: manager, storage });
  assert.deepEqual(outcome.enabled, []);
  assert.equal(outcome.failed.length, SIMPLE_DEFAULT_LAYER_IDS.length);
  assert.equal(simpleDefaultsApplied(storage), false);
});

test('a throwing layer is a failure, not an abort of the others', async () => {
  const manager = managerSpy({
    result: (id) => (id === 'flights' ? new Error('down') : true),
  });
  const outcome = await applySimpleDefaults({
    dataManager: manager,
    storage: memoryStorage(),
  });
  assert.deepEqual(outcome.failed, ['flights']);
  assert.deepEqual(outcome.enabled, ['military', 'satellites']);
});

test('startSimpleDefaults waits for layer-state restoration and then applies on a first open', async () => {
  let restore;
  const storage = memoryStorage();
  const manager = managerSpy();
  const styleManager = {
    _layerStateRestorePromise: new Promise((resolve) => {
      restore = resolve;
    }),
    _layerStateCoordinator: { source: 'defaults' },
    hasShareState: false,
  };
  const pending = startSimpleDefaults({
    styleManager,
    dataManager: manager,
    simpleUiActive: () => true,
    storage,
  });
  await Promise.resolve();
  assert.deepEqual(
    manager.calls,
    [],
    'nothing may be enabled before restoration settles',
  );
  restore([]);
  const result = await pending;
  assert.equal(result.applied, true);
  assert.deepEqual(
    manager.calls.map((call) => call.layerId),
    [...SIMPLE_DEFAULT_LAYER_IDS],
  );
});

test('startSimpleDefaults stays out of the way for saved state, share links and the full console', async () => {
  for (const [label, styleManager, simple] of [
    ['saved', { _layerStateCoordinator: { source: 'local' } }, true],
    [
      'share',
      { _layerStateCoordinator: { source: 'share' }, hasShareState: true },
      true,
    ],
    ['full console', { _layerStateCoordinator: { source: 'defaults' } }, false],
  ]) {
    const manager = managerSpy();
    const result = await startSimpleDefaults({
      styleManager,
      dataManager: manager,
      simpleUiActive: () => simple,
      storage: memoryStorage(),
    });
    assert.equal(result.applied, false, label);
    assert.deepEqual(manager.calls, [], label);
  }
  // A rejected restoration is not a reason to leave the globe empty.
  const manager = managerSpy();
  const result = await startSimpleDefaults({
    styleManager: {
      _layerStateRestorePromise: Promise.reject(new Error('restore failed')),
      _layerStateCoordinator: { source: 'defaults' },
    },
    dataManager: manager,
    simpleUiActive: () => true,
    storage: memoryStorage(),
  });
  assert.equal(result.applied, true);
});
