## Why

当前应用在文件工作流中部分依赖 SQLite（`better-sqlite3`）进行持久化，这带来了原生模块打包/运行时脆弱性和额外维护成本。我们需要统一为纯文件存储路径，确保思维导图可移植，并在不同环境下保持打开与保存行为稳定可靠。

## What Changes

- 从桌面端工作流中移除基于 SQLite 的持久化方案。
- 统一新建、打开、保存、另存为流程，仅使用 `.mindmap` 文件存储思维导图数据。
- 移除文件操作与 `better-sqlite3` 原生加载之间的运行时耦合。
- 更新持久化与 IPC/服务层逻辑，以文件序列化/反序列化作为唯一事实来源。
- **BREAKING**：移除所有 SQLite 专属的内部存储路径、迁移钩子与运行时兜底逻辑。

## Capabilities

### New Capabilities
- *(none)*

### Modified Capabilities
- `mindmap-file-operations`：调整持久化要求，强制使用纯文件存储，并在核心打开/保存流程中消除 SQLite/原生加载依赖。

## Impact

- 受影响代码：Electron 主进程文件处理器、持久化服务/仓储、保存与打开编排逻辑。
- 受影响依赖：思维导图持久化路径不再使用 `better-sqlite3`（若项目其他位置也未使用，可一并移除依赖）。
- 受影响行为：所有思维导图数据仅从 `.mindmap` 文件读取并写入 `.mindmap` 文件。
