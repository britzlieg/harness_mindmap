# ipc-contract-hardening Specification

## Purpose
TBD - created by archiving change refactor-architecture-and-code-quality. Update Purpose after archive.
## Requirements
### Requirement: IPC handlers SHALL validate request payloads at runtime
Every write-capable or state-affecting IPC handler SHALL validate request payload shape and required fields before executing business logic.

#### Scenario: Invalid IPC payload is rejected
- **WHEN** a renderer call sends malformed or incomplete payload data
- **THEN** the handler rejects the request with a controlled error and performs no side effects

### Requirement: File-write IPC channels MUST enforce safe path policy
IPC channels that write files MUST normalize and validate output paths according to approved path policy before write operations.

#### Scenario: Save/export request with disallowed output path
- **WHEN** a write-capable IPC channel receives a path outside allowed policy
- **THEN** the operation is rejected and no file is written

### Requirement: IPC execution SHALL verify trusted call context
Handlers for privileged operations SHALL verify trusted call context (sender/frame constraints) before accepting execution.

#### Scenario: Untrusted IPC invocation attempt
- **WHEN** a privileged channel is invoked from an untrusted context
- **THEN** the handler denies execution and returns an authorization-style error

