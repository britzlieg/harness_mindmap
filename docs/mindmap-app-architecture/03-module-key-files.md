# 功能模块与关键代码文件

> 目的：后续改功能时，先定位模块入口，再下钻实现，避免在错误层级改动。

## 1) 应用壳层（App Shell）

- `mindmap-app/src/main.tsx`：前端挂载入口
- `mindmap-app/src/App.tsx`：全局装配（Toolbar/Canvas/Sidebar/Dialogs/WindowChrome + ErrorBoundary + 主题变量）
- `mindmap-app/src/styles/globals.css`：UI token、布局框架、响应式样式
- `mindmap-app/src/components/Window/WindowChrome.tsx`：无边框窗口标题栏与窗口控制按钮

## 2) 画布与节点渲染

- `mindmap-app/src/components/Canvas/MindMapCanvas.tsx`：画布主组件，节点可见性、布局计算、选中/编辑态
- `mindmap-app/src/components/Canvas/ConnectionCanvas.tsx`：连线 Canvas 绘制
- `mindmap-app/src/components/Canvas/NodeRenderer.tsx`：节点渲染与内联编辑输入
- `mindmap-app/src/components/Canvas/CanvasControls.tsx`：缩放控件
- `mindmap-app/src/hooks/useCanvasInteraction.ts`：平移与滚轮缩放事件

## 3) 文档与节点业务状态

- `mindmap-app/src/stores/mindmap-store.ts`：节点树、元数据、文件路径、撤销重做、增删改折叠
- `mindmap-app/src/stores/canvas-store.ts`：缩放、偏移、选中节点
- `mindmap-app/src/stores/ui-store.ts`：侧边栏、帮助弹窗、导出弹窗状态

## 4) Shared 跨进程域层（重构后核心边界）

- `mindmap-app/electron/shared/types/index.ts`：统一类型协议（Node/FileMetadata/LayoutType/Export）
- `mindmap-app/electron/shared/themes/index.ts`：主题定义与归一化
- `mindmap-app/electron/shared/utils/layout-algorithms.ts`：布局算法统一实现
- `mindmap-app/electron/shared/utils/geometry.ts`：连线路径与几何工具
- `mindmap-app/electron/shared/utils/node-text.ts`：节点文本规范化
- `mindmap-app/electron/shared/utils/constants.ts`：跨层常量
- `mindmap-app/electron/shared/defaults.ts`：默认值统一来源

对应 renderer 侧转发入口：

- `mindmap-app/src/types/index.ts`
- `mindmap-app/src/themes/index.ts`
- `mindmap-app/src/utils/layout-algorithms.ts`

## 5) 文件操作链路（新建/打开/保存/自动保存）

- `mindmap-app/src/hooks/useFileOperations.ts`：前端文件动作与快捷键绑定
- `mindmap-app/src/hooks/useAutoSave.ts`：自动保存定时器
- `mindmap-app/electron/preload.ts`：渲染层可调用的 `electronAPI.file / export / layout / window`
- `mindmap-app/electron/ipc/file-handlers.ts`：IPC 文件通道注册、参数校验、错误映射
- `mindmap-app/electron/services/file-service.ts`：`.mindmap` 读写、校验、原子写、legacy 检测

## 6) IPC 安全与契约治理

- `mindmap-app/electron/ipc/security.ts`：可信 sender 校验
- `mindmap-app/electron/ipc/validators.ts`：payload 运行时校验
- `mindmap-app/electron/ipc/path-policy.ts`：输出路径规范化与扩展名策略
- `mindmap-app/electron/ipc/layout-handlers.ts`：布局 IPC 入口（含校验）
- `mindmap-app/electron/main.ts`：窗口 IPC 注册与 sender 校验

## 7) 布局与主题系统

- `mindmap-app/src/components/Sidebar/LayoutSelector.tsx`：布局切换 UI
- `mindmap-app/src/components/Sidebar/ThemeSelector.tsx`：主题切换 UI
- `mindmap-app/src/utils/theme-text-colors.ts`：文本对比度算法

## 8) 导出系统（拆分后）

- `mindmap-app/src/components/Dialogs/ExportDialog.tsx`：导出格式与参数输入
- `mindmap-app/electron/ipc/export-handlers.ts`：导出 IPC 编排与参数校验
- `mindmap-app/electron/services/export-orchestrator.ts`：导出主编排层
- `mindmap-app/electron/services/export/scene-builder.ts`：导出场景构建
- `mindmap-app/electron/services/export/svg-renderer.ts`：SVG 渲染
- `mindmap-app/electron/services/export/png-renderer.ts`：PNG 渲染
- `mindmap-app/electron/services/export-service.ts`：兼容层与底层渲染实现

## 9) 窗口与宿主壳交互

- `mindmap-app/src/components/Window/WindowChrome.tsx`：窗口最小化 / 最大化(还原) / 关闭交互
- `mindmap-app/electron/preload.ts`：`electronAPI.window` 暴露
- `mindmap-app/electron/main.ts`：`window:minimize`、`window:toggleMaximize`、`window:close`、`window:isMaximized`
- `mindmap-app/tests/ipc/main-window.test.ts`：窗口 IPC 与主窗口配置回归入口

## 10) 交互与快捷键

- `mindmap-app/src/hooks/useKeyboardShortcuts.ts`：撤销重做、缩放、节点快捷操作、帮助弹窗
- `mindmap-app/src/components/Dialogs/ShortcutsHelp.tsx`：快捷键帮助 UI
- `mindmap-app/src/constants/ui-text.ts`：UI 文案与快捷键说明

## 11) 工程与验证入口

- `mindmap-app/vite.config.ts`：Vite + React + Electron 双入口构建
- `mindmap-app/vitest.config.ts`：测试环境与匹配规则
- `mindmap-app/tests/architecture/electron-boundary.test.ts`：边界约束测试
- `mindmap-app/tests/ipc/*.test.ts`、`mindmap-app/tests/export/*.test.ts`、`mindmap-app/tests/features/*.test.tsx`：关键能力回归

## 12) 模块改动定位建议（给 AI/开发者）

- 改“跨进程协议”优先看：`electron/shared/*` + `src/types|themes|utils` 转发层
- 改“文件与导出”优先看：`electron/ipc/*` + `electron/services/*`
- 改“画布交互”优先看：`components/Canvas` + `hooks` + `stores`
- 改“窗口行为”优先看：`components/Window` + `electron/main.ts` + `electron/preload.ts`
- 需要回归验证时，对应查看 `tests/<capability>` 同名测试
