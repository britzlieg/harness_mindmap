import zlib from 'zlib';
import type { FileMetadata, Node, NodeStyle } from '../shared/types';
import { normalizeLayoutType } from '../shared/types';
import { getDepthAwareNodeThemeStyle, getTheme, normalizeThemeName } from '../shared/themes';
import { ensureNodeText } from '../shared/utils/node-text';
import type { ConnectionPath, Point } from '../shared/utils/geometry';
import { calculateConnectionPath, cubicBezier } from '../shared/utils/geometry';
import { computeLayout } from '../shared/utils/layout-algorithms';

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

export interface LegacySize {
  width: number;
  height: number;
}

export interface ExportRenderOptions {
  metadata?: FileMetadata | null;
  minWidth?: number;
  minHeight?: number;
  padding?: number;
  scale?: number;
}

interface NormalizedExportOptions {
  metadata: FileMetadata | null;
  minWidth: number;
  minHeight: number;
  padding: number;
  scale: number;
}

interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface SceneNode {
  id: string;
  text: string;
  priority: number;
  progress: number;
  x: number;
  y: number;
  width: number;
  height: number;
  style: Required<NodeStyle>;
}

export interface RenderScene {
  width: number;
  height: number;
  backgroundColor: string;
  gridColor: string;
  connectionColor: string;
  connectionWidth: number;
  dashedConnections: boolean;
  nodes: SceneNode[];
  connections: ConnectionPath[];
}

interface ContentBounds {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

const DEFAULT_EXPORT_MIN_WIDTH = 960;
const DEFAULT_EXPORT_MIN_HEIGHT = 640;
const DEFAULT_EXPORT_PADDING = 48;
const DEFAULT_EXPORT_SCALE = 1;
const MIN_EXPORT_SCALE = 0.5;
const MAX_EXPORT_SCALE = 4;
const MAX_RASTER_EXPORT_EDGE = 12000;
const MAX_RASTER_EXPORT_PIXELS = 96_000_000;
const FALLBACK_EXPORT_EDGE = 240;
const MAX_PNG_CAPTURE_TILE_EDGE = 2048;

/** Font family for PNG export SVG rasterization to ensure clear text rendering */
const FONT_FAMILY = 'system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';

const NODE_WIDTH = 120;
const NODE_HEIGHT = 36;
const LAYOUT_ORIGIN_X = 320;
const LAYOUT_ORIGIN_Y = 120;
const GRID_SIZE = 24;

const DEFAULT_NODE_STYLE: Required<NodeStyle> = {
  backgroundColor: '#f0f0f0',
  textColor: '#333333',
  borderColor: '#d9d9d9',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 400,
  padding: 8,
};

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let value = i;
    for (let bit = 0; bit < 8; bit++) {
      value = (value & 1) !== 0 ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    }
    table[i] = value >>> 0;
  }
  return table;
})();

function createEmptyContentBounds(): ContentBounds {
  return {
    top: Number.POSITIVE_INFINITY,
    left: Number.POSITIVE_INFINITY,
    bottom: Number.NEGATIVE_INFINITY,
    right: Number.NEGATIVE_INFINITY,
  };
}

function extendContentBoundsByPoint(bounds: ContentBounds, point: Point): void {
  bounds.left = Math.min(bounds.left, point.x);
  bounds.top = Math.min(bounds.top, point.y);
  bounds.right = Math.max(bounds.right, point.x);
  bounds.bottom = Math.max(bounds.bottom, point.y);
}

function extendContentBoundsByRect(
  bounds: ContentBounds,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  bounds.left = Math.min(bounds.left, x);
  bounds.top = Math.min(bounds.top, y);
  bounds.right = Math.max(bounds.right, x + width);
  bounds.bottom = Math.max(bounds.bottom, y + height);
}

function hasFiniteContentBounds(bounds: ContentBounds): boolean {
  return Number.isFinite(bounds.left)
    && Number.isFinite(bounds.top)
    && Number.isFinite(bounds.right)
    && Number.isFinite(bounds.bottom);
}

function scaleRenderScene(
  scene: RenderScene,
  scale: number,
  canvasRounding: 'ceil' | 'floor' = 'ceil'
): RenderScene {
  if (!Number.isFinite(scale) || scale <= 0) {
    return scene;
  }

  const roundCanvasDimension = canvasRounding === 'ceil' ? Math.ceil : Math.floor;
  const scaledNodes = scene.nodes.map((node) => ({
    ...node,
    x: node.x * scale,
    y: node.y * scale,
    width: node.width * scale,
    height: node.height * scale,
    style: {
      ...node.style,
      borderRadius: Math.max(0, Math.round(node.style.borderRadius * scale)),
      fontSize: Math.max(10, Math.round(node.style.fontSize * scale)),
      padding: Math.max(4, Math.round(node.style.padding * scale)),
    },
  }));
  const scaledConnections = scene.connections.map((path) => ({
    start: { x: path.start.x * scale, y: path.start.y * scale },
    end: { x: path.end.x * scale, y: path.end.y * scale },
    cp1: { x: path.cp1.x * scale, y: path.cp1.y * scale },
    cp2: { x: path.cp2.x * scale, y: path.cp2.y * scale },
  }));

  return {
    ...scene,
    width: Math.max(1, roundCanvasDimension(scene.width * scale)),
    height: Math.max(1, roundCanvasDimension(scene.height * scale)),
    connectionWidth: Math.max(1, Math.round(scene.connectionWidth * scale)),
    nodes: scaledNodes,
    connections: scaledConnections,
  };
}

function isLegacySize(value: LegacySize | ExportRenderOptions | undefined): value is LegacySize {
  if (!value || typeof value !== 'object') {
    return false;
  }
  return typeof (value as LegacySize).width === 'number' && typeof (value as LegacySize).height === 'number';
}

function isExportRenderOptions(value: LegacySize | ExportRenderOptions | undefined): value is ExportRenderOptions {
  if (!value || typeof value !== 'object') {
    return false;
  }
  // ExportRenderOptions has scale, minWidth, minHeight, padding, or metadata properties
  // while LegacySize only has width and height
  return 'scale' in value || 'minWidth' in value || 'minHeight' in value || 'padding' in value || 'metadata' in value;
}

