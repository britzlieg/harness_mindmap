## Why

当前 PNG 导出功能存在两个相互关联的核心问题：(1) 导出的图片中节点文字模糊，使用简化的伪字模渲染而非真实字体；(2) 大尺寸导图导出时可能出现图片截断或不完整。这两个问题形成"非此即彼"的困境——Electron 光栅化路径可能因分块捕获对齐问题导致截断，验证失败后降级到 Fallback 路径又会导致文字模糊。用户反复在"图片不完整"和"节点字体模糊"之间来回切换，无法获得既清晰又完整的导出结果。

## What Changes

- **修复分块捕获的坐标对齐逻辑**：重新设计 `tryRenderPngViaElectronSvg` 中的 tiled capture 流程，确保图像元素与窗口/容器的相对位置正确，避免拼接错位
- **改进渲染稳定等待机制**：使用 `requestAnimationFrame` 和图像 `onload` 事件替代固定超时，确保字体加载和渲染完全稳定后再捕获
- **增强 Fallback 文字渲染质量**：改进 `drawPseudoGlyph` 函数，使用更高分辨率的字模网格和抗锯齿采样，提升降级路径的文字清晰度
- **优化验证链阈值**：放宽尺寸验证的容差范围，避免过度降级到 Fallback 路径
- **增加导出调试日志**：在关键节点添加结构化日志，便于定位未来可能出现的问题

## Capabilities

### New Capabilities

- `png-tiled-capture`: 分块捕获流程的坐标对齐和时序控制规范
- `png-fallback-rendering`: Fallback 渲染路径的文字和图形质量标准

### Modified Capabilities

- `mindmap-png-export`: 更新 PNG 导出验证链和降级策略的要求，明确尺寸容差和渲染等待机制

## Impact

- **受影响文件**:
  - `electron/services/export-service.ts` - `tryRenderPngViaElectronSvg`、`renderSceneToPngFallback`、`drawPseudoGlyph`
  - `electron/services/export/png-renderer.ts` - 验证链逻辑
  - `electron/shared/utils/layout-algorithms.ts` - 无直接影响
- **测试影响**: 需要更新 `tests/export/png-export-integrity.test.ts` 增加分块捕获和 Fallback 质量的测试用例
- **依赖**: Electron 33+ 的 `capturePage`、`nativeImage` API 行为保持不变
- **向后兼容**: 非破坏性变更，现有导出 API 签名不变
