import type { RenderScene } from '../export-service';
import { renderExportSceneToSvg } from '../export-service';

export function renderSvg(scene: RenderScene): string {
  return renderExportSceneToSvg(scene);
}
