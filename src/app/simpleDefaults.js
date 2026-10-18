/**
 * Default live layers for the simple view.
 *
 * The full console deliberately starts with every feed off and lets the
 * mission launcher offer a first choice. The simple view hides that launcher,
 * so without this module a visitor on a phone opens the page to an empty globe
 * and nothing tells them what the app does. On a visitor's FIRST open in the
 * simple view, this turns on a small set of keyless live layers — exactly as
 * if they had tapped those rows themselves — so the globe shows aircraft,
 * satellites and launches at once.
 *
 * The rule is first-open only. The layers are enabled at `origin: 'user'`, so
 * the layer-state coordinator persists them like any tap; from then on the
 * visitor's own toggles are the durable truth and this module stays out of
 * the way. A share link, or a browser that already carries saved layer state
 * (for instance from the full console), never gets the defaults either: that
 * state was chosen, this one is only a starting point.
 */

/** Durable "already applied" flag; written once at least one default is on. */
export const SIMPLE_DEFAULTS_STORAGE_KEY = 'gev:simple-defaults:v1';
export const SIMPLE_DEFAULTS_APPLIED = 'applied';

/**
 * Keyless live layers that read well on a phone. Every id here is in the
 * durable layer-state registry, so the first application persists and the
 * next open restores the same picture (minus whatever the visitor turned off).
 *
 * None of them is a Context ENTRY layer (see CONTEXT_ENTRY_LAYER_IDS): turning
 * one of those on at `origin: 'user'` enters its Context mode, which clears
 * every layer outside that mode — enabling Rocket launches here would switch
 * the aircraft straight back off.
 */
export const SIMPLE_DEFAULT_LAYER_IDS = Object.freeze([
  'flights',
  'military',
  'satellites',
]);

function storageArea(injected) {
  if (injected !== undefined) return injected;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * @param {Storage|null|undefined} storage
 * @returns {boolean}
 */
export function simpleDefaultsApplied(storage) {
  try {
    return (
      storageArea(storage)?.getItem?.(SIMPLE_DEFAULTS_STORAGE_KEY) ===
      SIMPLE_DEFAULTS_APPLIED
    );
  } catch {
    return false;
  }
}

/**
 * @param {Storage|null|undefined} storage
 * @returns {boolean} Whether the flag was written.
 */
export function rememberSimpleDefaultsApplied(storage) {
  try {
    storageArea(storage)?.setItem?.(
      SIMPLE_DEFAULTS_STORAGE_KEY,
      SIMPLE_DEFAULTS_APPLIED,
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Decide whether this open gets the defaults.
 * @param {object} input
 * @param {boolean} input.simpleUiActive The simple view is on screen.
 * @param {boolean} [input.hasShareState] The page opened from a share link.
 * @param {string} [input.layerStateSource] The coordinator's source:
 *   'defaults' means no saved layer state and no share payload.
 * @param {Storage|null} [input.storage]
 * @returns {boolean}
 */
export function shouldApplySimpleDefaults({
  simpleUiActive,
  hasShareState = false,
  layerStateSource = 'defaults',
  storage,
} = {}) {
  if (!simpleUiActive) return false;
  if (hasShareState) return false;
  if (layerStateSource !== 'defaults') return false;
  return !simpleDefaultsApplied(storage);
}

/**
 * Turn the default layers on, as the visitor's own taps would.
 * @param {object} input
 * @param {{getAll?: Function, setEnabled: Function}} input.dataManager
 * @param {readonly string[]} [input.layerIds]
 * @param {Storage|null} [input.storage]
 * @param {AbortSignal} [input.signal]
 * @returns {Promise<{enabled: string[], failed: string[], skipped: string[]}>}
 */
export async function applySimpleDefaults({
  dataManager,
  layerIds = SIMPLE_DEFAULT_LAYER_IDS,
  storage,
  signal = null,
} = {}) {
  const known = dataManager?.getAll
    ? new Set((dataManager.getAll() || []).map((layer) => layer.id))
    : null;
  const enabled = [];
  const failed = [];
  const skipped = [];
  await Promise.all(
    layerIds.map(async (layerId) => {
      if (signal?.aborted || (known && !known.has(layerId))) {
        skipped.push(layerId);
        return;
      }
      try {
        const result = await dataManager.setEnabled(layerId, true, {
          origin: 'user',
        });
        (result === false ? failed : enabled).push(layerId);
      } catch {
        failed.push(layerId);
      }
    }),
  );
  // A first open with no network at all enables nothing; leaving the flag
  // unset lets the next open try again rather than settling on an empty
  // globe for good. Once one layer is on, the coordinator persists it and
  // this open counts as done.
  if (enabled.length) rememberSimpleDefaultsApplied(storage);
  return { enabled, failed, skipped };
}

/**
 * Startup entry point: wait for layer-state restoration to settle, then apply
 * the defaults when this open qualifies. Never throws.
 * @param {object} input
 * @param {object} input.styleManager Shell facade.
 * @param {object} [input.dataManager]
 * @param {() => boolean} input.simpleUiActive
 * @param {Storage|null} [input.storage]
 * @param {AbortSignal} [input.signal]
 * @returns {Promise<{applied: boolean, enabled?: string[], failed?: string[]}>}
 */
export async function startSimpleDefaults({
  styleManager,
  dataManager = styleManager?._dataManager,
  simpleUiActive,
  storage,
  signal = null,
} = {}) {
  try {
    await Promise.resolve(
      styleManager?._layerStateRestorePromise ??
        styleManager?.initialRestorePromise,
    ).catch(() => null);
    if (signal?.aborted || !dataManager) return { applied: false };
    const qualifies = shouldApplySimpleDefaults({
      simpleUiActive: Boolean(simpleUiActive?.()),
      hasShareState: Boolean(styleManager?.hasShareState),
      layerStateSource: styleManager?._layerStateCoordinator?.source,
      storage,
    });
    if (!qualifies) return { applied: false };
    const outcome = await applySimpleDefaults({ dataManager, storage, signal });
    if (outcome.failed.length)
      console.warn('[Simple] Default layers failed:', outcome.failed);
    return { applied: true, ...outcome };
  } catch (error) {
    console.warn('[Simple] Default layers did not apply:', error);
    return { applied: false };
  }
}
