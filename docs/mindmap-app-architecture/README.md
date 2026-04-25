# MindMap App Architecture Docs

本目录用于记录 `d:/2/mindmap-app` 的架构与实现文档，帮助后续开发和 AI 协作快速定位上下文。读取时按需读取，无需一次性全部读取。

## 文档导航

1. `01-functional-architecture.md`
   功能视角：用户能力、业务链路、核心流程。
2. `02-design-architecture.md`
   设计视角：分层、运行时边界、数据模型与依赖方向。
3. `03-module-key-files.md`
   模块索引：关键目录与入口文件定位。
4. `impact-radius/01-change-impact-radius-map.md`
   变更影响半径地图：改动前快速评估波及范围。
5. `04-refactor-architecture-and-code-quality.md`
   **最新重构同步**：`refactor-architecture-and-code-quality` 变更落地说明（共享层、IPC 安全、导出模块拆分、回归验证）。
6. `05-test-suite-hardening-follow-up.md`
   测试体系补强后续说明：覆盖率能力、关键边界补测与日志噪音治理的后续落地清单。
7. `06-png-export-integrity-fix.md`（新增）
   PNG 导出完整性修复：边界计算、分块捕获验证、多级验证链的修复说明与测试覆盖。

## 最新状态（2026-03-28）

- Active OpenSpec changes: `fix-png-export-truncation` (in-progress, 3/8 tasks)
- Recently archived changes:
  - `2026-03-28-fix-png-export`（21/21 tasks complete; spec 已同步到主 specs）
  - `2026-03-27-harden-test-suite-gaps`（spec 已同步到主 specs；归档时 tasks 仍为 0/12，需后续继续实施）
  - `refactor-architecture-and-code-quality`（22/22 tasks complete）
- 当前建议：
  - 涉及 PNG 导出链路改动时，优先参考 `06-png-export-integrity-fix.md` 与 `openspec/specs/mindmap-png-export/spec.md`
  - 涉及测试体系与跨进程边界改动时，参考 `05-test-suite-hardening-follow-up.md` 与 `04-refactor-architecture-and-code-quality.md`
