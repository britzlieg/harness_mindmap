import path from 'path';

type PathPolicyErrorCode = 'INVALID_PATH' | 'INVALID_EXTENSION';

export class PathPolicyError extends Error {
  code: PathPolicyErrorCode;

  constructor(code: PathPolicyErrorCode, message: string) {
    super(message);
    this.name = 'PathPolicyError';
    this.code = code;
  }
}

function normalizeExtensions(extensions: readonly string[]): string[] {
  return extensions.map((ext) => ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`);
}

export function normalizeWritePath(rawPath: unknown, allowedExtensions: readonly string[]): string {
  if (typeof rawPath !== 'string' || rawPath.trim().length === 0) {
    throw new PathPolicyError('INVALID_PATH', 'Output path must be a non-empty string.');
  }
  if (rawPath.includes('\0')) {
    throw new PathPolicyError('INVALID_PATH', 'Output path contains invalid null bytes.');
  }

  const normalizedPath = path.resolve(rawPath.trim());
  const normalizedExtensions = normalizeExtensions(allowedExtensions);
  const extension = path.extname(normalizedPath).toLowerCase();

  // Preserve existing UX: extensionless paths are allowed, but explicit extensions must be valid.
  if (extension && normalizedExtensions.length > 0 && !normalizedExtensions.includes(extension)) {
    throw new PathPolicyError(
      'INVALID_EXTENSION',
      `Output path extension "${extension}" is not allowed for this operation.`
    );
  }

  return normalizedPath;
}
