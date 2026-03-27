## ADDED Requirements

### Requirement: 系统 SHALL 提供额外的单向树布局
系统 SHALL 在现有布局基础上支持 `tree-right` 与 `tree-left` 作为合法布局模式。

#### Scenario: 新布局模式可用于计算
- **WHEN** 使用 `tree-right` 或 `tree-left` 发起布局计算请求
- **THEN** 系统会为所有可见节点返回坐标结果，且不会抛出错误

### Requirement: tree-right 布局 SHALL 将子孙节点放置在父节点右侧
在 `tree-right` 模式下，每个可见子节点的 x 坐标 SHALL 大于或等于父节点 x 坐标加上设定水平间距，且同级节点 SHALL 在垂直方向分离。

#### Scenario: tree-right 的方向性与同级间距
- **WHEN** 对包含多个展开后代的根节点应用 `tree-right` 布局
- **THEN** 每个子树都位于其祖先链右侧，且同级节点不共享相同 y 坐标

### Requirement: tree-left 布局 SHALL 镜像 tree-right 的方向规则
在 `tree-left` 模式下，每个可见子节点的 x 坐标 SHALL 小于或等于父节点 x 坐标减去设定水平间距，且同级节点垂直分离规则 SHALL 保持确定性。

#### Scenario: tree-left 的方向性与同级间距
- **WHEN** 对包含多个展开后代的根节点应用 `tree-left` 布局
- **THEN** 每个子树都位于其祖先链左侧，且同级节点不共享相同 y 坐标

### Requirement: 布局计算 SHALL 忽略折叠节点下的后代排布输出
对于任意受支持布局模式，被折叠节点下的后代在展开前 SHALL NOT 获得新的可见排布坐标。

#### Scenario: 折叠子树会被跳过
- **WHEN** 在存在折叠父节点的树上执行布局计算
- **THEN** 仅折叠子树之外的节点会被纳入当前排布计算
