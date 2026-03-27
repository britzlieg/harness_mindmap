## Context

当前 `mindmap-app` 的文件操作分散在文件 API 与基于 SQLite 的 DB API 两条路径上。`file:create/open/save` 与 `db:*` 处理器共同参与文档生命周期，且 Electron 关键运行模块中仍引入了 `better-sqlite3`。这会带来原生模块打包/运行时风险，也让持久化行为更难推断与维护。

本次变更目标是彻底移除 SQLite 存储，思维导图持久化仅保留文件存储。

## Goals / Non-Goals

**Goals:**
- 将 `.mindmap` 文件内容作为唯一持久化事实来源。
- 从运行时文件操作与 IPC 路径中移除 `better-sqlite3`。
- 保持用户可见的新建/打开/保存/另存为流程不变。
- 确保文档往返读写后 `metadata` 与节点树数据完整一致。

**Non-Goals:**
- 不引入云端/后端同步模型。
- 不在本次变更中重构超出持久化集成范围之外的编辑器状态管理。
- 不在本次变更中实现完整的交互式迁移向导。

## Decisions

### 1) Standardize `.mindmap` to JSON document format
- 决策：`.mindmap` 文件统一存储为 UTF-8 JSON 对象，包含 `metadata` 与 `nodes`（树结构），并增加格式版本字段以支持前向兼容。
- 原因：移除原生数据库依赖，提升可移植性与可调试性。
- 备选方案：
  - 继续保留 SQLite 并优化打包：否决，原生 ABI/打包风险仍在。
  - 使用自定义二进制格式：否决，复杂度更高且可调试性更差。

### 2) Collapse persistence into a single file service path
- 决策：`electron/services/file-service.ts` 成为唯一读写路径，通过 JSON 解析/校验与序列化辅助函数完成持久化。
- 原因：单一路径比“文件+数据库”混合路径更易测试、理解和维护。
- 备选方案：
  - 保留 `electron/db/*` 作为内部辅助层：否决，仍会保留 SQLite 耦合。

### 3) Remove `db:*` IPC surface from main/preload/renderer contract
- 决策：移除 `registerDbHandlers()` 与 `electronAPI.db` 桥接。文件操作直接返回完整 `{ filePath, metadata, nodes }` 载荷，渲染层不再进行二次 DB 读取。
- 原因：避免隐藏的存储旁路，强制收敛到“仅文件存储”边界。
- 备选方案：
  - 保留 `db:*` 并改成空实现：否决，会保留不必要接口并增加认知负担。

### 4) Replace native-module-specific errors with file-format errors
- 决策：移除 SQLite ABI 不匹配错误映射，新增文件解析/校验错误映射（`invalid format`、`unsupported legacy format`、`read/write failure`）。
- 原因：SQLite 移除后，错误信息应准确反映真实故障模式。
- 备选方案：
  - 保留现有原生错误映射：否决，已过时且具有误导性。

### 5) Legacy SQLite `.mindmap` compatibility strategy
- 决策：在打开文件时检测 SQLite 文件签名（`SQLite format 3`），并以明确的“当前版本不支持旧格式”错误失败。
- 原因：在本次彻底移除 SQLite 的同时，避免对旧文件静默覆盖或损坏。
- 备选方案：
  - 在应用内自动迁移 SQLite：由于复杂度较高，延期到后续变更。

### 6) Use atomic file writes for save operations
- 决策：保存时先写入临时文件，再重命名为目标文件。
- 原因：降低崩溃/中断时文件截断或损坏风险。
- 备选方案：
  - 直接覆盖写入：否决，损坏风险更高。

## Risks / Trade-offs

- [旧版文档缺少迁移时将不可读] -> 提供明确的旧格式不支持错误，并给出使用旧兼容版本迁移的说明路径。
- [JSON 在部分数据集下文件体积可能增大] -> 接受该权衡以换取可移植性与可靠性，并通过代表性样例持续观察。
- [移除 DB IPC 可能导致调用方/测试失败] -> 在一次协同改造中同步更新 preload 类型、渲染层 hooks 与测试 mock。
- [原子保存行为在不同文件系统上存在差异] -> 采用同分区临时文件+重命名策略，并在支持平台进行验证。

## Migration Plan

1. 引入 JSON 文件序列化/校验能力，并接入 `file-service` 的 create/open/save 流程。
2. 重构渲染层文件流程，仅依赖 `file:*` IPC 返回载荷（新建后不再调用 `db:loadNodes`）。
3. 移除 DB IPC handlers 与 preload 暴露。
4. 移除 SQLite 相关运行时逻辑与过时的 native verify 校验。
5. 若无剩余引用，移除 `better-sqlite3` 相关依赖与构建钩子。
6. 更新并运行文件处理、文件服务与集成流程测试。

回滚策略：
- 若发布前发现关键回归，可回滚本变更集，恢复 SQLite 持久化与 DB IPC。

## Open Questions

- 后续变更是否需要提供一次性转换命令，用于将旧 SQLite `.mindmap` 文件迁移为新格式？
- 是否应在本次落地时同步在 `docs/` 发布版本化文件格式规范，或待 schema 稳定后再发布？
