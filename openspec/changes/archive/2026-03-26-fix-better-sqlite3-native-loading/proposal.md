## Why
Creating a new mindmap currently fails in Electron with:

`Error occurred in handler for 'file:create': Error: Could not dynamically require ".../build/better_sqlite3.node"...`

Root cause: the Electron main-process bundle inlines `better-sqlite3` and its `bindings` dynamic loader. At runtime this resolves native paths relative to the app root (`.../build/better_sqlite3.node`) instead of loading `better-sqlite3` as an external dependency from `node_modules`.

## What Changes
- Externalize `better-sqlite3` in the Electron main Vite/Rollup build to prevent bundling native binding loader logic.
- Add a lightweight bundle verification script to assert:
  - `require("better-sqlite3")` exists in `dist-electron` output.
  - `better_sqlite3.node` native-loader marker is not bundled into generated chunks.
- Add an npm script `verify:native-bundle` for local/CI regression checks.
- Add an OpenSpec patch update for `mindmap-file-operations` documenting that new/open flows must not fail due to SQLite native binding bundling.
- Record existing unrelated TypeScript build errors as known risk and out-of-scope for this patch.

## Impact
- Affected module: Electron main-process build configuration and validation tooling.
- No IPC contract change and no renderer/preload behavior changes.
- Improves reliability for file creation/opening in development and release build pipelines.
