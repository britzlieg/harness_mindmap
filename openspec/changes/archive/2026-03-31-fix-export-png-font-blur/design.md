## Context

当前 PNG 导出流程采用三层渲染策略：
1. **Electron BrowserWindow 捕获**：将 SVG 渲染到隐藏的 BrowserWindow，使用 `capturePage()` 获取 PNG
2. **软件渲染 fallback**：当 Electron 捕获失败时，使用纯软件方式绘制 PNG

问题根源分析：
- **字体加载时序问题**：Electron 捕获时可能字体尚未完全加载完成，导致截取的图像字体模糊或缺失
- **DPI 缩放计算问题**：当前缩放比例 (`scale`) 直接应用于场景尺寸，但未同步调整字体渲染的 DPI 设置
- **SVG 栅格化质量问题**：BrowserWindow 的默认栅格化可能使用较低的采样率，导致文字边缘模糊

现有代码结构：
- `export-service.ts`：核心渲染逻辑，包含 SVG 生成和软件 PNG 渲染
- `png-renderer.ts`：PNG 导出编排，负责 Electron 捕获 + fallback
- `export-handlers.ts`：IPC 处理器，处理渲染层请求

## Goals / Non-Goals

**Goals:**
- 修复 PNG 导出时字体模糊问题，确保文字清晰可读
- 保持现有导出 API 和调用方式不变
- 确保高倍率导出（如 300%）时字体质量同步提升
- 不破坏现有的 fallback 机制和验证逻辑

**Non-Goals:**
- 不改变 PNG 导出的文件尺寸计算逻辑
- 不修改导出缩放比例的输入范围（50%-400%）
- 不引入新的外部字体渲染库
- 不改变 SVG 生成的结构和样式

## Decisions

### Decision 1: 在 Electron 捕获前等待字体加载完成

**方案**：在隐藏的 BrowserWindow 中加载 SVG 后，显式等待字体加载完成再执行捕获。

**实现方式**：
- 在 `png-renderer.ts` 中，创建临时 BrowserWindow 加载 SVG 时，注入字体加载检测脚本
- 使用 `document.fonts.ready` Promise 等待所有字体就绪
- 在字体加载完成后，再等待 2 个 `requestAnimationFrame` 周期确保渲染完成

**替代方案**：
- 方案 A：使用固定的超时等待（如 500ms）
  - **缺点**：无法适应不同字体加载时间，可能导致等待不足或过长
- 方案 B：在 SVG 中嵌入 base64 字体数据
  - **缺点**：大幅增加 SVG 体积，影响性能，且可能涉及字体版权问题

**选择理由**：`document.fonts.ready` 是浏览器标准 API，能准确反映字体加载状态，且实现成本低。

### Decision 2: 优化 Electron BrowserWindow 的创建参数

**方案**：调整隐藏 BrowserWindow 的创建参数，提升栅格化质量。

**实现方式**：
- 设置 `webPreferences.deviceScaleFactor` 与导出缩放比例匹配
- 启用 `webPreferences.deviceScaleFactor` 的高 DPI 支持
- 在 `capturePage()` 前设置 `webContents.zoomLevel` 以匹配目标缩放

**替代方案**：
- 方案 A：保持默认窗口参数，仅依赖软件渲染
  - **缺点**：软件渲染质量低于 Electron 原生捕获
- 方案 B：使用更高分辨率的虚拟窗口再缩小
  - **缺点**：增加内存消耗，可能触发栅格安全限制

**选择理由**：直接调整 `deviceScaleFactor` 是最直接的 DPI 控制方式，能让 Electron 使用正确的采样率进行栅格化。

### Decision 3: 在软件渲染 fallback 中优化字体绘制

**方案**：改进 `export-service.ts` 中的软件字体渲染质量。

**实现方式**：
- 增加 `drawPseudoGlyph` 函数的采样密度，从当前的 5x7 提升到更高分辨率
- 对字体边缘应用抗锯齿算法（如灰度采样）
- 根据缩放比例动态调整字体的绘制尺寸

