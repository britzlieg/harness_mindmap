## ADDED Requirements

### Requirement: 预览生成 IPC 接口
系统应提供预览生成的 IPC 通信接口，供 Renderer 调用。

#### Scenario: 调用 preview 生成接口
- **WHEN** Renderer 调用 `window.electronAPI.export.generatePreview`
- **THEN** 主进程接收 MindmapPayload、ExportFormat 和 ExportScaleOptions 参数

#### Scenario: 返回预览数据
- **WHEN** 主进程完成预览生成
- **THEN** 返回包含 svg（字符串）、width（数字）、height（数字）、estimatedSizeKb（数字）的对象

### Requirement: 预览数据类型定义
系统应定义预览相关的数据类型，供 Renderer 和 Main 共享。

#### Scenario: ExportPreviewResult 类型
- **WHEN** 定义预览返回类型
- **THEN** 包含 svg: string、width: number、height: number、estimatedSizeKb: number 字段

#### Scenario: ExportScaleOptions 扩展
- **WHEN** 扩展缩放选项类型
- **THEN** scalePercent 字段为可选数字，默认值 100
