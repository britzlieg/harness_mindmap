## 背景与动机

当前布局选项较少，无法覆盖常见的导图场景（如单向结构梳理、层级化展示）。现在扩展布局能力可以提升不同场景下的可读性，并减少用户手动调整节点位置的成本。

## 变更内容

- 在现有布局之外新增内置布局类型，并保证自动排版结果可预测、可复现。
- 扩展布局选择器 UI，让用户可以清晰地切换新布局并看到当前激活状态。
- 确保已选布局类型能稳定写入文档元数据，并在重新打开/导出流程中正确恢复。
- 为新布局算法、布局分发和布局选择行为补充测试。

## 能力清单

### 新增能力
- `layout-library-expansion`：引入新的导图布局模式，并定义各模式的节点放置规则。
- `layout-mode-management`：统一布局模式的选择、持久化与重新加载行为。

### 修改能力
- 无。

## 影响范围

- 受影响代码包括 `mindmap-app/src/utils/layout-algorithms.ts`、`mindmap-app/src/types/index.ts`、`mindmap-app/src/components/Sidebar/LayoutSelector.tsx`。
- Electron 侧文件元数据读写路径可能需要更新，以保证布局类型合法性。
- 需要更新 `mindmap-app/tests/` 下的布局和集成测试。
