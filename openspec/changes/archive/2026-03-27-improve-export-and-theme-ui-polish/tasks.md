## 1. PNG Export Clarity Pipeline

- [x] 1.1 Trace and update PNG scale parameter flow across `ExportDialog`, preload/IPC, and `electron/services/export-service.ts` to ensure one consistent render scale source.
- [x] 1.2 Implement high-DPI offscreen rendering so text and geometry are rendered at target export scale instead of post-render bitmap stretching.
- [x] 1.3 Add or update export validation for scale bounds and failure messaging to prevent invalid high-cost render requests.

## 2. Theme Tokens for Sidebar Editor Input

- [x] 2.1 Extend theme variable mapping in `src/App.tsx` and theme definitions to include sidebar input background, border, text, and focus-ring tokens.
- [x] 2.2 Update sidebar node editor/input styles to consume theme tokens and keep glassmorphism transparency/blur behavior across themes.

## 3. Themed Window Chrome Integration

- [x] 3.1 Update Electron window configuration in `electron/main.ts` to support custom themed title bar controls (minimize/maximize/close) instead of default system chrome.
- [x] 3.2 Implement renderer-side title bar controls and wire window actions via secure IPC/preload APIs.
- [x] 3.3 Bind title bar control colors and interaction states to current theme and verify live updates on theme switch.

## 4. Zoom UI Cleanup

- [x] 4.1 Remove static `1:1` zoom text from `CanvasControls` while preserving existing zoom in/out/reset interactions.
- [x] 4.2 Adjust control spacing/alignment after text removal to keep toolbar and canvas controls visually balanced.

## 5. Regression Coverage and Validation

- [x] 5.1 Add/update tests for PNG export clarity and scale behavior in export service and IPC test suites.
- [x] 5.2 Add/update tests for theme propagation to sidebar inputs and window chrome related UI behavior.
- [x] 5.3 Run targeted integration and polish regressions for export flow, theme switching, and canvas controls cleanup.
