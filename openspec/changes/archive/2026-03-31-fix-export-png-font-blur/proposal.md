## Why

用户导出的 PNG 图片存在字体模糊问题，导致文字内容完全看不清，严重影响导图的可用性和分享价值。此问题需要在导出流程中修复字体渲染和清晰度处理逻辑。

## What Changes

- 修复 PNG 导出时字体渲染模糊的问题，提升导出图片的文字清晰度
- 优化 SVG 到 PNG 的栅格化流程，确保字体在不同缩放比例下保持清晰
- 改进 Electron 捕获流程中的字体加载等待机制，避免在字体未完全加载时截取快照
- 调整缩放比例与 DPI 的计算逻辑，确保高倍率导出时字体质量同步提升

## Capabilities

### New Capabilities

- `png-export-font-clarity`: 修复 PNG 导出时字体模糊问题，包括字体加载等待、栅格化质量优化、DPI 缩放计算修正

### Modified Capabilities

- `mindmap-png-export`: 更新导出流程中的字体渲染和清晰度相关需求，补充字体加载验证和栅格化质量检查的规范

## Impact

- **受影响文件**: `electron/services/export-service.ts`, `electron/services/export-orchestrator.ts`, `electron/ipc/export-handlers.ts`
- **受影响测试**: `tests/export/export-regression-png.test.ts`, `tests/export/export-service.test.ts`
- **依赖项**: Electron BrowserWindow 捕获流程、SVG 栅格化逻辑
- **用户影响**: 修复后导出的 PNG 图片文字清晰度将显著提升，尤其是在高倍率导出时
