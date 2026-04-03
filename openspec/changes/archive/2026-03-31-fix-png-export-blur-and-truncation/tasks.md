## 1. 分块捕获坐标对齐修复

- [x] 1.1 修改 `tryRenderPngViaElectronSvg` 中的 HTML 模板，将图像元素从 `position:absolute;left:0;top:0` 改为使用变量控制位置
- [x] 1.2 修改分块捕获循环中的定位逻辑，使用 `left: -offsetX; top: -offsetY` 替代 `transform: translate(-offsetX, -offsetY)`
- [x] 1.3 移除容器 `div` 的 `transform` 样式，保持容器固定尺寸
- [x] 1.4 添加日志记录每个瓦片的预期位置和实际捕获位置

## 2. 渲染等待机制改进

- [x] 2.1 在单帧捕获流程中，将 `setTimeout` 等待改为 `requestAnimationFrame` 双帧等待
- [x] 2.2 在分块捕获的每个瓦片之间，使用双 `requestAnimationFrame` 替代 `setTimeout(30)`
- [x] 2.3 添加 3 秒超时保护，防止 `requestAnimationFrame` 无限等待
- [x] 2.4 在图像 `onload` 事件后再等待两帧才执行首次捕获

## 3. Fallback 文字渲染质量提升

- [x] 3.1 修改 `drawPseudoGlyph` 函数的字模网格从 10x14 提升到 20x28
- [x] 3.2 将 `samplesPerPixel` 计算从 `glyphScale` 改为 `glyphScale * 2`，至少采样 4 次
- [x] 3.3 优化字符位图模式算法，增加边缘增强逻辑
- [x] 3.4 测试常用中英文字符的渲染效果，调整字模参数

## 4. 验证链优化

- [x] 4.1 在 `isPngContentMeaningful` 和 `tryRenderPngViaElectronSvg` 中添加 2% 尺寸容差验证
- [x] 4.2 对于偏差在 2% 以内的情况，记录警告日志但不降级
- [x] 4.3 对于偏差超过 2% 的情况，降级到 Fallback 路径
- [x] 4.4 在 Fallback 渲染完成后记录降级原因日志

## 5. 测试覆盖

- [x] 5.1 在 `tests/export/png-export-integrity.test.ts` 中增加分块捕获对齐测试用例
- [x] 5.2 增加 Fallback 文字渲染质量测试（验证 20x28 网格）
- [x] 5.3 增加 2% 尺寸容差验证测试
- [x] 5.4 增加 100+ 节点大尺寸导图导出测试（200% 缩放）
- [x] 5.5 运行完整测试套件，确保无回归

## 6. 验证与归档

- [x] 6.1 手动验证 3 种场景的 PNG 导出（小、中、大尺寸）
- [x] 6.2 检查导出图片的清晰度和完整性
- [x] 6.3 运行 `npm run typecheck` 确保类型检查通过
- [x] 6.4 运行 `npm run build` 确保构建成功
- [x] 6.5 将变更归档到 `openspec/changes/archive/`
