## 1. renderPng 输出尺寸校验

- [x] 1.1 在 `mindmap-app/electron/services/export/png-renderer.ts` 的 `renderPng` 函数中，在返回 PNG Buffer 前调用 `readPngDimensions` 校验实际尺寸是否等于 `fittedScene.width × fittedScene.height`。不匹配时降级到 `renderExportSceneToPngFallback`。
- [x] 1.2 确认 `readPngDimensions` 已从 `export-service.ts` 正确导出（当前为内部函数，需确认是否需要调整导出可见性）。

## 2. Tiled capture tile 校验增强

- [x] 2.1 在 `mindmap-app/electron/services/export-service.ts` 的 `tryRenderExportPngViaElectronSvg` tiled capture 循环中，capturePage 后增加 tile 尺寸校验日志（仅 dev 模式），记录实际 tile 尺寸与期望尺寸的偏差。
- [x] 2.2 当 tile 尺寸不匹配时，确保 resize 前的 tile 数据来自 `nativeImage.createFromDataURL`（当前已实现），验证 resize 后的 toBitmap() 返回正确尺寸的数据。

## 3. 回归测试

- [x] 3.1 在 `mindmap-app/tests/export/export-service.test.ts` 中新增测试用例：5 层 × 5 子节点的 mindmap 布局导出 PNG，验证输出 PNG 尺寸与预期一致。
- [x] 3.2 在上述测试中验证底部区域（最后 20% 高度）存在非背景像素，确保底部节点未被裁切。
- [x] 3.3 在上述测试中验证所有四个象限（左上、右上、左下、右下）均有非背景像素，确保内容完整覆盖。

## 4. 验证

- [x] 4.1 运行 `npm run typecheck` 确认类型正确。
- [x] 4.2 运行 `npm test -- tests/export/export-service.test.ts` 确认所有导出测试通过。
- [x] 4.3 运行 `npm run build` 确认构建成功。
