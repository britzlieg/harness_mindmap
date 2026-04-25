import type { PngRenderResult, RenderScene } from '../export-service';
import { renderExportSceneToPng } from '../export-service';

export async function renderPng(scene: RenderScene, scale: number = 1): Promise<PngRenderResult> {
  return renderExportSceneToPng(scene, scale);
}
