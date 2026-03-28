# mindmap-node-depth-color-wheel Specification

## Purpose
TBD - created by archiving change add-level-color-wheel-node-backgrounds. Update Purpose after archive.
## Requirements
### Requirement: 节点默认背景色 SHALL 基于根节点色相按层级轮动
系统 MUST 以当前导图根节点默认背景色作为基准色相；当节点未设置显式 `backgroundColor` 时，系统 SHALL 按节点深度计算默认背景色，并保证相邻深度使用色轮上的相邻色相。

#### Scenario: 根节点作为基准色
- **WHEN** 用户新建导图且节点都未设置显式背景色
- **THEN** 根节点默认背景色使用当前主题定义的根节点基准色

#### Scenario: 相邻层级使用相邻色相
- **WHEN** 系统渲染深度为 `n` 与 `n+1` 的节点默认背景色
- **THEN** 两者色相在色轮上按固定步长相邻轮动，且轮动方向保持一致

### Requirement: 层级颜色计算 SHALL 具有确定性与层级一致性
系统 SHALL 基于节点深度使用同一套色轮计算规则；同一导图内深度相同且未设置显式背景色的节点 MUST 呈现同一默认背景色，深度变化后 MUST 重新计算为新深度对应颜色。

#### Scenario: 同层节点颜色一致
- **WHEN** 导图中多个节点位于同一深度且均未设置显式背景色
- **THEN** 这些节点显示一致的默认背景色

#### Scenario: 调整层级后颜色更新
- **WHEN** 用户将某节点移动到不同父节点导致其深度变化
- **THEN** 该节点及其子树未显式设色的节点背景色按新深度重新计算

### Requirement: 显式节点背景色 SHALL 覆盖自动轮动色
当节点设置了显式 `backgroundColor` 时，系统 MUST 保留该显式颜色，并 SHALL NOT 被层级色轮规则覆盖。

#### Scenario: 节点有显式背景色时保持不变
- **WHEN** 某节点已设置显式 `backgroundColor` 且其深度发生变化
- **THEN** 该节点继续显示显式背景色，不应用自动轮动色

