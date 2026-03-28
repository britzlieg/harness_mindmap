## ADDED Requirements

### Requirement: Privileged IPC contract tests MUST cover direct boundary enforcement
对特权 IPC 能力的测试 MUST 直接验证 sender 信任校验、写路径策略和运行时载荷校验，不得仅通过上层集成测试间接证明这些边界存在。

#### Scenario: 不可信 sender 触发特权 IPC
- **WHEN** 测试以不可信上下文调用特权 IPC handler
- **THEN** handler 拒绝执行，且不会进入后续业务逻辑或文件写入分支

#### Scenario: 写路径或载荷不合法
- **WHEN** 测试向写能力 IPC handler 提供非法路径或非法载荷
- **THEN** handler 返回受控错误，并且不会产生文件副作用

### Requirement: Preload bridge SHALL be verified as the canonical renderer contract
测试体系 SHALL 直接验证 preload 暴露的 `electronAPI` 契约，确保 renderer 侧实际可用的桥接方法与主进程支持的能力保持一致。

#### Scenario: preload 暴露桥接接口
- **WHEN** 测试加载 preload 模块
- **THEN** 暴露到渲染进程的桥接接口包含约定的分组与方法，且每个方法转发到正确的 IPC channel
