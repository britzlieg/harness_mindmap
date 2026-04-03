## Why

当前导出功能采用"一键导出"模式，用户在选择格式后直接保存文件，无法在保存前预览导出效果。这导致：
- 用户无法确认导出效果是否符合预期
- PNG 缩放比例调整缺乏视觉反馈
- 导出后发现问题需要重新操作

本变更引入分步向导式导出流程，在保存前提供实时预览能力，提升用户体验和导出成功率。

## What Changes

- **新增导出对话框分步向导模式**：将当前单步导出改为三步流程（选格式 → 预览调整 → 保存）
- **新增 PNG 实时预览功能**：在步骤 2 显示 SVG 预览图，拖动缩放滑块时实时更新
- **新增导出尺寸和文件大小估算显示**：预览区显示导出图像的像素尺寸和估算大小
- **修改导出对话框状态管理**：增加步骤状态、预览数据、保存路径等状态管理
- **新增 IPC API `export:generatePreview`**：用于生成预览数据和尺寸信息

## Capabilities

### New Capabilities

- `export-preview`: 导出预览生成与渲染能力，包括 SVG 预览生成、尺寸计算、文件大小估算
- `export-wizard-ui`: 分步向导式导出界面，包括三步流程控制、状态管理、交互逻辑
- `export-ipc-preview`: 预览相关的 IPC 通信协议，包括预览生成请求和响应

### Modified Capabilities

- `export`: 导出功能的需求扩展，增加预览生成和确认环节

## Impact

- **前端组件**: `src/components/Dialogs/ExportDialog.tsx` 需要重构为向导模式
- **状态管理**: `src/stores/ui-store.ts` 可能需要扩展导出相关状态
- **IPC 协议**: `electron/ipc/export-handlers.ts` 需要新增 `export:generatePreview` handler
- **导出服务**: `electron/services/export-service.ts` 可能需要暴露预览生成相关方法
- **类型定义**: `electron/shared/types.ts` 需要新增预览相关的类型定义
- **测试**: 需要新增向导交互测试和预览生成测试