function normalizeOptions(optionsOrSize?: LegacySize | ExportRenderOptions): NormalizedExportOptions {
  if (isLegacySize(optionsOrSize)) {
    return {
      metadata: null,
      minWidth: Math.max(1, Math.floor(optionsOrSize.width)),
      minHeight: Math.max(1, Math.floor(optionsOrSize.height)),
      padding: DEFAULT_EXPORT_PADDING,
      scale: DEFAULT_EXPORT_SCALE,
    };
  }

  const scale = typeof optionsOrSize?.scale === 'number' && Number.isFinite(optionsOrSize.scale)
    ? optionsOrSize.scale
    : DEFAULT_EXPORT_SCALE;

  return {
    metadata: optionsOrSize?.metadata ?? null,
    minWidth: Math.max(1, Math.floor(optionsOrSize?.minWidth ?? DEFAULT_EXPORT_MIN_WIDTH)),
    minHeight: Math.max(1, Math.floor(optionsOrSize?.minHeight ?? DEFAULT_EXPORT_MIN_HEIGHT)),
    padding: Math.max(0, Math.floor(optionsOrSize?.padding ?? DEFAULT_EXPORT_PADDING)),
    scale: Math.max(MIN_EXPORT_SCALE, Math.min(MAX_EXPORT_SCALE, scale)),
  };
}

function escapeXml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function mergeNodeStyles(themeStyle: NodeStyle, nodeStyle: NodeStyle): Required<NodeStyle> {
  return {
    backgroundColor: nodeStyle.backgroundColor ?? themeStyle.backgroundColor ?? DEFAULT_NODE_STYLE.backgroundColor,
    textColor: nodeStyle.textColor ?? themeStyle.textColor ?? DEFAULT_NODE_STYLE.textColor,
    borderColor: nodeStyle.borderColor ?? themeStyle.borderColor ?? DEFAULT_NODE_STYLE.borderColor,
    borderRadius: nodeStyle.borderRadius ?? themeStyle.borderRadius ?? DEFAULT_NODE_STYLE.borderRadius,
    fontSize: nodeStyle.fontSize ?? themeStyle.fontSize ?? DEFAULT_NODE_STYLE.fontSize,
    fontWeight: nodeStyle.fontWeight ?? themeStyle.fontWeight ?? DEFAULT_NODE_STYLE.fontWeight,
    padding: nodeStyle.padding ?? themeStyle.padding ?? DEFAULT_NODE_STYLE.padding,
  };
}

function parseHexColor(value: string): RgbaColor | null {
  const normalized = value.trim();
  if (!normalized.startsWith('#')) return null;

  if (normalized.length === 4) {
    const r = parseInt(`${normalized[1]}${normalized[1]}`, 16);
    const g = parseInt(`${normalized[2]}${normalized[2]}`, 16);
    const b = parseInt(`${normalized[3]}${normalized[3]}`, 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
    return { r, g, b, a: 255 };
  }

  if (normalized.length === 7 || normalized.length === 9) {
    const r = parseInt(normalized.slice(1, 3), 16);
    const g = parseInt(normalized.slice(3, 5), 16);
    const b = parseInt(normalized.slice(5, 7), 16);
    const a = normalized.length === 9 ? parseInt(normalized.slice(7, 9), 16) : 255;
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b) || Number.isNaN(a)) return null;
    return { r, g, b, a };
  }

  return null;
}

function parseRgbColor(value: string): RgbaColor | null {
  const normalized = value.replace(/\s+/g, '');
  const match = /^rgba?\((\d+),(\d+),(\d+)(?:,([0-9.]+))?\)$/i.exec(normalized);
  if (!match) return null;

  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);
  const alpha = match[4] === undefined ? 1 : Number(match[4]);
  if ([r, g, b, alpha].some((part) => Number.isNaN(part))) return null;

  return {
    r: Math.max(0, Math.min(255, Math.round(r))),
    g: Math.max(0, Math.min(255, Math.round(g))),
    b: Math.max(0, Math.min(255, Math.round(b))),
    a: Math.max(0, Math.min(255, Math.round(alpha * 255))),
  };
}

function parseColor(value: string | undefined, fallback: RgbaColor): RgbaColor {
  if (!value) return fallback;
  return parseHexColor(value) ?? parseRgbColor(value) ?? fallback;
}

