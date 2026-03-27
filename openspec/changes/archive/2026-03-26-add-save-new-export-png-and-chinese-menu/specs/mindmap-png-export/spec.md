## ADDED Requirements

### Requirement: 导出选项 SHALL 包含 PNG
导出流程 SHALL 在现有支持格式基础上提供 PNG 作为可选输出格式。

#### Scenario: 用户打开导出弹窗
- **WHEN** 用户打开导出弹窗
- **THEN** 弹窗显示可直接选择的 PNG 导出选项

### Requirement: PNG 导出 SHALL 将文件写入所选路径
当用户确认 PNG 导出时，系统 SHALL 通过 Electron 导出处理器将有效 `.png` 文件保存到所选路径。

#### Scenario: 用户导出为 PNG
- **WHEN** 用户选择 PNG 并确认目标文件路径
- **THEN** 指定路径生成 `.png` 文件，且导出流程无错误完成

### Requirement: PNG 导出成功后 SHALL 保持编辑会话状态不变
在 PNG 导出成功后，系统 SHALL 保持当前脑图文档与编辑上下文不变。

#### Scenario: 导出后继续编辑
- **WHEN** PNG 导出成功完成
- **THEN** 用户仍停留在同一脑图中，当前选中状态与内容保持不变
