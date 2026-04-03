## Why

PNG 导出功能当前存在字体渲染模糊问题：导出的 PNG 图像中节点文字边缘模糊、字重不一致，与屏幕上清晰的渲染效果存在明显差距。用户反馈导出图片"看起来不专业"，尤其在放大查看或打印时问题更加明显。此问题源于 SVG 光栅化过程中缺少字体声明，导致 Electron 离屏窗口使用浏览器默认字体（Times New Roman）而非无衬线字体进行渲染。

## What Changes

- **新增 SVG 字体声明**：在生成的 SVG 根元素和 `<text>` 元素中添加 `font-family` 属性
- **使用系统安全字体栈**：采用 `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` 确保跨平台兼容性
- **保持导出独立性**：不依赖 Web 字体加载，所有字体均为系统内置字体
- **修复优先级徽章文字**：Priority Badge 中的文字同样添加字体声明

## Capabilities

### New Capabilities

无新增能力，此变更为现有 PNG 导出功能的质量修复。

### Modified Capabilities

- `mindmap-png-export`: 添加字体声明要求，确保 SVG 光栅化时使用正确的无衬线字体族

## Impact

- **受影响文件**: `electron/services/export-service.ts`（SVG 生成逻辑）
- **受影响流程**: PNG 导出链路（`exportToPNG` → `tryRenderPngViaElectronSvg`）
- **兼容性**: 非破坏性变更，现有导出功能行为保持不变，仅提升文字清晰度
- **依赖**: 无外部依赖，使用系统内置字体
- **测试**: 需验证导出清晰度、跨平台字体一致性、缩放比例影响
