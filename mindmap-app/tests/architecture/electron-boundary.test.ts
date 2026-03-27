import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const ROOT_DIR = path.resolve(__dirname, '../../electron');
const IMPORT_SRC_PATTERN = /from\s+['"][^'"]*src\//;

function collectTypeScriptFiles(directory: string): string[] {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTypeScriptFiles(absolutePath));
      continue;
    }

    if (entry.isFile() && absolutePath.endsWith('.ts')) {
      files.push(absolutePath);
    }
  }

  return files;
}

describe('electron boundary checks', () => {
  it('does not allow electron modules to import from src', () => {
    const files = collectTypeScriptFiles(ROOT_DIR);
    const violations: string[] = [];

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (IMPORT_SRC_PATTERN.test(content)) {
        violations.push(path.relative(path.resolve(__dirname, '../..'), filePath));
      }
    }

    expect(violations).toEqual([]);
  });
});
