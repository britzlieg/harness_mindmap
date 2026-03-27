import zlib from 'zlib';
import { describe, it, expect } from 'vitest';
import { exportToMarkdown, exportToPNG, exportToSVG } from '../../electron/services/export-service';
import type { FileMetadata, LayoutType, Node } from '../../src/types';

function makeNode(id: string, text: string, children: Node[] = []): Node {
  return {
    id,
    parentId: null,
    text,
    note: '',
    labels: [],
    tags: [],
    priority: 0,
    progress: 0,
    style: {},
    isFolded: false,
    positionX: null,
    positionY: null,
    orderIndex: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    children,
  };
}

function makeMetadata(layoutType: LayoutType = 'mindmap', theme: string = 'default'): FileMetadata {
  return {
    title: 'Demo',
    rootTopicId: 'root',
    layoutType,
    theme,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
  };
}

describe('export-service', () => {
  it('exports single root as markdown', () => {
    expect(exportToMarkdown([makeNode('r', 'Root')])).toContain('# Root');
  });

  it('exports tree as nested markdown', () => {
    const child = makeNode('c', 'Child');
    const root = makeNode('r', 'Root', [child]);
    child.parentId = 'r';
    const md = exportToMarkdown([root]);
    expect(md).toContain('# Root');
    expect(md).toContain('- Child');
  });

  it('generates scene-aware SVG with node text and path', () => {
    const child = makeNode('c', 'Child');
    child.parentId = 'r';
    const root = makeNode('r', 'Root', [child]);

    const svg = exportToSVG([root], {
      metadata: makeMetadata('mindmap', 'ocean'),
      minWidth: 400,
      minHeight: 260,
      padding: 24,
    });

    expect(svg).toContain('<svg');
    expect(svg).toContain('Root');
    expect(svg).toContain('Child');
    expect(svg).toContain('<path d="M ');
    expect(svg).toContain('fill="#f0f9ff"');
  });

  it('generates valid PNG binary', async () => {
    const png = await exportToPNG([makeNode('r', 'Root')], { minWidth: 320, minHeight: 240 });
    expect(png.length).toBeGreaterThan(8);
    expect(Array.from(png.subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  });

  it('applies theme background in PNG output', async () => {
    const png = await exportToPNG([makeNode('r', 'Dark Root')], {
      metadata: makeMetadata('mindmap', 'dark'),
      minWidth: 320,
      minHeight: 220,
    });
    const rgba = decodePngRgba(png);
    const pixel = getPixel(rgba, 1, 1);

    expect(pixel.r).toBe(30);
    expect(pixel.g).toBe(30);
    expect(pixel.b).toBe(46);
    expect(pixel.a).toBe(255);
  });

  it('expands PNG bounds from visible graph geometry beyond minimum size', async () => {
    const leaf = makeNode('leaf', 'Leaf');
    leaf.parentId = 'child';
    const child = makeNode('child', 'Child', [leaf]);
    child.parentId = 'root';
    const root = makeNode('root', 'Root', [child]);

    const png = await exportToPNG([root], {
      metadata: makeMetadata('tree-right', 'default'),
      minWidth: 220,
      minHeight: 180,
      padding: 24,
    });
    const rgba = decodePngRgba(png);

    expect(rgba.width).toBeGreaterThan(220);
    expect(rgba.height).toBeGreaterThanOrEqual(180);
  });

  it('uses fallback minimum bounds for sparse graph export', async () => {
    const png = await exportToPNG([], {
      metadata: makeMetadata('mindmap', 'default'),
      minWidth: 280,
      minHeight: 200,
      padding: 24,
    });
    const rgba = decodePngRgba(png);

    expect(rgba.width).toBeGreaterThanOrEqual(280);
    expect(rgba.height).toBeGreaterThanOrEqual(240);
  });

  it('renders connections and text pixels in PNG output', async () => {
    const child = makeNode('c', 'Child Node');
    child.parentId = 'r';
    child.style = { textColor: '#000000', borderColor: '#000000', backgroundColor: '#ffffff' };
    const root = makeNode('r', 'Root Node', [child]);
    root.style = { textColor: '#000000', borderColor: '#000000', backgroundColor: '#ffffff' };
    const png = await exportToPNG([root], {
      metadata: makeMetadata('mindmap', 'default'),
      minWidth: 420,
      minHeight: 220,
      padding: 24,
    });
    const rgba = decodePngRgba(png);

    expect(hasPixel(rgba, 180, 100, 300, 150, (r, g, b) => r < 230 || g < 230 || b < 230)).toBe(true);
    expect(hasPixel(rgba, 0, 0, rgba.width - 1, rgba.height - 1, (r, g, b) => r < 40 && g < 40 && b < 40)).toBe(true);
  });

  it('uses scale option to increase PNG output size', async () => {
    const root = makeNode('r', 'Scale Test');
    const png100 = await exportToPNG([root], {
      metadata: makeMetadata('mindmap', 'default'),
      minWidth: 320,
      minHeight: 220,
      scale: 1,
    });
    const png200 = await exportToPNG([root], {
      metadata: makeMetadata('mindmap', 'default'),
      minWidth: 320,
      minHeight: 220,
      scale: 2,
    });
    const rgba100 = decodePngRgba(png100);
    const rgba200 = decodePngRgba(png200);

    expect(rgba200.width).toBeGreaterThan(rgba100.width);
    expect(rgba200.height).toBeGreaterThan(rgba100.height);
  });

  it('renders text with higher detail at larger export scale', async () => {
    const root = makeNode('r', 'Readable Text');
    root.style = { textColor: '#111111', backgroundColor: '#ffffff', borderColor: '#333333' };

    const png100 = await exportToPNG([root], {
      metadata: makeMetadata('mindmap', 'default'),
      minWidth: 320,
      minHeight: 220,
      scale: 1,
    });
    const png300 = await exportToPNG([root], {
      metadata: makeMetadata('mindmap', 'default'),
      minWidth: 320,
      minHeight: 220,
      scale: 3,
    });
    const rgba100 = decodePngRgba(png100);
    const rgba300 = decodePngRgba(png300);

    const textPixels100 = countPixels(rgba100, (r, g, b) => r < 90 && g < 90 && b < 90);
    const textPixels300 = countPixels(rgba300, (r, g, b) => r < 90 && g < 90 && b < 90);

    expect(textPixels300).toBeGreaterThan(textPixels100);
  });

  it('keeps dense same-level nodes visible at the far right edge', async () => {
    const children = Array.from({ length: 100 }, (_, index) => {
      const child = makeNode(`c-${index}`, `Child ${index + 1}`);
      child.parentId = 'root';
      child.style = {
        backgroundColor: '#ff4d4f',
        borderColor: '#ff4d4f',
        textColor: '#ffffff',
      };
      return child;
    });
    const root = makeNode('root', 'Root', children);
    root.style = {
      backgroundColor: '#ff4d4f',
      borderColor: '#ff4d4f',
      textColor: '#ffffff',
    };

    const png = await exportToPNG([root], {
      metadata: makeMetadata('org', 'default'),
      minWidth: 1200,
      minHeight: 800,
      padding: 56,
      scale: 1,
    });
    const rgba = decodePngRgba(png);

    expect(rgba.width).toBeGreaterThan(1200);
    expect(hasPixel(
      rgba,
      Math.max(0, rgba.width - 320),
      0,
      rgba.width - 1,
      rgba.height - 1,
      (r, g, b) => r > 220 && g < 110 && b < 110
    )).toBe(true);
  });

  it('applies scale after dynamic bounds so 50% export is roughly half of 100%', async () => {
    const children = Array.from({ length: 30 }, (_, index) => {
      const child = makeNode(`wide-${index}`, `Wide Child ${index + 1}`);
      child.parentId = 'root';
      return child;
    });
    const root = makeNode('root', 'Wide Root', children);

    const png100 = await exportToPNG([root], {
      metadata: makeMetadata('org', 'default'),
      minWidth: 1200,
      minHeight: 800,
      padding: 56,
      scale: 1,
    });
    const png50 = await exportToPNG([root], {
      metadata: makeMetadata('org', 'default'),
      minWidth: 1200,
      minHeight: 800,
      padding: 56,
      scale: 0.5,
    });
    const rgba100 = decodePngRgba(png100);
    const rgba50 = decodePngRgba(png50);

    expect(rgba100.width).toBeGreaterThan(1200);
    expect(Math.abs(rgba50.width * 2 - rgba100.width)).toBeLessThanOrEqual(2);
    expect(Math.abs(rgba50.height * 2 - rgba100.height)).toBeLessThanOrEqual(2);
  });

  it('fits oversized png export into safe raster bounds without returning blank output', async () => {
    const root = makeNode('root', 'Root');
    let current = root;
    for (let i = 0; i < 180; i++) {
      const child = makeNode(`n${i}`, `Node ${i}`);
      child.parentId = current.id;
      current.children = [child];
      current = child;
    }

    const png = await exportToPNG([root], {
      metadata: makeMetadata('tree-right', 'default'),
      minWidth: 26000,
      minHeight: 1800,
      padding: 48,
      scale: 2,
    });
    const rgba = decodePngRgba(png);

    expect(rgba.width).toBeLessThanOrEqual(12000);
    expect(rgba.height).toBeLessThanOrEqual(12000);
    expect(hasPixel(
      rgba,
      Math.max(0, rgba.width - 240),
      0,
      rgba.width - 1,
      rgba.height - 1,
      (r, g, b) => !(r > 248 && g > 248 && b > 248)
    )).toBe(true);
  });

  it('replaces blank node text during export rendering', () => {
    const svg = exportToSVG([makeNode('r', '   ')], {
      metadata: makeMetadata('mindmap', 'default'),
      minWidth: 320,
      minHeight: 220,
      scale: 1,
    });
    expect(svg).toContain('New Node');
  });
});

function decodePngRgba(png: Buffer): {
  width: number;
  height: number;
  pixels: Buffer;
} {
  let offset = 8;
  let width = 0;
  let height = 0;
  const idatChunks: Buffer[] = [];

  while (offset < png.length) {
    const chunkLength = png.readUInt32BE(offset);
    offset += 4;
    const chunkType = png.subarray(offset, offset + 4).toString('ascii');
    offset += 4;
    const chunkData = png.subarray(offset, offset + chunkLength);
    offset += chunkLength;
    offset += 4;

    if (chunkType === 'IHDR') {
      width = chunkData.readUInt32BE(0);
      height = chunkData.readUInt32BE(4);
    } else if (chunkType === 'IDAT') {
      idatChunks.push(chunkData);
    } else if (chunkType === 'IEND') {
      break;
    }
  }

  const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
  const bytesPerRow = width * 4;
  const pixels = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    const srcStart = y * (bytesPerRow + 1) + 1;
    const destStart = y * bytesPerRow;
    inflated.copy(pixels, destStart, srcStart, srcStart + bytesPerRow);
  }

  return { width, height, pixels };
}

function getPixel(
  image: { width: number; height: number; pixels: Buffer },
  x: number,
  y: number
): { r: number; g: number; b: number; a: number } {
  const px = Math.max(0, Math.min(image.width - 1, x));
  const py = Math.max(0, Math.min(image.height - 1, y));
  const offset = (py * image.width + px) * 4;
  return {
    r: image.pixels[offset],
    g: image.pixels[offset + 1],
    b: image.pixels[offset + 2],
    a: image.pixels[offset + 3],
  };
}

function hasPixel(
  image: { width: number; height: number; pixels: Buffer },
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  predicate: (r: number, g: number, b: number, a: number) => boolean
): boolean {
  const minX = Math.max(0, x1);
  const minY = Math.max(0, y1);
  const maxX = Math.min(image.width - 1, x2);
  const maxY = Math.min(image.height - 1, y2);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const offset = (y * image.width + x) * 4;
      const r = image.pixels[offset];
      const g = image.pixels[offset + 1];
      const b = image.pixels[offset + 2];
      const a = image.pixels[offset + 3];
      if (predicate(r, g, b, a)) {
        return true;
      }
    }
  }
  return false;
}

function countPixels(
  image: { width: number; height: number; pixels: Buffer },
  predicate: (r: number, g: number, b: number, a: number) => boolean
): number {
  let total = 0;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const offset = (y * image.width + x) * 4;
      if (predicate(
        image.pixels[offset],
        image.pixels[offset + 1],
        image.pixels[offset + 2],
        image.pixels[offset + 3]
      )) {
        total += 1;
      }
    }
  }
  return total;
}
