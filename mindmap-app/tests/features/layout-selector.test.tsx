import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LayoutSelector } from '../../src/components/Sidebar/LayoutSelector';
import { LAYOUT_TEXT } from '../../src/constants/ui-text';
import type { FileMetadata } from '../../src/types';

const mockSetMetadata = vi.fn();

let metadata: FileMetadata | null = {
  title: 'Test',
  rootTopicId: 'root-1',
  layoutType: 'mindmap',
  theme: 'default',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  version: 1,
};

vi.mock('../../src/stores/mindmap-store', () => ({
  useMindmapStore: (selector: (state: {
    metadata: FileMetadata | null;
    setMetadata: typeof mockSetMetadata;
  }) => unknown) => selector({
    metadata,
    setMetadata: mockSetMetadata,
  }),
}));

describe('LayoutSelector', () => {
  beforeEach(() => {
    mockSetMetadata.mockReset();
    metadata = {
      title: 'Test',
      rootTopicId: 'root-1',
      layoutType: 'mindmap',
      theme: 'default',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
    };
  });

  it('shows all supported layout options', () => {
    render(<LayoutSelector />);
    expect(screen.getByText(LAYOUT_TEXT.labels.mindmap)).toBeTruthy();
    expect(screen.getByText(LAYOUT_TEXT.labels.logic)).toBeTruthy();
    expect(screen.getByText(LAYOUT_TEXT.labels.org)).toBeTruthy();
    expect(screen.getByText(LAYOUT_TEXT.labels['tree-right'])).toBeTruthy();
    expect(screen.getByText(LAYOUT_TEXT.labels['tree-left'])).toBeTruthy();
  });

  it('highlights the active layout option', () => {
    metadata = { ...metadata!, layoutType: 'tree-left' };
    render(<LayoutSelector />);
    const activeButton = screen.getByText(LAYOUT_TEXT.labels['tree-left']);
    expect(activeButton.className).toContain('ui-option--active');
  });

  it('updates metadata layoutType when selecting a new mode', () => {
    render(<LayoutSelector />);
    fireEvent.click(screen.getByText(LAYOUT_TEXT.labels['tree-right']));
    expect(mockSetMetadata).toHaveBeenCalledWith({
      ...metadata,
      layoutType: 'tree-right',
    });
  });
});
