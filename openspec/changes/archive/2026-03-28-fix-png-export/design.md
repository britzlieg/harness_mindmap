## Context

当前 PNG 导出流程采用三层架构：
1. **scene-builder.ts** - 构建渲染场景（调用 `buildExportRenderScene`）
2. **png-renderer.ts** - PNG 渲染编排（调用 Electron SVG 栅格化 + fallback）
3. **export-service.ts** - 核心渲染能力（SVG 生成、Electron 捕获、软件渲染 fallback）

现有问题可能出现在以下环节：
- **内容边界计算**：`buildRenderScene` 中的 `ContentBounds` 计算可能未正确覆盖所有节点和连线
- **Electron 分块捕获**：`tryRenderPngViaElectronSvg` 中的 tiled capture 逻辑可能存在坐标偏移或裁切问题
- **尺寸验证不足**：虽然 PNG 导出后有尺寸验证，但验证失败后的 fallback 机制可能不够完善

## Goals / Non-Goals

**Goals:**
- PNG 导出完整包含所有可见节点和连线，无内容截断
- 保持与 SVG 导出相同的场景数据源和布局计算逻辑
- 大尺寸导图导出时（超过 `MAX_PNG_CAPTURE_TILE_EDGE`）能正确分块捕获并拼接
- 导出后验证图像尺寸与预期一致，失败时优雅降级

**Non-Goals:**
- 不改变 PNG 导出的 API 接口和调用方式
- 不修改导出对话框的 UI 交互流程
- 不改变现有的缩放百分比输入和验证逻辑
- 不优化导出性能（除非直接影响完整性）

## Decisions

### Decision 1: 统一内容边界计算逻辑

**选择**：在 `buildRenderScene` 中采用四极值点（最上、最左、最下、最右）计算内容边界，并在 `fitSceneForRaster` 中重新验证边界。

**理由**：
- 现有代码已使用 `ContentBounds` 接口，但可能在某些边缘情况下未正确扩展边界
- 四极值点方法能确保所有节点和贝塞尔曲线控制点都被包含
- 避免使用固定默认尺寸覆盖实际内容边界

**备选方案**：
- 方案 A：直接使用节点和连线的所有坐标点计算边界 - 计算量大但更精确
- 方案 B：使用固定安全边距 - 简单但可能导致过多空白或仍然截断

### Decision 2: 增强 Electron 分块捕获的坐标管理

**选择**：在 tiled capture 中使用容器位移（transform translate）而非图像裁剪来展示不同区域，并在拼接时严格验证瓦片尺寸。

**理由**：
- 现有代码已使用容器位移方案，但可能在 `copyBgraTileToRgba` 中存在坐标计算误差
- 分块捕获能处理超过 `MAX_PNG_CAPTURE_TILE_EDGE` 的大尺寸场景
- 需要确保瓦片拼接时的像素级对齐

**备选方案**：
- 方案 A：使用单个大窗口捕获 - 受限于 Electron/系统资源
- 方案 B：使用 Canvas 2D API 手动渲染 - 失去 Electron 原生文本渲染优势

### Decision 3: 强化尺寸验证和 fallback 链

**选择**：在 `renderPng` 中增加多级验证：
1. Electron 捕获后验证尺寸匹配
2. 尺寸不匹配时尝试 fallback 软件渲染
3. 软件渲染后再次验证

**理由**：
- 现有验证只检查尺寸，未检查内容完整性
- Fallback 链确保即使 Electron 捕获失败也能生成有效 PNG
- 软件渲染虽然质量较低但能保证内容完整

**备选方案**：
- 方案 A：多次重试 Electron 捕获 - 可能重复失败
- 方案 B：直接抛出错误让用户重试 - 用户体验差

## Risks / Trade-offs

### Risk 1: 修改边界计算可能影响现有导出尺寸行为

**影响**：用户可能注意到导出的 PNG 尺寸与之前版本略有不同

**缓解**：
- 保持 `minWidth`/`minHeight` 的默认值不变
- 确保 padding 计算逻辑一致
- 在测试中覆盖常见导图尺寸场景

### Risk 2: Electron 分块捕获涉及平台特定行为

**影响**：Windows/macOS/Linux 上的 BrowserWindow 渲染行为可能有差异

**缓解**：
- 在三个平台上都进行导出测试
- 增加跨平台的视觉回归测试
- 保留软件 fallback 作为最后保障

### Risk 3: 大尺寸导出可能消耗更多内存

**影响**：导出超大思维导图时可能遇到内存压力

**缓解**：
- 保持现有的 `MAX_RASTER_EXPORT_PIXELS` 限制
- 在导出前计算预期像素数并提前预警
- 分块捕获本身已限制单瓦片尺寸为 `MAX_PNG_CAPTURE_TILE_EDGE`

## Migration Plan

本修复不涉及数据迁移或配置变更，修改仅限于代码层面：

1. **阶段 1**：修复 `export-service.ts` 中的边界计算逻辑
2. **阶段 2**：增强 `png-renderer.ts` 中的验证和 fallback 链
3. **阶段 3**：添加 PNG 导出完整性测试用例
4. **阶段 4**：跨平台手动验证（Windows/macOS/Linux）

**回滚策略**：如果修复引入新问题，可回退到当前版本，用户可暂时使用 SVG 导出作为替代方案。

## Open Questions

1. **是否需要增加导出预览功能？** - 让用户在保存前预览导出效果，但这超出当前修复范围
2. **是否需要支持更多导出格式？** - 如 JPEG、WebP 等，建议作为独立功能需求处理
3. **是否需要优化导出性能？** - 当前修复聚焦完整性，性能优化可后续进行
