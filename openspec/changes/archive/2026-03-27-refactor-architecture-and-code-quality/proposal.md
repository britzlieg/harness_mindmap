## Why

Current quality risks are concentrated in architecture boundaries and IPC contracts: `electron -> src` reverse dependencies are already breaking Electron TypeScript builds, IPC write-path boundaries are too permissive, and oversized modules are slowing safe iteration. We need a behavior-preserving refactor now to reduce regression risk while improving maintainability and security posture.

## What Changes

- Refactor shared domain logic into a dedicated shared layer so Electron and Renderer no longer depend on each other in the wrong direction.
- Harden IPC contracts with stricter request validation, sender checks, and safe file-path handling rules.
- Decompose oversized modules (especially export pipeline code) into focused units with clear responsibilities.
- Standardize naming/text resources and remove encoding inconsistencies that reduce readability and maintainability.
- Add refactor safety rails (targeted regression checks and parity verification) to ensure existing user-visible behavior is preserved.

## Capabilities

### New Capabilities
- `architecture-boundary-governance`: Define and enforce allowed dependency directions across `src`, `electron`, and shared modules.
- `ipc-contract-hardening`: Define mandatory runtime validation and security constraints for IPC entry points and file-write operations.
- `refactor-parity-guardrails`: Define behavior-parity checks required for non-functional refactors.

### Modified Capabilities
- `mindmap-file-operations`: Strengthen save/open pathway safety requirements at IPC boundaries without changing user workflows.
- `mindmap-png-export`: Preserve export behavior while allowing internal module decomposition and stricter contract checks.

## Impact

- Affected code: `electron/ipc/*`, `electron/services/*`, `src/types/*`, `src/utils/*`, selected hooks/stores, and test suites under `tests/ipc`, `tests/export`, and `tests/features`.
- Build/tooling impact: TypeScript project boundaries and import paths will be adjusted to remove cross-layer compile violations.
- Risk focus: preserve all current functional behavior (file operations, layout behavior, export behavior, keyboard shortcuts) while improving internal structure and safety.
