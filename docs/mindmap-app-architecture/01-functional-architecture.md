# 功能架构（Functional View）

## 1) 功能总览

项目是基于 Electron 的本地思维导图应用，核心功能包括：

- 文件生命周期：新建、打开、保存、自动保存
- 节点编辑：选中、改名、增删、折叠/展开、撤销/重做
- 画布交互：平移、缩放、节点渲染、连线渲染
- 布局切换：`mindmap / logic / org / tree-right / tree-left`
- 主题系统：主题切换 + 文本对比度计算 + CSS 变量驱动
- 导出系统：Markdown / SVG / PNG（PNG 支持缩放百分比）
- 窗口控制：最小化 / 最大化(还原) / 关闭

## 2) 用户功能链路（当前）

```text
用户操作
  -> React 组件层 (Toolbar / Sidebar / Canvas / Dialog / WindowChrome)
  -> hooks (快捷键、文件操作、自动保存、画布交互)
  -> Zustand 状态层 (mindmap / canvas / ui)
  -> shared 纯逻辑 (layout / geometry / node-text / theme)
  -> preload (window.electronAPI)
  -> ipc handlers (含 sender 校验 + payload 校验 + 路径策略)
  -> services / BrowserWindow
  -> 文件系统或窗口状态变更
```

## 3) 高频业务流

### A. 新建 / 打开 / 保存

```text
Toolbar 或快捷键
  -> useFileOperations
  -> electronAPI.file.*
  -> ipc:file-handlers (security + validators + path-policy)
  -> file-service
  -> .mindmap 文件
  -> 回填 store (nodes / metadata / filePath)
```

### B. 编辑节点与画布显示

```text
节点交互
  -> canvas-store 记录选中
  -> NodeEditor 或内联编辑更新文本
  -> mindmap-store 更新节点树(含 undo/redo)
  -> MindMapCanvas 调用 layout 计算
  -> ConnectionCanvas + NodeRenderer 重绘
```

### C. 导出

```text
ExportDialog
  -> electronAPI.export.saveAs / toPNG / toSVG
  -> ipc:export-handlers (校验 + 路径策略)
  -> export-orchestrator
  -> scene-builder / svg-renderer / png-renderer
  -> 输出 md/svg/png
```

### D. 窗口控制

```text
WindowChrome
  -> electronAPI.window.*
  -> ipcMain(window:minimize/toggleMaximize/close/isMaximized)
  -> BrowserWindow 状态变更
```

## 4) 功能边界（当前实现特征）

- `electron -> src` 反向依赖已移除，跨进程共享能力集中在 `electron/shared/*`。
- 布局主路径仍是渲染进程计算；`layout:compute` IPC 保留为受控能力。
- 导出由主进程统一编排，行为通过回归测试与构建校验保障一致。
- 文件与导出写操作均经过路径规范化与扩展名策略校验。