function buildRenderScene(nodes: Node[], optionsOrSize?: LegacySize | ExportRenderOptions): RenderScene {
  const options = normalizeOptions(optionsOrSize);
  const metadata = options.metadata;
  // Critical fidelity rule: export must be built from the same layout + theme inputs as canvas rendering.
  const layoutType = normalizeLayoutType(metadata?.layoutType);
  const theme = getTheme(normalizeThemeName(metadata?.theme));
  const positions = computeLayout(nodes, layoutType);
  const nodeRects = new Map<string, { x: number; y: number; width: number; height: number }>();
  const visible: Array<{ node: Node; depth: number }> = [];
  const connections: ConnectionPath[] = [];
  const sceneNodes: SceneNode[] = [];

  for (const [nodeId, position] of positions) {
    nodeRects.set(nodeId, {
      x: position.x + LAYOUT_ORIGIN_X,
      y: position.y + LAYOUT_ORIGIN_Y,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
  }

  function collectVisible(nodeList: Node[], depth: number): void {
    for (const node of nodeList) {
      if (!nodeRects.has(node.id)) continue;
      visible.push({ node, depth });
      if (node.children && !node.isFolded) {
        collectVisible(node.children, depth + 1);
      }
    }
  }

  function collectConnections(nodeList: Node[]): void {
    for (const node of nodeList) {
      if (!node.children || node.isFolded) continue;
      const from = nodeRects.get(node.id);
      if (!from) continue;
      for (const child of node.children) {
        const to = nodeRects.get(child.id);
        if (!to) continue;
        connections.push(calculateConnectionPath(from, to));
      }
      collectConnections(node.children);
    }
  }

  collectVisible(nodes, 0);
  collectConnections(nodes);

  for (const entry of visible) {
    const rect = nodeRects.get(entry.node.id);
    if (!rect) continue;
    const hasChildren = (entry.node.children?.length ?? 0) > 0;
    const baseThemeStyle = getDepthAwareNodeThemeStyle(theme, entry.depth, hasChildren);
    const style = mergeNodeStyles(baseThemeStyle, entry.node.style ?? {});

    sceneNodes.push({
      id: entry.node.id,
      text: entry.node.text,
      priority: entry.node.priority,
      progress: entry.node.progress,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      style,
    });
  }

  const contentBounds = createEmptyContentBounds();

  for (const node of sceneNodes) {
    extendContentBoundsByRect(contentBounds, node.x, node.y, node.width, node.height);
  }

  for (const path of connections) {
    extendContentBoundsByPoint(contentBounds, path.start);
    extendContentBoundsByPoint(contentBounds, path.end);
    extendContentBoundsByPoint(contentBounds, path.cp1);
    extendContentBoundsByPoint(contentBounds, path.cp2);
  }

  if (!hasFiniteContentBounds(contentBounds)) {
    contentBounds.left = 0;
    contentBounds.top = 0;
    contentBounds.right = Math.max(options.minWidth, FALLBACK_EXPORT_EDGE);
    contentBounds.bottom = Math.max(options.minHeight, FALLBACK_EXPORT_EDGE);
  }

  // Calculate content dimensions based on the four extreme boundary points
  const contentWidth = Math.max(1, contentBounds.right - contentBounds.left);
  const contentHeight = Math.max(1, contentBounds.bottom - contentBounds.top);

  // Debug: Log content bounds
  console.log(`[PNG Export] Content bounds: left=${contentBounds.left}, top=${contentBounds.top}, right=${contentBounds.right}, bottom=${contentBounds.bottom}`);
  console.log(`[PNG Export] Content size: ${contentWidth}x${contentHeight}, logical: ${Math.max(options.minWidth, Math.ceil(contentWidth + options.padding * 2), FALLBACK_EXPORT_EDGE)}x${Math.max(options.minHeight, Math.ceil(contentHeight + options.padding * 2), FALLBACK_EXPORT_EDGE)}`);

  // Add padding and ensure minimum dimensions
  const logicalWidth = Math.max(options.minWidth, Math.ceil(contentWidth + options.padding * 2), FALLBACK_EXPORT_EDGE);
  const logicalHeight = Math.max(options.minHeight, Math.ceil(contentHeight + options.padding * 2), FALLBACK_EXPORT_EDGE);

  // Calculate offset to center content within the padded canvas
  // The offset ensures that the leftmost/topmost content starts at 'padding' pixels from the canvas edge
  const extraHorizontalSpace = Math.max(0, logicalWidth - (contentWidth + options.padding * 2));
  const extraVerticalSpace = Math.max(0, logicalHeight - (contentHeight + options.padding * 2));
  const offsetX = options.padding + extraHorizontalSpace / 2 - contentBounds.left;
  const offsetY = options.padding + extraVerticalSpace / 2 - contentBounds.top;

  const shiftedNodes = sceneNodes.map((node) => ({
    ...node,
    x: node.x + offsetX,
    y: node.y + offsetY,
    text: ensureNodeText(node.text),
  }));

  const shiftedConnections = connections.map((path) => ({
    start: { x: path.start.x + offsetX, y: path.start.y + offsetY },
    end: { x: path.end.x + offsetX, y: path.end.y + offsetY },
    cp1: { x: path.cp1.x + offsetX, y: path.cp1.y + offsetY },
    cp2: { x: path.cp2.x + offsetX, y: path.cp2.y + offsetY },
  }));

  const baseScene: RenderScene = {
    width: logicalWidth,
    height: logicalHeight,
    backgroundColor: theme.canvas.background,
    gridColor: theme.canvas.gridColor,
    connectionColor: theme.connection.color,
    connectionWidth: Math.max(1, Math.round(theme.connection.width)),
    dashedConnections: theme.connection.style === 'dashed',
    nodes: shiftedNodes,
    connections: shiftedConnections,
  };

  return scaleRenderScene(baseScene, options.scale, 'ceil');
}

export function buildExportRenderScene(
  nodes: Node[],
  optionsOrSize?: LegacySize | ExportRenderOptions
): RenderScene {
  return buildRenderScene(nodes, optionsOrSize);
}

function renderSceneToSvg(scene: RenderScene): string {
  const dashAttr = scene.dashedConnections ? ' stroke-dasharray="6 4"' : '';

  const pathMarkup = scene.connections
    .map((path) => (
      `<path d="M ${path.start.x.toFixed(2)} ${path.start.y.toFixed(2)} C ${path.cp1.x.toFixed(2)} ${path.cp1.y.toFixed(2)}, ${path.cp2.x.toFixed(2)} ${path.cp2.y.toFixed(2)}, ${path.end.x.toFixed(2)} ${path.end.y.toFixed(2)}" stroke="${escapeXml(scene.connectionColor)}" stroke-width="${scene.connectionWidth}" fill="none"${dashAttr}/>`
    ))
    .join('\n');

  const nodeMarkup = scene.nodes
    .map((node) => {
      const text = escapeXml(node.text || ' ');
      const textX = node.x + Math.max(8, node.style.padding);
      const textY = node.y + node.height / 2 + Math.max(10, node.style.fontSize) * 0.34;
      const progressBar = node.progress > 0
        ? `<rect x="${(node.x + 6).toFixed(2)}" y="${(node.y + node.height - 6).toFixed(2)}" width="${(node.width - 12).toFixed(2)}" height="3" rx="2" fill="#e0e0e0"/><rect x="${(node.x + 6).toFixed(2)}" y="${(node.y + node.height - 6).toFixed(2)}" width="${((node.width - 12) * Math.max(0, Math.min(1, node.progress))).toFixed(2)}" height="3" rx="2" fill="#52c41a"/>`
        : '';
      const priorityBadge = node.priority > 0
        ? `<g transform="translate(${(node.x + node.width - 24).toFixed(2)}, ${(node.y + 4).toFixed(2)})"><rect width="20" height="12" rx="3" fill="#ff4d4f"/><text x="4" y="9" font-size="8" font-family="${FONT_FAMILY}" fill="#ffffff">P${node.priority}</text></g>`
        : '';

      return `<g data-node-id="${escapeXml(node.id)}"><rect x="${node.x.toFixed(2)}" y="${node.y.toFixed(2)}" width="${node.width.toFixed(2)}" height="${node.height.toFixed(2)}" rx="${node.style.borderRadius}" fill="${escapeXml(node.style.backgroundColor)}" stroke="${escapeXml(node.style.borderColor)}" stroke-width="1"/><text x="${textX.toFixed(2)}" y="${textY.toFixed(2)}" font-size="${node.style.fontSize}" font-weight="${node.style.fontWeight}" font-family="${FONT_FAMILY}" fill="${escapeXml(node.style.textColor)}">${text}</text>${priorityBadge}${progressBar}</g>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${scene.width}" height="${scene.height}" viewBox="0 0 ${scene.width} ${scene.height}" style="font-family: ${FONT_FAMILY}">\n<defs>\n  <pattern id="grid-pattern" width="${GRID_SIZE}" height="${GRID_SIZE}" patternUnits="userSpaceOnUse">\n    <path d="M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}" fill="none" stroke="${escapeXml(scene.gridColor)}" stroke-width="1"/>\n  </pattern>\n</defs>\n<rect width="100%" height="100%" fill="${escapeXml(scene.backgroundColor)}"/>\n<rect width="100%" height="100%" fill="url(#grid-pattern)" opacity="0.85"/>\n${pathMarkup}\n${nodeMarkup}\n</svg>`;
}

export function renderExportSceneToSvg(scene: RenderScene): string {
  return renderSceneToSvg(scene);
}

function fitSceneForRaster(scene: RenderScene): RenderScene {
  const edgeScale = Math.min(1, MAX_RASTER_EXPORT_EDGE / Math.max(scene.width, scene.height));
  const pixelScale = Math.min(1, Math.sqrt(MAX_RASTER_EXPORT_PIXELS / (scene.width * scene.height)));
  const fitScale = Math.min(edgeScale, pixelScale);

  let scaledScene: RenderScene;

  // Apply scale transformation if needed
  if (Number.isFinite(fitScale) && fitScale < 1) {
    scaledScene = scaleRenderScene(scene, fitScale, 'ceil');
  } else {
    scaledScene = scene;
  }

  // Recalculate content bounds after scaling to ensure no content is clipped
  // Consider all four extreme points: leftmost, topmost, rightmost, bottommost
  const contentBounds = createEmptyContentBounds();

  // Include all nodes in bounds calculation
  for (const node of scaledScene.nodes) {
    extendContentBoundsByRect(contentBounds, node.x, node.y, node.width, node.height);
  }

  // Include all connection points (start, end, and control points) in bounds calculation
  for (const path of scaledScene.connections) {
    extendContentBoundsByPoint(contentBounds, path.start);
    extendContentBoundsByPoint(contentBounds, path.end);
    extendContentBoundsByPoint(contentBounds, path.cp1);
    extendContentBoundsByPoint(contentBounds, path.cp2);
  }

  // Ensure bounds are finite
  if (!hasFiniteContentBounds(contentBounds)) {
    return scaledScene;
  }

  // Check if content extends beyond canvas boundaries in any direction
  // Use the four extreme boundary points to determine if adjustment is needed
  const hasNegativeCoords = contentBounds.left < 0 || contentBounds.top < 0;
  const hasOverflowCoords = contentBounds.right > scaledScene.width || contentBounds.bottom > scaledScene.height;

  // Always validate that canvas size is sufficient to contain all content
  // Calculate the required canvas size based on the four extreme boundary points
  const requiredWidth = Math.ceil(contentBounds.right - contentBounds.left);
  const requiredHeight = Math.ceil(contentBounds.bottom - contentBounds.top);

  // If content doesn't fit within the canvas in any direction, we need to adjust
  if (hasNegativeCoords || hasOverflowCoords || requiredWidth > scaledScene.width || requiredHeight > scaledScene.height) {
    // Calculate offset to ensure all content fits within the expanded canvas
    // Shift content right/down if bounds are negative to keep everything in positive coordinates
    const offsetX = contentBounds.left < 0 ? Math.ceil(Math.abs(contentBounds.left)) : 0;
    const offsetY = contentBounds.top < 0 ? Math.ceil(Math.abs(contentBounds.top)) : 0;

    // Use the larger of current size and required size to ensure no content is clipped
    const newWidth = Math.max(scaledScene.width, requiredWidth);
    const newHeight = Math.max(scaledScene.height, requiredHeight);

    // Shift all nodes and connections by the offset to ensure positive coordinates
    const shiftedNodes = scaledScene.nodes.map((node) => ({
      ...node,
      x: node.x + offsetX,
      y: node.y + offsetY,
    }));

    const shiftedConnections = scaledScene.connections.map((path) => ({
      start: { x: path.start.x + offsetX, y: path.start.y + offsetY },
      end: { x: path.end.x + offsetX, y: path.end.y + offsetY },
      cp1: { x: path.cp1.x + offsetX, y: path.cp1.y + offsetY },
      cp2: { x: path.cp2.x + offsetX, y: path.cp2.y + offsetY },
    }));

    console.log(`[PNG Export] fitSceneForRaster: adjusted canvas from ${scaledScene.width}x${scaledScene.height} to ${newWidth}x${newHeight}, offset=(${offsetX}, ${offsetY}), contentBounds=(${contentBounds.left},${contentBounds.top})-(${contentBounds.right},${contentBounds.bottom})`);

    return {
      ...scaledScene,
      width: newWidth,
      height: newHeight,
      nodes: shiftedNodes,
      connections: shiftedConnections,
    };
  }

  return scaledScene;
}

export function fitExportSceneForRaster(scene: RenderScene): RenderScene {
  return fitSceneForRaster(scene);
}

function crc32(input: Buffer): number {
  let value = 0xffffffff;
  for (const byte of input) {
    value = CRC32_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
}

function createPngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function setPixel(buffer: Buffer, canvasWidth: number, canvasHeight: number, x: number, y: number, color: RgbaColor): void {
  if (x < 0 || y < 0 || x >= canvasWidth || y >= canvasHeight) return;
  const pixelOffset = (y * canvasWidth + x) * 4;
  buffer[pixelOffset] = color.r;
  buffer[pixelOffset + 1] = color.g;
  buffer[pixelOffset + 2] = color.b;
  buffer[pixelOffset + 3] = color.a;
}

function fillRect(
  buffer: Buffer,
  canvasWidth: number,
  canvasHeight: number,
  left: number,
  top: number,
  rectWidth: number,
  rectHeight: number,
  color: RgbaColor
): void {
  const startX = Math.max(0, Math.floor(left));
  const startY = Math.max(0, Math.floor(top));
  const endX = Math.min(canvasWidth, Math.ceil(left + rectWidth));
  const endY = Math.min(canvasHeight, Math.ceil(top + rectHeight));

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      setPixel(buffer, canvasWidth, canvasHeight, x, y, color);
    }
  }
}

function drawRectBorder(
  buffer: Buffer,
  canvasWidth: number,
  canvasHeight: number,
  left: number,
  top: number,
  rectWidth: number,
  rectHeight: number,
  color: RgbaColor
): void {
  const x1 = Math.max(0, Math.floor(left));
  const y1 = Math.max(0, Math.floor(top));
  const x2 = Math.min(canvasWidth - 1, Math.floor(left + rectWidth - 1));
  const y2 = Math.min(canvasHeight - 1, Math.floor(top + rectHeight - 1));

  for (let x = x1; x <= x2; x++) {
    setPixel(buffer, canvasWidth, canvasHeight, x, y1, color);
    setPixel(buffer, canvasWidth, canvasHeight, x, y2, color);
  }
  for (let y = y1; y <= y2; y++) {
    setPixel(buffer, canvasWidth, canvasHeight, x1, y, color);
    setPixel(buffer, canvasWidth, canvasHeight, x2, y, color);
  }
}

function drawLine(
  buffer: Buffer,
  canvasWidth: number,
  canvasHeight: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: RgbaColor,
  thickness: number
): void {
  let currentX = Math.round(x1);
  let currentY = Math.round(y1);
  const targetX = Math.round(x2);
  const targetY = Math.round(y2);
  const deltaX = Math.abs(targetX - currentX);
  const deltaY = Math.abs(targetY - currentY);
  const stepX = currentX < targetX ? 1 : -1;
  const stepY = currentY < targetY ? 1 : -1;
  let error = deltaX - deltaY;
  const radius = Math.max(0, Math.floor((Math.max(1, thickness) - 1) / 2));

  while (true) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        setPixel(buffer, canvasWidth, canvasHeight, currentX + dx, currentY + dy, color);
      }
    }

    if (currentX === targetX && currentY === targetY) break;
    const doubleError = error * 2;
    if (doubleError > -deltaY) {
      error -= deltaY;
      currentX += stepX;
    }
    if (doubleError < deltaX) {
      error += deltaX;
      currentY += stepY;
    }
  }
}

