## Why

Architecture documentation under `docs/mindmap-app-architecture` no longer fully matches the current implementation. This increases the risk of incorrect changes because contributors may rely on outdated dependency maps and module entry points.

## What Changes

- Refresh the architecture document set by re-validating it against the live codebase under `mindmap-app/`.
- Correct structural inconsistencies in doc navigation (for example, listed view counts vs actual files).
- Add missing architecture coverage for custom window chrome and `window:*` IPC flow.
- Update impact-radius guidance to include window-control related changes and their regression scope.

## Capabilities

### New Capabilities
- `architecture-docs-maintenance`: Maintain a code-validated architecture map for contributors, including renderer/main boundaries and impact-radius guidance.

### Modified Capabilities
- None.

## Impact

- Affected docs: `docs/mindmap-app-architecture/README.md`, `01-functional-architecture.md`, `02-design-architecture.md`, `03-module-key-files.md`, `impact-radius/01-change-impact-radius-map.md`.
- No runtime behavior, APIs, or dependencies change.
