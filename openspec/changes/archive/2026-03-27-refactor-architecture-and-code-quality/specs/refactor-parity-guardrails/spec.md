## ADDED Requirements

### Requirement: Refactor changes SHALL pass behavior-parity regression checks
Non-functional refactor changes SHALL pass targeted regression checks that cover file operations, layout behavior, keyboard interactions, and export flows.

#### Scenario: Refactor candidate evaluated before merge
- **WHEN** a refactor branch is prepared for merge
- **THEN** required regression checks complete successfully with no behavior regressions

### Requirement: Export pipeline refactors MUST preserve output semantics
Refactors to export internals MUST preserve output semantics including format validity, non-empty graph rendering, and expected dimension rules.

#### Scenario: PNG/SVG export parity validation
- **WHEN** representative documents are exported before and after refactor
- **THEN** both outputs remain valid and equivalent in expected structural and visual semantics

### Requirement: Contract changes SHALL include compatibility verification
When type contracts or validation rules are tightened, the system SHALL verify compatibility with existing valid workflows and SHALL fail safely for invalid inputs.

#### Scenario: Existing valid workflow after contract tightening
- **WHEN** users execute standard open/save/export actions with valid inputs
- **THEN** workflows succeed without additional user steps or feature loss
