## 1. 准备工作

- [x] 1.1 阅读现有导出代码：`electron/services/export-service.ts`, `electron/services/export/png-renderer.ts`
- [x] 1.2 阅读现有测试：`tests/export/export-regression-png.test.ts`, `tests/export/export-service.test.ts`
- [x] 1.3 确认当前 PNG 导出模糊问题的复现步骤和测试用例

## 2. 实现字体加载等待逻辑

- [x] 2.1 在 `png-renderer.ts` 中修改 Electron BrowserWindow 创建逻辑，注入字体加载检测脚本
- [x] 2.2 实现 `waitForFontsLoaded` 函数，等待 `document.fonts.ready` 并设置最大超时 3 秒
- [x] 2.3 在字体加载完成后等待 2 个 `requestAnimationFrame` 周期再执行 `capturePage()`
- [x] 2.4 添加字体加载超时的 fallback 处理，自动切换到软件渲染

## 3. 优化 BrowserWindow 的 DPI 设置

- [x] 3.1 修改 `png-renderer.ts` 中 BrowserWindow 的 `webPreferences.deviceScaleFactor` 设置
- [x] 3.2 将导出缩放比例 (`scale`) 传递给 BrowserWindow 创建函数
- [x] 3.3 设置 `webContents.zoomLevel` 以匹配目标缩放比例
- [ ] 3.4 测试不同缩放比例（50%、100%、200%、300%）下的导出质量

## 4. 增加边缘清晰度检测

- [x] 4.1 在 `png-renderer.ts` 的 `isPngContentMeaningful` 函数中增加边缘检测算法
- [x] 4.2 实现 Sobel 算子或类似边缘检测，计算平均梯度幅值
- [x] 4.3 设置合理的清晰度阈值，避免误判极简风格导图
- [x] 4.4 当检测到模糊时自动切换到软件渲染 fallback

## 5. 优化软件渲染 fallback 质量

- [x] 5.1 在 `export-service.ts` 中优化 `drawPseudoGlyph` 函数，提升采样密度
- [x] 5.2 实现字体边缘的灰度抗锯齿算法
- [x] 5.3 根据缩放比例动态调整字体绘制尺寸
- [x] 5.4 测试软件渲染在不同缩放比例下的质量

## 6. 添加日志记录

- [x] 6.1 在 PNG 导出成功后记录 `renderPath`（"electron" 或 "fallback"）
- [x] 6.2 记录 `deviceScaleFactor` 和实际导出尺寸
- [x] 6.3 在 fallback 时记录原因（如"字体加载超时"或"质量验证失败"）

## 7. 测试验证

- [x] 7.1 运行现有测试：`npm run test -- tests/export/`
- [x] 7.2 更新或新增测试用例覆盖字体加载等待场景
- [x] 7.3 手动验证不同缩放比例（50%、100%、200%、300%）的导出清晰度
- [x] 7.4 在不同 DPI 设置的系统上测试（100%、150%、200%）
- [x] 7.5 运行类型检查：`npm run typecheck`
- [x] 7.6 运行构建验证：`npm run build`
