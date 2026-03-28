# PNG 导出完整性修复

**变更名称**: `fix-png-export`  
**归档日期**: 2026-03-28  
**归档位置**: `openspec/changes/archive/2026-03-28-fix-png-export/`

## 问题背景

用户报告 PNG 导出功能无法导出完整图片（内容被截断或显示不完整），但 SVG 导出功能工作正常。这是一个影响用户体验的关键功能缺陷。

## 修复范围

### 核心问题

1. **内容边界计算不准确**: `fitSceneForRaster` 中的边界验证逻辑在某些边缘情况下未正确覆盖所有节点和连线
2. **Electron 分块捕获缺少验证**: `copyBgraTileToRgba` 函数缺少边界检查和尺寸验证
3. **单帧捕获失败未降级**: 单帧捕获验证失败后直接返回，未尝试分块捕获
4. **PNG 验证不够完善**: 只验证尺寸，未验证内容完整性

### 修复内容

#### 1. 边界计算增强 (`electron/services/export-service.ts`)

- 修复 `fitSceneForRaster` 函数，确保使用四极值点（最左、最上、最右、最下）计算内容边界
- 在缩放后重新验证边界，确保内容不被截断
- 改进注释说明边界计算逻辑

**关键代码变更**:
```typescript
// 使用四极值点计算边界
const hasNegativeCoords = contentBounds.left < 0 || contentBounds.top < 0;
const hasOverflowCoords = contentBounds.right > scaledScene.width || contentBounds.bottom > scaledScene.height;

// 计算偏移量确保所有内容为正坐标
const offsetX = contentBounds.left < 0 ? Math.ceil(Math.abs(contentBounds.left)) : 0;
const offsetY = contentBounds.top < 0 ? Math.ceil(Math.abs(contentBounds.top)) : 0;
```

#### 2. 分块捕获验证 (`electron/services/export-service.ts`)

- 增强 `copyBgraTileToRgba` 函数，添加：
  - 边界验证和尺寸夹紧
  - 源缓冲区大小验证
  - 目标缓冲区写入检查
  - 警告日志用于调试

**关键代码变更**:
```typescript
function copyBgraTileToRgba(
  destination: Buffer,
  destinationWidth: number,
  destinationHeight: number,  // 新增参数
  tileBgra: Buffer,
  tileWidth: number,
  tileHeight: number,
  offsetX: number,
  offsetY: number
): void {
  // 验证瓦片是否适合目标边界
  const expectedMaxX = offsetX + tileWidth;
  const expectedMaxY = offsetY + tileHeight;
  
  if (expectedMaxX > destinationWidth || expectedMaxY > destinationHeight) {
    console.warn(`Tile exceeds destination bounds. Clamping.`);
  }
  
  // 计算实际复制尺寸（夹紧到目标边界）
  const copyWidth = Math.min(tileWidth, destinationWidth - offsetX);
  const copyHeight = Math.min(tileHeight, destinationHeight - offsetY);
  
  // 验证源缓冲区有足够数据
  const requiredSrcSize = tileWidth * tileHeight * 4;
  if (tileBgra.length < requiredSrcSize) {
    console.warn(`Tile buffer size insufficient.`);
  }
  
  // ... 边界检查和 BGRA 到 RGBA 转换
}
```

#### 3. 单帧捕获 fallback 逻辑 (`electron/services/export-service.ts`)

- 添加注释说明当单帧捕获尺寸验证失败时 fall through 到分块捕获逻辑
- 修复 `RuntimeNativeImage` 类型定义，添加 `crop` 方法

#### 4. 多级验证链 (`electron/services/export/png-renderer.ts`)

- 新增 `isPngContentMeaningful` 函数检测空白/损坏的 PNG
- 增强 `renderPng` 函数实现三级验证：
  1. Electron 捕获后尺寸验证
  2. 内容完整性检查
  3. Fallback 到软件渲染

**关键代码变更**:
```typescript
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

  // Fallback: Use software rendering
  return renderExportSceneToPngFallback(fittedScene);
}
```

## 测试覆盖

### 新增测试文件

`tests/export/png-export-integrity.test.ts` - 13 个综合测试用例

### 测试场景覆盖

| 测试类别 | 测试用例 | 状态 |
|---------|---------|------|
| **边界计算** | 线性链边界计算 | ✅ |
| | 宽树边界计算 | ✅ |
| | 空节点数组处理 | ✅ |
| **大尺寸导出** | 100+ 节点导图导出 | ✅ |
| | 200% 缩放比例验证 | ✅ |
| | 1000+ 节点分块捕获 | ✅ |
| **尺寸验证** | 场景拟合后尺寸验证 | ✅ |
| | 缩放变换正确性 | ✅ |
| **内容完整性** | 非空 PNG 验证 | ✅ |
| | 所有节点包含验证 | ✅ |
| **边缘情况** | 单节点导出 | ✅ |
| | 深层嵌套（20 层） | ✅ |
| | 折叠节点处理 | ✅ |

