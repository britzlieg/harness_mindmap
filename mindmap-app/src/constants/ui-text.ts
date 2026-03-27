import type { LayoutType } from '../types';

export const TOOLBAR_TEXT = {
  new: 'New',
  open: 'Open',
  save: 'Save',
  undo: 'Undo',
  redo: 'Redo',
  addChild: 'Add Child',
  export: 'Export',
  toggleSidebar: 'Toggle Sidebar',
  newNodeDefaultText: 'New Node',
  title: {
    new: 'New (Ctrl+N)',
    open: 'Open (Ctrl+O)',
    save: 'Save (Ctrl+S)',
    undo: 'Undo (Ctrl+Z)',
    redo: 'Redo (Ctrl+Y)',
    addChild: 'Add Child (Tab)',
    export: 'Export',
    toggleSidebar: 'Toggle Sidebar',
  },
} as const;

export const EXPORT_TEXT = {
  title: 'Export',
  cancel: 'Cancel',
  formats: {
    markdown: 'Markdown File',
    svg: 'SVG Vector',
    png: 'PNG Image',
  },
  pngScaleLabel: 'PNG Scale Percent',
  pngScaleHintPrefix: 'Allowed range:',
  pngScaleInvalid: 'Enter an integer between 50 and 400.',
} as const;

export const SIDEBAR_TEXT = {
  tabs: {
    editor: 'Editor',
    theme: 'Theme',
    layout: 'Layout',
  },
} as const;

export const NODE_EDITOR_TEXT = {
  empty: 'Select a node to edit.',
  label: 'Text',
} as const;

export const LAYOUT_TEXT = {
  title: 'Layout',
  labels: {
    mindmap: 'Mind Map',
    logic: 'Logic Chart',
    org: 'Org Chart',
    'tree-right': 'Tree Right',
    'tree-left': 'Tree Left',
  } as Record<LayoutType, string>,
} as const;

export const THEME_TEXT = {
  title: 'Theme',
  names: {
    default: 'Default',
    dark: 'Dark',
    ocean: 'Ocean',
    forest: 'Forest',
    sunset: 'Sunset',
  } as Record<string, string>,
} as const;

export function getThemeDisplayName(themeKey: string, fallback: string): string {
  return THEME_TEXT.names[themeKey] ?? fallback;
}

export const SHORTCUTS_TEXT = {
  title: 'Shortcuts',
  close: 'Close',
  items: [
    { key: 'Enter', desc: 'Add sibling node' },
    { key: 'Tab', desc: 'Add child node' },
    { key: 'Delete', desc: 'Delete node' },
    { key: 'Space', desc: 'Fold / unfold node' },
    { key: 'Ctrl + Z', desc: 'Undo' },
    { key: 'Ctrl + Y', desc: 'Redo' },
    { key: 'Ctrl + O', desc: 'Open file' },
    { key: 'Ctrl + S', desc: 'Save file' },
    { key: 'Ctrl + +', desc: 'Zoom in' },
    { key: 'Ctrl + -', desc: 'Zoom out' },
    { key: 'Ctrl + 0', desc: 'Reset zoom' },
    { key: '?', desc: 'Show help' },
  ],
} as const;

export const CANVAS_CONTROLS_TEXT = {
  zoomOut: 'Zoom Out (Ctrl+-)',
  zoomIn: 'Zoom In (Ctrl++)',
  resetZoom: 'Reset Zoom (Ctrl+0)',
} as const;

export const WINDOW_TEXT = {
  title: 'MindMap',
  minimize: 'Minimize window',
  maximize: 'Maximize window',
  restore: 'Restore window',
  close: 'Close window',
} as const;
