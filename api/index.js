/**
 * Vercel serverless entry for every `/api/*` route.
 *
 * The browser talks to the same local provider proxies that `vite dev` and
 * `vite preview` install as Connect middleware. This module mounts that same
 * middleware chain on a standalone Connect app so a static Vercel deployment
 * of `dist/` keeps its live data layers.
 *
 * Deliberately excluded:
 * - `gev-key-setup`: development-only Provider Settings; it writes `.env` and
 *   restarts the dev server, neither of which exists here.
 * - `ais-live-proxy`: holds a long-lived upstream WebSocket, which a
 *   request-scoped function cannot keep alive.
 *
 * Disk caches are written under `process.cwd()/.gev-cache`; the function's
 * working directory is read-only on Vercel, so the working directory is moved
 * to the runtime's temporary directory before the providers evaluate paths.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import connect from 'connect';

const EXCLUDED_PLUGINS = new Set(['gev-key-setup', 'ais-live-proxy']);

/** Point process.cwd() at a writable directory for the providers' disk caches. */
function useWritableWorkingDirectory() {
  const dir = path.join(os.tmpdir(), 'gods-eye-view');
  try {
    fs.mkdirSync(dir, { recursive: true });
    process.chdir(dir);
  } catch {
    // Fall through: providers already tolerate cache write failures.
  }
}

/** Build the Connect app once per function instance. */
async function createApp() {
  useWritableWorkingDirectory();
  const [{ localProviderPlugins }, { apiNotFoundPlugin }] = await Promise.all([
    import('../server/providers/local.js'),
    import('../server/standalone/api-not-found.js'),
  ]);
  const app = connect();
  const server = { middlewares: app, httpServer: undefined };
  const plugins = localProviderPlugins().filter(
    (plugin) => !EXCLUDED_PLUGINS.has(plugin.name),
  );
  for (const plugin of [...plugins, apiNotFoundPlugin()]) {
    const hook = plugin.configurePreviewServer ?? plugin.configureServer;
    const install = typeof hook === 'function' ? hook : hook?.handler;
    if (install) await install.call(plugin, server);
  }
  return app;
}

let appPromise;

/** Vercel Node handler: (req, res) with the Node.js helpers disabled. */
export default async function handler(req, res) {
  appPromise ??= createApp();
  const app = await appPromise;
  await new Promise((resolve) => {
    res.once('finish', resolve);
    res.once('close', resolve);
    app(req, res, (error) => {
      if (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal error' }));
      } else if (!res.headersSent) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unknown API route' }));
      }
    });
  });
}
