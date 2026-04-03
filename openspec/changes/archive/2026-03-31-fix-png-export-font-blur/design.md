## Context

当前 PNG 导出流程：
1. `buildRenderScene()` 构建场景数据（节点位置、连线、样式）
2. `renderSceneToSvg()` 生成 SVG 矢量图
3. `tryRenderPngViaElectronSvg()` 在离屏 BrowserWindow 中光栅化 SVG
4. `capturePage()` 捕获 PNG 位图

问题根源：
- SVG 生成的 `<text>` 元素仅包含 `font-size` 和 `font-weight`，**缺少 `font-family` 属性**
- 离屏窗口的 HTML 模板没有 CSS 字体声明
- Electron 使用浏览器默认字体（Times New Roman，衬线体）进行光栅化
- 结果：文字边缘模糊、字重不一致、与渲染层视觉效果不匹配

约束条件：
- 不引入 Web 字体（保持导出独立性）
- 不修改现有架构分层（`electron/services/` 为服务层）
- 跨平台兼容（Windows/macOS/Linux）
- 保持 SVG 导出功能不变

## Goals / Non-Goals

**Goals:**
- 在 SVG 中添加 `font-family` 声明，确保光栅化时使用无衬线字体
- 提升 PNG 导出文字清晰度，尤其是高倍率导出时
- 保持跨平台字体一致性
- 最小化代码改动（仅修改 SVG 生成逻辑）

**Non-Goals:**
- 不修改渲染层（`src/`）字体使用
- 不嵌入 Web 字体文件
- 不修改 fallback 软件渲染逻辑（`renderSceneToPngFallback`）
- 不改变导出尺寸、缩放比例计算逻辑

## Decisions

### 决策 1：使用系统安全字体栈

**选择**: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

**理由**:
- 各平台自动使用最优系统字体（Windows: Segoe UI, macOS: SF Pro, Linux: 回退到 sans-serif）
- 无需网络加载，导出完全离线可用
- 字体针对各自平台优化，清晰度最佳
- 与渲染层使用的 `"Space Grotesk", "IBM Plex Sans"` 视觉风格接近（均为无衬线体）

**备选方案**:
- 方案 A: 使用 `"Segoe UI", "San Francisco", "Microsoft YaHei", sans-serif`
  - 缺点：字体名称在不同系统可能有差异，兼容性不如 `system-ui`
- 方案 B: 嵌入 Web 字体文件到 SVG
  - 缺点：大幅增加导出文件大小，涉及字体授权问题，增加复杂度

### 决策 2：在 SVG 根元素和 `<text>` 元素同时声明字体

**选择**: 双重声明（继承 + 显式）

**实现**:
```xml
<!-- 根元素声明（继承） -->
<svg ... style="font-family: system-ui, -apple-system, ...">

<!-- 每个 text 元素显式声明 -->
<text font-family="system-ui, -apple-system, ..." ...>
```

**理由**:
- 根元素 `style` 提供 CSS 继承链
- 每个 `<text>` 显式声明确保独立 SVG 查看器也能正确渲染
- 双重保障，兼容性最佳

### 决策 3：仅修改 `renderSceneToSvg` 函数

**选择**: 在单一函数内完成所有字体声明修改

**修改点**:
1. 添加 `FONT_FAMILY` 常量（文件顶部）
2. 修改 SVG 根元素生成（添加 `style` 属性）
3. 修改节点文字 `<text>` 生成（添加 `font-family` 属性）
4. 修改优先级徽章 `<text>` 生成（添加 `font-family` 属性）

**理由**:
- 集中修改，便于维护和审查
- 不影响其他导出功能（SVG 导出、Markdown 导出）
- 符合现有代码分层架构

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 不同系统字体渲染差异 | Windows/macOS 导出的 PNG 文字外观略有不同 | 这是预期行为，各平台使用各自优化字体，差异在可接受范围内 |
| 中文字体回退行为 | 某些中文字符可能回退到宋体 | `sans-serif` 在中文系统通常回退到黑体类字体，需实际测试验证 |
| SVG 文件大小略微增加 | 每个节点增加约 50-80 字节 | 对于典型导图（<100 节点）增加 <10KB，影响可忽略 |
| 现有测试未覆盖字体验证 | 可能无法自动检测字体回归 | 手动验证导出清晰度，后续可考虑添加视觉回归测试 |

## Migration Plan

**无需迁移计划**：此变更为增量修复，不影响现有文件格式、API 或用户数据。

**部署策略**:
1. 修改 `export-service.ts`
2. 运行类型检查 `npm run typecheck`
3. 运行导出相关测试 `npm run test -- tests/export/`
4. 手动测试 PNG 导出清晰度
5. 提交代码

**回滚策略**: 直接回退 commit 即可，无副作用。

## Open Questions

无。此变更为直接修复，技术决策明确，无需额外调研。
