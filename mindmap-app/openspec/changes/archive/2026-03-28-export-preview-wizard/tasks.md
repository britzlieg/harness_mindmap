## 1. 类型定义与共享

- [x] 1.1 在 `electron/shared/types/index.ts` 中新增 `ExportPreviewResult` 接口
- [x] 1.2 扩展 `ExportScaleOptions` 接口（如需要）
- [x] 1.3 在 `src/types/index.ts` 或 `src/types/global.d.ts` 中更新 `window.electronAPI` 类型定义

## 2. IPC 层实现

- [x] 2.1 在 `electron/ipc/export-handlers.ts` 中新增 `export:generatePreview` handler
- [x] 2.2 实现预览数据生成逻辑（调用 `renderExportSceneToSvg`）
- [x] 2.3 实现尺寸计算和文件大小估算
- [x] 2.4 在 `electron/preload.ts` 中暴露 `export.generatePreview` API

## 3. 状态管理扩展

- [x] 3.1 在 `src/stores/ui-store.ts` 中新增 `lastExportFormat` 和 `lastPngScalePercent` 状态
- [x] 3.2 实现状态持久化（localStorage）
- [x] 3.3 新增状态操作方法 `setLastExportFormat` 和 `setLastPngScalePercent`

## 4. ExportDialog 重构

- [x] 4.1 将单步对话框重构为三步向导结构
- [x] 4.2 实现步骤 1：格式选择界面（记忆上次格式）
- [x] 4.3 实现步骤 2：预览区域（SVG 渲染、缩放滑块、尺寸显示）
- [x] 4.4 实现步骤 3：调用系统保存对话框
- [x] 4.5 实现步骤间导航逻辑（上一步/下一步/取消）
- [x] 4.6 实现 PNG 缩放输入的防抖更新逻辑
- [x] 4.7 实现预览提示文字（"预览效果可能与最终导出略有差异"）
- [x] 4.8 实现缩放输入验证和错误提示

## 5. 样式与 UI

- [x] 5.1 在 `globals.css` 中新增向导相关样式类
- [x] 5.2 实现预览区域样式（固定最大高度、自适应宽度）
- [x] 5.3 实现缩放滑块样式
- [x] 5.4 实现步骤指示器样式（可选）

## 6. 测试

- [x] 6.1 新增 `export:generatePreview` IPC handler 测试
- [x] 6.2 新增 ExportDialog 向导流程测试
- [x] 6.3 新增 PNG 缩放输入验证测试
- [x] 6.4 新增状态持久化测试
- [x] 6.5 手动测试导出完整流程

## 7. 文档与清理

- [x] 7.1 更新 `README.md` 或相关文档说明导出功能变更
- [x] 7.2 清理临时调试代码
- [x] 7.3 运行 typecheck 和 lint 修复问题
