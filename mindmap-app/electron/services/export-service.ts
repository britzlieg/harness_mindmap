import zlib from 'zlib';
import type { FileMetadata, Node, NodeStyle } from '../shared/types';
import { normalizeLayoutType } from '../shared/types';
import { getDepthAwareNodeThemeStyle, getTheme, normalizeThemeName } from '../shared/themes';
import { ensureNodeText } from '../shared/utils/node-text';
import type { ConnectionPath, Point } from '../shared/utils/geometry';
import { calculateConnectionPath, cubicBezier } from '../shared/utils/geometry';
import { computeLayout } from '../shared/utils/layout-algorithms';

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

  const contentWidth = Math.max(1, contentBounds.right - contentBounds.left);
  const contentHeight = Math.max(1, contentBounds.bottom - contentBounds.top);
  const logicalWidth = Math.max(options.minWidth, Math.ceil(contentWidth + options.padding * 2), FALLBACK_EXPORT_EDGE);
  const logicalHeight = Math.max(options.minHeight, Math.ceil(contentHeight + options.padding * 2), FALLBACK_EXPORT_EDGE);

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
        ? `<g transform="translate(${(node.x + node.width - 24).toFixed(2)}, ${(node.y + 4).toFixed(2)})"><rect width="20" height="12" rx="3" fill="#ff4d4f"/><text x="4" y="9" font-size="8" fill="#ffffff">P${node.priority}</text></g>`
        : '';

      return `<g data-node-id="${escapeXml(node.id)}"><rect x="${node.x.toFixed(2)}" y="${node.y.toFixed(2)}" width="${node.width.toFixed(2)}" height="${node.height.toFixed(2)}" rx="${node.style.borderRadius}" fill="${escapeXml(node.style.backgroundColor)}" stroke="${escapeXml(node.style.borderColor)}" stroke-width="1"/><text x="${textX.toFixed(2)}" y="${textY.toFixed(2)}" font-size="${node.style.fontSize}" font-weight="${node.style.fontWeight}" fill="${escapeXml(node.style.textColor)}">${text}</text>${priorityBadge}${progressBar}</g>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${scene.width}" height="${scene.height}" viewBox="0 0 ${scene.width} ${scene.height}">\n<defs>\n  <pattern id="grid-pattern" width="${GRID_SIZE}" height="${GRID_SIZE}" patternUnits="userSpaceOnUse">\n    <path d="M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}" fill="none" stroke="${escapeXml(scene.gridColor)}" stroke-width="1"/>\n  </pattern>\n</defs>\n<rect width="100%" height="100%" fill="${escapeXml(scene.backgroundColor)}"/>\n<rect width="100%" height="100%" fill="url(#grid-pattern)" opacity="0.85"/>\n${pathMarkup}\n${nodeMarkup}\n</svg>`;
}

export function renderExportSceneToSvg(scene: RenderScene): string {
  return renderSceneToSvg(scene);
}

