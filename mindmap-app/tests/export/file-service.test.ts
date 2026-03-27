import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { FileMetadata, Node } from '../../src/types';
import {
  createMindmapFile,
  openMindmapFile,
  saveMindmapFile,
  MindmapFileError,
} from '../../electron/services/file-service';

function createNode(overrides: Partial<Node> = {}): Node {
  const now = Date.now();
  return {
    id: 'root-1',
    parentId: null,
    text: 'Central Topic',
    note: '',
    labels: [],
    tags: [],
    priority: 0,
    progress: 0,
    style: {},
    isFolded: false,
    positionX: null,
    positionY: null,
    orderIndex: 0,
    createdAt: now,
    updatedAt: now,
    children: [],
    ...overrides,
  };
}

function createMetadata(rootTopicId: string): FileMetadata {
  const now = Date.now();
  return {
    title: 'Untitled',
    rootTopicId,
    layoutType: 'mindmap',
    theme: 'default',
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
}

describe('file-service', () => {
  let filePath: string;

  beforeEach(() => {
    filePath = path.join(os.tmpdir(), `test-fs-${Date.now()}-${Math.random()}.mindmap`);
  });

  afterEach(() => {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });

  it('creates a new mindmap file with default metadata and root node', () => {
    const result = createMindmapFile(filePath);

    expect(fs.existsSync(filePath)).toBe(true);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].text).toBe('Central Topic');
    expect(result.metadata.title).toBe('Untitled');
    expect(result.metadata.rootTopicId).toBe(result.nodes[0].id);
  });

  it('opens an existing mindmap file and returns metadata + nodes', () => {
    const created = createMindmapFile(filePath);
    const opened = openMindmapFile(filePath);

    expect(opened.metadata.title).toBe(created.metadata.title);
    expect(opened.nodes[0].id).toBe(created.nodes[0].id);
  });

  it('saves updated metadata and node tree', () => {
    const created = createMindmapFile(filePath);
    const child: Node = createNode({
      id: 'child-1',
      parentId: created.nodes[0].id,
      text: 'Child Node',
      orderIndex: 0,
      children: [],
    });
    const root: Node = {
      ...created.nodes[0],
      children: [child],
    };
    const metadata: FileMetadata = {
      ...created.metadata,
      title: 'Updated',
      layoutType: 'tree-left',
    };

    saveMindmapFile(filePath, { nodes: [root], metadata });
    const opened = openMindmapFile(filePath);

    expect(opened.metadata.title).toBe('Updated');
    expect(opened.metadata.layoutType).toBe('tree-left');
    expect(opened.nodes[0].children).toHaveLength(1);
    expect(opened.nodes[0].children?.[0].text).toBe('Child Node');
  });

  it('fills blank text with default when saving', () => {
    const created = createMindmapFile(filePath);
    const root = {
      ...created.nodes[0],
      text: '   ',
    };
    saveMindmapFile(filePath, { nodes: [root], metadata: created.metadata });
    const opened = openMindmapFile(filePath);

    expect(opened.nodes[0].text.trim().length).toBeGreaterThan(0);
  });

  it('normalizes unsupported layoutType to mindmap when opening', () => {
    const root = createNode();
    const metadata = { ...createMetadata(root.id), layoutType: 'unsupported-layout' as any };
    const raw = {
      version: 1,
      metadata,
      nodes: [root],
    };

    fs.writeFileSync(filePath, `${JSON.stringify(raw)}\n`, 'utf8');
    const opened = openMindmapFile(filePath);
    expect(opened.metadata.layoutType).toBe('mindmap');
  });

  it('throws legacy-format error when opening SQLite-based mindmap file', () => {
    fs.writeFileSync(filePath, 'SQLite format 3\0some-binary-content', 'utf8');

    expect(() => openMindmapFile(filePath)).toThrow(MindmapFileError);
    expect(() => openMindmapFile(filePath)).toThrow(/Legacy SQLite-based/i);
  });

  it('throws invalid-format error when rootTopicId does not exist in nodes', () => {
    const raw = {
      version: 1,
      metadata: createMetadata('missing-root'),
      nodes: [createNode({ id: 'root-1' })],
    };
    fs.writeFileSync(filePath, `${JSON.stringify(raw)}\n`, 'utf8');

    expect(() => openMindmapFile(filePath)).toThrow(MindmapFileError);
    expect(() => openMindmapFile(filePath)).toThrow(/rootTopicId/i);
  });
});
