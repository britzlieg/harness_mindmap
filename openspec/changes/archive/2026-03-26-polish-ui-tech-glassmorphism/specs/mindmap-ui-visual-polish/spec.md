## ADDED Requirements

### Requirement: Technology-Inspired Visual Language
The application SHALL present a unified technology-inspired visual style across the main shell, sidebar, toolbar, and dialogs while preserving existing information hierarchy.

#### Scenario: Core surfaces render with consistent style primitives
- **WHEN** the application renders its primary UI containers
- **THEN** those containers MUST use the shared visual token system for surface, typography, border, and elevation values

### Requirement: Restrained Color Palette
The UI styling system SHALL enforce a restrained palette with neutral foundation tones and a minimal accent set to prevent color clutter.

#### Scenario: Accent usage stays constrained
- **WHEN** interactive controls and highlights are rendered
- **THEN** the UI MUST use only the configured neutral palette plus limited accent tokens defined by the shared visual system

### Requirement: Glassmorphism and Rounded Interactive Controls
Primary and secondary buttons, as well as key action controls, SHALL use glassmorphism-inspired styling and rounded corners.

#### Scenario: Buttons render with glass and radius treatment
- **WHEN** a user views actionable controls in toolbar, sidebar, and dialog actions
- **THEN** those controls MUST display translucent surface treatment, subtle border/elevation, and standardized rounded corner values

### Requirement: Behavioral Invariance During Visual Refresh
Visual restyling SHALL NOT alter existing functional behavior.

#### Scenario: Existing workflows remain unchanged
- **WHEN** users perform create, edit, save, open, and export operations
- **THEN** command handling, data persistence, keyboard shortcuts, and output behavior MUST remain functionally identical to pre-refresh behavior

### Requirement: Responsive Visual Consistency
The refreshed style SHALL remain usable and visually coherent on both desktop and mobile viewport sizes supported by the application.

#### Scenario: Visual system adapts across viewport sizes
- **WHEN** the viewport switches between desktop and mobile breakpoints
- **THEN** controls and containers MUST preserve readability, touch/click target clarity, and consistent token-driven styling
