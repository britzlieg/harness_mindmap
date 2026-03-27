## 1. Shared Boundary Foundation

- [x] 1.1 Inventory all `electron -> src` imports and map each usage to a target `shared/*` module.
- [x] 1.2 Create `shared` module structure for cross-process types and pure utilities.
- [x] 1.3 Migrate shared contracts/utilities to `shared/*` and update imports in `src` and `electron`.
- [x] 1.4 Add boundary checks (TypeScript/project configuration and lint rules if applicable) to prevent new reverse imports.

## 2. IPC Contract Hardening

- [x] 2.1 Define typed request/response contracts for file, export, and layout IPC channels.
- [x] 2.2 Add runtime payload validation wrappers for privileged IPC handlers.
- [x] 2.3 Implement trusted sender/frame verification for privileged IPC entry points.
- [x] 2.4 Align preload-exposed API types with handler return shapes and remove contract drift.

## 3. File Path Safety Policy

- [x] 3.1 Implement centralized path normalization and policy checks for write-capable operations.
- [x] 3.2 Apply the policy to `file:save` and export write flows.
- [x] 3.3 Add safe error mapping for rejected path operations without crashing or mutating session state.

## 4. Export Service Decomposition

- [x] 4.1 Split export scene construction into a focused module with stable input/output contracts.
- [x] 4.2 Split SVG rendering and PNG rendering/capture logic into separate modules.
- [x] 4.3 Keep a thin export orchestration facade for IPC handlers to preserve external behavior.
- [x] 4.4 Remove dead code and consolidate shared constants used by export and canvas logic.

## 5. Naming and Code Quality Cleanup

- [x] 5.1 Replace high-risk `any`/`as any` hotspots in IPC boundary and editor-side helper code.
- [x] 5.2 Normalize UI text resource encoding and naming consistency in touched files.
- [x] 5.3 Refine duplicated defaults/constants to a single authoritative source where behavior must stay identical.

## 6. Regression and Parity Verification

- [x] 6.1 Execute targeted regression tests for file operations, IPC handlers, layout behavior, and export flows.
- [x] 6.2 Add/update parity tests for PNG/SVG export semantics and contract validation failures.
- [x] 6.3 Verify no user-visible behavior regression in keyboard shortcuts, open/save, layout switching, and export dialogs.
- [x] 6.4 Run full build/typecheck checks and document any residual risks in change notes.
