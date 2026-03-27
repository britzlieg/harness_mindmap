import { isLayoutType } from '../shared/types';
import type {
  ExportFormat,
  LayoutType,
  MindmapPayload,
  Node,
} from '../shared/types';

const EXPORT_FORMATS: ExportFormat[] = ['markdown', 'svg', 'png'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function assertNodeArray(value: unknown, message: string = 'Nodes must be an array.'): asserts value is Node[] {
  if (!Array.isArray(value)) {
    throw new Error(message);
  }
}

export function assertMindmapPayload(
  value: unknown,
  message: string = 'Invalid mindmap payload.'
): asserts value is MindmapPayload {
  if (!isRecord(value)) {
    throw new Error(message);
  }

  const maybePayload = value as {
    nodes?: unknown;
    metadata?: unknown;
  };

  assertNodeArray(maybePayload.nodes, message);
  if (!isRecord(maybePayload.metadata)) {
    throw new Error(message);
  }
}

export function parseLayoutType(type: unknown, message: string = 'Invalid layout type.'): LayoutType {
  if (!isLayoutType(type)) {
    throw new Error(message);
  }
  return type;
}

export function parseExportFormat(
  format: unknown,
  message: string = 'Invalid export format.'
): ExportFormat {
  if (typeof format !== 'string' || !EXPORT_FORMATS.includes(format as ExportFormat)) {
    throw new Error(message);
  }
  return format as ExportFormat;
}
