## ADDED Requirements

### Requirement: 导出预览生成
系统应支持生成导出预览，包括 SVG 渲染、尺寸计算和文件大小估算。

#### Scenario: 生成 PNG 预览
- **WHEN** 用户选择 PNG 格式并进入预览步骤
- **THEN** 系统生成 SVG 预览图，显示导出尺寸（宽度×高度像素）和估算文件大小

#### Scenario: 生成 SVG 预览
- **WHEN** 用户选择 SVG 格式并进入预览步骤
- **THEN** 系统生成 SVG 预览图，显示导出尺寸和估算文件大小

#### Scenario: 实时更新预览
- **WHEN** 用户拖动 PNG 缩放滑块
- **THEN** 系统以防抖方式（200ms）重新生成预览，更新尺寸和大小信息

#### Scenario: 预览尺寸计算
- **WHEN** 系统计算预览尺寸
- **THEN** 使用与导出相同的 `fitExportSceneForRaster` 和 `renderExportSceneToSvg` 函数，保证一致性

### Requirement: 预览显示
系统应在导出对话框中显示预览区域，提供视觉反馈。

#### Scenario: 预览区域布局
- **WHEN** 用户进入步骤 2（预览调整）
- **THEN** 显示预览图、缩放滑块、尺寸信息和操作按钮

#### Scenario: 预览提示
- **WHEN** 预览显示时
- **THEN** 显示提示文字"预览效果可能与最终导出略有差异"
