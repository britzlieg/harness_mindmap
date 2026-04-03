# png-fallback-rendering Specification

## Purpose

定义 PNG 导出在 Electron 光栅化失败时的 Fallback 软件渲染质量标准，确保即使降级路径也能保持节点文字清晰可读，图形边界正确。

## Requirements

### Requirement: Fallback 文字渲染 MUST 使用 20x28 字模网格

系统 MUST 使用 20x28 分辨率的字模网格模拟字符形状，MUST NOT 使用低于 20x28 的网格（如 10x14）。

#### Scenario: 英文字符渲染
- **WHEN** 渲染英文字母（A-Z, a-z）
- **THEN** 每个字母在 20x28 网格中有对应的位图模式，字符边缘清晰可辨

#### Scenario: 数字字符渲染
- **WHEN** 渲染数字（0-9）
- **THEN** 每个数字在 20x28 网格中有对应的位图模式，可清晰区分（如 0 与 O、1 与 l）

#### Scenario: 中文字符渲染
- **WHEN** 渲染常用汉字
- **THEN** 字符在 20x28 网格中保持基本结构，主要笔画清晰，无严重失真

### Requirement: Fallback 文字渲染 MUST 支持亚像素抗锯齿

系统 MUST 对每个像素进行多次采样（至少 4 次）并应用 alpha 混合，MUST NOT 使用简单的二值（开/关）像素渲染。

#### Scenario: 100% 缩放比例下的抗锯齿
- **WHEN** 以 100% 缩放比例导出 PNG
- **THEN** 每个像素至少采样 4 次（2x2 网格），边缘像素使用 alpha 混合平滑锯齿

#### Scenario: 200% 缩放比例下的抗锯齿
- **WHEN** 以 200% 缩放比例导出 PNG
- **THEN** 每个像素至少采样 8 次（2x4 或 4x2 网格），边缘更平滑

### Requirement: Fallback 图形渲染 MUST 保持与 Electron 路径一致

系统 MUST 确保 Fallback 路径绘制的节点矩形、连线、网格与 Electron 光栅化路径视觉一致。

#### Scenario: 节点矩形边界
- **WHEN** 渲染节点背景矩形和边框
- **THEN** 矩形的 `(x, y, width, height)` 与场景数据完全一致，边框宽度为 1px

#### Scenario: 贝塞尔曲线连线
- **WHEN** 渲染节点间的贝塞尔曲线连线
- **THEN** 使用至少 52 段线段逼近曲线，曲线平滑无明显折角

#### Scenario: 网格图案
- **WHEN** 渲染背景网格
- **THEN** 网格线间距为 24px，与 Electron 路径的网格图案一致

### Requirement: Fallback 渲染 MUST 验证输出非空

系统 MUST 在 Fallback 渲染完成后验证 PNG 缓冲区包含有效像素数据，MUST NOT 返回空白或接近空白的图像。

#### Scenario: 正常节点渲染后输出非空
- **WHEN** 场景包含至少一个节点
- **THEN** Fallback 渲染的 PNG 缓冲区长度 > 100 字节，且通过 `readPngDimensions` 验证

#### Scenario: 空场景的降级处理
- **WHEN** 场景为空（无节点）
- **THEN** 系统返回最小尺寸（960x640）的空白 PNG，而非报错

### Requirement: Fallback 渲染 MUST 记录降级原因

系统 MUST 在 Fallback 渲染完成后记录日志，说明从 Electron 路径降级的原因。

#### Scenario: Electron 捕获失败
- **WHEN** Electron 路径返回 `null` 或抛出异常
- **THEN** 日志记录 `"Electron capture failed: <reason>"`，然后执行 Fallback

#### Scenario: 尺寸验证失败
- **WHEN** Electron 捕获的 PNG 尺寸与预期不符
- **THEN** 日志记录 `"Dimension validation failed: expected <WxH>, got <WxH>"`，然后执行 Fallback

#### Scenario: 内容验证失败
- **WHEN** Electron 捕获的 PNG 内容为空白或接近空白
- **THEN** 日志记录 `"Content validation failed: PNG is blank or corrupted"`，然后执行 Fallback
