import type { Node } from '../../shared/types';
import type { ExportRenderOptions, LegacySize, RenderScene } from '../export-service';
import { buildExportRenderScene } from '../export-service';

export function buildScene(
  nodes: Node[],
  optionsOrSize?: LegacySize | ExportRenderOptions
): RenderScene {
  return buildExportRenderScene(nodes, optionsOrSize);
}
