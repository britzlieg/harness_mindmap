## Why

当前项目虽然已有 `22` 个测试文件、`175` 个用例全部通过，但仍缺少可复现的覆盖率统计能力，无法回答“覆盖率是多少、是否达标”这一基础问题。与此同时，现有测试在 `preload`、IPC 安全校验、路径策略、自动保存、画布交互等关键边界上存在明显盲区，部分集成测试还通过大量 mock 绕开了真实契约，容易产生“测试全绿但边界失守”的假象。

现在推进这项变更，是因为测试体系已经成为后续架构演进和跨进程重构的信心基础；如果继续在没有覆盖率基线、没有关键边界防线的状态下迭代，后续修改会越来越依赖人工回归和经验判断。

## What Changes

- 为项目补齐 Vitest 覆盖率统计能力，支持稳定生成覆盖率报告，并为后续门槛治理打下基础。
- 补强关键高风险模块的测试，包括 `preload` 暴露契约、IPC sender 安全校验、路径与载荷校验、`layout` handler 行为、自动保存与画布交互等。
- 修正当前偏脆弱或信号不足的测试结构，减少不必要的深度 mock，提升“失败即说明真实问题”的可信度。
- 清理测试运行中的预期性日志噪音，降低 CI 输出噪声，提升失败定位效率。
- 建立一套面向关键边界的测试分层约束，明确哪些逻辑应做纯函数测试、哪些应做 handler 测试、哪些应做 renderer 集成测试。

## Capabilities

### New Capabilities
- `test-suite-hardening`: 定义覆盖率统计、关键边界补测、脆弱用例治理与测试信号质量的要求

### Modified Capabilities
- `ipc-contract-hardening`: 补充对 IPC 安全校验、路径策略与 preload 契约的测试要求
- `mindmap-file-operations`: 补充文件保存、另存为、自动保存及无效载荷场景的测试要求

## Impact

- 受影响目录主要包括 `mindmap-app/tests/`、`mindmap-app/vitest.config.ts`、`mindmap-app/package.json`
- 受影响模块包括 `mindmap-app/electron/preload.ts`、`mindmap-app/electron/ipc/`、`mindmap-app/src/hooks/`、`mindmap-app/src/components/Canvas/`
- 可能新增覆盖率依赖与测试辅助工具，但不改变最终用户可见功能
- 后续 CI、回归验证和架构重构会直接受益于更可靠的测试信号
