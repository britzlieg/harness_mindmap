# 05 - Test Suite Hardening Follow-up

## 1. 背景

对应 OpenSpec 归档变更：`2026-03-27-harden-test-suite-gaps`。  
该变更在归档时已完成 proposal/design/specs，并已同步主 specs，但实现任务尚未执行完成（归档时任务进度 `0/12`）。

本文件用于记录后续测试体系补强的落地方向，避免仅有规范更新而缺少工程实施。

## 2. 已完成（归档时）

- OpenSpec delta specs 已同步到主规范：
  - `openspec/specs/ipc-contract-hardening/spec.md`
  - `openspec/specs/mindmap-file-operations/spec.md`
  - `openspec/specs/test-suite-hardening/spec.md`（新增能力）
- 归档目录：
  - `openspec/changes/archive/2026-03-27-harden-test-suite-gaps/`

## 3. 待继续落地的任务主题

### 3.1 覆盖率能力

- 为 Vitest 维护可复现的覆盖率执行路径（依赖、脚本、报告目录）
- 固化覆盖率基线并用于后续质量门槛治理

### 3.2 跨进程边界测试

- 补齐 `preload` 桥接契约测试
- 补齐 `security`、`path-policy`、`validators` 直接单元测试
- 补齐 `layout/file/export` handlers 的非法输入、不可信 sender、失败保护分支

### 3.3 Renderer 行为测试

- 补齐 `useAutoSave`（定时触发、文本规范化、失败兜底）
- 补齐 `useCanvasInteraction`（平移、缩放、边界约束）
- 降低关键测试中的深度 mock，让边界行为可被真实触发

### 3.4 测试信号治理

- 清理预期失败路径中的 `console.error` / `console.log` 噪音
- 保证测试输出可读性，避免掩盖真实失败

## 4. 推荐实施顺序

1. 先确保覆盖率命令可稳定执行并产出报告。
2. 再补跨进程边界测试（preload + IPC 安全/校验/路径策略）。
3. 接着补 renderer 行为测试与交互边界。
4. 最后统一清理日志噪音并回归验证。

## 5. 验证建议

- 最小回归优先：先跑新增/改动测试文件，确认边界行为无回归。
- 阶段完成后再跑全量 `npm test` 与覆盖率命令，记录基线结果。
