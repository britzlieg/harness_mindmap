## Why

当前导出 PNG 的文字在不同缩放比例下依然模糊，导致导图内容不可读，直接影响导出可用性。  
同时，侧栏编辑输入背景、缩放信息展示与应用窗体外观与主题不一致，破坏整体视觉语言，需要统一修复以恢复主题一致性与产品质感。

## What Changes

- 修复 PNG 导出文字清晰度问题，确保导出倍率变化可真实提升文本与图形细节质量。
- 让侧栏节点编辑输入背景跟随当前主题，并采用半透明玻璃态风格。
- 移除界面中的静态 `1:1` 缩放文本展示，保留必要交互控件以简化界面。
- 将最外层窗体标题栏（最小化/最大化/关闭）改为主题化呈现，使窗体层视觉与导图主题同步。

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `mindmap-png-export`: 强化 PNG 导出对文本清晰度与缩放倍率的质量约束，确保倍率提升带来可感知清晰度提升。
- `mindmap-theme-management`: 扩展主题同步范围到侧栏编辑输入与应用窗体标题栏控制区，要求主题切换时同步更新。
- `mindmap-ui-visual-polish`: 调整界面信息密度（移除静态缩放文本）并统一侧栏输入控件为玻璃态主题风格。

## Impact

- Affected renderer UI: `src/components/Sidebar/*`, `src/components/Canvas/CanvasControls.tsx`, `src/styles/globals.css`, `src/App.tsx`
- Affected theme pipeline: `src/themes/index.ts`, `src/utils/theme-text-colors.ts`
- Affected export pipeline: `electron/ipc/export-handlers.ts`, `electron/services/export-service.ts`
- Affected shell/window layer: `electron/main.ts` and related title bar/window styling integration
- Regression focus: export quality consistency, theme propagation consistency, and UI polish snapshots
