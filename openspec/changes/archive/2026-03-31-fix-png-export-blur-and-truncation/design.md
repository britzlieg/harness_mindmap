## Context

当前 PNG 导出流程采用双路径策略：
1. **Electron 光栅化路径**：通过 `BrowserWindow` 的 `capturePage()` 捕获 SVG 渲染结果，支持分块捕获处理大尺寸图片
2. **Fallback 软件渲染路径**：使用 `renderSceneToPngFallback` 直接绘制像素，文字通过 `drawPseudoGlyph` 模拟

问题根源：
- **分块捕获对齐问题**：在 `tryRenderPngViaElectronSvg` 中，通过 CSS `transform: translate()` 移动容器来显示不同区域，但图像元素使用 `position: absolute` 固定在容器原点，导致窗口移动后图像与捕获区域不对齐
- **等待时间不足**：分块捕获之间仅等待 30ms，不足以让 Electron 完成渲染稳定
- **Fallback 文字质量差**：`drawPseudoGlyph` 使用 10x14 网格和简单位图模式模拟字符，无真正字体渲染
- **验证链过严**：尺寸验证要求完全匹配，稍有偏差就降级到 Fallback

## Goals / Non-Goals

**Goals:**
- 修复分块捕获的坐标对齐问题，确保大尺寸导图导出完整无截断
- 改进渲染等待机制，使用事件驱动替代固定超时
- 提升 Fallback 路径的文字渲染质量，即使降级也能保持可读性
- 优化验证链阈值，减少不必要的降级
- 保持现有 API 签名和导出行为不变

**Non-Goals:**
- 不引入新的外部依赖（如 Canvas API、第三方图像处理库）
- 不改变 PNG 导出的用户界面和交互流程
- 不支持矢量格式（SVG）的光栅化质量改进（已在规范中覆盖）
- 不重构整个导出架构，仅针对已识别的问题点进行修复

## Decisions

### Decision 1: 分块捕获改用图像定位而非容器移动

**方案**：将图像元素从 `position: absolute; left: 0; top: 0` 改为 `position: absolute; left: -offsetX; top: -offsetY`，容器保持固定尺寸，窗口捕获整个可视区域。

**理由**：
- 原方案移动容器时，图像相对于容器的位置不变，但窗口看到的是容器的不同区域，可能导致图像边缘与窗口边界不对齐
- 新方案直接移动图像，确保图像的指定区域精确对齐到窗口的 (0, 0) 点
- 代码改动最小，仅需修改 HTML 模板和 `transform` 逻辑

**替代方案**：
- 使用 `clip-path` 裁剪图像：复杂度高，且可能引入额外的渲染开销
- 多次加载不同位置的 SVG：性能差，需要重新解析和布局

### Decision 2: 使用 `requestAnimationFrame` + 图像 `onload` 事件等待

**方案**：在分块捕获的每个瓦片之间，使用 `await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))` 替代 `setTimeout(30)`。

**理由**：
- `requestAnimationFrame` 与显示器刷新率同步，确保渲染帧已完成
- 双层 `requestAnimationFrame` 确保第一帧的渲染结果已提交到 GPU
- 不依赖固定时间，适应不同性能的设备

**替代方案**：
- 增加超时时间到 100-200ms：仍然不可靠，且在高性能设备上浪费时间
- 使用 `MutationObserver` 监听样式变化：复杂度高，可能错过渲染完成点

### Decision 3: Fallback 文字渲染使用 20x28 网格 + 亚像素采样

**方案**：将 `drawPseudoGlyph` 的字模网格从 10x14 提升到 20x28，并将 `samplesPerPixel` 从 `glyphScale` 提升到 `glyphScale * 2`，每个像素采样 4-8 次进行抗锯齿。

**理由**：
- 更高分辨率的网格可以模拟更多字符细节
- 亚像素采样可以平滑边缘锯齿，提升视觉质量
- 代码改动局限在单个函数内，不影响其他导出逻辑

**替代方案**：
- 使用 Node.js 的 `canvas` 库：需要新增原生依赖，增加安装复杂度
- 调用系统字体渲染 API：跨平台兼容性差，Windows/macOS/Linux 行为不一致

### Decision 4: 验证链增加 2% 尺寸容差

**方案**：在 `isPngContentMeaningful` 和 `tryRenderPngViaElectronSvg` 的尺寸验证中，允许实际尺寸与预期尺寸有 ±2% 的偏差。

**理由**：
- Electron 的 `capturePage` 在某些情况下可能因 DPI 缩放产生轻微尺寸偏差
- 2% 容差足够覆盖常见偏差，同时不会放过严重的截断问题
- 对于偏差在容差范围内的情况，可以通过裁剪或填充修正，而非直接降级

**替代方案**：
- 完全移除尺寸验证：风险过高，可能放过严重问题
- 使用固定像素容差（如 ±10px）：对于不同尺寸的图片不够灵活

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 分块捕获逻辑修改引入新 bug | 大尺寸图片导出仍然截断或错位 | 增加 13 个测试用例覆盖边界场景，包括 100+ 节点、200% 缩放、超大图片 |
| Fallback 渲染性能下降 | 导出时间增加 10-20% | 仅在 Electron 路径失败时使用 Fallback，且 20x28 网格仍在可接受范围 |
| 2% 容差放过截断问题 | 用户收到轻微裁剪的图片 | 在日志中记录实际尺寸，便于后续分析和调整 |
| `requestAnimationFrame` 在 offscreen 窗口行为不一致 | 等待失效或超时 | 保留 3 秒超时保护，避免无限等待 |
| 修改导出核心逻辑影响其他格式 | SVG/Markdown 导出受影响 | 修改仅限于 PNG 相关函数，SVG 和 Markdown 使用独立路径 |

## Migration Plan

1. **备份当前代码**：创建 Git 分支 `backup-png-export-before-fix`
2. **实施修复**：按 tasks.md 顺序修改代码
3. **运行测试**：执行 `npm run test -- tests/export/png-export-integrity.test.ts`
4. **手动验证**：导出 3 种场景的 PNG（小、中、大尺寸），检查清晰度和完整性
5. **回滚策略**：如发现问题，使用 `git revert` 回滚提交，恢复原代码

## Open Questions

1. **20x28 网格是否足够覆盖常用字符**：需要测试中文、英文、数字、符号的渲染效果，如不足需进一步调整
2. **2% 容差是否适用于极端尺寸**：对于超过 8000px 的超大图片，2% 可能是 160px 的偏差，需要实际测试验证
3. **Electron 40+ 版本的兼容性**：当前基于 Electron 33 测试，未来升级后需重新验证分块捕获逻辑
