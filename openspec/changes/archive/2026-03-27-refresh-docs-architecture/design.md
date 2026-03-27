## Context

The repository root `README.md` defines `mindmap-app/` as the active application and `docs/` as the documentation location. The current architecture doc set in `docs/mindmap-app-architecture` is useful, but parts of it drifted from the current code (for example, missing explicit coverage of custom window controls implemented through `window.electronAPI.window` and `window:*` IPC handlers).

## Goals / Non-Goals

**Goals:**
- Rebuild confidence that architecture docs reflect current implementation boundaries.
- Ensure navigation and section claims are internally consistent.
- Add missing module/impact references for window chrome and window IPC flow.

**Non-Goals:**
- No product feature implementation.
- No refactor of renderer/main code.
- No change to test logic beyond documentation references.

## Decisions

1. Validate docs against implementation entry points, not assumptions.
   - Source of truth: `src/App.tsx`, hooks/stores, `electron/preload.ts`, `electron/main.ts`, IPC handlers, and services.
   - Alternative considered: update docs from prior memory/version notes. Rejected because drift is the root issue.

2. Keep updates scoped to existing architecture doc set.
   - Update only files under `docs/mindmap-app-architecture` to match requested scope.
   - Alternative considered: create a new parallel doc set. Rejected to avoid duplicate navigation surfaces.

3. Capture behavior accurately even when imperfect.
   - If docs and implementation differ (for example shortcut text vs actual handler behavior), docs should reflect implementation truth and call out known mismatch where needed.

## Risks / Trade-offs

- [Risk] Future drift reappears as code evolves.
  -> Mitigation: keep docs tightly linked to concrete module paths and integration points.
- [Risk] Over-documenting internal details that may change frequently.
  -> Mitigation: document stable boundaries and key files, avoid line-level implementation detail.
