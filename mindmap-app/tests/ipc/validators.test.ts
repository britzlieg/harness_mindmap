import { describe, expect, it } from 'vitest';
import {
  assertMindmapPayload,
  assertNodeArray,
  parseExportFormat,
  parseLayoutType,
} from '../../electron/ipc/validators';

describe('ipc validators', () => {
  it('assertNodeArray accepts arrays and rejects non-arrays', () => {
    expect(() => assertNodeArray([])).not.toThrow();
    expect(() => assertNodeArray({})).toThrow('Nodes must be an array.');
  });

  it('assertMindmapPayload accepts valid payload', () => {
    expect(() => assertMindmapPayload({ nodes: [], metadata: { title: 'ok' } })).not.toThrow();
  });

  it('assertMindmapPayload rejects invalid payload', () => {
    expect(() => assertMindmapPayload({ nodes: [] })).toThrow('Invalid mindmap payload.');
    expect(() => assertMindmapPayload(null)).toThrow('Invalid mindmap payload.');
  });

  it('parseLayoutType validates layout values', () => {
    expect(parseLayoutType('mindmap')).toBe('mindmap');
    expect(() => parseLayoutType('unknown')).toThrow('Invalid layout type.');
  });

  it('parseExportFormat validates export values', () => {
    expect(parseExportFormat('png')).toBe('png');
    expect(parseExportFormat('svg')).toBe('svg');
    expect(parseExportFormat('markdown')).toBe('markdown');
    expect(() => parseExportFormat('pdf')).toThrow('Invalid export format.');
  });
});