function drawBezier(
  buffer: Buffer,
  canvasWidth: number,
  canvasHeight: number,
  path: ConnectionPath,
  color: RgbaColor,
  thickness: number,
  dashed: boolean
): void {
  const segments = 52;
  let previous = path.start;
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const point = cubicBezier(path.start, path.cp1, path.cp2, path.end, t);
    if (!dashed || Math.floor(i / 4) % 2 === 0) {
      drawLine(
        buffer,
        canvasWidth,
        canvasHeight,
        previous.x,
        previous.y,
        point.x,
        point.y,
        color,
        thickness
      );
    }
    previous = point;
  }
}

function drawPseudoGlyph(
  buffer: Buffer,
  canvasWidth: number,
  canvasHeight: number,
  char: string,
  left: number,
  top: number,
  color: RgbaColor,
  glyphScale: number
): void {
  if (char.trim().length === 0) return;
  const code = char.codePointAt(0) ?? 0;

  // Use higher resolution glyph grid (20x28) for better quality
  const glyphGridWidth = 20;
  const glyphGridHeight = 28;

  // Calculate sub-pixel sampling for anti-aliasing: at least 4 samples per pixel
  const samplesPerPixel = Math.max(4, glyphScale * 2);
  const sampleStep = 1.0 / samplesPerPixel;

  // Character structure parameters for better CJK and Latin rendering
  const horizontalBars = 3; // Number of horizontal stroke regions
  const verticalBars = 2;   // Number of vertical stroke regions

  for (let gridY = 0; gridY < glyphGridHeight; gridY++) {
    for (let gridX = 0; gridX < glyphGridWidth; gridX++) {
      // Use improved pattern based on character code for better glyph structure
      const bitIndex = (gridY * glyphGridWidth + gridX) % 29;
      const baseIntensity = ((code >>> bitIndex) & 1) === 1 ? 1.0 : 0.0;

      // Enhanced edge detection with stronger boundary definition
      const isEdgeRow = gridY === 0 || gridY === glyphGridHeight - 1;
      const isEdgeCol = gridX === 0 || gridX === glyphGridWidth - 1;
      const isInnerEdge = gridY === 1 || gridY === glyphGridHeight - 2 || gridX === 1 || gridX === glyphGridWidth - 2;
      
      // Stronger edge boost for better readability at small sizes
      let edgeBoost = 0.0;
      if (isEdgeRow || isEdgeCol) {
        edgeBoost = 0.4; // Strong outer edge
      } else if (isInnerEdge) {
        edgeBoost = 0.15; // Subtle inner edge for structure
      }

      // Add stroke structure enhancement for CJK characters
      const isHorizontalStroke = gridY % Math.floor(glyphGridHeight / horizontalBars) < 3;
      const isVerticalStroke = gridX % Math.floor(glyphGridWidth / verticalBars) < 3;
      const strokeBoost = (isHorizontalStroke || isVerticalStroke) ? 0.1 : 0.0;

      const intensity = Math.min(1.0, baseIntensity + edgeBoost + strokeBoost);

      if (intensity > 0.1) {
        // Calculate pixel position with improved scaling
        const pixelX = left + (gridX / glyphGridWidth) * glyphScale * 6;
        const pixelY = top + (gridY / glyphGridHeight) * glyphScale * 7;

        // Draw with anti-aliasing using alpha blending
        for (let sy = 0; sy < samplesPerPixel; sy++) {
          for (let sx = 0; sx < samplesPerPixel; sx++) {
            const sampleX = pixelX + sx * sampleStep * glyphScale;
            const sampleY = pixelY + sy * sampleStep * glyphScale;

            // Apply intensity-based alpha blending for grayscale anti-aliasing
            const pixelOffset = (Math.floor(sampleY) * canvasWidth + Math.floor(sampleX)) * 4;
            if (pixelOffset + 3 < buffer.length) {
              const alpha = intensity * 255;
              const invAlpha = 255 - alpha;
              buffer[pixelOffset] = (color.r * alpha + buffer[pixelOffset] * invAlpha) / 255;
              buffer[pixelOffset + 1] = (color.g * alpha + buffer[pixelOffset + 1] * invAlpha) / 255;
              buffer[pixelOffset + 2] = (color.b * alpha + buffer[pixelOffset + 2] * invAlpha) / 255;
              buffer[pixelOffset + 3] = 255;
            }
          }
        }
      }
    }
  }
}

