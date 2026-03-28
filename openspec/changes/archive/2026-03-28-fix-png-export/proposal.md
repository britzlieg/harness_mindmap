## Why

用户报告 PNG 导出功能无法导出完整图片（内容被截断或显示不完整），但 SVG 导出功能工作正常。这是一个影响用户体验的关键功能缺陷，需要修复 PNG 导出流程中的内容边界计算或渲染捕获逻辑。

## What Changes

- 修复 PNG 导出流程中内容边界计算不准确的问题，确保所有可见节点和连线都被包含在导出图像中
- 修复 Electron BrowserWindow 分块捕获（tiled capture）逻辑中可能存在的坐标偏移或裁切问题
- 增强 PNG 导出后的尺寸验证，确保输出图像尺寸与预期场景尺寸一致
- 添加更完善的 fallback 机制，当 SVG 栅格化失败时能优雅降级到纯软件渲染

## Capabilities

### New Capabilities

无新增能力，此变更是对现有 PNG 导出能力的缺陷修复。

### Modified Capabilities

- `mindmap-png-export`: 修复 PNG 导出内容边界计算和 Electron 栅格化捕获逻辑，确保导出图像完整包含所有可见内容

## Impact

- **受影响文件**:
  - `mindmap-app/electron/services/export-service.ts` - 核心导出渲染逻辑
  - `mindmap-app/electron/services/export-orchestrator.ts` - 导出编排层（需检查）
  - `mindmap-app/electron/ipc/export-handlers.ts` - IPC 处理器和尺寸验证
  - `mindmap-app/tests/export/` - PNG 导出测试用例

- **依赖项**:
  - Electron BrowserWindow offscreen 渲染 API
  - Node.js zlib 模块（PNG 编码）

- **风险**:
  - 修改内容边界计算可能影响现有导出尺寸行为
  - Electron 分块捕获逻辑涉及平台特定行为，需跨平台验证

- **测试影响**:
  - 需要增加 PNG 导出完整性验证测试
  - 需要增加大尺寸导图导出测试场景
