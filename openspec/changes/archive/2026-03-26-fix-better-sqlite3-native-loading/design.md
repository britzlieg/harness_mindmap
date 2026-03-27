## Overview
This patch fixes native module loading for `better-sqlite3` by ensuring Electron main output keeps it as an external runtime dependency rather than bundling its CommonJS internals.

## Design Decisions
### 1) Externalize `better-sqlite3` in Electron main build
- Update `vite.config.ts` for the Electron `main` entry build:
  - `build.rollupOptions.external = ["better-sqlite3"]`
- Rationale:
  - Native modules with `.node` bindings should not be inlined by Rollup.
  - Externalization preserves `require("better-sqlite3")` and delegates native resolution to Node/Electron runtime.

### 2) Add regression guard for native bundling
- Add `scripts/verify-native-bundle.js`:
  - Scans generated `dist-electron/*.js`.
  - Fails if `require("better-sqlite3")` is missing.
  - Fails if `better_sqlite3.node` marker appears in bundled output.
- Add npm script:
  - `verify:native-bundle`: runs `vite build` and then verification script.

## Out-of-Scope and Risks
- Existing unrelated TypeScript build failures (e.g., canvas nullability / unused vars) are intentionally not addressed in this patch.
- Release packaging behavior still relies on existing `electron-builder` dependency handling for native modules.
