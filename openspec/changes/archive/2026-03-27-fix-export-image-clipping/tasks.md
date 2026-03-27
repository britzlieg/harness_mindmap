## 1. Export Scene Bounds Refactor

- [x] 1.1 在 `electron/services/export-service.ts` 提取统一的内容边界计算逻辑，明确输出 top/left/bottom/right 四向极值（覆盖节点矩形与连线路径控制点）。
- [x] 1.2 重构导出逻辑尺寸计算顺序：先按内容边界 + padding 计算逻辑宽高，再应用 `minWidth/minHeight` 兜底。
- [x] 1.3 调整场景平移策略，使逻辑场景以边界为基准入框，确保任一方向都不会发生裁切。

## 2. PNG Scale and Raster Safety

- [x] 2.1 在 `buildRenderScene` 中固定比例应用顺序：在完整逻辑场景建立后统一应用 `scale` 到坐标、尺寸、字体与连线宽度。
- [x] 2.2 校验并必要时修正 `fitSceneForRaster`，确保超过安全上限时仅做全局等比收敛，不发生局部裁切。
- [x] 2.3 保持 `electron/ipc/export-handlers.ts` 的 `scalePercent` 输入语义兼容，并确认与新尺寸计算链路一致。

## 3. Regression Tests and Validation

- [x] 3.1 在 `tests/export/export-service.test.ts` 新增“同层级大量节点（如 100 个）”用例，验证导出结果包含全部可见节点且无边缘截断。
- [x] 3.2 增补“边界超出默认最小尺寸”与“超安全上限等比收敛仍完整”断言，覆盖内容边界优先与安全收敛行为。
- [x] 3.3 运行导出相关测试（至少 `tests/export/export-service.test.ts` 与 `tests/ipc/export-handlers.test.ts`）并修复失败项，确保变更可回归。
