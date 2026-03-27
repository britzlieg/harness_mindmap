## Why

The current UI is functional but visually plain and inconsistent across panels, controls, and action buttons. A cohesive visual refresh is needed now to improve perceived quality and modernity without changing any existing behavior.

## What Changes

- Introduce a unified "tech" visual language with limited color tones and stronger hierarchy.
- Apply glassmorphism-style surfaces for key controls and floating action areas.
- Standardize rounded corners, spacing, and elevation across buttons and interactive controls.
- Refine typography, backgrounds, and contrast tokens for cleaner visual consistency.
- Preserve all existing features, workflows, keyboard shortcuts, persistence behavior, and export logic.

## Capabilities

### New Capabilities
- `mindmap-ui-visual-polish`: Defines non-functional UI style requirements for a technology-inspired appearance, constrained color palette, and glassy rounded controls.

### Modified Capabilities
- None.

## Impact

- Affected frontend UI layer (layout shell, sidebar, toolbar, dialogs, and shared button/control styles).
- Affected styling assets (CSS variables/theme tokens and component-level style modules).
- Affected visual regression and component tests that assert class names/styles.
- No backend, IPC contract, database schema, or file format changes.
