import type { RenderScene } from '../export-service';
import {
  fitExportSceneForRaster,
  renderExportSceneToPngFallback,
  renderExportSceneToSvg,
  tryRenderExportPngViaElectronSvg,
} from '../export-service';

export async function renderPng(scene: RenderScene): Promise<Buffer> {
  const fittedScene = fitExportSceneForRaster(scene);
  const svg = renderExportSceneToSvg(fittedScene);
  return (await tryRenderExportPngViaElectronSvg(svg, fittedScene.width, fittedScene.height))
    ?? renderExportSceneToPngFallback(fittedScene);
}
