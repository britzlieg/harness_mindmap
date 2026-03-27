import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeSelector } from '../../src/components/Sidebar/ThemeSelector';
import { THEME_TEXT } from '../../src/constants/ui-text';
import type { FileMetadata } from '../../src/types';

const mockSetMetadata = vi.fn();
let metadataState: FileMetadata | null = null;

vi.mock('../../src/stores/mindmap-store', () => ({
  useMindmapStore: (selector: (state: { metadata: FileMetadata | null; setMetadata: typeof mockSetMetadata }) => unknown) => selector({
    metadata: metadataState,
    setMetadata: mockSetMetadata,
  }),
}));

describe('ThemeSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    metadataState = {
      title: 'Test',
      rootTopicId: 'root',
      layoutType: 'mindmap',
      theme: 'default',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
    };
  });

  it('highlights default theme when metadata theme is unknown', () => {
    metadataState = { ...metadataState!, theme: 'unknown-theme' };
    render(<ThemeSelector />);

    const defaultThemeButton = screen.getByRole('button', { name: new RegExp(THEME_TEXT.names.default) });
    expect(defaultThemeButton.className).toContain('ui-theme-card--active');
  });

  it('updates metadata theme when selecting a supported theme', () => {
    render(<ThemeSelector />);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(THEME_TEXT.names.dark) }));

    expect(mockSetMetadata).toHaveBeenCalledTimes(1);
    const nextMetadata = mockSetMetadata.mock.calls[0][0] as FileMetadata;
    expect(nextMetadata.theme).toBe('dark');
    expect(nextMetadata.layoutType).toBe('mindmap');
  });
});
