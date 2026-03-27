## 1. 布局类型与元数据基础

- [x] 1.1 在 `mindmap-app/src/types/index.ts` 中扩展 `LayoutType`，加入 `tree-right` 与 `tree-left`。
- [x] 1.2 确保元数据加载路径会将不支持的 `layoutType` 归一化为 `mindmap`。
- [x] 1.3 验证 create/open/save 全流程能端到端保留受支持的布局类型。

## 2. 布局算法扩展

- [x] 2.1 在 `mindmap-app/src/utils/layout-algorithms.ts` 中实现 `tree-right` 布局计算。
- [x] 2.2 实现 `tree-left` 布局计算，并确保其为 `tree-right` 的方向镜像。
- [x] 2.3 更新 `computeLayout` 分发逻辑，支持新类型并保留未知类型回退到 `mindmap`。
- [x] 2.4 确认新布局模式下折叠节点行为与现有逻辑保持一致。

## 3. 布局选择体验

- [x] 3.1 更新 `mindmap-app/src/components/Sidebar/LayoutSelector.tsx`，展示新增布局选项。
- [x] 3.2 保证所有布局模式的激活态高亮准确。
- [x] 3.3 确保用户选择布局后会立即更新 `metadata.layoutType` 并触发布局重算路径。

## 4. 测试覆盖

- [x] 4.1 在 `mindmap-app/tests/layout/layout-algorithms.test.ts` 中新增或扩展 `tree-right`、`tree-left` 单元测试。
- [x] 4.2 补充分发层对未知布局值的回退测试。
- [x] 4.3 新增或扩展 UI 集成测试，验证布局选项展示与元数据更新。
- [x] 4.4 补充持久化测试，验证所选布局在保存与重开后仍能保持一致。
