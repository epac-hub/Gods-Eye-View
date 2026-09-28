import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEVICE_LOCATION_LABEL,
  DEVICE_LOCATION_RANGE_M,
  DeviceLocationError,
  describeDeviceLocationError,
  deviceLocationFraming,
  readDevicePosition,
} from './deviceLocation.js';

function geolocationStub(behaviour) {
  const calls = [];
  return {
    calls,
    getCurrentPosition(success, error, options) {
      calls.push(options);
      behaviour(success, error);
    },
  };
}

test('readDevicePosition resolves a labelled fix from the platform callback', async () => {
  const geolocation = geolocationStub((success) =>
    success({ coords: { latitude: 18.4, longitude: -66.1, accuracy: 25 } }),
  );
  const fix = await readDevicePosition({ geolocation, timeoutMs: 500 });
  assert.deepEqual(fix, {
    lat: 18.4,
    lon: -66.1,
    accuracyM: 25,
    label: DEVICE_LOCATION_LABEL,
  });
  assert.equal(geolocation.calls[0].timeout, 500);
  assert.equal(geolocation.calls[0].enableHighAccuracy, false);
});

test('readDevicePosition maps permission denial and platform failures to typed errors', async () => {
  const denied = geolocationStub((_success, error) =>
    error({ code: 1, message: 'User denied Geolocation' }),
  );
  await assert.rejects(
    readDevicePosition({ geolocation: denied }),
    (error) => error instanceof DeviceLocationError && error.code === 'denied',
  );
  const unavailable = geolocationStub((_success, error) =>
    error({ code: 2, message: 'Position unavailable' }),
  );
  await assert.rejects(
    readDevicePosition({ geolocation: unavailable }),
    (error) => error.code === 'unavailable',
  );
  await assert.rejects(
    readDevicePosition({ geolocation: null }),
    (error) => error.code === 'unsupported',
  );
});

test('readDevicePosition rejects a fix without finite coordinates', async () => {
  const geolocation = geolocationStub((success) =>
    success({ coords: { latitude: Number.NaN, longitude: -66.1 } }),
  );
  await assert.rejects(
    readDevicePosition({ geolocation }),
    (error) => error.code === 'unavailable',
  );
});

test('readDevicePosition enforces its own timeout when the platform never answers', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const geolocation = geolocationStub(() => {});
  const pending = readDevicePosition({ geolocation, timeoutMs: 2000 });
  t.mock.timers.tick(2000);
  await assert.rejects(pending, (error) => error.code === 'timeout');
});

test('readDevicePosition ignores a late callback after the timeout settled it', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let lateSuccess;
  const geolocation = geolocationStub((success) => {
    lateSuccess = success;
  });
  const pending = readDevicePosition({ geolocation, timeoutMs: 1000 });
  t.mock.timers.tick(1000);
  await assert.rejects(pending, (error) => error.code === 'timeout');
  assert.doesNotThrow(() =>
    lateSuccess({ coords: { latitude: 1, longitude: 2, accuracy: 3 } }),
  );
});

test('deviceLocationFraming scales range with accuracy inside its bounds', () => {
  const { min, max, perAccuracyMetre } = DEVICE_LOCATION_RANGE_M;
  assert.equal(deviceLocationFraming(10).rangeM, min);
  assert.equal(deviceLocationFraming(null).rangeM, min);
  assert.equal(deviceLocationFraming(1000).rangeM, 1000 * perAccuracyMetre);
  assert.equal(deviceLocationFraming(1e6).rangeM, max);
  assert.ok(deviceLocationFraming(50).pitchDeg < 0);
});

test('describeDeviceLocationError speaks to each failure mode', () => {
  const messages = new Set(
    ['unsupported', 'denied', 'timeout', 'unavailable', 'other'].map((code) =>
      describeDeviceLocationError({ code }),
    ),
  );
  assert.equal(messages.size, 4);
  assert.match(describeDeviceLocationError({ code: 'denied' }), /blocked/);
  assert.equal(
    describeDeviceLocationError(new Error('boom')),
    describeDeviceLocationError({ code: 'unavailable' }),
  );
});
