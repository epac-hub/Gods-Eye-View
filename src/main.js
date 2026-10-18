import { createStandaloneApplication } from './standalone/application.js';
import { describeError } from './standalone/errors.js';
import {
  applyUiMode,
  isPhoneViewport,
  readStoredUiMode,
  resolveInitialUiMode,
} from './uiMode.js';

// Decide the interface mode before anything paints so the full console never
// flashes in front of a visitor who is about to get the simple view.
applyUiMode(
  document,
  resolveInitialUiMode({
    stored: readStoredUiMode(),
    search: window.location.search,
    hash: window.location.hash,
    phone: isPhoneViewport(window),
  }),
);

const application = createStandaloneApplication({
  googleApiKey: import.meta.env.GOOGLE_MAPS_API_KEY,
  cesiumToken: import.meta.env.CESIUM_ION_TOKEN,
  allowQaRegistration: import.meta.env.DEV,
});

application.start().catch((error) => {
  console.error("God's Eye View initialization failed:", error);
  const loaderStatus = document.querySelector('#loading-screen .loader-status');
  loaderStatus.textContent = `Error: ${describeError(error)}`;
  loaderStatus.style.color = '#ff4444';
});

export { application };
