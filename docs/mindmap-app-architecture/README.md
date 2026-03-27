# MindMap App Architecture Docs

本目录用于记录 `d:/2/mindmap-app` 的架构与实现文档，帮助后续开发和 AI 协作快速定位上下文。

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

## 最新状态（2026-03-27）

- OpenSpec change: `refactor-architecture-and-code-quality`
- 实施结果：22/22 tasks complete
- 重构目标：在不改变用户可见功能前提下，提升分层清晰度、安全性、可维护性与可测试性。