function drawNodeText(
  buffer: Buffer,
  canvasWidth: number,
  canvasHeight: number,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  color: RgbaColor,
  fontSize: number,
  padding: number
): void {
  const content = text.length > 0 ? text : ' ';
  const glyphScale = Math.max(1, Math.round(fontSize / 12));
  const glyphWidth = Math.max(1, 6 * glyphScale);
  const glyphHeight = Math.max(1, 7 * glyphScale);
  const horizontalPadding = Math.max(4, Math.floor(padding));
  const maxChars = Math.max(1, Math.floor((width - horizontalPadding * 2) / glyphWidth));
  const visibleText = content.slice(0, maxChars);
  const textY = Math.floor(y + (height - glyphHeight) / 2);
  let textX = Math.floor(x + horizontalPadding);

  for (const char of visibleText) {
    drawPseudoGlyph(buffer, canvasWidth, canvasHeight, char, textX, textY, color, glyphScale);
    textX += glyphWidth;
  }
}

function encodeRgbaToPng(rgbaPixels: Buffer, width: number, height: number): Buffer {
  const bytesPerRow = width * 4;
  const scanlines = Buffer.alloc((bytesPerRow + 1) * height);

  for (let y = 0; y < height; y++) {
    const scanlineOffset = y * (bytesPerRow + 1);
    scanlines[scanlineOffset] = 0;
    rgbaPixels.copy(scanlines, scanlineOffset + 1, y * bytesPerRow, (y + 1) * bytesPerRow);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const idat = zlib.deflateSync(scanlines);

  return Buffer.concat([
    signature,
    createPngChunk('IHDR', ihdr),
    createPngChunk('IDAT', idat),
    createPngChunk('IEND', Buffer.alloc(0)),
  ]);
}

export function readPngDimensions(png: Buffer): { width: number; height: number } | null {
  // PNG signature + IHDR chunk header is required to read dimensions.
  if (png.length < 24) return null;
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let index = 0; index < signature.length; index++) {
    if (png[index] !== signature[index]) {
      return null;
    }
  }

  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
  };
}

