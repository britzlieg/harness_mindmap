## ADDED Requirements

### Requirement: Cross-layer dependencies SHALL follow approved direction
The system architecture SHALL enforce dependency direction as `renderer -> shared <- electron`, and Electron modules MUST NOT import from renderer modules under `src/`.

#### Scenario: Build-time import boundary validation
- **WHEN** an Electron file imports from `src/` directly
- **THEN** the architecture validation and TypeScript build checks fail with a boundary violation

### Requirement: Shared domain modules SHALL host cross-process pure logic
Cross-process pure logic (types, normalization utilities, layout-compatible primitives) SHALL be placed in shared modules that are importable by both renderer and Electron layers.

#### Scenario: Shared utility consumed by both processes
- **WHEN** renderer and Electron both need the same domain utility
- **THEN** both import the utility from the shared module path instead of process-specific code

### Requirement: Boundary refactors MUST preserve existing user-visible behavior
Refactoring imports and module locations for boundary compliance MUST NOT change user-visible file operations, layout outcomes, or export workflows.

#### Scenario: Feature behavior after boundary refactor
- **WHEN** users perform open, save, layout switch, and export flows after boundary refactor
- **THEN** outcomes remain functionally equivalent to pre-refactor behavior
