import * as Cesium from 'cesium';

/**
 * Multisampling is a real cost on phone GPUs and the gain is invisible on a
 * high-density handset screen, so touch-first devices render without it.
 * @param {{matchMedia?: Function}} [windowRef]
 * @returns {number}
 */
export function msaaSamplesForDevice(windowRef = globalThis.window) {
  try {
    return windowRef?.matchMedia?.('(pointer: coarse)')?.matches ? 1 : 4;
  } catch {
    return 4;
  }
}

/** Create the standard globe viewer in caller-owned, visible containers. */
export function createApplicationViewer({ container, creditContainer }) {
  if (!container || !creditContainer)
    throw new TypeError('Viewer and credit containers are required');
  const viewer = new Cesium.Viewer(container, {
    timeline: false,
    animation: false,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    vrButton: false,
    selectionIndicator: false,
    infoBox: false,
    baseLayer: false,
    creditContainer,
    msaaSamples: msaaSamplesForDevice(),
    contextOptions: { webgl: { preserveDrawingBuffer: true } },
  });
  try {
    viewer.targetFrameRate = 60;
    viewer.scene.globe.show = false;
    viewer.scene.skyAtmosphere.show = true;
    viewer.scene.skyAtmosphere.atmosphereLightIntensity = 18;
    viewer.scene.skyAtmosphere.saturationShift = -0.12;
    viewer.scene.skyAtmosphere.brightnessShift = -0.08;
    return viewer;
  } catch (error) {
    viewer.destroy();
    throw error;
  }
}
