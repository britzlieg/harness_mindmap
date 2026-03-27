## Why

PNG export currently succeeds at the file level but can produce an image that does not faithfully match the live canvas (for example stale layout/state or placeholder-like output). This breaks trust in export and blocks users who rely on exported images for sharing and reporting.

## What Changes

- Tighten PNG export behavior so rendered output must match the current canvas state at export time.
- Require export capture to use the same visual sources as the on-screen canvas (nodes, links, text, transforms, and theme styling).
- Ensure export flow waits for render stability after recent edits before snapshotting.
- Add validation coverage to catch mismatches between exported image content and current canvas data.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `mindmap-png-export`: strengthen requirements so PNG output must reflect the real current canvas content and latest edit state, not stale or synthetic imagery.

## Impact

- Affected frontend export trigger path and canvas-to-image preparation logic.
- Affected Electron export bridge/handler and image generation service wiring.
- Affected tests for export flow, render readiness timing, and image-content fidelity.
- No changes to document schema, persistence format, or non-export business workflows.
