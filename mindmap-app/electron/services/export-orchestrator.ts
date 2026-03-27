import type { Node } from '../shared/types';
import type { ExportRenderOptions, LegacySize } from './export-service';
import { exportToMarkdown as exportMarkdown } from './export-service';
import { buildScene } from './export/scene-builder';
import { renderPng } from './export/png-renderer';
import { renderSvg } from './export/svg-renderer';

export function exportToMarkdown(nodes: Node[]): string {
  return exportMarkdown(nodes);
}

export function exportToSVG(
  nodes: Node[],
  optionsOrSize?: LegacySize | ExportRenderOptions
): string {
  return renderSvg(buildScene(nodes, optionsOrSize));
}

export async function exportToPNG(
  nodes: Node[],
  optionsOrSize?: LegacySize | ExportRenderOptions
): Promise<Buffer> {
  return renderPng(buildScene(nodes, optionsOrSize));
}
