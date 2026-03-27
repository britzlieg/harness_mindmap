## Context

The current codebase has a nominal split between `src` (renderer) and `electron` (main process), but several Electron modules import from `src`, creating reverse dependencies and TypeScript compile instability (`rootDir` boundary violations). IPC handlers also accept broad `any` payloads and write paths with limited guardrails, increasing security and reliability risks. A large export service module mixes multiple responsibilities (scene building, SVG, PNG rasterization, Electron capture, markdown export), which increases change risk and review complexity.

This change targets internal architecture quality only and must preserve existing user-visible behavior.

## Goals / Non-Goals

**Goals:**
- Enforce one-way dependency rules through a shared boundary module set (`shared/*`) used by both renderer and Electron.
- Harden IPC boundaries with explicit contracts and runtime validation at handler entry points.
- Reduce module complexity by decomposing oversized services into focused components with stable interfaces.
- Preserve behavior for file operations, layout, keyboard workflows, and export output semantics.
- Improve maintainability by removing naming/encoding inconsistencies and tightening type contracts.

**Non-Goals:**
- No new end-user features or workflow changes.
- No redesign of UI layout, interaction model, or visual theme behavior.
- No new persistence format or migration to different storage engines.
- No broad performance rewrite beyond what is necessary for safe refactoring.

## Decisions

### 1) Introduce a shared core layer and forbid `electron -> src` imports
- Decision: Move shared types and pure domain helpers into `shared/*` (for example: layout normalization primitives, theme/type contracts, text-normalization helpers).
- Rationale: Fixes compile-boundary violations and clarifies dependency direction.
- Alternatives considered:
  - Keep current imports and relax `rootDir`: faster short-term but preserves architectural debt.
  - Duplicate code in both layers: avoids imports but increases drift risk.

### 2) Define typed IPC contracts with runtime validation at main-process entry
- Decision: Each IPC channel gets a typed request/response contract and runtime schema validation before business logic execution.
- Rationale: Prevents malformed payloads, narrows trust boundaries, and aligns declared types with runtime behavior.
- Alternatives considered:
  - Type-only validation (compile-time only): insufficient for runtime safety.
  - Central generic validator without channel contracts: lower ceremony but weaker explicitness.

### 3) Add file-path safety policy for all write-capable IPC flows
- Decision: Centralize path normalization and policy checks (`resolve`, extension checks, allowed targets/flows) before writes.
- Rationale: Reduces arbitrary path-write risk and makes write behavior auditable.
- Alternatives considered:
  - Per-handler ad-hoc checks: inconsistent and easy to miss.
  - No policy change: unacceptable given current risk profile.

### 4) Decompose export pipeline by responsibility while preserving outputs
- Decision: Split current export service into internal components:
  - scene construction
  - SVG rendering
  - PNG rendering/capture strategy
  - markdown serialization
  - orchestration facade for handlers
- Rationale: Smaller units are easier to test and safer to evolve.
- Alternatives considered:
  - Keep monolith and add comments/tests only: improves readability but not structural risk.

### 5) Behavior-parity guardrails for refactor safety
- Decision: Use existing test suites as baseline and add targeted parity checks where contracts change (IPC payload shape and export equivalence tolerance).
- Rationale: Ensures refactor does not alter expected behavior.
- Alternatives considered:
  - Manual QA only: insufficient for repeated safe iteration.

## Risks / Trade-offs

- [Risk] Shared-layer extraction causes temporary import churn and merge conflicts  
  → Mitigation: Stage extraction first, then migrate module-by-module with thin compatibility adapters.

- [Risk] Runtime validation may reject payloads previously tolerated by loose handlers  
  → Mitigation: Explicitly document acceptable payloads and normalize benign legacy shapes where safe.

- [Risk] Export decomposition could introduce subtle rendering differences  
  → Mitigation: Keep orchestration contract stable and compare representative PNG/SVG outputs via regression tests.

- [Risk] Refactor scope may grow beyond safe increment size  
  → Mitigation: Sequence work into small, verifiable slices with rollback-safe checkpoints.

## Migration Plan

1. Establish `shared/*` modules and switch cross-layer imports to shared contracts.
2. Introduce typed IPC contracts and validation wrappers without changing channel names.
3. Apply centralized file-path safety policy to write-capable handlers.
4. Decompose export service behind unchanged public facade and run parity checks.
5. Normalize naming/encoding artifacts and tighten remaining `any` hotspots.
6. Run targeted regression suite and verify no functional changes before merge.

Rollback strategy:
- Keep refactor in isolated commits per slice; if parity fails, revert last slice without rolling back unrelated stability fixes.

## Open Questions

- Should `layout:compute` remain exposed via IPC if layout is already computed in shared pure logic?
- What strictness level should path policy enforce for user-selected save targets on different platforms?
- Do we standardize all UI text files to UTF-8 in this change or split localization hygiene into a follow-up change?
