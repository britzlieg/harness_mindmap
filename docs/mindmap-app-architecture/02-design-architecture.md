# 设计架构（Design View）

## 1) 运行时分层与边界

```text
┌───────────────────────────────────────────────────────────┐
│ Renderer（src）                                            │
│ 组件 / hooks / stores / UI utilities                      │
└───────────────┬───────────────────────────────────────────┘
                │ window.electronAPI（preload 白名单 API）
┌───────────────▼───────────────────────────────────────────┐
│ Main（electron）                                           │
│ ipc handlers / services / BrowserWindow                    │
└───────────────────────────────────────────────────────────┘

共享域层（跨进程）：electron/shared/*
- types / themes / layout / geometry / node-text / defaults
- 依赖方向：renderer -> shared <- electron
```

设计原则：

- 渲染层负责交互与状态编排，不直接触达 Node/Electron 能力。
- 主进程负责文件系统、导出落盘、窗口宿主行为。
- 跨进程复用逻辑统一收敛到 `electron/shared/*`，避免 `electron -> src` 反向依赖。

## 2) 分层职责

### 2.1 Renderer 层（UI + 状态）

- `src/components/*`：交互视图（Canvas/Sidebar/Dialogs/Window）
- `src/hooks/*`：行为编排（文件操作、自动保存、快捷键、画布交互）
- `src/stores/*`：状态容器（mindmap/canvas/ui）
- `src/types`、`src/themes`、`src/utils/layout-algorithms`：对 shared 的薄转发

### 2.2 Bridge 层（preload）

- `electron/preload.ts` 暴露最小必要 API：`file`、`layout`、`export`、`window`
- 使用 `contextBridge + ipcRenderer.invoke` 固定调用面，防止渲染层任意扩权

### 2.3 Main 层（IPC + 服务）

- `electron/ipc/*`：入站校验、参数解析、路径策略、错误映射
- `electron/services/*`：领域实现（file/export/window host 协作）
- `electron/main.ts`：窗口生命周期与 handler 注册

### 2.4 Shared 层（跨进程纯逻辑）

- `electron/shared/types`：统一类型协议
- `electron/shared/themes`：主题协议与解析
- `electron/shared/utils/*`：布局、几何、文本规范化、常量
- `electron/shared/defaults.ts`：默认值统一来源

## 3) 关键依赖方向

```text
src/components -> src/hooks -> src/stores
       |              |            |
       └──────────────┴────────────┴──> src/types|themes|utils (re-export)
                                           |
                                           v
                                  electron/shared/*
                                           ^
                                           |
                              electron/ipc -> electron/services
                                           ^
                                           |
                                  electron/preload
```

约束：

- 不允许主进程直接 import `src/*`。
- renderer 与 main 的共享协议，优先放入 `electron/shared/*`。
- IPC handler 不承载重业务逻辑，业务下沉到 services。

## 4) IPC 安全与契约

当前 IPC 入口执行三道防线：

1. sender 校验：`electron/ipc/security.ts`
2. payload 运行时校验：`electron/ipc/validators.ts`
3. 文件输出路径策略：`electron/ipc/path-policy.ts`

落地点：

- `file-handlers.ts`：`.mindmap` 打开/保存/创建
- `export-handlers.ts`：`markdown/svg/png` 导出与 `saveAs`
- `layout-handlers.ts`：布局计算能力入口
- `main.ts` 窗口 handler：`window:*` 也有 sender 校验

## 5) 导出链路设计

```text
ExportDialog (renderer)
  -> preload export API
  -> ipc/export-handlers
  -> export-orchestrator
  -> scene-builder
  -> svg-renderer / png-renderer
  -> fs write
```

说明：

- `export-orchestrator` 作为主编排层，降低 handler 与大体量 `export-service` 的耦合。
- `scene-builder/svg-renderer/png-renderer` 将“场景构建”和“格式渲染”拆分，便于测试与替换。
- 外部行为保持兼容：仍支持 Markdown/SVG/PNG（含 PNG scalePercent）。

## 6) 质量保障与验证入口

- 架构边界：`tests/architecture/electron-boundary.test.ts`
- IPC 回归：`tests/ipc/file-handlers.test.ts`、`tests/ipc/export-handlers.test.ts`
- 导出一致性：`tests/export/export-service.test.ts`
- 关键业务回归：`tests/features/*`、`tests/polish/App-integration.test.tsx`

本设计与 `04-refactor-architecture-and-code-quality.md` 保持一致，当前状态为重构已落地并可归档。
