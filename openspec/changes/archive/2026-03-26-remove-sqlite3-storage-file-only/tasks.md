## 1. 纯文件持久化核心改造

- [x] 1.1 定义 `.mindmap` JSON 文档结构（version、metadata、nodes），并在 Electron 文件服务中实现解析与校验辅助函数。
- [x] 1.2 重构 `file-service` 的新建/打开流程，仅通过 JSON 文件内容读写并返回完整 `{ nodes, metadata }`。
- [x] 1.3 为 `file:save` 与 `file:saveAs` 实现原子保存（先写临时文件再重命名）。
- [x] 1.4 在打开流程中增加旧版 SQLite 签名检测，并映射为清晰的旧格式不支持错误。

## 2. IPC 与渲染层契约收敛

- [x] 2.1 移除 `db:*` IPC handlers，并在 Electron 主进程启动流程中取消 `registerDbHandlers()` 注册。
- [x] 2.2 从 preload 移除 `electronAPI.db` 暴露，并同步更新渲染层共享类型定义。
- [x] 2.3 重构 `useFileOperations` 的新建/打开/保存流程，仅依赖 `file:*` 返回载荷（不再进行 DB 二次读取）。

## 3. SQLite 依赖与构建流程清理

- [x] 3.1 移除 `better-sqlite3` 引用，并删除已无引用的 `electron/db/*` 模块。
- [x] 3.2 移除仅用于 SQLite 打包的 native rebuild/verify 脚本与 Vite external 配置。
- [x] 3.3 在确认无剩余使用后，更新依赖与 lockfile，移除 `better-sqlite3` 及相关类型包。

## 4. 测试与回归验证

- [x] 4.1 更新 file-service 与 file-handler 测试，覆盖纯文件持久化与新的错误映射语义。
- [x] 4.2 移除或替换 DB 导向测试与 mocks（`db-handlers`、schema/operations），改为文件格式校验覆盖。
- [x] 4.3 增加新建/打开/保存/另存为回归测试，以及旧版 SQLite 文件打开失败行为测试。
- [x] 4.4 运行目标测试集，并确认打包后的 Electron 产物中不再包含 `better-sqlite3` 运行时引用。
