## ADDED Requirements

### Requirement: PNG 渲染管线 SHALL 校验输出尺寸与预期一致

在 `renderPng` 返回 PNG Buffer 前，系统 SHALL 读取输出 PNG 的实际像素尺寸并与 fittedScene 的预期尺寸进行比对。若尺寸不一致，系统 SHALL 降级到 fallback 渲染器重新生成，MUST NOT 将尺寸不匹配的 PNG 写入文件。

#### Scenario: 大型场景下 capturePage 返回尺寸不匹配
- **WHEN** fittedScene 尺寸为 662×12000，但 capturePage 返回的 PNG 尺寸不等于 662×12000
- **THEN** 系统降级到 fallback 渲染器，返回尺寸为 662×12000 的 PNG

#### Scenario: 正常场景下尺寸匹配
- **WHEN** fittedScene 尺寸为 800×600，capturePage 返回的 PNG 尺寸为 800×600
- **THEN** 直接返回该 PNG，不触发降级

### Requirement: Tiled capture SHALL 校验每个 tile 的输出尺寸

在 tiled capture 拼接路径中，系统 SHALL 对每个 capturePage 返回的 tile 校验其尺寸是否等于当前 tile 期望尺寸 (`currentTileWidth × currentTileHeight`)。若不匹配，系统 SHALL 尝试通过 nativeImage 重新获取正确尺寸的 tile 数据，MUST NOT 仅通过 stretch/resize 掩盖尺寸差异。

#### Scenario: DPR 导致 tile 尺寸偏差
- **WHEN** capturePage 返回的 tile 尺寸与 currentTileWidth/Height 不匹配
- **THEN** 系统通过 nativeImage.createFromDataURL 重新获取 tile 并 resize 到期望尺寸
- **AND** resize 前的 tile 内容完整（非空白）

### Requirement: renderPng SHALL 保证返回的 PNG 尺寸与 fittedScene 一致

无论使用哪条渲染路径（BrowserWindow capture、tiled capture、nativeImage、fallback），`renderPng` 返回的 PNG Buffer 的 IHDR 尺寸 SHALL 等于 `fittedScene.width × fittedScene.height`。

#### Scenario: 所有 Electron 路径失败后 fallback
- **WHEN** BrowserWindow capture 和 tiled capture 均失败
- **THEN** renderExportSceneToPngFallback 生成的 PNG 尺寸等于 fittedScene 的 width × height
