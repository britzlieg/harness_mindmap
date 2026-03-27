## Context

The app already supports PNG export through the export dialog and Electron export pipeline, but current output can diverge from what users see on canvas at the moment of export. The likely failure mode is that export uses a stale or simplified render source instead of the same resolved scene (nodes, links, text, transforms, and theme styling) shown on screen.

This change is scoped to export fidelity. Functional workflows (create/edit/save/open/export entry points and keyboard shortcuts) must remain unchanged.

## Goals / Non-Goals

**Goals:**
- Ensure PNG export captures the same scene users currently see in the editor.
- Guarantee export uses the latest committed state after recent edits.
- Keep canvas-to-image flow deterministic and testable.
- Preserve existing export UX and command wiring.

**Non-Goals:**
- No redesign of export UI, formats, or file naming behavior.
- No changes to document schema, persistence model, or layout algorithms.
- No addition of new export formats or theme features.

## Decisions

### 1) Single render source for both screen and PNG
- Decision: Build PNG snapshot input from the same resolved canvas scene model used by runtime rendering (including node text, coordinates, connection geometry, active theme values, and current transform context).
- Rationale: Eliminates divergence between on-screen content and exported result.
- Alternative considered: Maintain a separate export-only scene builder. Rejected due to drift risk.

### 2) Explicit render-stability barrier before capture
- Decision: Keep and enforce a two-frame render-ready wait (or equivalent stable checkpoint) before collecting export payload, then read fresh store state at capture time.
- Rationale: Prevents stale frames right after edits.
- Alternative considered: Fixed timeout. Rejected because timing is less deterministic across devices.

### 3) Tighten bounds and scale derivation from current visible graph
- Decision: Compute export bounds from currently visible node/link geometry and ensure image dimensions map to those bounds with consistent padding.
- Rationale: Prevents blank/placeholder-like output and clipping.
- Alternative considered: Static canvas size snapshot. Rejected because it can miss off-center or zoomed content.

### 4) Verification through behavior-preserving regression tests
- Decision: Add/extend tests around export payload freshness, fidelity assumptions, and no-regression behavior for export/open/save/shortcut flows.
- Rationale: Confirms visual-fidelity fix without changing business behavior.
- Alternative considered: Manual-only checks. Rejected due to repeated regression risk.

## Risks / Trade-offs

- [Risk] Fidelity fixes may increase export compute cost on large graphs.
  - Mitigation: Keep geometry pass linear and avoid duplicate scene materialization.
- [Risk] Render-readiness checks can still race under extreme update bursts.
  - Mitigation: Always read latest store snapshot after readiness barrier and before final export call.
- [Risk] Bounds normalization may expose edge cases for very sparse or single-node maps.
  - Mitigation: Add minimum-size and fallback-padding behavior covered by tests.

## Migration Plan

1. Refactor export scene preparation to consume the canonical canvas scene inputs.
2. Keep existing export IPC contract, but ensure handler/service operate on fresh payload.
3. Add or update tests for freshness/fidelity and run targeted export + workflow regression suites.
4. If regressions appear, rollback to previous export builder while retaining new tests for guided re-fix.

## Open Questions

- Should PNG export mirror viewport-only content or full logical map bounds when parts are outside current viewport?
- Do we want optional transparent background export in a follow-up change?
