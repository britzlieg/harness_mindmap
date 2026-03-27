## 1. Build configuration fix
- [x] 1.1 Externalize `better-sqlite3` in Electron main-process Vite/Rollup build.
- [x] 1.2 Keep preload/renderer behavior unchanged (no IPC contract changes).

## 2. Native bundle regression guard
- [x] 2.1 Add `scripts/verify-native-bundle.js` to validate `dist-electron` output.
- [x] 2.2 Add `verify:native-bundle` npm script to run build + validation.

## 3. Spec and risk documentation
- [x] 3.1 Add OpenSpec spec delta for `mindmap-file-operations` covering file create/open native-loading reliability.
- [x] 3.2 Record unrelated current TypeScript build errors as known out-of-scope risk for this patch.

## 4. Validation
- [x] 4.1 Run `npm run verify:native-bundle`.
- [x] 4.2 Run `npm test -- tests/ipc/file-handlers.test.ts`.
- [ ] 4.3 Manually verify `file:create` via toolbar and shortcut in Electron app (requires interactive runtime check).
