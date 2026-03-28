## 1. 覆盖率基础设施

- [ ] 1.1 为 Vitest 补齐 coverage 依赖、脚本与基础输出配置
- [ ] 1.2 验证覆盖率命令可在当前项目中稳定执行并生成可读取报告

## 2. 跨进程边界测试补强

- [ ] 2.1 为 `electron/preload.ts` 增加桥接契约测试，验证暴露方法与 IPC channel 映射
- [ ] 2.2 为 `electron/ipc/security.ts`、`path-policy.ts`、`validators.ts` 增加直接单元测试
- [ ] 2.3 为 `electron/ipc/layout-handlers.ts` 补充 handler 行为测试，覆盖合法输入、非法载荷与不可信 sender
- [ ] 2.4 扩展 `file-handlers` 与 `export-handlers` 测试，补齐无效路径、无效载荷和失败分支保护行为

## 3. Renderer 行为测试补强

- [ ] 3.1 为 `useAutoSave` 增加定时触发、文本规范化与失败兜底测试
- [ ] 3.2 为 `useCanvasInteraction` 增加平移、缩放与边界约束测试
- [ ] 3.3 调整相关组件或集成测试中的深度 mock，使关键边界不再被上层测试完全绕过

## 4. 测试信号治理与回归验证

- [ ] 4.1 清理预期失败路径中的测试日志噪音，并在需要处显式断言或静默 `console`
- [ ] 4.2 运行最小必要测试集合，验证新增/调整后的测试稳定通过
- [ ] 4.3 运行覆盖率命令并记录当前基线，为后续阈值治理提供依据
