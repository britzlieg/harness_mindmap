## Why

当前应用虽然有主题列表和主题字段，但选中的主题尚未稳定驱动画布、节点与连线渲染，导致用户“可选主题”与“实际视觉效果”不一致。需要补齐导图主题能力，让主题在编辑、保存、重开后都可预期生效。

## What Changes

- 增加导图主题的端到端生效能力：选择主题后，画布背景、网格、节点样式与连线样式同步更新。
- 规范主题应用优先级：节点显式样式优先，缺省部分由主题填充，避免覆盖用户手动样式。
- 规范主题持久化与回退：文档元数据保存主题名；遇到未知主题时安全回退到 `default`。
- 为主题行为补充测试覆盖，确保渲染一致性与持久化稳定性。

## Capabilities

### New Capabilities

- `mindmap-theme-management`: 定义主题选择、渲染应用、样式优先级、持久化与未知主题回退的行为规范。

### Modified Capabilities

- None.

## Impact

- Affected frontend: `mindmap-app/src/components/Sidebar/ThemeSelector.tsx`, `mindmap-app/src/components/Canvas/MindMapCanvas.tsx`, `mindmap-app/src/components/Canvas/NodeRenderer.tsx`, `mindmap-app/src/components/Canvas/ConnectionCanvas.tsx`, `mindmap-app/src/themes/index.ts`, `mindmap-app/src/stores/mindmap-store.ts`.
- Affected persistence path: `mindmap-app/electron/db/operations.ts`, `mindmap-app/electron/services/file-service.ts` (theme 字段读写一致性验证)。
- Affected tests: `mindmap-app/tests/features/themes.test.ts`, `mindmap-app/tests/canvas/MindMapCanvas.test.tsx`, 以及新增主题应用行为测试。
