# AGENTS.md

本仓库是一个 harness 工作区，真正的产品代码位于 `mindmap-app/`；根目录主要用于承载文档、架构说明和 OpenSpec 上下文。

## 会话启动建议

每次启动新的 Codex session 时，建议按下面顺序建立上下文：

1. 这个是路由地图，如果需要了解整个项目，可以从这个 `docs/mindmap-app-architecture/README.md`入手。
   这是架构文档与变更影响分析的导航入口。
2. 根据当前任务类型，再继续打开对应文档：
   - `01-functional-architecture.md`：功能视角、用户流程、核心能力
   - `02-design-architecture.md`：分层设计、运行时边界、数据模型
   - `03-module-key-files.md`：关键模块与入口文件索引
   - `impact-radius/01-change-impact-radius-map.md`：改动前的影响半径评估
   - `04-refactor-architecture-and-code-quality.md`：最近一次重构落地说明
3. 在做架构性修改前，检查 `openspec/changes/` 是否存在未归档变更。
   如果目录下只有 `archive/`，通常可以按当前代码状态继续工作。

## 仓库结构

- `mindmap-app/`：主应用，技术栈为 Electron + React + Vite
- `docs/mindmap-app-architecture/`：高价值架构文档与导航入口
- `openspec/`：需求、变更与规范流程产物

## 默认工作目录

涉及应用代码、测试、构建时，默认在 `mindmap-app/` 目录下执行命令。

常用命令：

```bash
npm run typecheck
npm run test
npm run build
npm run lint
```

如果改动范围较小，优先执行最小必要验证，而不是直接跑全量：

```bash
npm test -- tests/<targeted-file>.test.ts
```

## 代码分层速览

修改前先确认所处层级，避免在错误边界做变更：

- `mindmap-app/src/`：渲染层 UI、hooks、stores、themes、utils
- `mindmap-app/electron/main.ts`：Electron 主进程启动与窗口行为
- `mindmap-app/electron/preload.ts`：渲染层可调用的安全桥接 API
- `mindmap-app/electron/ipc/`：IPC handler、校验、安全策略、路径策略
- `mindmap-app/electron/services/`：文件、导出等业务服务层
- `mindmap-app/electron/shared/`：跨进程共享类型、默认值、主题、布局工具

其中，renderer 侧对 shared 域能力的转发入口主要在：

- `mindmap-app/src/types/`
- `mindmap-app/src/themes/`
- `mindmap-app/src/utils/layout-algorithms.ts`

## 改动定位建议

开始改代码前，可以先用这份路由表快速定位：

- 画布或节点交互：`src/components/Canvas/`、`src/hooks/`、`src/stores/`
- 文件操作链路：`src/hooks/useFileOperations.ts`、`electron/ipc/file-handlers.ts`、`electron/services/file-service.ts`
- 导出链路：`src/components/Dialogs/ExportDialog.tsx`、`electron/ipc/export-handlers.ts`、`electron/services/export*`
  - PNG 导出渲染：`electron/services/export/png-renderer.ts`（多级验证链）
  - SVG 导出渲染：`electron/services/export/svg-renderer.ts`
  - 场景构建：`electron/services/export/scene-builder.ts`
  - 核心服务：`electron/services/export-service.ts`（边界计算、分块捕获）
- 布局或主题逻辑：`electron/shared/`、`src/themes/`、`src/utils/`、`src/components/Sidebar/`
- 窗口行为：`src/components/Window/`、`electron/preload.ts`、`electron/main.ts`

## 已归档变更

- **2026-03-28-fix-png-export**: PNG 导出完整性修复
  - 修复内容：边界计算、分块捕获验证、多级验证链
  - 规范同步：`openspec/specs/mindmap-png-export/spec.md`
  - 测试覆盖：`tests/export/png-export-integrity.test.ts`（13 个用例）

## 工作约束
- 强约束：所有会话和文档都用中文。

- 所有新增文档、修改文档、架构说明、规范说明、操作指南、评审记录，统一使用中文编写；除代码标识、命令、路径、协议字段名等必须保留原文的内容外，不使用英文作为正文语言。
- 不要修改 `dist/`、`dist-electron/`、`node_modules/`，除非用户明确要求，或这些产物是验证流程自动生成的结果。
- 跨进程协议、共享类型和共享默认值应尽量集中在 `electron/shared/`，不要在 renderer 与 main 两侧重复定义同一份领域模型。
- 如果修改 IPC 相关逻辑，请沿着完整链路检查：
  `preload -> ipc handlers -> validators/security/path policy -> service layer -> tests`
- 优先做最小且符合分层边界的修改，不要为了省事跨层绕过既有架构。
- 修改某项能力时，记得同步检查 `mindmap-app/tests/` 中对应的测试入口。

## 完成标准

任务结束前，至少完成以下检查：

1. 如果改动跨越模块或进程边界，回看对应架构文档，确认没有破坏既有分层约束。
2. 运行最小但足够有信心的验证命令，例如相关测试、`typecheck`、`build`。
3. 汇报改动文件、已执行验证，以及剩余风险或后续建议。
