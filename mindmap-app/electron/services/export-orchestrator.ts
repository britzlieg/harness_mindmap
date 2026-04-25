import type { Node } from '../shared/types';
import type { ExportRenderOptions, LegacySize, PngRenderResult } from './export-service';
import type { ExportPreviewResult } from '../shared/types';
import { exportToMarkdown as exportMarkdown, fitExportSceneForRaster, normalizeExportRenderOptions } from './export-service';
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
  return (await exportToPNGWithDiagnostics(nodes, optionsOrSize)).buffer;
}

export async function exportToPNGWithDiagnostics(
  nodes: Node[],
  optionsOrSize?: LegacySize | ExportRenderOptions
): Promise<PngRenderResult> {
  const options = normalizeExportRenderOptions(optionsOrSize);
  return renderPng(buildScene(nodes, options), options.scale);
}

/**
 * Generate preview data for export dialog.
 * Returns SVG string, dimensions, and estimated file size.
 */
export function generateExportPreview(
  nodes: Node[],
  format: 'svg' | 'png',
  optionsOrSize?: LegacySize | ExportRenderOptions
): ExportPreviewResult {
  const scene = buildScene(nodes, optionsOrSize);
  const fittedScene = format === 'png' ? fitExportSceneForRaster(scene) : scene;
  const svg = renderSvg(fittedScene);
  
  // Estimate file size based on SVG string length
  // SVG typically compresses well, estimate ~0.3-0.5 bytes per char for PNG
  const estimatedSizeKb = Math.round(svg.length * 0.4 / 1024);
  
  return {
    svg,
    width: fittedScene.width,
    height: fittedScene.height,
    estimatedSizeKb,
  };
}
