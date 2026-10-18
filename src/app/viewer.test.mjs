import assert from 'node:assert/strict';
import test from 'node:test';
import { msaaSamplesForDevice } from './viewer.js';

test('touch-first devices render without multisampling, pointer devices keep it', () => {
  assert.equal(
    msaaSamplesForDevice({ matchMedia: () => ({ matches: true }) }),
    1,
  );
  assert.equal(
    msaaSamplesForDevice({ matchMedia: () => ({ matches: false }) }),
    4,
  );
});

test('a window without matchMedia, or a throwing one, falls back to the desktop default', () => {
  assert.equal(msaaSamplesForDevice({}), 4);
  assert.equal(msaaSamplesForDevice(undefined), 4);
  assert.equal(
    msaaSamplesForDevice({
      matchMedia() {
        throw new Error('unsupported');
      },
    }),
    4,
  );
});
