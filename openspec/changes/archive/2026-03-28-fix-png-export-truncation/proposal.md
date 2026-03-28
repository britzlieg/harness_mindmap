## Why

大型思维导图（30+ 节点，5 层深度）导出 PNG 时，底部区域节点被截断，而同一场景导出 SVG 完全正常。问题限定在 PNG 渲染管线中，根因是 `fitSceneForRaster` 对超大场景执行缩放后，后续的 Electron offscreen BrowserWindow capture 路径在极端尺寸下未能完整捕获内容，且 `renderPng` 缺少输出尺寸校验，导致截断的 PNG 被静默写入文件。

## What Changes

- 在 `renderPng` 返回前增加输出 PNG 尺寸校验：若实际尺寸与预期 `fittedScene` 尺寸不符，降级到 fallback 渲染器。
- 为 `tryRenderExportPngViaElectronSvg` 的 tiled capture 路径增加 tile 输出尺寸校验与自动重试逻辑。
- 当 BrowserWindow 全尺寸 capture 与 tiled capture 均失败时，确保 fallback 渲染器生成正确尺寸的 PNG。
- 增加针对大型树形场景（多层多分支）的导出回归测试，验证底部节点不被裁切。

## Capabilities

### New Capabilities

无新增能力。

### Modified Capabilities

- `mindmap-png-export`: 当前规格已有"MUST NOT 因节点数量增加而发生边缘裁切"与"达到栅格安全上限时保持完整内容"要求，但实现未满足。本次修改强化 PNG 渲染管线的输出校验与降级逻辑，确保规格中的场景在大型场景下成立。

## Impact

- `mindmap-app/electron/services/export-service.ts`：renderPng、tryRenderExportPngViaElectronSvg、renderExportSceneToPngFallback 相关函数
- `mindmap-app/electron/services/export/png-renderer.ts`：renderPng 入口
- `mindmap-app/tests/export/export-service.test.ts`：新增大型场景回归测试
- 不涉及 IPC 协议变更、不涉及 shared 层类型变更