### 验证结果

```
✅ 所有导出测试通过：38/38
   - export-regression-png.test.ts: 1 个测试
   - export-service.test.ts: 17 个测试
   - file-service.test.ts: 7 个测试
   - png-export-integrity.test.ts: 13 个测试

✅ TypeScript 类型检查通过
✅ 构建成功（无错误）
```

## 规范同步

### Delta Spec 同步

已将以下需求同步到 `openspec/specs/mindmap-png-export/spec.md`：

**新增需求 (ADDED)**:
1. PNG 导出边界计算 MUST 基于四极值点
2. Electron 分块捕获 MUST 验证瓦片尺寸和坐标对齐
3. PNG 导出验证 MUST 包含尺寸和内容完整性检查

**修改需求 (MODIFIED)**:
1. PNG 导出 SHALL 包含完整可视思维导图内容（增加分块捕获场景）
2. PNG 导出分辨率 SHALL 按缩放百分比计算（场景不变）
3. PNG export MUST use latest state after render readiness（增加 Electron 捕获等待场景）

## 修改文件清单

### 核心代码

1. `electron/services/export-service.ts`
   - 修复 `fitSceneForRaster` 边界验证逻辑
   - 增强 `copyBgraTileToRgba` 边界检查
   - 更新 `tryRenderPngViaElectronSvg` fallback 逻辑注释
   - 添加 `crop` 方法到 `RuntimeNativeImage` 接口

2. `electron/services/export/png-renderer.ts`
   - 新增 `isPngContentMeaningful` 函数
   - 增强 `renderPng` 多级验证链

### 测试文件

3. `tests/export/png-export-integrity.test.ts`（新增）
   - 13 个综合测试用例

### 文档

4. `openspec/changes/fix-png-export/`（已归档）
   - `proposal.md`
   - `design.md`
   - `specs/mindmap-png-export/spec.md`
   - `tasks.md`
   - `edge-cases-and-recommendations.md`

5. `openspec/specs/mindmap-png-export/spec.md`（已同步）

6. `QWEN.md`, `AGENTS.md`, `docs/mindmap-app-architecture/README.md`（已更新）

## 已知边缘情况

### 1. 超大导图导出（接近 12000px 限制）
- **现象**: 当导图非常大时，会自动缩小到 `MAX_RASTER_EXPORT_EDGE` (12000px) 限制内
- **当前行为**: 等比缩放场景以适应限制，保持内容完整但可能降低清晰度
- **建议**: 在 UI 中增加导出前尺寸提示

### 2. 分块捕获的平台差异
- **现象**: Windows/macOS/Linux 上的 BrowserWindow 渲染行为可能有细微差异
- **当前行为**: 使用分块捕获 + 拼接，有边界检查和警告日志
- **建议**: 增加跨平台视觉回归测试

### 3. 软件 fallback 渲染质量
- **现象**: 当 Electron 捕获失败时，fallback 到软件渲染
- **当前行为**: 软件渲染使用简化的文字渲染（伪字模），质量低于 Electron 原生渲染
- **建议**: 考虑使用 Canvas API 或引入 sharp 库作为更高质量的 fallback

## 后续优化建议

### 短期（1-2 周）
- [ ] 增加导出预览功能（保存前预览）
- [ ] 改进错误提示（具体错误信息）
- [ ] 性能优化（Web Worker 后台渲染、进度指示器）

### 中期（1-2 月）
- [ ] 引入高质量 fallback 渲染器（sharp 或 node-canvas）
- [ ] 支持更多导出格式（JPEG、WebP、PDF）
- [ ] 批量导出功能（多缩放比例、ZIP 压缩）

### 长期（3-6 月）
- [ ] 云端导出服务（超大规模导图）
- [ ] 增量导出（缓存已渲染节点）

## 验证命令

```bash
# 运行所有导出测试
npm run test -- tests/export/

# 运行 PNG 导出完整性测试
npm run test -- tests/export/png-export-integrity.test.ts

# 运行类型检查
npm run typecheck

# 运行构建
npm run build
```

## 总结

本次修复聚焦于 PNG 导出的完整性和可靠性：
- ✅ 确保所有可见节点和连线都被包含在导出图像中
- ✅ 增强 Electron 捕获失败时的 fallback 机制
- ✅ 增加多级验证确保输出质量
- ✅ 添加完善的测试覆盖（13 个新测试用例）

所有现有测试（38 个）通过，类型检查和构建验证通过。
