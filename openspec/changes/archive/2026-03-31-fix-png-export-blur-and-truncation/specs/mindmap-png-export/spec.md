# mindmap-png-export Delta Specification

## Purpose

更新 PNG 导出验证链和降级策略的要求，明确尺寸容差、渲染等待机制和 Fallback 质量标准。

## ADDED Requirements

### Requirement: PNG 导出验证 MUST 包含 2% 尺寸容差

系统 MUST 在验证 Electron 捕获的 PNG 尺寸时允许 ±2% 的偏差，而非要求完全匹配。

#### Scenario: 尺寸偏差在 2% 以内时接受
- **WHEN** Electron 捕获的 PNG 尺寸与预期场景尺寸偏差在 ±2% 以内
- **THEN** 系统接受该 PNG 并返回，记录警告日志但不降级

#### Scenario: 尺寸偏差超过 2% 时降级
- **WHEN** Electron 捕获的 PNG 尺寸与预期场景尺寸偏差超过 ±2%
- **THEN** 系统判定验证失败，降级到 Fallback 渲染路径

### Requirement: PNG 导出流程 MUST 使用事件驱动等待机制

系统 MUST 使用 `requestAnimationFrame` 和图像 `onload` 事件等待渲染稳定，MUST NOT 仅依赖固定超时。

#### Scenario: 图像加载完成后等待两帧
- **WHEN** SVG 图像在 BrowserWindow 中加载完成
- **THEN** 系统等待 `img.onload` 事件后，再执行两次 `requestAnimationFrame` 才捕获

#### Scenario: 分块捕获之间等待渲染稳定
- **WHEN** 分块捕获流程移动图像位置后
- **THEN** 系统执行两次 `requestAnimationFrame` 等待渲染稳定，而非使用 `setTimeout(30)`

## MODIFIED Requirements

### Requirement: Electron 分块捕获 MUST 验证瓦片尺寸和坐标对齐

**原要求位置**: `openspec/specs/mindmap-png-export/spec.md` 中的 "Electron 分块捕获 MUST 验证瓦片尺寸和坐标对齐"

**变更说明**: 明确坐标对齐的实现方式——使用图像定位而非容器移动。

Electron BrowserWindow 分块捕获流程 MUST 对每个瓦片执行尺寸验证，并在拼接时确保像素级坐标对齐。系统 MUST 通过移动图像元素的 `left` 和 `top` 样式来对齐捕获区域，MUST NOT 使用 CSS `transform` 移动容器。

#### Scenario: 大尺寸导图分块捕获后完整拼接
- **WHEN** 场景尺寸超过 `MAX_PNG_CAPTURE_TILE_EDGE` 时触发分块捕获
- **THEN** 所有瓦片正确拼接，接缝处无错位或重复像素

#### Scenario: 边缘瓦片尺寸不足时正确处理
- **WHEN** 最后一行或最后一列的瓦片尺寸小于标准瓦片尺寸
- **THEN** 系统正确裁剪或填充边缘瓦片，最终图像尺寸与预期一致

#### Scenario: 图像定位对齐
- **WHEN** 捕获位于 `(offsetX, offsetY)` 的瓦片
- **THEN** 图像元素的 `left` 样式设置为 `-offsetX`，`top` 样式设置为 `-offsetY`

### Requirement: PNG 导出验证 MUST 包含尺寸和内容完整性检查

**原要求位置**: `openspec/specs/mindmap-png-export/spec.md` 中的 "PNG 导出验证 MUST 包含尺寸和内容完整性检查"

**变更说明**: 增加 2% 尺寸容差，明确验证失败后的降级策略。

PNG 导出流程 MUST 在生成后验证：(1) 输出尺寸与预期场景尺寸一致（允许 ±2% 容差），(2) 图像内容非空白且包含有效像素数据。

#### Scenario: 导出后尺寸验证失败时触发 fallback
- **WHEN** Electron 捕获生成的 PNG 尺寸与预期不符（偏差超过 ±2%）
- **THEN** 系统自动降级到软件渲染 fallback 并重新生成

#### Scenario: 导出图像非空验证
- **WHEN** 生成的 PNG 文件存在但内容为空白或接近空白
- **THEN** 系统检测到无效输出并尝试 fallback 或抛出明确错误

#### Scenario: 尺寸偏差在容差范围内
- **WHEN** Electron 捕获的 PNG 尺寸与预期偏差在 ±2% 以内
- **THEN** 系统接受该 PNG，记录警告日志但不降级

### Requirement: 导出流程 MUST 等待渲染就绪后再截取快照

**原要求位置**: `openspec/specs/mindmap-png-export/spec.md` 中的 "导出流程 MUST 等待渲染就绪后再截取快照"

**变更说明**: 明确等待机制为事件驱动而非固定超时。

在写入 PNG 文件前，导出流程 MUST 从渲染就绪状态截取快照，使用 `requestAnimationFrame` 和图像 `onload` 事件等待渲染稳定，MUST NOT 仅依赖固定超时（如 `setTimeout(30)`），避免因时序竞态导致内容缺失。

#### Scenario: 用户在最近编辑后立即导出
- **WHEN** 用户刚修改节点文字或结构后立即触发 PNG 导出
- **THEN** 保存的 PNG 仍包含最新渲染出的文字与连线，而不是部分或空白画面

#### Scenario: 图像加载完成后等待两帧
- **WHEN** SVG 图像在 BrowserWindow 中加载完成
- **THEN** 系统等待 `img.onload` 事件后，再执行两次 `requestAnimationFrame` 才捕获

#### Scenario: 分块捕获之间等待渲染稳定
- **WHEN** 分块捕获流程需要捕获多个瓦片
- **THEN** 每个瓦片捕获前执行两次 `requestAnimationFrame` 等待渲染稳定

## REMOVED Requirements

（无）
