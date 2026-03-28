import { describe, expect, it } from 'vitest';
import { normalizeWritePath, PathPolicyError } from '../../electron/ipc/path-policy';

describe('path policy', () => {
  it('normalizes valid path input', () => {
    const normalized = normalizeWritePath('C:/tmp/out.png', ['.png']);
    expect(normalized.toLowerCase()).toContain('c:');
    expect(normalized.toLowerCase()).toContain('out.png');
  });

  it('allows extensionless write paths', () => {
    const normalized = normalizeWritePath('C:/tmp/out', ['.png']);
    expect(normalized.toLowerCase()).toContain('c:');
    expect(normalized.toLowerCase()).toContain('out');
  });

  it('rejects empty path values', () => {
    expect(() => normalizeWritePath('   ', ['.png'])).toThrow(PathPolicyError);
    expect(() => normalizeWritePath('   ', ['.png'])).toThrow('Output path must be a non-empty string.');
  });

  it('rejects path with invalid extension', () => {
    expect(() => normalizeWritePath('C:/tmp/out.svg', ['.png'])).toThrow(PathPolicyError);
    expect(() => normalizeWritePath('C:/tmp/out.svg', ['.png'])).toThrow(
      'Output path extension ".svg" is not allowed for this operation.'
    );
  });

  it('rejects path with null bytes', () => {
    expect(() => normalizeWritePath('C:/tmp/out.png\0', ['.png'])).toThrow(PathPolicyError);
  });
});
