import type { RenderScene } from '../export-service';
import {
  fitExportSceneForRaster,
  readPngDimensions,
  renderExportSceneToPngFallback,
  renderExportSceneToSvg,
  tryRenderExportPngViaElectronSvg,
} from '../export-service';

/**
 * Wait for fonts to load in the browser context before capturing.
 * Returns true if fonts loaded successfully, false if timed out.
 */
async function waitForFontsLoaded(webContents: any, timeoutMs: number = 3000): Promise<boolean> {
  try {
    const result = await Promise.race([
      webContents.executeJavaScript(
        `new Promise((resolve) => {
          const checkFonts = () => {
            if (document.fonts && document.fonts.ready) {
              document.fonts.ready.then(() => {
                // Wait for 2 requestAnimationFrame cycles after fonts are ready
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => {
                    resolve(true);
                  });
                });
              });
              return;
            }
            resolve(true);
          };
          checkFonts();
        })`,
        false
      ),
      new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), timeoutMs);
      }),
    ]);
    return result;
  } catch {
    return false;
  }
}

/**
 * Sobel edge detection filter to calculate gradient magnitude.
 * Returns the average gradient magnitude across the image.
 */
// Edge strength calculation removed: not used in current rendering path.

/**
 * Check if PNG buffer contains meaningful content.
 * Returns true if the PNG has valid dimensions (with 2% tolerance).
 * Note: Edge strength validation removed to avoid false positives on simple graphics.
 */
function isPngContentMeaningful(pngBuffer: Buffer, expectedWidth: number, expectedHeight: number): { valid: boolean; reason?: string } {
  // Quick sanity check: PNG must have valid dimensions
  const dims = readPngDimensions(pngBuffer);
  if (!dims) {
    return { valid: false, reason: 'invalid PNG dimensions' };
  }

  // Calculate 2% tolerance for dimension validation
  const widthTolerance = Math.max(2, Math.floor(expectedWidth * 0.02));
  const heightTolerance = Math.max(2, Math.floor(expectedHeight * 0.02));
  
  const widthDiff = Math.abs(dims.width - expectedWidth);
  const heightDiff = Math.abs(dims.height - expectedHeight);

  // Check if dimensions are within 2% tolerance
  if (widthDiff > widthTolerance || heightDiff > heightTolerance) {
    return { 
      valid: false, 
      reason: `dimension mismatch: expected ${expectedWidth}x${expectedHeight}, got ${dims.width}x${dims.height} (diff: ${widthDiff}x${heightDiff}, tolerance: ${widthTolerance}x${heightTolerance})`
    };
  }

  // Log warning if dimensions are within tolerance but not exact match
  if (widthDiff > 0 || heightDiff > 0) {
    console.log(`[PNG Export] Warning: Dimension minor mismatch within 2% tolerance: expected ${expectedWidth}x${expectedHeight}, got ${dims.width}x${dims.height}`);
  }

  // Basic size sanity check - PNG should have some compressed data
  // Use a very low threshold (0.001 = 0.1%) to allow simple graphics with large blank areas
  const minExpectedSize = Math.max(100, expectedWidth * expectedHeight * 0.001);
  if (pngBuffer.length < minExpectedSize) {
    return { valid: false, reason: 'PNG buffer too small, possible corruption' };
  }

  return { valid: true };
}

export async function renderPng(scene: RenderScene, scale: number = 1): Promise<Buffer> {
  const fittedScene = fitExportSceneForRaster(scene);
  const svg = renderExportSceneToSvg(fittedScene);
  const deviceScaleFactor = Math.max(1, Math.min(4, scale));

  console.log('[PNG Export] Debug SVG:', {
    svgLength: svg.length,
    width: fittedScene.width,
    height: fittedScene.height,
    nodeCount: fittedScene.nodes.length,
    hasText: svg.includes('<text'),
    hasFontFamily: svg.includes('font-family'),
  });

  // Level 1: Try Electron SVG rasterization with font loading wait
  const electronPng = await tryRenderExportPngViaElectronSvg(svg, fittedScene.width, fittedScene.height, scale);
  let fallbackReason = 'electron capture failed';

  if (electronPng) {
    // Level 2: Validate dimensions match expected scene size (with 2% tolerance)
    const size = readPngDimensions(electronPng);
    console.log('[PNG Export] Debug PNG:', {
      hasElectronPng: electronPng.length > 0,
      expectedWidth: fittedScene.width,
      expectedHeight: fittedScene.height,
      actualWidth: size?.width,
      actualHeight: size?.height,
      pngBufferSize: electronPng.length,
    });

    // Calculate 2% tolerance for dimension validation
    const widthTolerance = Math.max(2, Math.floor(fittedScene.width * 0.02));
    const heightTolerance = Math.max(2, Math.floor(fittedScene.height * 0.02));
    const widthDiff = Math.abs((size?.width || 0) - fittedScene.width);
    const heightDiff = Math.abs((size?.height || 0) - fittedScene.height);

    if (size && widthDiff <= widthTolerance && heightDiff <= heightTolerance) {
      // Log warning if dimensions are within tolerance but not exact match
      if (widthDiff > 0 || heightDiff > 0) {
        console.log(`[PNG Export] Warning: Dimension minor mismatch within 2% tolerance: expected ${fittedScene.width}x${fittedScene.height}, got ${size.width}x${size.height}`);
      }
      // Level 3: Validate content is meaningful (with 2% tolerance)
      const validation = isPngContentMeaningful(electronPng, fittedScene.width, fittedScene.height);
      if (validation.valid) {
        // Success: Log render path and metrics
        console.log('[PNG Export] Success:', {
          renderPath: 'electron',
          deviceScaleFactor,
          width: fittedScene.width,
          height: fittedScene.height,
          scale,
        });
        return electronPng;
      }
      // Content validation failed with 2% tolerance check
      fallbackReason = `content validation failed: ${validation.reason}`;
      console.log(`[PNG Export] ${fallbackReason}, falling back to software rendering`);
    } else {
      // Dimension validation failed
      fallbackReason = `dimension validation failed: expected ${fittedScene.width}x${fittedScene.height}, got ${size?.width}x${size?.height} (tolerance: ${widthTolerance}x${heightTolerance})`;
      console.log(`[PNG Export] ${fallbackReason}, falling back to software rendering`);
    }
  } else {
    // Electron capture failed (possibly due to font loading timeout)
    console.log('[PNG Export] Electron capture failed (returned null), falling back to software rendering');
  }

  // Fallback: Use software rendering (lower quality but guaranteed to work)
  const fallbackPng = renderExportSceneToPngFallback(fittedScene);

  // Log fallback metrics with detailed reason
  console.log('[PNG Export] Fallback success:', {
    renderPath: 'fallback',
    reason: fallbackReason,
    deviceScaleFactor,
    width: fittedScene.width,
    height: fittedScene.height,
    scale,
  });

  return fallbackPng;
}
