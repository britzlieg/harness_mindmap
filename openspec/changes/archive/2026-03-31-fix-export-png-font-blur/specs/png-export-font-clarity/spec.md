# png-export-font-clarity Specification

## Purpose

定义 PNG 导出时字体清晰度优化的核心需求，确保导出的 PNG 图片文字清晰可读，无模糊问题。

## ADDED Requirements

### Requirement: PNG 导出前 MUST 等待字体加载完成
Electron BrowserWindow 捕获流程 MUST 在 SVG 加载完成后显式等待所有字体资源加载就绪，然后才能执行页面捕获。

#### Scenario: 标准字体加载后导出
- **WHEN** 用户触发 PNG 导出且导图使用系统默认字体
- **THEN** 系统等待 `document.fonts.ready` 解析完成后才执行 `capturePage()`

#### Scenario: 自定义字体加载后导出
- **WHEN** 导图使用自定义网络字体且用户触发 PNG 导出
- **THEN** 系统等待所有自定义字体加载完成后才执行捕获，而不是在字体加载前捕获

#### Scenario: 字体加载超时降级
- **WHEN** 字体加载超过 3 秒未完成
- **THEN** 系统自动降级到软件渲染 fallback 并生成 PNG

### Requirement: Electron BrowserWindow 的 deviceScaleFactor MUST 匹配导出缩放比例
隐藏捕获窗口的 `webPreferences.deviceScaleFactor` MUST 设置为与导出缩放比例一致的值，以确保栅格化采样率正确。

#### Scenario: 100% 缩放导出
- **WHEN** 用户以 100% 缩放比例导出 PNG
- **THEN** BrowserWindow 的 `deviceScaleFactor` 设置为 1.0

#### Scenario: 200% 缩放导出
- **WHEN** 用户以 200% 缩放比例导出 PNG
- **THEN** BrowserWindow 的 `deviceScaleFactor` 设置为 2.0

#### Scenario: 高 DPI 系统兼容性
- **WHEN** 用户在系统 DPI 设置为 150% 的显示器上以 100% 导出
- **THEN** 导出的 PNG 尺寸和清晰度与 100% DPI 系统上一致，不受系统 DPI 影响

### Requirement: PNG 导出质量验证 MUST 包含边缘清晰度检测
PNG 生成后 MUST 执行边缘检测算法验证文字清晰度，检测到模糊时自动切换到更高质量渲染路径。

#### Scenario: 清晰文字边缘验证通过
- **WHEN** 导出的 PNG 包含清晰的文字边缘
- **THEN** 边缘检测算法计算的平均梯度幅值高于阈值，验证通过

#### Scenario: 模糊文字边缘触发重试
- **WHEN** 导出的 PNG 文字边缘模糊（梯度幅值低于阈值）
- **THEN** 系统自动切换到软件渲染 fallback 重新生成 PNG

#### Scenario: 极简线条导图不误判
- **WHEN** 导图包含极简风格的细线条节点
- **THEN** 边缘检测算法不会将其误判为"模糊"，导出正常完成

### Requirement: 软件渲染 fallback 的字体绘制 MUST 支持抗锯齿
当 Electron 捕获失败或质量验证不通过时，软件渲染 MUST 使用抗锯齿算法绘制字体边缘。

#### Scenario: 软件渲染 fallback 时字体清晰
- **WHEN** 系统降级到软件渲染 fallback 生成 PNG
- **THEN** 字体边缘使用灰度采样抗锯齿，无明显锯齿

#### Scenario: 高倍率软件渲染保持质量
- **WHEN** 用户以 300% 缩放比例导出且触发 fallback
- **THEN** 软件渲染根据缩放比例动态调整字体绘制尺寸，保持清晰度

### Requirement: PNG 导出成功后 MUST 记录渲染路径和质量指标
成功的 PNG 导出 MUST 记录使用的渲染路径（Electron/软件 fallback）和关键质量指标，用于问题诊断。

#### Scenario: Electron 渲染成功记录路径
- **WHEN** PNG 通过 Electron BrowserWindow 捕获成功生成
- **THEN** 日志记录 `renderPath: "electron"` 和 `deviceScaleFactor` 值

#### Scenario: Fallback 渲染记录原因
- **WHEN** PNG 导出降级到软件渲染 fallback
- **THEN** 日志记录 `renderPath: "fallback"` 和 fallback 原因（如"字体加载超时"或"质量验证失败"）

## MODIFIED Requirements

### Requirement: PNG export MUST use latest state after render readiness
Before snapshot capture, the export flow MUST wait for render readiness and then read the latest store snapshot used for export payload construction.

**新增**: 等待渲染就绪包括等待字体资源加载完成 (`document.fonts.ready`)。

#### Scenario: Export right after text update
- **WHEN** a user changes node text and triggers PNG export without delay
- **THEN** the exported image contains the updated text, not the previous value

#### Scenario: Font loading completes before capture
- **WHEN** BrowserWindow loads the SVG for capture
- **THEN** capture occurs only after `document.fonts.ready` resolves and all fonts are rendered

#### Scenario: Electron capture waits for image load
- **WHEN** BrowserWindow captures the SVG rasterization
- **THEN** capture occurs only after the image element fires 'load' event and two requestAnimationFrame cycles complete
