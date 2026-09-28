/**
 * Open the session on the device's own position.
 *
 * The default opening flight (Austin) starts immediately so the globe is never
 * idle; in parallel the browser is asked for a fix. If the fix arrives before
 * the visitor has taken the camera themselves, the opening flight is cancelled
 * and the same authority-checked flight the "Show your location" button uses
 * takes over. A denied or missing fix leaves the default flight untouched and
 * says nothing — startup is not the moment to nag about permissions.
 */

/** Camera gestures on the globe canvas that mean the visitor is already exploring. */
const INTERACTION_EVENTS = Object.freeze([
  'pointerdown',
  'touchstart',
  'wheel',
]);

/**
 * @param {object} options
 * @param {{flyToDeviceLocation?: Function}} options.shell
 * @param {{scene?: {canvas?: EventTarget}}} [options.viewer]
 * @param {Function} [options.cancelStartupFlight] Cancels the default opening flight.
 * @param {{textContent: string}|null} [options.loaderStatus]
 * @param {number} [options.timeoutMs]
 * @returns {Function} Withdraws the request; a fix arriving afterwards moves nothing.
 */
export function startAtDeviceLocation({
  shell,
  viewer,
  cancelStartupFlight,
  loaderStatus = null,
  timeoutMs = 8000,
}) {
  if (typeof shell?.flyToDeviceLocation !== 'function') return () => {};
  const canvas = viewer?.scene?.canvas ?? null;
  let interacted = false;
  let withdrawn = false;
  const markInteracted = () => {
    interacted = true;
  };
  for (const name of INTERACTION_EVENTS)
    canvas?.addEventListener?.(name, markInteracted, { passive: true });
  const cleanup = () => {
    for (const name of INTERACTION_EVENTS)
      canvas?.removeEventListener?.(name, markInteracted);
  };
  Promise.resolve(
    shell.flyToDeviceLocation({
      origin: 'startup',
      timeoutMs,
      mayFly: () => !withdrawn && !interacted,
      beforeFly: () => {
        if (loaderStatus)
          loaderStatus.textContent = 'Flying to your location...';
        cancelStartupFlight?.();
      },
    }),
  )
    .catch(() => {
      /* startup stays silent on a failed fix */
    })
    .finally(cleanup);
  return () => {
    withdrawn = true;
    cleanup();
  };
}
