## ADDED Requirements

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

## REMOVED Requirements

### Requirement: 文件新建/打开操作 MUST NOT 因打包 SQLite 原生加载器失败
**Reason**: 思维导图持久化已不再使用 SQLite，也不再在文件流程中触发原生数据库加载。
**Migration**: 移除原生模块 ABI 兜底处理路径，并将新建/打开/保存的验证重点改为文件解析与写入错误处理。
