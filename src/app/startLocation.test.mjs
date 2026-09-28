import assert from 'node:assert/strict';
import test from 'node:test';
import { startAtDeviceLocation } from './startLocation.js';

function canvasStub() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(name, callback) {
      listeners.set(name, callback);
    },
    removeEventListener(name) {
      listeners.delete(name);
    },
    fire(name) {
      listeners.get(name)?.();
    },
  };
}

function shellStub() {
  let resolve;
  const shell = {
    request: null,
    flyToDeviceLocation(options) {
      shell.request = options;
      return new Promise((r) => {
        resolve = r;
      });
    },
    settle: (value) => resolve(value),
  };
  return shell;
}

test('startAtDeviceLocation asks the shell for a startup fix and hands it the opening-flight cancel', async () => {
  const shell = shellStub();
  const viewer = { scene: { canvas: canvasStub() } };
  let cancelled = 0;
  const loaderStatus = { textContent: 'Flying to Austin, TX...' };
  startAtDeviceLocation({
    shell,
    viewer,
    cancelStartupFlight: () => cancelled++,
    loaderStatus,
    timeoutMs: 1234,
  });
  assert.equal(shell.request.origin, 'startup');
  assert.equal(shell.request.timeoutMs, 1234);
  assert.equal(shell.request.mayFly(), true);
  shell.request.beforeFly();
  assert.equal(cancelled, 1);
  assert.match(loaderStatus.textContent, /your location/);
  shell.settle({ ok: true });
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(viewer.scene.canvas.listeners.size, 0);
});

test('a camera gesture on the globe withdraws the automatic flight', () => {
  const shell = shellStub();
  const canvas = canvasStub();
  startAtDeviceLocation({ shell, viewer: { scene: { canvas } } });
  assert.equal(shell.request.mayFly(), true);
  canvas.fire('pointerdown');
  assert.equal(shell.request.mayFly(), false);
});

test('the returned cancel withdraws the flight and detaches listeners', () => {
  const shell = shellStub();
  const canvas = canvasStub();
  const cancel = startAtDeviceLocation({
    shell,
    viewer: { scene: { canvas } },
  });
  assert.equal(canvas.listeners.size, 3);
  cancel();
  assert.equal(shell.request.mayFly(), false);
  assert.equal(canvas.listeners.size, 0);
});

test('a shell without the seam is a no-op', () => {
  assert.doesNotThrow(() => startAtDeviceLocation({ shell: {} })());
});
