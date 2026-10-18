import { initFirstRunExperience } from '../firstRunExperience.js';
import { initSimpleBar } from '../ui/simpleBar.js';
import { isSimpleUiActive } from '../uiMode.js';

/** Reveal welcome controls only after restoration and the loading transition. */
export function startApplicationChrome({
  loadingScreen,
  styleManager,
  dataManager,
  signal,
  initializeWelcome = initFirstRunExperience,
  initializeSettings,
  initializeSimpleBar = initSimpleBar,
  simpleUiActive = isSimpleUiActive,
}) {
  let disposed = false;
  let firstRun;
  let revealTimer;
  let resolveDelay;
  // The simple view's action bar is plain chrome: it needs no restoration
  // and no reveal choreography, so it binds at once.
  const simpleBar = initializeSimpleBar?.({ styleManager, dataManager });
  const minimumDelay = new Promise((resolve) => {
    resolveDelay = resolve;
  });
  const delayTimer = setTimeout(resolveDelay, 1000);
  const revealFirstRun = () => {
    if (disposed || signal.aborted || firstRun) return;
    // The mission launcher explains the full console's panels; the simple
    // view has none of them on screen, so it stays out of the way there.
    if (simpleUiActive?.()) return;
    firstRun = initializeWelcome?.({ styleManager, dataManager });
    clearTimeout(revealTimer);
    loadingScreen.removeEventListener('transitionend', revealFirstRun);
  };
  void Promise.all([styleManager.initialRestorePromise, minimumDelay])
    .catch(() => {
      /* Restoration reports its own outcome through the controls. */
    })
    .then(() => {
      if (disposed || signal.aborted) return;
      loadingScreen.classList.add('hidden');
      loadingScreen.addEventListener('transitionend', revealFirstRun, {
        once: true,
      });
      revealTimer = setTimeout(revealFirstRun, 900);
    });
  const keySetup = Promise.resolve(
    signal.aborted ? null : initializeSettings?.({ signal }),
  );
  // Own the pending initializer too; it must not reveal a dialog after abort.
  void keySetup.catch(() =>
    console.error('Provider settings initialization failed'),
  );
  return async () => {
    disposed = true;
    clearTimeout(delayTimer);
    clearTimeout(revealTimer);
    resolveDelay();
    loadingScreen.removeEventListener('transitionend', revealFirstRun);
    firstRun?.destroy();
    simpleBar?.destroy();
    (await keySetup.catch(() => null))?.destroy();
  };
}