function fitSceneForRaster(scene: RenderScene): RenderScene {
  const edgeScale = Math.min(1, MAX_RASTER_EXPORT_EDGE / Math.max(scene.width, scene.height));
  const pixelScale = Math.min(1, Math.sqrt(MAX_RASTER_EXPORT_PIXELS / (scene.width * scene.height)));
  const fitScale = Math.min(edgeScale, pixelScale);

  if (!Number.isFinite(fitScale) || fitScale >= 1) {
    return scene;
  }

  return scaleRenderScene(scene, fitScale, 'ceil');
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
  const glyphWidth = 5;
  const glyphHeight = 7;
  for (let row = 0; row < glyphHeight; row++) {
    for (let col = 0; col < glyphWidth; col++) {
      const bitIndex = (row * glyphWidth + col) % 17;
      const drawPixel = ((code >>> bitIndex) & 1) === 1 || row === 0 || row === glyphHeight - 1;
      if (drawPixel) {
        for (let sy = 0; sy < glyphScale; sy++) {
          for (let sx = 0; sx < glyphScale; sx++) {
            setPixel(
              buffer,
              canvasWidth,
              canvasHeight,
              left + col * glyphScale + sx,
              top + row * glyphScale + sy,
              color
            );
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

function readPngDimensions(png: Buffer): { width: number; height: number } | null {
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

function copyBgraTileToRgba(
  destination: Buffer,
  destinationWidth: number,
  tileBgra: Buffer,
  tileWidth: number,
  tileHeight: number,
  offsetX: number,
  offsetY: number
): void {
  for (let y = 0; y < tileHeight; y++) {
    for (let x = 0; x < tileWidth; x++) {
      const srcIndex = (y * tileWidth + x) * 4;
      const destIndex = ((offsetY + y) * destinationWidth + (offsetX + x)) * 4;
      destination[destIndex] = tileBgra[srcIndex + 2];
      destination[destIndex + 1] = tileBgra[srcIndex + 1];
      destination[destIndex + 2] = tileBgra[srcIndex];
      destination[destIndex + 3] = tileBgra[srcIndex + 3];
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

async function tryRenderPngViaElectronSvg(svg: string, width: number, height: number): Promise<Buffer | null> {
  try {
    interface RuntimeNativeImage {
      isEmpty: () => boolean;
      getSize: () => { width: number; height: number };
      toBitmap: () => Buffer;
      resize: (size: { width: number; height: number; quality: 'best' | 'good' | 'better' }) => RuntimeNativeImage;
      toPNG: () => Buffer;
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
    if (electronRuntime.BrowserWindow && electronRuntime.app?.isReady?.()) {
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
        await offscreenWindow.webContents.executeJavaScript(
          `new Promise((resolve) => {
            const image = document.getElementById('scene');
            const done = () => requestAnimationFrame(() => requestAnimationFrame(resolve));
            if (!image) {
              done();
              return;
            }
            if (image.complete) {
              done();
              return;
            }
            image.addEventListener('load', done, { once: true });
            image.addEventListener('error', done, { once: true });
            setTimeout(done, 120);
          })`,
          false
        );
        const captured = await offscreenWindow.webContents.capturePage({
          x: 0,
          y: 0,
          width,
          height,
        });
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
      } finally {
        offscreenWindow.destroy();
      }
    }

    // If single-frame capture is unreliable for large scenes, fall back to tiled capture and stitch.
    if (electronRuntime.BrowserWindow && electronRuntime.app?.isReady?.() && electronRuntime.nativeImage?.createFromDataURL) {
      const tileWidth = Math.min(width, MAX_PNG_CAPTURE_TILE_EDGE);
      const tileHeight = Math.min(height, MAX_PNG_CAPTURE_TILE_EDGE);
      const columns = Math.ceil(width / tileWidth);
      const rows = Math.ceil(height / tileHeight);

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
        const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body style="margin:0;overflow:hidden;background:transparent;width:${tileWidth}px;height:${tileHeight}px;"><img id="scene" alt="" src="${dataUrl}" style="position:absolute;left:0;top:0;display:block;width:${width}px;height:${height}px;transform:translate(0px,0px);" /></body></html>`;
        await tiledWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
        await tiledWindow.webContents.executeJavaScript(
          `new Promise((resolve) => {
            const image = document.getElementById('scene');
            const done = () => requestAnimationFrame(() => requestAnimationFrame(resolve));
            if (!image) {
              done();
              return;
            }
            if (image.complete) {
              done();
              return;
            }
            image.addEventListener('load', done, { once: true });
            image.addEventListener('error', done, { once: true });
            setTimeout(done, 120);
          })`,
          false
        );

        const stitchedRgba = Buffer.alloc(width * height * 4);
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < columns; col++) {
            const offsetX = col * tileWidth;
            const offsetY = row * tileHeight;
            const currentTileWidth = Math.min(tileWidth, width - offsetX);
            const currentTileHeight = Math.min(tileHeight, height - offsetY);

            await tiledWindow.webContents.executeJavaScript(
              `new Promise((resolve) => {
                const image = document.getElementById('scene');
                if (image) {
                  image.style.transform = 'translate(${-offsetX}px, ${-offsetY}px)';
                }
                requestAnimationFrame(() => requestAnimationFrame(resolve));
              })`,
              false
            );

            const capturedTile = await tiledWindow.webContents.capturePage({
              x: 0,
              y: 0,
              width: currentTileWidth,
              height: currentTileHeight,
            });
            let tileImage = electronRuntime.nativeImage.createFromDataURL(`data:image/png;base64,${capturedTile.toPNG().toString('base64')}`);
            const tileSize = tileImage.getSize();
            if (tileSize.width !== currentTileWidth || tileSize.height !== currentTileHeight) {
              tileImage = tileImage.resize({
                width: currentTileWidth,
                height: currentTileHeight,
                quality: 'best',
              });
            }

            copyBgraTileToRgba(
              stitchedRgba,
              width,
              tileImage.toBitmap(),
              currentTileWidth,
              currentTileHeight,
              offsetX,
              offsetY
            );
          }
        }

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
  height: number
): Promise<Buffer | null> {
  return tryRenderPngViaElectronSvg(svg, width, height);
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
  return (await tryRenderPngViaElectronSvg(svg, scene.width, scene.height)) ?? renderSceneToPngFallback(scene);
}
