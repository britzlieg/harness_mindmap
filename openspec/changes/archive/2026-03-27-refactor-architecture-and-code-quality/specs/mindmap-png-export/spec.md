## ADDED Requirements

### Requirement: PNG export refactor SHALL preserve existing export behavior
Internal restructuring of PNG export logic SHALL preserve existing user-visible behavior, including successful file creation, expected bounds coverage, and current scale handling semantics.

#### Scenario: Export after internal module decomposition
- **WHEN** a user exports PNG after refactor with a valid scale value
- **THEN** the export succeeds and produces a valid PNG representing the current mindmap scene

### Requirement: PNG export MUST validate and reject invalid scale input safely
The PNG export flow MUST validate scale input at the IPC boundary and MUST reject invalid values without writing partial or corrupted output.

#### Scenario: Invalid scale value at export request
- **WHEN** a PNG export request provides a non-integer or out-of-range scale value
- **THEN** the request is rejected with a controlled error and no output file is written

### Requirement: PNG export SHALL maintain session continuity on failure
If PNG export fails for validation or runtime reasons, the system SHALL preserve current editor session state and keep the document available for continued editing.

#### Scenario: Export failure due to runtime capture error
- **WHEN** PNG rendering fails during export
- **THEN** the user remains in the current document session with unchanged mindmap state