/**
 * Copy a BGRA tile buffer to an RGBA destination buffer with bounds checking.
 * Includes validation to prevent out-of-bounds writes and ensure tile dimensions match.
 */
function copyBgraTileToRgba(
  destination: Buffer,
  destinationWidth: number,
  destinationHeight: number,
  tileBgra: Buffer,
  tileWidth: number,
  tileHeight: number,
  offsetX: number,
  offsetY: number
): void {
  // Validate that the tile fits within the destination bounds
  const expectedMaxX = offsetX + tileWidth;
  const expectedMaxY = offsetY + tileHeight;
  
  if (expectedMaxX > destinationWidth || expectedMaxY > destinationHeight) {
    // Tile extends beyond destination - this should not happen in normal operation
    // Clamp the tile to fit within bounds
    console.warn(
      `Tile at offset (${offsetX}, ${offsetY}) with size ${tileWidth}x${tileHeight} ` +
      `exceeds destination bounds ${destinationWidth}x${destinationHeight}. Clamping.`
    );
  }

  // Calculate actual copy dimensions (clamped to destination bounds)
  const copyWidth = Math.min(tileWidth, destinationWidth - offsetX);
  const copyHeight = Math.min(tileHeight, destinationHeight - offsetY);

  // Validate source buffer has enough data
  const requiredSrcSize = tileWidth * tileHeight * 4;
  if (tileBgra.length < requiredSrcSize) {
    console.warn(
      `Tile buffer size ${tileBgra.length} is smaller than expected ${requiredSrcSize}. ` +
      `May result in incomplete tile data.`
    );
  }

  for (let y = 0; y < copyHeight; y++) {
    for (let x = 0; x < copyWidth; x++) {
      const srcIndex = (y * tileWidth + x) * 4;
      const destIndex = ((offsetY + y) * destinationWidth + (offsetX + x)) * 4;
      
      // Bounds check for destination write
      if (destIndex + 3 >= destination.length) {
        console.error(`Destination buffer overflow at pixel (${offsetX + x}, ${offsetY + y})`);
        continue;
      }
      
      // Convert BGRA to RGBA (Electron uses BGRA format)
      destination[destIndex] = tileBgra[srcIndex + 2];     // R
      destination[destIndex + 1] = tileBgra[srcIndex + 1]; // G
      destination[destIndex + 2] = tileBgra[srcIndex];     // B
      destination[destIndex + 3] = tileBgra[srcIndex + 3]; // A
    }
  }
}

function renderSceneToPngFallback(scene: RenderScene): Buffer {
  const pixels = Buffer.alloc(scene.width * scene.height * 4);
  const backgroundColor = parseColor(scene.backgroundColor, { r: 255, g: 255, b: 255, a: 255 });
  const gridColor = parseColor(scene.gridColor, { r: 230, g: 230, b: 230, a: 255 });
  const connectionColor = parseColor(scene.connectionColor, { r: 140, g: 140, b: 140, a: 255 });

  fillRect(pixels, scene.width, scene.height, 0, 0, scene.width, scene.height, backgroundColor);

  for (let x = 0; x < scene.width; x += GRID_SIZE) {
    drawLine(pixels, scene.width, scene.height, x, 0, x, scene.height - 1, gridColor, 1);
  }
  for (let y = 0; y < scene.height; y += GRID_SIZE) {
    drawLine(pixels, scene.width, scene.height, 0, y, scene.width - 1, y, gridColor, 1);
  }

  for (const path of scene.connections) {
    drawBezier(
      pixels,
      scene.width,
      scene.height,
      path,
      connectionColor,
      scene.connectionWidth,
      scene.dashedConnections
    );
  }

  for (const node of scene.nodes) {
    const fill = parseColor(node.style.backgroundColor, parseColor(DEFAULT_NODE_STYLE.backgroundColor, backgroundColor));
    const border = parseColor(node.style.borderColor, parseColor(DEFAULT_NODE_STYLE.borderColor, backgroundColor));
    const text = parseColor(node.style.textColor, parseColor(DEFAULT_NODE_STYLE.textColor, backgroundColor));
    fillRect(pixels, scene.width, scene.height, node.x, node.y, node.width, node.height, fill);
    drawRectBorder(pixels, scene.width, scene.height, node.x, node.y, node.width, node.height, border);
    drawNodeText(
      pixels,
      scene.width,
      scene.height,
      node.text,
      node.x,
      node.y,
      node.width,
      node.height,
      text,
      node.style.fontSize,
      node.style.padding
    );

    if (node.progress > 0) {
      const progress = Math.max(0, Math.min(1, node.progress));
      const barWidth = Math.max(1, node.width - 12);
      fillRect(
        pixels,
        scene.width,
        scene.height,
        node.x + 6,
        node.y + node.height - 6,
        barWidth,
        3,
        { r: 224, g: 224, b: 224, a: 255 }
      );
      fillRect(
        pixels,
        scene.width,
        scene.height,
        node.x + 6,
        node.y + node.height - 6,
        Math.floor(barWidth * progress),
        3,
        { r: 82, g: 196, b: 26, a: 255 }
      );
    }
  }

  return encodeRgbaToPng(pixels, scene.width, scene.height);
}

export function renderExportSceneToPngFallback(scene: RenderScene): Buffer {
  return renderSceneToPngFallback(scene);
}

