import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { normalizeLayoutType } from '../shared/types';
import type { FileMetadata, Node, NodeStyle } from '../shared/types';
import {
  DEFAULT_LAYOUT_TYPE,
  DEFAULT_MINDMAP_TITLE,
  DEFAULT_ROOT_TOPIC_TEXT,
  DEFAULT_THEME_NAME,
  MINDMAP_DOCUMENT_VERSION,
} from '../shared/defaults';
import { ensureNodeText } from '../shared/utils/node-text';
const SQLITE_FILE_SIGNATURE = 'SQLite format 3';

type MindmapFileErrorCode =
  | 'INVALID_FORMAT'
  | 'UNSUPPORTED_LEGACY_FORMAT'
  | 'READ_WRITE_FAILED';

interface MindmapDocument {
  version: number;
  metadata: FileMetadata;
  nodes: Node[];
}

interface MindmapPayload {
  nodes: Node[];
  metadata: FileMetadata;
}

export class MindmapFileError extends Error {
  code: MindmapFileErrorCode;

  constructor(code: MindmapFileErrorCode, message: string) {
    super(message);
    this.name = 'MindmapFileError';
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function parseNodeStyle(value: unknown): NodeStyle {
  if (!isRecord(value)) {
    throw new MindmapFileError('INVALID_FORMAT', 'Node style must be an object.');
  }
  return value as NodeStyle;
}

function parseNode(value: unknown, fallbackParentId: string | null = null): Node {
  if (!isRecord(value)) {
    throw new MindmapFileError('INVALID_FORMAT', 'Node must be an object.');
  }

  const {
    id,
    parentId,
    text,
    note,
    labels,
    tags,
    priority,
    progress,
    style,
    isFolded,
    positionX,
    positionY,
    orderIndex,
    createdAt,
    updatedAt,
    children,
  } = value;

  if (typeof id !== 'string' || id.length === 0) {
    throw new MindmapFileError('INVALID_FORMAT', 'Node id must be a non-empty string.');
  }
  if (parentId !== null && parentId !== undefined && typeof parentId !== 'string') {
    throw new MindmapFileError('INVALID_FORMAT', 'Node parentId must be string or null.');
  }
  if (typeof text !== 'string' || typeof note !== 'string') {
    throw new MindmapFileError('INVALID_FORMAT', 'Node text and note must be strings.');
  }
  if (!isStringArray(labels) || !isStringArray(tags)) {
    throw new MindmapFileError('INVALID_FORMAT', 'Node labels and tags must be string arrays.');
  }
  if (!isFiniteNumber(priority) || !isFiniteNumber(progress)) {
    throw new MindmapFileError('INVALID_FORMAT', 'Node priority/progress must be numbers.');
  }
  if (typeof isFolded !== 'boolean') {
    throw new MindmapFileError('INVALID_FORMAT', 'Node isFolded must be boolean.');
  }
  if (!isNullableNumber(positionX) || !isNullableNumber(positionY)) {
    throw new MindmapFileError('INVALID_FORMAT', 'Node positionX/positionY must be number or null.');
  }
  if (!isFiniteNumber(orderIndex) || !isFiniteNumber(createdAt) || !isFiniteNumber(updatedAt)) {
    throw new MindmapFileError('INVALID_FORMAT', 'Node orderIndex/createdAt/updatedAt must be numbers.');
  }

  let parsedChildren: Node[] = [];
  if (children !== undefined) {
    if (!Array.isArray(children)) {
      throw new MindmapFileError('INVALID_FORMAT', 'Node children must be an array when provided.');
    }
    parsedChildren = children.map((child) => parseNode(child, id));
  }

  return {
    id,
    parentId: parentId === undefined ? fallbackParentId : parentId,
    text: ensureNodeText(text),
    note,
    labels,
    tags,
    priority,
    progress,
    style: parseNodeStyle(style),
    isFolded,
    positionX,
    positionY,
    orderIndex,
    createdAt,
    updatedAt,
    children: parsedChildren,
  };
}

function collectNodeIds(nodes: Node[]): Set<string> {
  const ids = new Set<string>();
  const stack = [...nodes];
  while (stack.length > 0) {
    const current = stack.pop()!;
    ids.add(current.id);
    if (current.children && current.children.length > 0) {
      stack.push(...current.children);
    }
  }
  return ids;
}

function parseMetadata(value: unknown): FileMetadata {
  if (!isRecord(value)) {
    throw new MindmapFileError('INVALID_FORMAT', 'Metadata must be an object.');
  }

  const {
    title,
    rootTopicId,
    layoutType,
    theme,
    createdAt,
    updatedAt,
    version,
  } = value;

  if (typeof title !== 'string' || title.length === 0) {
    throw new MindmapFileError('INVALID_FORMAT', 'Metadata title must be a non-empty string.');
  }
  if (typeof rootTopicId !== 'string' || rootTopicId.length === 0) {
    throw new MindmapFileError('INVALID_FORMAT', 'Metadata rootTopicId must be a non-empty string.');
  }
  if (typeof theme !== 'string' || theme.length === 0) {
    throw new MindmapFileError('INVALID_FORMAT', 'Metadata theme must be a non-empty string.');
  }
  if (!isFiniteNumber(createdAt) || !isFiniteNumber(updatedAt) || !isFiniteNumber(version)) {
    throw new MindmapFileError('INVALID_FORMAT', 'Metadata createdAt/updatedAt/version must be numbers.');
  }

  return {
    title,
    rootTopicId,
    layoutType: normalizeLayoutType(layoutType),
    theme,
    createdAt,
    updatedAt,
    version,
  };
}

function parseDocument(value: unknown): MindmapDocument {
  if (!isRecord(value)) {
    throw new MindmapFileError('INVALID_FORMAT', 'Mindmap document must be an object.');
  }

  const { version, metadata, nodes } = value;
  if (!isFiniteNumber(version)) {
    throw new MindmapFileError('INVALID_FORMAT', 'Document version must be a number.');
  }
  if (!Array.isArray(nodes)) {
    throw new MindmapFileError('INVALID_FORMAT', 'Document nodes must be an array.');
  }

  const parsedNodes = nodes.map((node) => parseNode(node));
  const parsedMetadata = parseMetadata(metadata);

  const nodeIds = collectNodeIds(parsedNodes);
  if (!nodeIds.has(parsedMetadata.rootTopicId)) {
    throw new MindmapFileError('INVALID_FORMAT', 'Metadata rootTopicId must reference an existing node.');
  }

  return {
    version,
    metadata: parsedMetadata,
    nodes: parsedNodes,
  };
}

function createDefaultRootNode(): Node {
  const now = Date.now();
  return {
    id: uuidv4(),
    parentId: null,
    text: DEFAULT_ROOT_TOPIC_TEXT,
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
  };
}

function createDefaultMetadata(rootTopicId: string): FileMetadata {
  const now = Date.now();
  return {
    title: DEFAULT_MINDMAP_TITLE,
    rootTopicId,
    layoutType: DEFAULT_LAYOUT_TYPE,
    theme: DEFAULT_THEME_NAME,
    createdAt: now,
    updatedAt: now,
    version: MINDMAP_DOCUMENT_VERSION,
  };
}

function buildDocument(payload: MindmapPayload): MindmapDocument {
  const parsedNodes = payload.nodes.map((node) => parseNode(node));
  const parsedMetadata = parseMetadata(payload.metadata);
  const nodeIds = collectNodeIds(parsedNodes);
  if (!nodeIds.has(parsedMetadata.rootTopicId)) {
    throw new MindmapFileError('INVALID_FORMAT', 'Metadata rootTopicId must reference an existing node.');
  }

  return {
    version: MINDMAP_DOCUMENT_VERSION,
    metadata: {
      ...parsedMetadata,
      layoutType: normalizeLayoutType(parsedMetadata.layoutType),
      updatedAt: Date.now(),
    },
    nodes: parsedNodes,
  };
}

function writeFileAtomic(filePath: string, content: string): void {
  const directory = path.dirname(filePath);
  const tempPath = path.join(
    directory,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`
  );

  try {
    fs.writeFileSync(tempPath, content, { encoding: 'utf8' });
    fs.renameSync(tempPath, filePath);
  } catch (error) {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    const details = error instanceof Error ? error.message : String(error);
    throw new MindmapFileError('READ_WRITE_FAILED', `Failed to write mindmap file: ${details}`);
  }
}

function readDocument(filePath: string): MindmapDocument {
  let buffer: Buffer;
  try {
    buffer = fs.readFileSync(filePath);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    throw new MindmapFileError('READ_WRITE_FAILED', `Failed to read mindmap file: ${details}`);
  }

  if (buffer.subarray(0, SQLITE_FILE_SIGNATURE.length).toString('utf8') === SQLITE_FILE_SIGNATURE) {
    throw new MindmapFileError(
      'UNSUPPORTED_LEGACY_FORMAT',
      'Legacy SQLite-based .mindmap files are not supported.'
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(buffer.toString('utf8'));
  } catch {
    throw new MindmapFileError('INVALID_FORMAT', 'Mindmap file is not valid JSON.');
  }

  return parseDocument(parsed);
}

function toPayload(document: MindmapDocument): MindmapPayload {
  return {
    nodes: document.nodes,
    metadata: document.metadata,
  };
}

export function createMindmapFile(filePath: string): MindmapPayload {
  const root = createDefaultRootNode();
  const document: MindmapDocument = {
    version: MINDMAP_DOCUMENT_VERSION,
    metadata: createDefaultMetadata(root.id),
    nodes: [root],
  };
  writeFileAtomic(filePath, `${JSON.stringify(document, null, 2)}\n`);
  return toPayload(document);
}

export function openMindmapFile(filePath: string): MindmapPayload {
  return toPayload(readDocument(filePath));
}

export function saveMindmapFile(filePath: string, data: MindmapPayload): void {
  const normalizedPayload: MindmapPayload = {
    ...data,
    nodes: data.nodes.map((node) => parseNode(node)),
  };
  const document = buildDocument(normalizedPayload);
  writeFileAtomic(filePath, `${JSON.stringify(document, null, 2)}\n`);
}
