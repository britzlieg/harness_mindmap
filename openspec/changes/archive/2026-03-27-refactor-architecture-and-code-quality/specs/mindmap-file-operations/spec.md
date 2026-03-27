## ADDED Requirements

### Requirement: Save and Save-As MUST enforce path safety without workflow changes
The file operation flow MUST validate and normalize write targets while preserving existing user interaction patterns for New/Open/Save/Save-As.

#### Scenario: User saves to a valid selected path
- **WHEN** a user selects a valid `.mindmap` destination through the save flow
- **THEN** the file is written successfully and the active session context remains unchanged

#### Scenario: Save request contains invalid path input
- **WHEN** a malformed or disallowed write path is passed to save handling
- **THEN** the operation fails safely with a controlled error and current in-memory session data remains intact

### Requirement: File operation errors SHALL be deterministic and non-crashing
Open/create/save failures SHALL surface deterministic error outcomes and MUST NOT crash the application or corrupt current editing state.

#### Scenario: Open failure on invalid file content
- **WHEN** the selected file cannot be parsed as a valid mindmap document
- **THEN** the operation reports failure and preserves the current document session
