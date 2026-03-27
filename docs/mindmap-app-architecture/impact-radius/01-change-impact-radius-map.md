# 改动影响半径图（MindMap App）

## 1) 半径模型

```text
R0: 改动点本身
|
v
R1: 直接依赖层（直接 import / 直接调用）
|
v
R2: 业务联动层（状态一致性、IPC 协议、导出结果、持久化格式）
|
v
R3: 质量与交付层（测试、构建、打包、跨平台行为）
```

```text
         ┌──────────────────────────────────────┐
         │ R3 测试/构建/打包                     │
         │ tests + typecheck + build            │
 ┌──────────────────────────────────────────────────────┐
 │ R2 业务联动                                           │
 │ stores 协同 / shared 协议 / IPC contract / 导出一致性 │
 │  ┌──────────────────────────────────────────────────┐ │
 │  │ R1 直接调用链                                     │ │
 │  │ components <-> hooks <-> stores                  │ │
 │  │ preload <-> ipc-handlers <-> services            │ │
 │  │ src(types/themes/utils) <-> electron/shared      │ │
 │  │   ┌──────────────────────────────────────────┐   │ │
 │  │   │ R0 当前改动文件                           │   │ │
 │  │   └──────────────────────────────────────────┘   │ │
 │  └──────────────────────────────────────────────────┘ │
 └──────────────────────────────────────────────────────┘
```

## 2) 高价值改动点影响矩阵

| 改动入口 | R1 直接影响 | R2 联动风险 | 建议最小回归 |
|---|---|---|---|
| `electron/shared/types/index.ts` | `src/types/index.ts`、`preload.ts`、`ipc/*`、`services/*` | 跨进程类型契约断裂、编译链路连锁报错 | `npm run typecheck`、`tests/architecture/electron-boundary.test.ts`、`tests/ipc/main-window.test.ts` |
| `electron/shared/themes/index.ts` + `electron/shared/defaults.ts` | `src/themes/index.ts`、`App`、`export-service` | 画布主题与导出主题不一致、默认值漂移 | `tests/features/themes.test.ts`、`tests/features/theme-selector.test.tsx`、`tests/export/export-service.test.ts` |
| `electron/shared/utils/layout-algorithms.ts` | `MindMapCanvas`、`layout-handlers.ts`、`export-service.ts` | 画布布局与导出布局偏差 | `tests/layout/layout-algorithms.test.ts`、`tests/canvas/MindMapCanvas.test.tsx`、`tests/export/export-service.test.ts` |
| `electron/ipc/security.ts` | 所有 `ipcMain.handle` 入口 | 合法请求被误拦截或越权请求未拦截 | `tests/ipc/file-handlers.test.ts`、`tests/ipc/export-handlers.test.ts`、`tests/ipc/main-window.test.ts` |
| `electron/ipc/validators.ts` | `file-handlers.ts`、`layout-handlers.ts`、`export-handlers.ts` | payload 兼容性退化、运行时异常提示变化 | `tests/ipc/file-handlers.test.ts`、`tests/ipc/export-handlers.test.ts`、`tests/features/file-operations.test.tsx` |
| `electron/ipc/path-policy.ts` | 文件保存与导出写路径链路 | 输出路径被错误拒绝或扩展名策略失效 | `tests/ipc/file-handlers.test.ts`、`tests/ipc/export-handlers.test.ts`、`tests/features/export-dialog.test.tsx` |
| `electron/services/export-orchestrator.ts` | `ipc/export-handlers.ts` | 导出编排顺序错误、参数转发丢失 | `tests/ipc/export-handlers.test.ts`、`tests/export/export-service.test.ts` |
| `electron/services/export/scene-builder.ts` | `svg-renderer.ts`、`png-renderer.ts` | 画布/导出场景不一致（节点位置、连接线、主题） | `tests/export/export-service.test.ts`、`tests/features/export-dialog.test.tsx` |
| `electron/services/export/svg-renderer.ts` + `png-renderer.ts` | 导出文件最终渲染层 | 渲染结果损坏、缩放失真、视觉偏差 | `tests/export/export-service.test.ts`、`tests/ipc/export-handlers.test.ts` |
| `src/stores/mindmap-store.ts` | `App`、`MindMapCanvas`、`NodeEditor`、`useFileOperations`、`ExportDialog` | 节点树正确性、undo/redo、保存与导出数据质量 | `tests/features/undo-redo.test.ts`、`tests/features/file-operations.test.tsx`、`tests/polish/App-integration.test.tsx` |
| `src/hooks/useFileOperations.ts` | `App`、`MainToolbar`、`preload file API` | 文件生命周期中断、自动保存状态错乱 | `tests/features/file-operations.test.tsx`、`tests/ipc/file-handlers.test.ts` |
| `electron/preload.ts` + `src/types/global.d.ts` | 所有 `window.electronAPI.*` 调用点 | IPC 契约断裂、渲染层调用异常 | `tests/ipc/main-window.test.ts`、`tests/features/export-dialog.test.tsx`、`tests/features/file-operations.test.tsx` |

## 3) 改动前检查清单（轻量）

1. 本次改动属于 UI、状态、shared 协议，还是 IPC/文件格式？
2. 是否跨越 renderer/main 边界？若是，shared 是否需要同步？
3. 是否触及 `security / validators / path-policy` 安全链路？
4. 导出结果是否需要与画布视觉严格一致（布局、主题、缩放）？
5. 是否改变 `window.electronAPI` 契约或类型定义？
6. 是否补齐对应能力目录的最小回归（`tests/<capability>`）？

## 4) 快速规则

- 规则 A：改 shared 协议必查 renderer 转发层 + preload + ipc + typecheck
- 规则 B：改 `layout/theme/export` 必做“画布一致性 + 导出一致性”双检查
- 规则 C：改 `security/validators/path-policy` 必回归 `tests/ipc/*` 与关键 features
- 规则 D：改 `window/preload/main-window` 必查窗口 IPC + 集成回归
