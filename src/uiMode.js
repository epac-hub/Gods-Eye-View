/**
 * Interface mode: the full operator console, or the simple view.
 *
 * The full console exposes every panel (data layers, scenes, display tuning,
 * CCTV calibration, context rails, the technical HUD). The simple view keeps
 * the globe and one labelled action bar, which is what a visitor on a phone
 * can actually use. The mode is a single body class so every surface can
 * follow it from CSS; this module owns the policy, the persistence and the
 * class, and nothing else.
 *
 * Resolution order on load: an explicit `?ui=simple|full` query wins, a share
 * link (camera in the URL hash) opens the full console its author configured,
 * then the visitor's stored choice, and finally the simple view.
 *
 * Phones are the exception: the full console is a desktop surface, and on a
 * phone-sized screen its panels stack over the globe and over each other until
 * nothing can be tapped. So on a phone the simple view is the only view: a
 * stored "full" and a share link both open the simple view there, and the bar
 * does not offer the switch. Only an explicit `?ui=full` still forces it, so
 * support can inspect the console on a handset.
 */

/**
 * The one definition of "phone" the mode policy and the stylesheet share:
 * a narrow screen, or a short landscape screen driven by touch.
 * src/ui/styles/simple.css repeats this list verbatim (pinned by a test).
 */
export const PHONE_MEDIA_QUERY =
  '(max-width: 720px), (pointer: coarse) and (max-height: 500px)';

/**
 * @param {{matchMedia?: Function}|null|undefined} [windowRef]
 * @returns {boolean}
 */
export function isPhoneViewport(windowRef = globalThis.window) {
  try {
    return Boolean(windowRef?.matchMedia?.(PHONE_MEDIA_QUERY)?.matches);
  } catch {
    return false;
  }
}

/** Durable preference. Written only when the visitor switches mode. */
export const UI_MODE_STORAGE_KEY = 'gev:ui-mode:v1';
export const UI_MODE_SIMPLE = 'simple';
export const UI_MODE_FULL = 'full';
/** Body class every simple-view rule keys on. */
export const UI_SIMPLE_CLASS = 'ui-simple';

/**
 * @param {unknown} value
 * @returns {'simple'|'full'|null}
 */
export function normalizeUiMode(value) {
  const text = String(value ?? '')
    .trim()
    .toLowerCase();
  if (text === UI_MODE_SIMPLE) return UI_MODE_SIMPLE;
  if (text === UI_MODE_FULL || text === 'advanced') return UI_MODE_FULL;
  return null;
}

/**
 * Does the URL hash carry a shared camera? Mirrors the share-link parser's
 * minimum: a finite latitude and longitude.
 * @param {string} hash `location.hash`, with or without the leading `#`.
 */
export function hasShareLinkHash(hash) {
  const text = String(hash ?? '').replace(/^#/, '');
  if (!text) return false;
  const params = new URLSearchParams(text);
  return (
    Number.isFinite(parseFloat(params.get('lat'))) &&
    Number.isFinite(parseFloat(params.get('lon')))
  );
}

/**
 * @param {object} [input]
 * @param {unknown} [input.stored] The persisted preference, if any.
 * @param {string} [input.search] `location.search`.
 * @param {string} [input.hash] `location.hash`.
 * @param {boolean} [input.phone] Phone-sized screen (see PHONE_MEDIA_QUERY).
 * @returns {'simple'|'full'}
 */
export function resolveInitialUiMode({
  stored,
  search = '',
  hash = '',
  phone = false,
} = {}) {
  const forced = normalizeUiMode(
    new URLSearchParams(String(search).replace(/^\?/, '')).get('ui'),
  );
  if (forced) return forced;
  if (phone) return UI_MODE_SIMPLE;
  if (hasShareLinkHash(hash)) return UI_MODE_FULL;
  return normalizeUiMode(stored) || UI_MODE_SIMPLE;
}

/** Resolve a storage area lazily; the global getter can throw in private mode. */
function storageArea(injected) {
  if (injected !== undefined) return injected;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * @param {Storage|null} [storage]
 * @returns {'simple'|'full'|null}
 */
export function readStoredUiMode(storage) {
  try {
    return normalizeUiMode(storageArea(storage)?.getItem(UI_MODE_STORAGE_KEY));
  } catch {
    return null;
  }
}

/**
 * @param {Storage|null|undefined} storage
 * @param {'simple'|'full'} mode
 * @returns {boolean} Whether the preference was written.
 */
export function writeStoredUiMode(storage, mode) {
  const normalized = normalizeUiMode(mode);
  if (!normalized) return false;
  try {
    storageArea(storage)?.setItem(UI_MODE_STORAGE_KEY, normalized);
    return true;
  } catch {
    return false;
  }
}

/**
 * Put the document in the given mode. Idempotent.
 * @param {Document|null|undefined} doc
 * @param {'simple'|'full'} mode
 * @returns {'simple'|'full'} The mode applied (defaults to simple on bad input).
 */
export function applyUiMode(doc, mode) {
  const normalized = normalizeUiMode(mode) || UI_MODE_SIMPLE;
  const body = doc?.body;
  if (body) {
    body.classList.toggle(UI_SIMPLE_CLASS, normalized === UI_MODE_SIMPLE);
    if (body.dataset) body.dataset.uiMode = normalized;
  }
  return normalized;
}

/**
 * @param {Document|null|undefined} [doc]
 * @returns {'simple'|'full'}
 */
export function currentUiMode(doc = globalThis.document) {
  return doc?.body?.classList?.contains(UI_SIMPLE_CLASS)
    ? UI_MODE_SIMPLE
    : UI_MODE_FULL;
}

/** @param {Document|null|undefined} [doc] */
export function isSimpleUiActive(doc = globalThis.document) {
  return currentUiMode(doc) === UI_MODE_SIMPLE;
}
