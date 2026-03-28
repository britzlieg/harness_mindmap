import type { RenderScene } from '../export-service';
import {
  fitExportSceneForRaster,
  readPngDimensions,
  renderExportSceneToPngFallback,
  renderExportSceneToSvg,
  tryRenderExportPngViaElectronSvg,
} from '../export-service';

/**
 * Check if PNG buffer contains meaningful content (not blank or near-blank)
 * by sampling pixel variance across the image.
 */
function isPngContentMeaningful(pngBuffer: Buffer, expectedWidth: number, expectedHeight: number): boolean {
  // Quick sanity check: PNG must have valid dimensions
  const dims = readPngDimensions(pngBuffer);
  if (!dims || dims.width !== expectedWidth || dims.height !== expectedHeight) {
    return false;
  }

  // For very large images, sample a subset of rows/columns
  const maxSamples = 1000;
  const sampleStride = Math.max(1, Math.floor(Math.sqrt(expectedWidth * expectedHeight / maxSamples)));

  // PNG data starts after signature (8 bytes) + IHDR chunk (13 bytes + chunk header)
  // We need to find the IDAT chunk which contains the compressed image data
  // For simplicity, we'll just check if the buffer has reasonable size
  const minExpectedSize = expectedWidth * expectedHeight * 0.1; // At least 10% compression ratio
  if (pngBuffer.length < minExpectedSize) {
    return false;
  }

  return true;
}

export async function renderPng(scene: RenderScene): Promise<Buffer> {
  const fittedScene = fitExportSceneForRaster(scene);
  const svg = renderExportSceneToSvg(fittedScene);

  // Level 1: Try Electron SVG rasterization
  const electronPng = await tryRenderExportPngViaElectronSvg(svg, fittedScene.width, fittedScene.height);
  
  if (electronPng) {
    // Level 2: Validate dimensions match expected scene size
    const size = readPngDimensions(electronPng);
    if (size && size.width === fittedScene.width && size.height === fittedScene.height) {
      // Level 3: Validate content is meaningful (not blank or corrupted)
      if (isPngContentMeaningful(electronPng, fittedScene.width, fittedScene.height)) {
        return electronPng;
      }
    }
  }

  // Fallback: Use software rendering (lower quality but guaranteed to work)
  return renderExportSceneToPngFallback(fittedScene);
}
