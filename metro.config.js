const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

// ─── Preflight cleanup ────────────────────────────────────────────────────────
// Metro's FallbackWatcher crashes with ENOENT when it encounters a temporary
// directory that is created and then immediately deleted mid-scan.
//
// globalthis@1.0.4 (a transitive dep) creates a tmp dir
// (globalthis_tmp_<pid>/test) when its postinstall runs and deletes it before
// the process exits.  If pnpm runs the postinstall at the same time Metro is
// scanning node_modules, the watcher calls fs.watch() on a path that no
// longer exists → unhandled ENOENT → process crash.
//
// Fix 1 (proactive): remove any stale globalthis_tmp dirs before Metro boots.
// Fix 2 (reactive): add the pattern to resolver.blockList so the FallbackWatcher
//   skips any matching directory during both the initial scan AND runtime
//   change events (confirmed via code trace through recReaddir → walker.filterDir
//   and _processChange → doIgnore).
try {
  const globalthisNM = path.join(
    __dirname, '..', '..',
    'node_modules', '.pnpm',
    'globalthis@1.0.4', 'node_modules',
  );
  if (fs.existsSync(globalthisNM)) {
    for (const entry of fs.readdirSync(globalthisNM)) {
      if (/^[^@]+_tmp_\d+$/.test(entry)) {
        fs.rmSync(path.join(globalthisNM, entry), { recursive: true, force: true });
      }
    }
  }
} catch {
  // best-effort — never crash metro config loading
}

// ─── Metro config ─────────────────────────────────────────────────────────────
const config = getDefaultConfig(__dirname);

const existingBlockList = Array.isArray(config.resolver?.blockList)
  ? config.resolver.blockList
  : config.resolver?.blockList
    ? [config.resolver.blockList]
    : [];

config.resolver = {
  ...(config.resolver ?? {}),
  blockList: [
    ...existingBlockList,
    // Block any package temp dir (pattern: <pkg>_tmp_<pid>) so the watcher
    // never tries to watch them even if they're briefly created at runtime.
    /[/\\][^/\\]+_tmp_\d+([/\\]|$)/,
  ],
};

module.exports = config;
