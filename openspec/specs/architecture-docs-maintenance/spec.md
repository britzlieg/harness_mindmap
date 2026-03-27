# architecture-docs-maintenance Specification

## Purpose
TBD - created by archiving change refresh-docs-architecture. Update Purpose after archive.
## Requirements
### Requirement: Architecture docs SHALL match current implementation boundaries
The architecture documentation set under `docs/mindmap-app-architecture` SHALL describe the active renderer/main boundaries and module entry points that exist in the current codebase.

#### Scenario: Window-control architecture is documented
- **WHEN** a contributor reads the architecture docs for runtime boundaries
- **THEN** they can find the `WindowChrome -> preload window API -> main process window IPC` flow and related key files

### Requirement: Architecture navigation SHALL be internally consistent
Navigation and summary statements in the architecture docs SHALL not contradict the actual number or structure of listed documents.

#### Scenario: View count and list are aligned
- **WHEN** a contributor reads the architecture README overview
- **THEN** the listed view count matches the enumerated documents

### Requirement: Impact guidance SHALL include window-control change radius
Impact-radius guidance SHALL explicitly include window control bridge and IPC change effects to support safer regression planning.

#### Scenario: Window IPC change has mapped regression scope
- **WHEN** a contributor plans modifications to `window:*` IPC or preload surface
- **THEN** the impact-radius map identifies directly affected modules and minimum regression tests

