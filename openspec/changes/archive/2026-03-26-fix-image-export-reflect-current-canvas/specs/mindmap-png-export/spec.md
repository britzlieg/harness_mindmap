## ADDED Requirements

### Requirement: PNG export SHALL reflect the current rendered canvas scene
The PNG export pipeline SHALL generate image content from the same resolved scene data used for current on-screen rendering, including node text, node positions, connection paths, and active theme styling.

#### Scenario: Export after normal editing session
- **WHEN** a user edits nodes and immediately exports PNG
- **THEN** the generated PNG visually reflects the same nodes, labels, and connections currently shown on canvas

### Requirement: PNG export MUST use latest state after render readiness
Before snapshot capture, the export flow MUST wait for render readiness and then read the latest store snapshot used for export payload construction.

#### Scenario: Export right after text update
- **WHEN** a user changes node text and triggers PNG export without delay
- **THEN** the exported image contains the updated text, not the previous value

### Requirement: PNG export SHALL not fallback to synthetic placeholder imagery
If graph content is present, exported PNG SHALL include real graph geometry derived from current node/link bounds and MUST NOT produce blank or placeholder-like output unrelated to current canvas content.

#### Scenario: Export map with multiple connected nodes
- **WHEN** the canvas contains multiple connected nodes and user exports PNG
- **THEN** the resulting PNG contains rendered nodes and connection lines aligned to current graph bounds
