## 1. Export Scene Fidelity

- [x] 1.1 Audit current PNG export path (UI trigger -> IPC -> export service) and document where stale/synthetic scene data is introduced.
- [x] 1.2 Refactor export payload construction to use the same resolved node/link/text/theme scene inputs as canvas rendering.
- [x] 1.3 Ensure export bounds and padding are derived from current visible graph geometry so output is not blank, clipped, or placeholder-like.

## 2. Fresh-State Capture Timing

- [x] 2.1 Enforce render-readiness barrier before snapshot capture and always read latest store snapshot after the barrier.
- [x] 2.2 Preserve existing export UX/handlers while wiring the freshness and fidelity changes through IPC/service layers.
- [x] 2.3 Add defensive fallback behavior for sparse graphs (minimum size/padding) without altering non-export workflows.

## 3. Verification And Regression Safety

- [x] 3.1 Add or update tests for PNG export fidelity (current text, positions, links, and theme-consistent scene capture).
- [x] 3.2 Add or update tests proving export uses latest state when triggered immediately after edits.
- [x] 3.3 Run targeted regression tests for export, create/edit/save/open, and keyboard shortcuts to confirm no behavior changes.


