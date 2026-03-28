# QWEN.md - MindMap Harness 项目上下文

## 项目概述

这是一个 **harness 工作区项目**，采用 "zero hand-code" 理念，真正的产品代码位于 `mindmap-app/` 子目录。根目录主要用于承载架构文档、OpenSpec 规范流程和 AI 协作上下文。

### 核心产品

**mindmap-app** 是一个基于 Electron + React + Vite + TypeScript 的本地思维导图应用，技术栈包括：

- **渲染层**: React 18 + TypeScript + Zustand (状态管理) + TailwindCSS
- **主进程**: Electron 33 + Node.js
- **构建工具**: Vite 6 + vite-plugin-electron
- **测试框架**: Vitest + Testing Library (jsdom)
- **打包**: electron-builder

### 仓库结构

```
harness_mindmap/
├── mindmap-app/              # 主应用（产品代码）
│   ├── src/                  # React 渲染层
│   ├── electron/             # Electron 主进程/IPC/服务
│   ├── tests/                # 测试套件
│   └── [构建配置]
├── docs/mindmap-app-architecture/  # 架构文档导航
├── openspec/                 # OpenSpec 规范与变更流程
└── [AI 助手配置] (.claude, .codex, .opencode, .qwen)
```

## 构建与运行

所有命令在 `mindmap-app/` 目录下执行：

```bash
# 开发模式
npm run dev

# 构建
npm run build

# 类型检查
npm run typecheck

# 运行测试
npm run test
npm run test:watch        # 监听模式
npm run test:coverage     # 覆盖率报告

# Lint
npm run lint
```

## 代码分层架构

### 运行时边界

```
┌─────────────────────────────────────────┐
│ Renderer (src/)                         │
│ 组件 / hooks / stores / UI utilities    │
└──────────────┬──────────────────────────┘
               │ window.electronAPI
┌──────────────▼──────────────────────────┐
│ Main (electron/)                        │
│ ipc handlers / services / BrowserWindow │
└─────────────────────────────────────────┘

共享域层：electron/shared/* (跨进程纯逻辑)
```

### 目录职责

| 目录 | 职责 |
|------|------|
| `src/components/` | UI 组件 (Canvas/Sidebar/Dialogs/Window) |
| `src/hooks/` | 行为编排 (文件操作/自动保存/快捷键) |
| `src/stores/` | Zustand 状态容器 (mindmap/canvas/ui) |
| `electron/main.ts` | Electron 主进程入口 |
| `electron/preload.ts` | 安全桥接 API (contextBridge) |
| `electron/ipc/` | IPC handler + 校验 + 安全策略 |
| `electron/services/` | 业务服务层 (文件/导出) |
| `electron/shared/` | 跨进程共享类型/主题/布局逻辑 |

### 关键路由表

| 功能 | 相关文件路径 |
|------|-------------|
| 画布/节点交互 | `src/components/Canvas/`, `src/hooks/`, `src/stores/` |
| 文件操作链路 | `src/hooks/useFileOperations.ts` → `electron/ipc/file-handlers.ts` → `electron/services/file-service.ts` |
| 导出链路 | `src/components/Dialogs/ExportDialog.tsx` → `electron/ipc/export-handlers.ts` → `electron/services/export*` |
| 布局/主题 | `electron/shared/`, `src/themes/`, `src/utils/` |
| 窗口行为 | `src/components/Window/`, `electron/preload.ts`, `electron/main.ts` |

## 开发约束与约定

### 强约束

1. **语言**: 所有会话和文档使用**中文**编写（代码标识符/命令/路径保留原文）
2. **禁止修改**: `dist/`, `dist-electron/`, `node_modules/`（除非明确指定或 CI 生成）
3. **分层边界**: 优先做最小且符合分层边界的修改，不跨层绕过既有架构
4. **共享逻辑**: 跨进程协议/类型/默认值集中在 `electron/shared/`，避免双侧重复定义

### IPC 修改链路

修改 IPC 相关逻辑时，需沿完整链路检查：

```
preload → ipc handlers → validators/security/path policy → service layer → tests
```

### 测试同步

修改某项能力时，同步检查 `mindmap-app/tests/` 中对应的测试入口。

## 测试体系

测试文件位于 `mindmap-app/tests/`，按功能模块组织：

```
tests/
├── architecture/    # 架构边界测试
├── canvas/          # 画布交互测试
├── export/          # 导出功能测试
│   ├── export-service.test.ts
│   ├── export-regression-png.test.ts
│   ├── png-export-integrity.test.ts  # PNG 导出完整性测试（13 个用例）
│   └── file-service.test.ts
├── features/        # 特性测试
├── ipc/             # IPC 协议测试
├── layout/          # 布局算法测试
└── polish/          # 视觉优化测试
```

## 已归档变更

- **2026-03-28-fix-png-export**: PNG 导出完整性修复（边界计算、分块捕获验证、多级验证链）
  - 归档位置：`openspec/changes/archive/2026-03-28-fix-png-export/`
  - 同步规范：`openspec/specs/mindmap-png-export/spec.md`

## 架构文档导航

开始工作前，建议按顺序阅读：

1. `docs/mindmap-app-architecture/README.md` - 文档导航入口
2. `docs/mindmap-app-architecture/01-functional-architecture.md` - 功能视角
3. `docs/mindmap-app-architecture/02-design-architecture.md` - 分层设计
4. `docs/mindmap-app-architecture/03-module-key-files.md` - 关键文件索引
5. `docs/mindmap-app-architecture/impact-radius/` - 变更影响评估

## OpenSpec 变更流程

- **活跃变更**: 检查 `openspec/changes/` 是否存在未归档变更
- **已归档变更**: `openspec/specs/` 包含各功能模块的规范说明
- **仅 archive**: 如果 `openspec/changes/` 只有 `archive/`，可按当前代码状态继续工作

## 完成标准

任务结束前需完成：

1. 若改动跨越模块/进程边界，回看架构文档确认未破坏分层约束
2. 运行最小但足够的验证命令（相关测试/typecheck/build）
3. 汇报改动文件、已执行验证、剩余风险或后续建议

## AI 助手配置

本仓库配置了多套 AI 助手上下文：
- `.claude/` - Claude 助手配置
- `.codex/` - Codex 助手配置
- `.opencode/` - OpenCode 助手配置
- `.qwen/` - Qwen 助手配置

各助手共享相同的架构文档和约束条件。
