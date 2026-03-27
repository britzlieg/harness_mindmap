## Context

The application already provides complete mind map workflows (create/edit/save/open/export), but visual styling is currently inconsistent across shell layout, sidebar controls, toolbar actions, and dialogs. The requested change is a visual-only refresh: modern technology-inspired aesthetics, limited color usage, and glassy rounded controls, while preserving all existing behavior and data flow.

## Goals / Non-Goals

**Goals:**
- Establish a consistent visual system (tokens for color, radius, blur, border, shadow, spacing) that can be reused across UI surfaces.
- Deliver a technology-inspired style with restrained palette usage and high readability.
- Apply glassmorphism and rounded corner treatment to buttons and key interactive controls.
- Keep all functional behavior unchanged, including shortcuts, file operations, persistence, layout algorithms, and export behavior.
- Maintain desktop and mobile usability with responsive style adjustments.

**Non-Goals:**
- No changes to feature scope, interaction flows, or information architecture.
- No IPC, database, file schema, or business logic modifications.
- No new theme selection feature or user-custom theme editor in this change.

## Decisions

### 1) Introduce a semantic UI token layer for visual consistency
- Decision: Define/normalize CSS variables (or equivalent style tokens) for core visual primitives (surface, text, accent, blur, border alpha, radius, elevation).
- Rationale: Tokenization keeps the restyle coherent and limits color sprawl while making future style tuning safer.
- Alternative considered: Per-component hardcoded style updates. Rejected because it causes drift and inconsistent palette usage.

### 2) Implement glassmorphism only on interactive emphasis surfaces
- Decision: Apply backdrop blur, translucent fills, and subtle borders to action buttons, floating controls, and dialog action areas; keep content-heavy zones less transparent for readability.
- Rationale: Focused glass effects deliver the requested aesthetic without harming contrast or visual noise.
- Alternative considered: Full-screen glass overlays everywhere. Rejected due to readability and performance risk.

### 3) Standardize rounded geometry and control states
- Decision: Use consistent radius tiers (for example: small inputs, medium cards, large buttons/chips) and shared hover/active/focus rules.
- Rationale: Consistent geometry and state treatment improves perceived quality and scanability.
- Alternative considered: Keep current mixed radii and state styles. Rejected because it preserves inconsistency.

### 4) Enforce no-functional-change boundaries during refactor
- Decision: Restrict code changes to presentational layers (styles, class composition, visual tokens, non-behavioral markup wrappers). Existing handlers, store mutations, and command wiring remain untouched.
- Rationale: This protects existing workflows while allowing broad UI polish.
- Alternative considered: Opportunistic UX behavior tweaks during restyling. Rejected to avoid hidden regressions and scope creep.

### 5) Add visual regression-focused verification
- Decision: Update/add tests that validate class/style token application and key control rendering states without asserting behavior changes.
- Rationale: Keeps confidence high that only visuals changed.
- Alternative considered: Manual-only QA. Rejected because regressions are easy to miss across multiple surfaces.

## Risks / Trade-offs

- [Risk] Glass blur/transparency can reduce text contrast in some combinations.
  - Mitigation: Keep opacity floors and explicit contrast checks for text/icon tokens.
- [Risk] Visual token refactor may unintentionally alter spacing or hit targets.
  - Mitigation: Snapshot/component tests and manual smoke checks on core flows.
- [Risk] Backdrop filters may affect rendering performance on lower-end devices.
  - Mitigation: Limit blur radius and apply effects to bounded components instead of large continuous surfaces.

## Migration Plan

1. Introduce shared visual tokens and base utility classes first.
2. Restyle high-impact controls (buttons, toolbar, sidebar actions) with glass + rounded rules.
3. Restyle secondary surfaces (panels, dialogs, cards) to align with same palette and elevation scale.
4. Run targeted tests and manual smoke validation for create/edit/save/open/export flows.
5. If severe regression appears, rollback style layer changes while keeping functional code untouched.

## Open Questions

- Should export preview surfaces also use glass styling or remain solid for strict legibility?
- Is a single accent color sufficient, or should a secondary accent be allowed for status-only states?
