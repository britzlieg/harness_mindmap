# test-suite-hardening Specification

## Purpose
TBD - created by archiving change harden-test-suite-gaps. Update Purpose after archive.
## Requirements
### Requirement: Test suite MUST provide reproducible coverage reporting
项目测试体系 MUST 提供可重复执行的覆盖率统计能力，使开发者能够在本地与持续验证环境中生成一致的覆盖率结果。

#### Scenario: 开发者执行覆盖率命令
- **WHEN** 开发者运行项目定义的覆盖率测试命令
- **THEN** 系统生成可读取的覆盖率摘要与覆盖率产物，并明确本次统计基于当前测试套件

### Requirement: High-risk runtime boundaries SHALL have direct tests
对高风险运行时边界的验证 MUST NOT 仅依赖上层集成测试间接覆盖；测试体系 SHALL 为关键边界提供直接测试，至少覆盖 preload 契约、IPC 安全/路径/载荷校验、自动保存或画布交互中的高风险逻辑。

#### Scenario: 关键边界测试补齐
- **WHEN** 项目对跨进程桥接、安全校验、定时保存或交互输入进行回归验证
- **THEN** 测试套件能够直接执行对应边界模块并在失败时定位到具体边界，而不是只在上层界面测试中暴露模糊失败

### Requirement: Test output MUST preserve signal quality
测试体系 MUST 控制预期失败路径产生的日志噪音，确保测试通过时的输出不会被预期性错误日志淹没，且真实失败仍可被识别。

#### Scenario: 失败路径测试通过
- **WHEN** 测试验证一个预期失败但已正确处理的分支
- **THEN** 测试输出保持聚焦，不会持续打印未受控的预期性错误日志

