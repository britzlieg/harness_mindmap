## Why

当前节点背景色主要依赖固定主题层级样式，难以在复杂导图中直观体现层级关系。需要引入“以根节点颜色为基准、按层级沿色轮相邻轮动”的规则，让用户在不手动配色的前提下快速识别结构深度。

## What Changes

- 新增层级颜色轮动规则：根节点使用主题根节点基准色，后续层级按固定色相步长沿色轮顺序轮动，且相邻层级使用相邻色相。
- 节点默认背景色从“固定层级映射”升级为“基于层级深度动态计算”，确保层级扩展时仍有一致配色策略。
- 保持显式节点背景色优先级不变：用户手动设置 `backgroundColor` 时继续覆盖自动计算结果。
- 为主题与渲染链路补充测试，确保主题切换、层级变化、保存与重开后颜色表现一致。

## Capabilities

### New Capabilities
- `mindmap-node-depth-color-wheel`: 定义节点背景色按层级深度基于根节点色相沿色轮相邻轮动的规则与约束。

### Modified Capabilities
- （无）

## Impact

- 受影响模块：`mindmap-app/electron/shared/`、`mindmap-app/src/themes/`、`mindmap-app/src/utils/`、`mindmap-app/src/components/Canvas/`。
- 受影响行为：节点默认背景色计算、主题切换后的节点渲染一致性、节点层级变化后的颜色稳定性。
- 受影响测试：`mindmap-app/tests/features/themes*.test.ts*`、`mindmap-app/tests/canvas/*.test.tsx`、可能涉及导出颜色一致性的相关测试。
