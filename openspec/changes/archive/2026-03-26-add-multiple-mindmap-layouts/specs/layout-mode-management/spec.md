## ADDED Requirements

### Requirement: 布局选择器 SHALL 展示全部受支持布局模式
布局选择器 UI SHALL 列出所有受支持布局模式（包含新增模式），并为当前模式提供清晰的激活态标识。

#### Scenario: 用户可查看并选择布局模式
- **WHEN** 用户打开侧边栏中的布局面板
- **THEN** UI 会展示全部受支持布局模式，并高亮当前选中项

### Requirement: 选择布局模式 SHALL 更新文档元数据
当用户在 UI 中选择布局模式时，系统 SHALL 在下一次保存前将 `metadata.layoutType` 更新为所选模式。

#### Scenario: 选择布局后元数据被更新
- **WHEN** 用户切换到不同布局模式
- **THEN** 文档元数据会存储新的 `layoutType`

### Requirement: 布局模式 SHALL 在保存与重开后保持一致
系统 SHALL 将所选 `layoutType` 持久化到文件元数据中，使同一文档重开后可恢复相同布局模式。

#### Scenario: 重开后恢复所选布局
- **WHEN** 文档以受支持的非默认 `layoutType` 保存并在之后重新打开
- **THEN** 文档元数据与渲染出的布局模式应与保存时保持一致

### Requirement: 未知布局值 SHALL 安全回退
如果运行时布局值缺失或不受支持，系统 SHALL 回退到 `mindmap`，且不得阻塞文件打开或布局计算。

#### Scenario: 不受支持值触发回退
- **WHEN** 系统加载或计算包含不受支持 `layoutType` 的文档
- **THEN** 文档仍可正常使用，且布局将按 `mindmap` 模式计算
