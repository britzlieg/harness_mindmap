# png-tiled-capture Specification

## Purpose

定义 PNG 导出中大尺寸图片的分块捕获（tiled capture）流程，确保坐标对齐、时序控制和瓦片拼接正确，避免导出图片出现截断、错位或重复像素。

## Requirements

### Requirement: 分块捕获 MUST 使用图像定位而非容器移动

系统 MUST 通过移动图像元素的位置（`left` 和 `top` 样式）来对齐捕获区域，MUST NOT 通过 CSS `transform` 移动容器。

#### Scenario: 瓦片捕获时图像正确对齐到窗口
- **WHEN** 分块捕获流程需要捕获位于 `(offsetX, offsetY)` 的瓦片
- **THEN** 图像元素的 `left` 样式设置为 `-offsetX`，`top` 样式设置为 `-offsetY`，确保图像的指定区域对齐到窗口的 `(0, 0)` 点

#### Scenario: 连续瓦片捕获之间无累积误差
- **WHEN** 捕获多个连续瓦片（如第一行第一列、第一行第二列）
- **THEN** 每个瓦片的图像位置独立计算，不依赖前一个瓦片的状态，无累积偏移误差

### Requirement: 分块捕获 MUST 等待渲染稳定后再捕获

系统 MUST 在每次移动图像位置后等待渲染稳定，MUST NOT 使用固定超时（如 `setTimeout(30)`）作为唯一等待机制。

#### Scenario: 图像移动后等待两帧再捕获
- **WHEN** 图像位置更新完成
- **THEN** 系统使用 `await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))` 等待两帧后再执行捕获

#### Scenario: 等待超时保护
- **WHEN** `requestAnimationFrame` 在 3 秒内未触发
- **THEN** 系统超时并继续捕获，避免无限等待

### Requirement: 瓦片拼接 MUST 验证坐标边界

系统 MUST 在拼接每个瓦片时验证目标坐标在最终图像范围内，MUST NOT 写入越界像素。

#### Scenario: 边缘瓦片尺寸不足时正确裁剪
- **WHEN** 最后一行或最后一列的瓦片尺寸小于标准瓦片尺寸（如 2048x1024）
- **THEN** 系统按实际瓦片尺寸复制像素，目标坐标不超出最终图像的 `(width, height)`

#### Scenario: 瓦片缓冲区尺寸验证
- **WHEN** 从 `nativeImage.toBitmap()` 获取瓦片数据
- **THEN** 系统验证缓冲区长度 `>= tileWidth * tileHeight * 4`，不足时记录警告并跳过该瓦片

### Requirement: 分块捕获 MUST 设置正确的缩放级别

系统 MUST 在捕获前设置 BrowserWindow 的缩放级别以匹配导出倍率，确保渲染质量与缩放比例一致。

#### Scenario: 200% 缩放导出时设置正确 zoomLevel
- **WHEN** 用户选择 200% 缩放比例导出 PNG
- **THEN** 系统调用 `webContents.setZoomLevel(Math.log2(2.0))` 设置缩放级别为 1.0

#### Scenario: 100% 缩放导出时不额外放大
- **WHEN** 用户选择 100% 缩放比例导出 PNG
- **THEN** 系统调用 `webContents.setZoomLevel(0)` 设置缩放级别为 0

### Requirement: 分块捕获 MUST 验证最终图像尺寸

系统 MUST 在拼接完成后验证最终图像尺寸与预期场景尺寸一致，允许 ±2% 的容差。

#### Scenario: 图像尺寸完全匹配
- **WHEN** 拼接完成的图像尺寸与预期场景尺寸完全一致
- **THEN** 验证通过，返回 PNG 缓冲区

#### Scenario: 图像尺寸偏差在 2% 以内
- **WHEN** 拼接完成的图像尺寸与预期场景尺寸偏差在 ±2% 以内
- **THEN** 系统记录警告日志，但仍接受该图像（可通过裁剪或填充修正）

#### Scenario: 图像尺寸偏差超过 2%
- **WHEN** 拼接完成的图像尺寸与预期场景尺寸偏差超过 ±2%
- **THEN** 系统判定验证失败，降级到 Fallback 渲染路径
