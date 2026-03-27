# mindmap-file-operations Specification

## Purpose
TBD - created by archiving change add-save-new-export-png-and-chinese-menu. Update Purpose after archive.
## Requirements
### Requirement: 新建命令 SHALL 创建并加载新文档
系统 SHALL 同时支持工具栏动作与 `Ctrl/Cmd+N` 触发“新建文档”命令，并 SHALL 用新建文件的元数据与节点数据初始化当前会话。

#### Scenario: 用户通过工具栏新建文档
- **WHEN** 用户点击新建命令并确认 `.mindmap` 文件路径
- **THEN** 应用将该文件加载为当前活动文档并展示节点树（若文件为空则创建根节点）

### Requirement: 保存命令 SHALL 持久化当前脑图状态
系统 SHALL 同时支持工具栏动作与 `Ctrl/Cmd+S` 触发保存命令，并 SHALL 将当前节点与元数据写入活动文件路径。

#### Scenario: 用户保存当前文档
- **WHEN** 用户在已有活动文件的情况下触发保存
- **THEN** 当前内存中的脑图节点与元数据被写入磁盘，且活动文件路径不发生变化

### Requirement: 缺少活动文件上下文时保存命令 MUST 安全失败
当不存在活动文件路径或元数据时，保存命令 MUST NOT 导致应用崩溃，并 MUST 保持当前编辑会话可继续使用。

#### Scenario: 文件初始化前触发保存
- **WHEN** 用户在缺少活动文件上下文时触发保存
- **THEN** 应用保持可响应状态，且不会抛出未处理异常

### Requirement: 打开命令 SHALL 加载已有思维导图文件
系统 SHALL 提供“打开”文件操作，允许用户选择已有 `.mindmap` 文件，并将其节点与元数据加载到当前编辑会话。

#### Scenario: 用户打开已保存的思维导图
- **WHEN** 用户触发打开命令并确认有效的 `.mindmap` 文件路径
- **THEN** 应用将该文件作为当前活动文档加载，并在编辑器中渲染其思维导图内容

### Requirement: 打开失败 MUST 保持当前编辑会话不变
当用户取消选择文件、所选文件无效或解析失败时，打开操作 MUST NOT 导致应用崩溃，且 MUST 保持当前内存中的思维导图不变。

#### Scenario: 用户选择无效的思维导图文件
- **WHEN** 用户确认一个无法解析为有效 `.mindmap` 的文件
- **THEN** 应用报告打开失败，并保持当前已加载内容与选择状态不变

### Requirement: 思维导图持久化 MUST 使用纯文件文档存储
系统 MUST 将思维导图的全部元数据与节点数据直接持久化到 `.mindmap` 文件内容中，且运行时 MUST NOT 依赖 SQLite 表、SQLite 文件或 SQLite 原生模块。

#### Scenario: 保存思维导图时将完整文档数据写入文件
- **WHEN** 用户对包含当前 `metadata` 与 `nodes` 的思维导图触发保存或另存为
- **THEN** 系统将完整文档载荷写入目标 `.mindmap` 文件，且过程无需加载 `better-sqlite3`

#### Scenario: 打开思维导图时从文件内容读取文档数据
- **WHEN** 用户打开一个有效的 `.mindmap` 文件
- **THEN** 系统从该文件解析出 `metadata` 与 `nodes` 并返回，且不查询任何 SQLite 状态

### Requirement: 旧版 SQLite 思维导图文件 MUST 以可执行指引失败
系统 MUST 能识别基于 SQLite 的旧版 `.mindmap` 文件，并 MUST 返回明确的“不支持旧格式”提示；发生该情况时系统 MUST NOT 改变当前内存会话状态。

#### Scenario: 打开旧版 SQLite 格式思维导图
- **WHEN** 用户选择的 `.mindmap` 文件头标识为 `SQLite format 3`
- **THEN** 打开操作以“需迁移的旧格式”错误失败，且当前编辑器状态保持不变

### Requirement: 新建节点 SHALL 自动填充默认文本
系统在创建节点时 SHALL 为节点文本字段填充默认值，默认文本 MUST NOT 为空字符串或仅空白字符。

#### Scenario: 用户新增子节点
- **WHEN** 用户通过快捷键或按钮新增一个节点且未输入文本
- **THEN** 新节点显示默认文本并可立即编辑

### Requirement: 保存与导出前 MUST 修复空文本节点
在保存 `.mindmap` 文件或执行导出前，系统 MUST 对节点集合进行空文本校验；对 `null`、`undefined`、空字符串或仅空白字符的节点文本进行默认文本兜底，确保输出中不存在空文本节点。

#### Scenario: 导图中存在历史空文本节点
- **WHEN** 用户打开旧文件并直接保存或导出
- **THEN** 持久化结果与导出结果中的所有节点文本均为非空有效文本

### Requirement: Save and Save-As MUST enforce path safety without workflow changes
The file operation flow MUST validate and normalize write targets while preserving existing user interaction patterns for New/Open/Save/Save-As.

#### Scenario: User saves to a valid selected path
- **WHEN** a user selects a valid `.mindmap` destination through the save flow
- **THEN** the file is written successfully and the active session context remains unchanged

#### Scenario: Save request contains invalid path input
- **WHEN** a malformed or disallowed write path is passed to save handling
- **THEN** the operation fails safely with a controlled error and current in-memory session data remains intact

### Requirement: File operation errors SHALL be deterministic and non-crashing
Open/create/save failures SHALL surface deterministic error outcomes and MUST NOT crash the application or corrupt current editing state.

#### Scenario: Open failure on invalid file content
- **WHEN** the selected file cannot be parsed as a valid mindmap document
- **THEN** the operation reports failure and preserves the current document session

