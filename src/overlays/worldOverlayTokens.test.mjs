import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DETECTION_THEME_MAP,
  TOUCH_TYPE_SCALE,
  overlayTypeScale,
  scaleFontPx,
} from './worldOverlayTokens.js';
import { TRANSIT_TIER_KEYS } from '../data/transitPresetStyle.js';

test('every detection theme carries a distinct bracket colour for every transit mode', () => {
  // The detection canvas composites above the post-FX chain, so these are
  // literal screen colours in every preset — the mode signal the sprites
  // lose under NVG and FLIR. A missing key would silently fall back to the
  // theme's line colour and every mode would bracket alike.
  for (const [name, theme] of Object.entries(DETECTION_THEME_MAP)) {
    const seen = new Set();
    for (const key of TRANSIT_TIER_KEYS) {
      const colour = theme.tiers?.[key];
      assert.match(colour || '', /^#[0-9a-f]{6}$/i, `${name} ${key}`);
      if (key !== 'transit_unknown') seen.add(colour.toLowerCase());
    }
    assert.equal(
      seen.size,
      TRANSIT_TIER_KEYS.length - 1,
      `${name}: the five real modes differ`,
    );
  }
});

test('touch screens get one typography scale; desktops and broken matchMedia get none', () => {
  assert.equal(
    overlayTypeScale({ matchMedia: () => ({ matches: true }) }),
    TOUCH_TYPE_SCALE,
  );
  assert.ok(
    TOUCH_TYPE_SCALE > 1.2 && TOUCH_TYPE_SCALE <= 1.6,
    'readable, not cartoonish',
  );
  assert.equal(overlayTypeScale({ matchMedia: () => ({ matches: false }) }), 1);
  assert.equal(overlayTypeScale({}), 1);
  assert.equal(overlayTypeScale(undefined), 1);
  assert.equal(
    overlayTypeScale({
      matchMedia() {
        throw new Error('unsupported');
      },
    }),
    1,
  );
});

test('scaleFontPx grows only the pixel size, lands on half pixels, and leaves scale 1 alone', () => {
  assert.equal(
    scaleFontPx('600 12px "JetBrains Mono", monospace', 1.35),
    '600 16px "JetBrains Mono", monospace',
  );
  assert.equal(
    scaleFontPx('10px JetBrains Mono, monospace', 1.35),
    '13.5px JetBrains Mono, monospace',
  );
  assert.equal(
    scaleFontPx('500 10.5px "JetBrains Mono", monospace', 2),
    '500 21px "JetBrains Mono", monospace',
  );
  const same = '600 13px "JetBrains Mono", monospace';
  assert.equal(scaleFontPx(same, 1), same);
  assert.equal(scaleFontPx(same, NaN), same);
  assert.equal(scaleFontPx('bold monospace', 1.35), 'bold monospace');
  assert.equal(scaleFontPx(undefined, 1.35), '');
});
