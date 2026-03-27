## ADDED Requirements

### Requirement: File create/open operations MUST NOT fail due to bundled SQLite native loader
The system MUST keep SQLite native dependency loading runtime-safe in Electron so that `file:create` and `file:open` do not fail from bundled `better-sqlite3` binding resolution errors.

#### Scenario: Creating a mindmap in Electron uses externalized better-sqlite3
- **WHEN** the user triggers `file:create` in the Electron app
- **THEN** the operation completes without a dynamic require error for `better_sqlite3.node`

#### Scenario: Opening a mindmap in Electron uses externalized better-sqlite3
- **WHEN** the user triggers `file:open` for a valid `.mindmap` file
- **THEN** the operation completes without a dynamic require error for `better_sqlite3.node`