**替代方案**：
- 方案 A：使用 Node.js 的 `canvas` 库进行软件渲染
  - **缺点**：引入新的原生依赖，增加安装复杂度
- 方案 B：完全移除软件渲染，强制使用 Electron 捕获
  - **缺点**：失去 fallback 机制，在 Electron 捕获失败时无法导出

**选择理由**：保持无外部依赖的优势，同时提升 fallback 质量。

### Decision 4: 增加导出质量验证和自动重试

**方案**：在 PNG 生成后增加质量验证，检测到模糊时自动重试。

**实现方式**：
- 在 `isPngContentMeaningful` 函数中增加边缘检测算法
- 计算图像的梯度幅值，判断文字边缘是否清晰
- 当检测到模糊时，自动切换到更高质量的渲染路径

**替代方案**：
- 方案 A：仅验证尺寸，不验证内容质量
  - **缺点**：无法发现尺寸正确但内容模糊的问题
- 方案 B：让用户手动重试
  - **缺点**：用户体验差

**选择理由**：自动化质量验证能减少用户遇到模糊导出的概率。

## Risks / Trade-offs

### Risk 1: 字体加载等待可能导致导出时间增加

**风险**：等待 `document.fonts.ready` 可能增加 100-500ms 的导出时间，尤其在首次导出时。

**Mitigation**：
- 设置最大等待超时（如 3 秒），超时后自动 fallback 到软件渲染
- 在 UI 层显示导出进度提示

### Risk 2: deviceScaleFactor 可能与用户系统 DPI 设置冲突

**风险**：在高 DPI 显示器上，显式设置 `deviceScaleFactor` 可能与系统缩放设置叠加，导致实际缩放比例偏离预期。

**Mitigation**：
- 在创建 BrowserWindow 时显式设置 `webPreferences.deviceScaleFactor` 为导出缩放比例
- 在测试中覆盖不同系统 DPI 设置场景（100%、150%、200%）

### Risk 3: 软件渲染的字体质量仍可能低于 Electron 捕获

**风险**：即使优化了 `drawPseudoGlyph`，软件渲染的字体质量可能仍不如 Electron 的原生栅格化。

**Mitigation**：
- 优先使用 Electron 捕获，仅在失败或质量验证不通过时使用 fallback
- 在文档中说明推荐导出方式（使用 Electron 捕获 + 合适的缩放比例）

### Risk 4: 边缘检测算法可能误判

**风险**：自动质量验证可能将某些特殊风格的导图（如极简线条）误判为"模糊"。

**Mitigation**：
- 调整边缘检测阈值，降低误报率
- 仅在明显模糊时触发重试，避免过度敏感

## Migration Plan

1. **阶段 1**：修改 `png-renderer.ts`，添加字体加载等待逻辑
   - 在 BrowserWindow 中注入字体检测脚本
   - 等待 `document.fonts.ready` 后再捕获

2. **阶段 2**：优化 BrowserWindow 创建参数
   - 设置 `deviceScaleFactor` 匹配导出缩放比例
   - 测试不同缩放比例下的导出质量

3. **阶段 3**：改进软件渲染 fallback
   - 优化 `drawPseudoGlyph` 的采样密度
   - 增加边缘抗锯齿

4. **阶段 4**：增加质量验证
   - 在 `isPngContentMeaningful` 中增加边缘检测
   - 实现自动重试逻辑

5. **阶段 5**：测试验证
   - 运行现有测试：`npm run test -- tests/export/`
   - 手动验证不同缩放比例（50%、100%、200%、300%）的导出质量
   - 在不同 DPI 设置的系统上测试

## Open Questions

1. 是否需要为用户提供一个"高质量导出"的选项？（可能增加导出时间但提升质量）
2. 对于包含自定义字体的导图，是否需要预加载字体数据的机制？
3. 是否需要在导出失败时提供更详细的错误信息（如"字体加载超时"）？
