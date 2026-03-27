# 04 - Refactor Architecture And Code Quality

## 1. 背景与目标

对应 OpenSpec 变更：`refactor-architecture-and-code-quality`。  
目标是在**不影响现有功能行为**的前提下，完成以下重构：

- 清理 `electron -> src` 反向依赖，建立共享层边界。
- 强化 IPC 契约（输入校验、sender 校验、路径策略）。
- 拆分导出服务，降低单模块复杂度。
- 统一默认值与命名，清理高风险 `any`。
- 通过回归测试和构建验证保证行为一致性。

## 2. 主要架构变化

### 2.1 Shared Layer 引入

新增 `electron/shared/*` 作为跨进程共享域层：

- `electron/shared/types/index.ts`
- `electron/shared/themes/index.ts`
- `electron/shared/utils/layout-algorithms.ts`
- `electron/shared/utils/geometry.ts`
- `electron/shared/utils/node-text.ts`
- `electron/shared/utils/constants.ts`
- `electron/shared/defaults.ts`

`src/types`、`src/themes`、`src/utils/*` 改为从 shared 层转发或复用，避免 Electron 直接依赖 Renderer 目录。

### 2.2 IPC 安全与契约强化

新增：

- `electron/ipc/validators.ts`：运行时 payload 校验
- `electron/ipc/security.ts`：trusted sender 校验
- `electron/ipc/path-policy.ts`：写路径标准化与扩展名策略

改造：

- `electron/ipc/file-handlers.ts`
- `electron/ipc/export-handlers.ts`
- `electron/ipc/layout-handlers.ts`
- `electron/main.ts`（window handlers 加 sender 校验）
- `electron/preload.ts`（API 类型契约收紧）

### 2.3 导出模块拆分（保留外部行为）

在保留原 `export-service` 兼容接口基础上，新增模块化导出链路：

- `electron/services/export/scene-builder.ts`
- `electron/services/export/svg-renderer.ts`
- `electron/services/export/png-renderer.ts`
- `electron/services/export-orchestrator.ts`

`export-handlers` 已切到 orchestrator 层，降低 handler 与大文件耦合。

## 3. 代码质量与一致性改进

- 统一默认值来源：`electron/shared/defaults.ts`
- `NodeEditor` 等高风险 `any` 位置收紧类型
- 文案资源与日志信息规范化（`src/constants/ui-text.ts`, `src/hooks/useFileOperations.ts`）
- 新增架构边界测试：`tests/architecture/electron-boundary.test.ts`

## 4. 功能行为保持说明

本次重构未引入新业务能力，核心功能保持不变：

- 文件操作：新建 / 打开 / 保存 / 另存 / 自动保存
- 画布交互：缩放、平移、节点编辑
- 布局切换与主题切换
- 导出：Markdown / SVG / PNG（含比例参数）
- 窗口控制：最小化 / 最大化 / 关闭

## 5. 验证记录

已执行并通过：

- `npm run typecheck`
- `npx tsc -p tsconfig.electron.json --noEmit`
- `npm run build`

关键回归通过（节选）：

- `tests/ipc/file-handlers.test.ts`
- `tests/ipc/export-handlers.test.ts`
- `tests/architecture/electron-boundary.test.ts`
- `tests/export/export-service.test.ts`
- `tests/features/file-operations.test.tsx`
- `tests/features/export-dialog.test.tsx`
- `tests/features/useKeyboardShortcuts.test.ts`
- `tests/features/layout-selector.test.tsx`
- `tests/features/theme-selector.test.tsx`
- `tests/polish/App-integration.test.tsx`

## 6. OpenSpec 对齐

- Change: `refactor-architecture-and-code-quality`
- Schema: `spec-driven`
- Tasks: `22/22 complete`
- 状态：可归档（archive-ready）