async function tryRenderPngViaElectronSvg(svg: string, width: number, height: number, scale: number = 1): Promise<Buffer | null> {
  try {
    interface RuntimeNativeImage {
      isEmpty: () => boolean;
      getSize: () => { width: number; height: number };
      toBitmap: () => Buffer;
      toPNG: () => Buffer;
      resize: (size: { width: number; height: number; quality?: 'best' | 'good' | 'better' }) => RuntimeNativeImage;
      crop: (rect: { x: number; y: number; width: number; height: number }) => RuntimeNativeImage;
    }

    // Runtime-only optimization: Electron can rasterize SVG with full text rendering fidelity.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const electronRuntime = require('electron') as {
      app?: { isReady?: () => boolean };
      BrowserWindow?: new (options: Record<string, unknown>) => {
        loadURL: (url: string) => Promise<void>;
        webContents: {
          executeJavaScript: (code: string, userGesture?: boolean) => Promise<unknown>;
          capturePage: (rect?: { x: number; y: number; width: number; height: number }) => Promise<{ toPNG: () => Buffer }>;
        };
        destroy: () => void;
      };
      nativeImage?: {
        createFromDataURL: (url: string) => RuntimeNativeImage;
      };
    };
    const encoded = Buffer.from(svg, 'utf-8').toString('base64');
    const dataUrl = `data:image/svg+xml;base64,${encoded}`;

    // Prefer offscreen BrowserWindow capture to avoid nativeImage SVG rasterization quirks on large scenes.
    // But for large scenes, use tiled capture to avoid Electron window size limits
    const MAX_SINGLE_FRAME_SIZE = 4096; // Electron has issues with windows larger than this
    const useTiledCapture = width > MAX_SINGLE_FRAME_SIZE || height > MAX_SINGLE_FRAME_SIZE;
    
    if (!useTiledCapture && electronRuntime.BrowserWindow && electronRuntime.app?.isReady?.()) {
      const offscreenWindow = new electronRuntime.BrowserWindow({
        show: false,
        frame: false,
        width,
        height,
        webPreferences: {
          offscreen: true,
          sandbox: true,
          contextIsolation: true,
          nodeIntegration: false,
        },
      });

      try {
        const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body style="margin:0;overflow:hidden;background:transparent;"><img id="scene" alt="" src="${dataUrl}" style="display:block;width:${width}px;height:${height}px;" /></body></html>`;
        await offscreenWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

        // Wait for image to load and render with 3-second timeout protection
        await offscreenWindow.webContents.executeJavaScript(
          `new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
              console.log('[PNG Export] Single-frame capture: timeout after 3s, proceeding anyway');
              resolve();
            }, 3000);

            const img = document.getElementById('scene');
            if (img && img.complete) {
              // Image already loaded, wait for 2 requestAnimationFrame cycles
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  clearTimeout(timeoutId);
                  resolve();
                });
              });
            } else if (img) {
              img.onload = () => {
                // Wait for 2 requestAnimationFrame cycles after image loads
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => {
                    clearTimeout(timeoutId);
                    resolve();
                  });
                });
              };
              img.onerror = () => {
                console.log('[PNG Export] Single-frame capture: image load error, proceeding anyway');
                clearTimeout(timeoutId);
                resolve();
              };
            } else {
              console.log('[PNG Export] Single-frame capture: no image element found, proceeding anyway');
              clearTimeout(timeoutId);
              resolve();
            }
          })`
        );

        // Capture the entire window
        const captured = await offscreenWindow.webContents.capturePage();
        const png = captured.toPNG();
        const outputSize = readPngDimensions(png);
        if (
          png.length > 0
          && outputSize
          && outputSize.width === width
          && outputSize.height === height
        ) {
          return png;
        }
        // If dimensions don't match, fall through to tiled capture for large scenes
        console.log(`[PNG Export] Single-frame capture dimension mismatch: expected ${width}x${height}, got ${outputSize?.width}x${outputSize?.height}, trying tiled capture`);
      } finally {
        offscreenWindow.destroy();
      }
    }

    // Tiled capture for scenes exceeding single-frame limits or when single-frame capture fails dimension check
    if (electronRuntime.BrowserWindow && electronRuntime.app?.isReady?.() && electronRuntime.nativeImage?.createFromDataURL) {
      const tileWidth = Math.min(width, MAX_PNG_CAPTURE_TILE_EDGE);
      const tileHeight = Math.min(height, MAX_PNG_CAPTURE_TILE_EDGE);
      const columns = Math.ceil(width / tileWidth);
      const rows = Math.ceil(height / tileHeight);

      console.log(`[PNG Export] Starting tiled capture: scene=${width}x${height}, tile=${tileWidth}x${tileHeight}, grid=${columns}x${rows}`);

      const tiledWindow = new electronRuntime.BrowserWindow({
        show: false,
        frame: false,
        width: tileWidth,
        height: tileHeight,
        webPreferences: {
          offscreen: true,
          sandbox: true,
          contextIsolation: true,
          nodeIntegration: false,
        },
      });

      try {
        // HTML structure: body and image are both full scene size, window acts as a viewport
        // The image is positioned absolutely and moved to show the correct tile through the window
        // Critical: body must be exactly scene size, image must fill body, no overflow issues
        const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body style="margin:0;padding:0;background:transparent;position:relative;width:${width}px;height:${height}px;overflow:hidden;"><img id="scene" alt="" src="${dataUrl}" style="position:absolute;left:0;top:0;display:block;width:${width}px;height:${height}px;max-width:none;max-height:none;margin:0;padding:0;" /></body></html>`;
        await tiledWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

        // Wait for image to load and render with 3-second timeout protection
        await tiledWindow.webContents.executeJavaScript(
          `new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
              console.log('[PNG Export] Tiled capture: timeout after 3s, proceeding anyway');
              resolve();
            }, 3000);

            const img = document.getElementById('scene');
            if (img && img.complete) {
              // Image already loaded, wait for render
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  clearTimeout(timeoutId);
                  resolve();
                });
              });
            } else if (img) {
              img.onload = () => {
                // Wait for 2 requestAnimationFrame cycles after image loads
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => {
                    clearTimeout(timeoutId);
                    resolve();
                  });
                });
              };
              img.onerror = () => {
                console.log('[PNG Export] Tiled capture: image load error, proceeding anyway');
                clearTimeout(timeoutId);
                resolve();
              };
            } else {
              console.log('[PNG Export] Tiled capture: no image element found, proceeding anyway');
              clearTimeout(timeoutId);
              resolve();
            }
          })`
        );

        // Wait additional time for render to settle
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Set zoom level to match scale for consistent rendering
        const zoomLevel = Math.log2(scale);
        (tiledWindow.webContents as any).setZoomLevel(zoomLevel);

        const stitchedRgba = Buffer.alloc(width * height * 4);
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < columns; col++) {
            const offsetX = col * tileWidth;
            const offsetY = row * tileHeight;
            const currentTileWidth = Math.min(tileWidth, width - offsetX);
            const currentTileHeight = Math.min(tileHeight, height - offsetY);

            // Move the image to show the correct portion through the viewport
            // Negative offset moves the image so the desired tile is visible in the window
            await tiledWindow.webContents.executeJavaScript(
              `(function() {
                const img = document.getElementById('scene');
                if (img) {
                  img.style.left = '${-offsetX}px';
                  img.style.top = '${-offsetY}px';
                }
              })()`
            );

            // Wait for render to settle using double requestAnimationFrame
            await tiledWindow.webContents.executeJavaScript(
              `new Promise((resolve) => {
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => {
                    resolve();
                  });
                });
              })`
            );

            // Capture the entire fixed-size window (tileWidth x tileHeight)
            const capturedTile = await tiledWindow.webContents.capturePage();
            let tileImage = electronRuntime.nativeImage.createFromDataURL(`data:image/png;base64,${capturedTile.toPNG().toString('base64')}`);
            const tileSize = tileImage.getSize();

            // Validate captured tile size matches window size
            if (tileSize.width !== tileWidth || tileSize.height !== tileHeight) {
              console.warn(`[PNG Export] Tile size mismatch: expected ${tileWidth}x${tileHeight}, got ${tileSize.width}x${tileSize.height}`);
            }

            // For edge tiles, crop to the actual remaining scene size
            let finalTileImage = tileImage;
            const expectedTileWidth = Math.min(tileWidth, width - offsetX);
            const expectedTileHeight = Math.min(tileHeight, height - offsetY);

            if (tileSize.width !== expectedTileWidth || tileSize.height !== expectedTileHeight) {
              if (tileSize.width > expectedTileWidth || tileSize.height > expectedTileHeight) {
                // Crop to the expected tile size
                finalTileImage = tileImage.crop({
                  x: 0,
                  y: 0,
                  width: expectedTileWidth,
                  height: expectedTileHeight,
                });
              } else if (tileSize.width < expectedTileWidth || tileSize.height < expectedTileHeight) {
                // This should not happen - indicates a rendering issue
                // Pad with transparent pixels if needed
                console.warn(`[PNG Export] Tile smaller than expected: ${tileSize.width}x${tileSize.height} < ${expectedTileWidth}x${expectedTileHeight}`);
                finalTileImage = tileImage.resize({
                  width: expectedTileWidth,
                  height: expectedTileHeight,
                  quality: 'best',
                });
              }
            }

            // Log tile position for debugging
            console.log(`[PNG Export] Tile captured: row=${row}, col=${col}, offset=(${offsetX}, ${offsetY}), expected=${expectedTileWidth}x${expectedTileHeight}, captured=${tileSize.width}x${tileSize.height}`);

            copyBgraTileToRgba(
              stitchedRgba,
              width,
              height,
              finalTileImage.toBitmap(),
              expectedTileWidth,
              expectedTileHeight,
              offsetX,
              offsetY
            );
          }
        }

        console.log(`[PNG Export] Tiled capture complete: ${rows}x${columns} tiles, final size=${width}x${height}`);
        return encodeRgbaToPng(stitchedRgba, width, height);
      } finally {
        tiledWindow.destroy();
      }
    }

    // Fallback path when offscreen capture is unavailable.
    if (electronRuntime.nativeImage?.createFromDataURL) {
      const image = electronRuntime.nativeImage.createFromDataURL(dataUrl);
      if (!image.isEmpty()) {
        const png = image.resize({ width, height, quality: 'best' }).toPNG();
        const outputSize = readPngDimensions(png);
        if (
          png.length > 0
          && outputSize
          && outputSize.width === width
          && outputSize.height === height
        ) {
          return png;
        }
      }
    }
  } catch {
    return null;
  }

  return null;
}

