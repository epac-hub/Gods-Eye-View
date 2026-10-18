import {
  UI_MODE_FULL,
  UI_MODE_SIMPLE,
  applyUiMode,
  writeStoredUiMode,
} from '../uiMode.js';

/**
 * The simple view's one action bar and its "What to show" sheet.
 *
 * Nothing here owns data or camera state: every action is a call into the
 * shell's public seams (search, device location, globe reset) or the data
 * manager's enable/disable contract, so the simple view and the full console
 * always agree on what is on.
 */

/**
 * Layers the simple view offers, in display order, with plain-language names.
 * A layer missing from the catalog is skipped rather than shown dead.
 */
export const SIMPLE_LAYERS = Object.freeze([
  {
    id: 'flights',
    label: 'Aircraft',
    hint: 'Live airliners and private flights',
  },
  { id: 'military', label: 'Military aircraft', hint: 'Live military traffic' },
  { id: 'ais-live-vessels', label: 'Ships', hint: 'Live vessel positions' },
  { id: 'satellites', label: 'Satellites', hint: 'Objects in orbit overhead' },
  { id: 'earthquakes', label: 'Earthquakes', hint: 'Recent quakes from USGS' },
  { id: 'local-firms', label: 'Active fires', hint: 'NASA fire detections' },
  {
    id: 'rocket-launches',
    label: 'Rocket launches',
    hint: 'Upcoming and recent launches',
  },
  { id: 'cctv', label: 'Traffic cameras', hint: 'Public camera snapshots' },
  {
    id: 'military-installations',
    label: 'Military sites',
    hint: 'Mapped installations in view',
  },
  {
    id: 'radio',
    label: 'Radio stations',
    hint: 'Listen to local broadcasters',
  },
]);

/**
 * Project the data manager's layer list onto the simple view's rows.
 * @param {Array<{id: string, enabled?: boolean, lifecycleState?: string, stats?: {keyRequired?: boolean}}>} layers
 * @returns {Array<{id: string, label: string, hint: string, enabled: boolean, keyRequired: boolean, busy: boolean}>}
 */
export function simpleLayerRows(layers = []) {
  const byId = new Map((layers || []).map((layer) => [layer.id, layer]));
  const rows = [];
  for (const entry of SIMPLE_LAYERS) {
    const layer = byId.get(entry.id);
    if (!layer) continue;
    const state = String(layer.lifecycleState || '');
    rows.push({
      id: entry.id,
      label: entry.label,
      hint: entry.hint,
      enabled: layer.enabled === true,
      keyRequired: layer.stats?.keyRequired === true,
      busy: /ing$/.test(state),
    });
  }
  return rows;
}

/**
 * One-word status for a row.
 * @param {{enabled: boolean, keyRequired: boolean, busy: boolean}} row
 */
export function describeLayerState(row) {
  if (row.keyRequired && !row.enabled) return 'Needs key';
  if (row.busy) return 'Loading';
  return row.enabled ? 'On' : 'Off';
}

/**
 * Wire the simple bar. Safe to call when the markup is absent (returns null).
 * @param {object} input
 * @param {object} input.styleManager Shell facade.
 * @param {object} [input.dataManager] Layer manager (getAll/isEnabled/setEnabled/subscribe).
 * @param {Document} [input.documentRef]
 * @param {Storage|null} [input.storage] Injected preference store; `undefined` uses the global.
 * @returns {null|{destroy: Function, setMode: Function, renderLayers: Function}}
 */
