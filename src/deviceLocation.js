/**
 * Device position via the browser Geolocation API, framed for the globe.
 *
 * The browser owns the permission prompt and the fix itself; this module only
 * turns the callback API into a promise with a hard timeout, normalises the
 * failure modes into a small typed error, and picks a camera range that
 * matches how precise the fix actually is (a GPS fix earns a street-level
 * view, a coarse Wi-Fi or IP fix a district-level one).
 */

/** Label the location readout shows for the device's own position. */
export const DEVICE_LOCATION_LABEL = 'Your location';

/** Hard ceiling on how long a fix may take before the request is abandoned. */
export const DEVICE_LOCATION_TIMEOUT_MS = 10000;

/** Accept a fix cached by the platform up to this old; startup should not wait on a cold GPS. */
export const DEVICE_LOCATION_MAX_AGE_MS = 60000;

/** Camera framing bounds for a device fix, in metres. */
export const DEVICE_LOCATION_RANGE_M = Object.freeze({
  min: 1500,
  max: 30000,
  perAccuracyMetre: 6,
});

/** Oblique tilt for the arrival view, in degrees (negative looks down). */
export const DEVICE_LOCATION_PITCH_DEG = -45;

/** Typed failure so callers can speak to the operator without parsing messages. */
export class DeviceLocationError extends Error {
  /**
   * @param {'unsupported'|'denied'|'unavailable'|'timeout'} code
   * @param {string} message
   */
  constructor(code, message) {
    super(message);
    this.name = 'DeviceLocationError';
    this.code = code;
  }
}

/** Map a GeolocationPositionError code onto this module's vocabulary. */
function errorFromPositionError(error) {
  switch (error?.code) {
    case 1:
      return new DeviceLocationError('denied', 'Location permission denied');
    case 3:
      return new DeviceLocationError('timeout', 'Location fix timed out');
    default:
      return new DeviceLocationError(
        'unavailable',
        String(error?.message || 'Location unavailable'),
      );
  }
}

/**
 * Read the device's current position once.
 * @param {object} [options]
 * @param {Geolocation|null} [options.geolocation] Injected API; defaults to `navigator.geolocation`.
 * @param {number} [options.timeoutMs]
 * @param {number} [options.maximumAgeMs]
 * @param {boolean} [options.enableHighAccuracy]
 * @returns {Promise<{lat: number, lon: number, accuracyM: number|null, label: string}>}
 */
export function readDevicePosition({
  geolocation = globalThis.navigator?.geolocation ?? null,
  timeoutMs = DEVICE_LOCATION_TIMEOUT_MS,
  maximumAgeMs = DEVICE_LOCATION_MAX_AGE_MS,
  enableHighAccuracy = false,
} = {}) {
  if (!geolocation || typeof geolocation.getCurrentPosition !== 'function') {
    return Promise.reject(
      new DeviceLocationError(
        'unsupported',
        'Geolocation is not available in this browser',
      ),
    );
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback) => (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(watchdog);
      callback(value);
    };
    // The platform timeout is advisory on some engines; keep our own so a
    // fix that never arrives cannot leave the caller waiting forever.
    const watchdog = setTimeout(
      finish(() =>
        reject(new DeviceLocationError('timeout', 'Location fix timed out')),
      ),
      timeoutMs,
    );
    try {
      geolocation.getCurrentPosition(
        finish((position) => {
          const coords = position?.coords;
          const lat = Number(coords?.latitude);
          const lon = Number(coords?.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            reject(
              new DeviceLocationError(
                'unavailable',
                'Location fix had no coordinates',
              ),
            );
            return;
          }
          const accuracy = Number(coords?.accuracy);
          resolve({
            lat,
            lon,
            accuracyM:
              Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : null,
            label: DEVICE_LOCATION_LABEL,
          });
        }),
        finish((error) => reject(errorFromPositionError(error))),
        { enableHighAccuracy, timeout: timeoutMs, maximumAge: maximumAgeMs },
      );
    } catch (error) {
      finish(() => reject(errorFromPositionError(error)))();
    }
  });
}

/**
 * Pick the arrival framing for a fix of the given accuracy.
 * @param {number|null|undefined} accuracyM
 * @returns {{rangeM: number, pitchDeg: number}}
 */
export function deviceLocationFraming(accuracyM) {
  const { min, max, perAccuracyMetre } = DEVICE_LOCATION_RANGE_M;
  // An unknown accuracy earns the closest framing rather than a guess: the
  // fix is still the device's own position, so the operator wants to see it.
  const known = Number.isFinite(accuracyM) && accuracyM > 0;
  const rangeM = known
    ? Math.min(max, Math.max(min, accuracyM * perAccuracyMetre))
    : min;
  return { rangeM: Math.round(rangeM), pitchDeg: DEVICE_LOCATION_PITCH_DEG };
}

/**
 * One operator-facing sentence for a failed fix.
 * @param {unknown} error
 * @returns {string}
 */
export function describeDeviceLocationError(error) {
  switch (error?.code) {
    case 'unsupported':
      return 'This browser cannot report your location';
    case 'denied':
      return 'Location access is blocked — allow it in your browser settings';
    case 'timeout':
      return 'Could not fix your location in time — try again';
    default:
      return 'Your location is unavailable right now';
  }
}