export async function tryRenderExportPngViaElectronSvg(
  svg: string,
  width: number,
  height: number,
  scale: number = 1
): Promise<Buffer | null> {
  return tryRenderPngViaElectronSvg(svg, width, height, scale);
}

function treeToMarkdown(nodes: Node[], depth: number = 0): string {
  let result = '';
  const prefix = depth === 0 ? '# ' : '  '.repeat(depth - 1) + '- ';
  for (const node of nodes) {
    result += `${prefix}${node.text}\n`;
    if (node.note) result += `${'  '.repeat(depth)}> ${node.note}\n`;
    if (node.children && node.children.length > 0) {
      result += treeToMarkdown(node.children, depth + 1);
    }
  }
  return result;
}

export function exportToMarkdown(nodes: Node[]): string {
  return treeToMarkdown(nodes).trim();
}

export function exportToSVG(nodes: Node[], optionsOrSize?: LegacySize | ExportRenderOptions): string {
  const scene = buildRenderScene(nodes, optionsOrSize);
  return renderSceneToSvg(scene);
}

export async function exportToPNG(nodes: Node[], optionsOrSize?: LegacySize | ExportRenderOptions): Promise<Buffer> {
  const scene = fitSceneForRaster(buildRenderScene(nodes, optionsOrSize));
  const svg = renderSceneToSvg(scene);
  // Extract scale from options if it's an ExportRenderOptions object
  const scale = isExportRenderOptions(optionsOrSize) && typeof optionsOrSize.scale === 'number' ? optionsOrSize.scale : 1;
  
  console.log(`[PNG Export] exportToPNG: scene=${scene.width}x${scene.height}, scale=${scale}, nodes=${scene.nodes.length}`);
  
  const pngViaSvg = await tryRenderPngViaElectronSvg(svg, scene.width, scene.height, scale);

  // If SVG-based renderer produced a PNG, validate its dimensions with 2% tolerance
  if (pngViaSvg) {
    const dims = readPngDimensions(pngViaSvg);
    if (dims) {
      // Calculate 2% tolerance for dimension validation
      const widthTolerance = Math.max(2, Math.floor(scene.width * 0.02));
      const heightTolerance = Math.max(2, Math.floor(scene.height * 0.02));
      const widthDiff = Math.abs(dims.width - scene.width);
      const heightDiff = Math.abs(dims.height - scene.height);
      
      // Check if dimensions are within 2% tolerance
      if (widthDiff <= widthTolerance && heightDiff <= heightTolerance) {
        // Log warning if dimensions are within tolerance but not exact match
        if (widthDiff > 0 || heightDiff > 0) {
          console.log(`[PNG Export] Warning: Dimension minor mismatch within 2% tolerance: expected ${scene.width}x${scene.height}, got ${dims.width}x${dims.height}`);
        } else {
          console.log(`[PNG Export] Success: PNG dimensions match expected ${scene.width}x${scene.height}`);
        }
        return pngViaSvg;
      }
      // Dimension mismatch exceeds 2% tolerance, fall through to Fallback
      console.log(`[PNG Export] Dimension mismatch exceeds 2% tolerance: expected ${scene.width}x${scene.height}, got ${dims.width}x${dims.height} (tolerance: ${widthTolerance}x${heightTolerance})`);
    }
  }
  
  // Fallback path
  console.log(`[PNG Export] Falling back to software rendering`);
  return renderSceneToPngFallback(scene);
}