export function initSimpleBar({
  styleManager,
  dataManager = styleManager?._dataManager,
  documentRef = globalThis.document,
  storage,
} = {}) {
  const doc = documentRef;
  const root = doc?.getElementById?.('simple-bar');
  if (!root || root.dataset?.initialized === 'true') return null;
  root.dataset.initialized = 'true';

  const sheet = doc.getElementById('simple-layers');
  const list = doc.getElementById('simple-layers-list');
  const searchForm = doc.getElementById('simple-search-form');
  const searchInput = doc.getElementById('simple-search-input');
  const fullViewToggle = doc.getElementById('simple-view-toggle');
  const action = (name) =>
    root.querySelector(`[data-simple-action="${name}"]`) ||
    sheet?.querySelector?.(`[data-simple-action="${name}"]`) ||
    null;

  const removers = [];
  const bind = (element, type, handler, options) => {
    if (!element?.addEventListener) return;
    element.addEventListener(type, handler, options);
    removers.push(() => element.removeEventListener(type, handler, options));
  };
  let destroyed = false;
  let unsubscribeLayers = null;

  const setExpanded = (button, expanded) => {
    button?.setAttribute?.('aria-expanded', expanded ? 'true' : 'false');
  };

  const closeSearch = () => {
    if (!searchForm) return;
    searchForm.hidden = true;
    setExpanded(action('search'), false);
  };
  const openSearch = () => {
    if (!searchForm) return;
    closeLayers();
    searchForm.hidden = false;
    setExpanded(action('search'), true);
    searchInput?.focus?.();
  };
  const closeLayers = () => {
    if (!sheet) return;
    sheet.hidden = true;
    setExpanded(action('layers'), false);
    unsubscribeLayers?.();
    unsubscribeLayers = null;
  };
  const openLayers = () => {
    if (!sheet) return;
    closeSearch();
    sheet.hidden = false;
    setExpanded(action('layers'), true);
    renderLayers();
    unsubscribeLayers?.();
    unsubscribeLayers = dataManager?.subscribe?.(() => renderLayers()) || null;
  };

  /** Repaint the sheet from the data manager's current layer list. */
  function renderLayers() {
    if (destroyed || !list || !dataManager?.getAll) return;
    const rows = simpleLayerRows(dataManager.getAll());
    list.replaceChildren();
    for (const row of rows) {
      const item = doc.createElement('div');
      item.className = 'simple-layer-row';
      item.setAttribute('role', 'listitem');
      item.dataset.layerId = row.id;

      const text = doc.createElement('div');
      text.className = 'simple-layer-text';
      const name = doc.createElement('span');
      name.className = 'simple-layer-name';
      name.textContent = row.label;
      const hint = doc.createElement('span');
      hint.className = 'simple-layer-hint';
      hint.textContent =
        row.keyRequired && !row.enabled
          ? 'Needs a provider key in Full view'
          : row.hint;
      text.append(name, hint);

      const toggle = doc.createElement('button');
      toggle.type = 'button';
      toggle.className = 'simple-layer-toggle';
      toggle.setAttribute('role', 'switch');
      toggle.setAttribute('aria-checked', row.enabled ? 'true' : 'false');
      toggle.setAttribute(
        'aria-label',
        `${row.label}: ${describeLayerState(row)}`,
      );
      toggle.dataset.state = describeLayerState(row)
        .toLowerCase()
        .replace(' ', '-');
      if (row.busy) toggle.setAttribute('aria-busy', 'true');
      const knob = doc.createElement('span');
      knob.className = 'simple-layer-knob';
      knob.textContent = describeLayerState(row);
      toggle.append(knob);
      bind(toggle, 'click', async () => {
        if (destroyed || toggle.getAttribute('aria-busy') === 'true') return;
        toggle.setAttribute('aria-busy', 'true');
        try {
          await dataManager.setEnabled(row.id, !dataManager.isEnabled(row.id), {
            origin: 'user',
          });
        } catch (error) {
          console.warn(`[Simple] ${row.id} toggle error:`, error);
        } finally {
          if (!destroyed) renderLayers();
        }
      });

      item.append(text, toggle);
      list.append(item);
    }
  }

  /** Switch mode, persist the choice, and tidy any open surface. */
  function setMode(mode) {
    closeSearch();
    closeLayers();
    const applied = applyUiMode(doc, mode);
    writeStoredUiMode(storage, applied);
    return applied;
  }

  bind(action('search'), 'click', () => {
    if (searchForm?.hidden === false) closeSearch();
    else openSearch();
  });
  bind(searchForm, 'submit', (event) => {
    event?.preventDefault?.();
    const query = String(searchInput?.value || '').trim();
    if (!query) return;
    void styleManager?.searchLocation?.(query);
    closeSearch();
  });
  bind(action('layers'), 'click', () => {
    if (sheet?.hidden === false) closeLayers();
    else openLayers();
  });
  bind(action('close-layers'), 'click', closeLayers);
  bind(action('locate'), 'click', async () => {
    const button = action('locate');
    button?.setAttribute?.('aria-busy', 'true');
    try {
      await styleManager?.flyToDeviceLocation?.({ origin: 'user' });
    } finally {
      button?.setAttribute?.('aria-busy', 'false');
    }
  });
  bind(action('globe'), 'click', () => {
    closeLayers();
    void styleManager?.resetToGlobeView?.();
  });
  bind(action('full'), 'click', () => setMode(UI_MODE_FULL));
  bind(fullViewToggle, 'click', () => setMode(UI_MODE_SIMPLE));
  bind(doc, 'keydown', (event) => {
    if (event?.key !== 'Escape') return;
    if (sheet?.hidden === false || searchForm?.hidden === false) {
      closeLayers();
      closeSearch();
    }
  });

  return {
    setMode,
    renderLayers,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unsubscribeLayers?.();
      unsubscribeLayers = null;
      for (const remove of removers.splice(0)) remove();
    },
  };
}
