# mindmap-png-export Specification

## Purpose

定义 PNG 导出功能的核心需求，确保导出的 PNG 图像完整包含所有可见节点和连线，支持缩放比例调整，并提供可靠的降级机制。

## Requirements

### Requirement: PNG 导出边界计算 MUST 基于四极值点
系统 MUST 基于场景中所有节点矩形和连线控制点的最左、最上、最右、最下四个极值点计算内容边界，确保所有可见内容都在输出图像范围内。

#### Scenario: 多节点导图导出时边界正确
- **WHEN** 导图包含多个分散在不同位置的节点
- **THEN** 生成的 PNG 边界覆盖所有节点和连线，无内容截断

#### Scenario: 节点数量增加时边界自适应扩展
- **WHEN** 用户向导图添加更多节点后导出 PNG
- **THEN** 生成的 PNG 边界自动扩展以包含新增内容，而不是保持固定尺寸

### Requirement: Electron 分块捕获 MUST 验证瓦片尺寸和坐标对齐
Electron BrowserWindow 分块捕获流程 MUST 对每个瓦片执行尺寸验证，并在拼接时确保像素级坐标对齐。

#### Scenario: 大尺寸导图分块捕获后完整拼接
- **WHEN** 场景尺寸超过 `MAX_PNG_CAPTURE_TILE_EDGE` 时触发分块捕获
- **THEN** 所有瓦片正确拼接，接缝处无错位或重复像素

#### Scenario: 边缘瓦片尺寸不足时正确处理
- **WHEN** 最后一行或最后一列的瓦片尺寸小于标准瓦片尺寸
- **THEN** 系统正确裁剪或填充边缘瓦片，最终图像尺寸与预期一致

### Requirement: PNG 导出验证 MUST 包含尺寸和内容完整性检查
PNG 导出流程 MUST 在生成后验证：(1) 输出尺寸与预期场景尺寸一致，(2) 图像内容非空白且包含有效像素数据。

#### Scenario: 导出后尺寸验证失败时触发 fallback
- **WHEN** Electron 捕获生成的 PNG 尺寸与预期不符
- **THEN** 系统自动降级到软件渲染 fallback 并重新生成

#### Scenario: 导出图像非空验证
- **WHEN** 生成的 PNG 文件存在但内容为空白或接近空白
- **THEN** 系统检测到无效输出并尝试 fallback 或抛出明确错误

### Requirement: 导出选项 SHALL 包含 PNG
导出流程 SHALL 在现有支持格式基础上提供 PNG 作为可选输出格式。

#### Scenario: 用户打开导出弹窗
- **WHEN** 用户打开导出弹窗
- **THEN** 弹窗显示可直接选择的 PNG 导出选项

### Requirement: PNG 导出 SHALL 将文件写入所选路径
当用户确认 PNG 导出时，系统 SHALL 通过 Electron 导出处理器将有效 `.png` 文件保存到所选路径。

#### Scenario: 用户导出为 PNG
- **WHEN** 用户选择 PNG 并确认目标文件路径
- **THEN** 指定路径生成 `.png` 文件，且导出流程无错误完成

### Requirement: PNG 导出成功后 SHALL 保持编辑会话状态不变
在 PNG 导出成功后，系统 SHALL 保持当前脑图文档与编辑上下文不变。

#### Scenario: 导出后继续编辑
- **WHEN** PNG 导出成功完成
- **THEN** 用户仍停留在同一脑图中，当前选中状态与内容保持不变

### Requirement: PNG 导出 SHALL 包含完整可视思维导图内容
PNG 导出 SHALL 捕获与编辑器可见内容一致的完整渲染场景，包括节点文字、连线以及可见节点图形。系统 MUST 基于导出场景中节点与连线几何的最上、最左、最下、最右极值点计算导出内容边界，并确保所有可见节点都在输出图像范围内，MUST NOT 因节点数量增加而发生边缘裁切。

#### Scenario: 用户导出包含内容的思维导图为 PNG
- **WHEN** 当前导图包含多个带文字的节点与父子连线，且用户确认 PNG 导出
- **THEN** 生成的 `.png` 包含全部可见节点与连线，不出现顶部、左侧、底部或右侧内容截断

#### Scenario: 同层节点很多时仍完整导出
- **WHEN** 当前导图在同一层级包含大量节点（例如 100 个），且用户确认 PNG 导出
- **THEN** 生成的 `.png` 仍完整包含该层级全部可见节点，不会只显示部分前序节点

#### Scenario: 大尺寸导图触发分块捕获时仍保持完整
- **WHEN** 导图内容边界计算后的尺寸超过 `MAX_PNG_CAPTURE_TILE_EDGE`
- **THEN** 系统自动启用分块捕获并正确拼接，最终 PNG 包含全部可见内容

### Requirement: 导出流程 MUST 等待渲染就绪后再截取快照
在写入 PNG 文件前，导出流程 MUST 从渲染就绪状态截取快照，避免因时序竞态导致内容缺失。

#### Scenario: 用户在最近编辑后立即导出
- **WHEN** 用户刚修改节点文字或结构后立即触发 PNG 导出
- **THEN** 保存的 PNG 仍包含最新渲染出的文字与连线，而不是部分或空白画面

### Requirement: PNG export SHALL reflect the current rendered canvas scene
The PNG export pipeline SHALL generate image content from the same resolved scene data used for current on-screen rendering, including node text, node positions, connection paths, and active theme styling.

#### Scenario: Export after normal editing session
- **WHEN** a user edits nodes and immediately exports PNG
- **THEN** the generated PNG visually reflects the same nodes, labels, and connections currently shown on canvas

### Requirement: PNG export MUST use latest state after render readiness
Before snapshot capture, the export flow MUST wait for render readiness and then read the latest store snapshot used for export payload construction.

#### Scenario: Export right after text update
- **WHEN** a user changes node text and triggers PNG export without delay
- **THEN** the exported image contains the updated text, not the previous value

### Requirement: PNG export SHALL not fallback to synthetic placeholder imagery
If graph content is present, exported PNG SHALL include real graph geometry derived from current node/link bounds and MUST NOT produce blank or placeholder-like output unrelated to current canvas content.

#### Scenario: Export map with multiple connected nodes
- **WHEN** the canvas contains multiple connected nodes and user exports PNG
- **THEN** the resulting PNG contains rendered nodes and connection lines aligned to current graph bounds

### Requirement: PNG 导出前 SHALL 允许输入缩放百分比
系统在用户确认 PNG 导出前 SHALL 弹出缩放百分比输入界面，默认值为 `100`，并显示可接受范围说明。

#### Scenario: 用户打开 PNG 导出确认弹窗
- **WHEN** 用户选择导出格式为 PNG
- **THEN** 弹窗包含缩放百分比输入项且默认显示 `100`

### Requirement: 缩放百分比 MUST 完成有效性校验
系统 MUST 对缩放百分比进行数值校验，仅允许定义范围内的有效整数；校验失败时 MUST 阻止导出并给出可理解的错误提示。

#### Scenario: 用户输入非法缩放值
- **WHEN** 用户输入非数字、空值或超出范围的百分比并点击导出
- **THEN** 导出不会执行，界面提示用户修正输入

### Requirement: PNG 导出分辨率 SHALL 按缩放百分比计算
系统 SHALL 先基于内容边界与导出内边距计算逻辑导出尺寸，再将缩放百分比转换为导出倍率应用于该逻辑尺寸；输出像素尺寸 MUST 由"内容边界尺寸 × 导出倍率"推导，MUST NOT 退化为固定基准尺寸或仅在裁切后再缩放。

#### Scenario: 用户以 200% 导出
- **WHEN** 用户输入 `200` 并确认导出
- **THEN** 生成 PNG 的渲染倍率为 `2.0`，且最终尺寸基于完整内容边界计算后再放大，较 `100%` 导出更清晰

#### Scenario: 内容边界超过默认基准时自适应扩展
- **WHEN** 当前导图内容边界超出默认最小导出尺寸，且用户以 `100%` 导出
- **THEN** 生成 PNG 的宽高按内容边界自适应增大以覆盖全部可见节点，而不是保持固定默认尺寸

#### Scenario: 达到栅格安全上限时保持完整内容
- **WHEN** 计算后的 PNG 像素尺寸超过栅格安全上限
- **THEN** 系统对完整场景执行统一等比收敛，导出结果仍包含全部可见节点与连线，且不发生局部裁切

### Requirement: PNG export MUST use latest state after render readiness
Before snapshot capture, the export flow MUST wait for render readiness and then read the latest store snapshot used for export payload construction.

#### Scenario: Export right after text update
- **WHEN** a user changes node text and triggers PNG export without delay
- **THEN** the exported image contains the updated text, not the previous value

#### Scenario: Electron capture waits for image load
- **WHEN** BrowserWindow captures the SVG rasterization
- **THEN** capture occurs only after the image element fires 'load' event and two requestAnimationFrame cycles complete

### Requirement: PNG 导出文字清晰度 SHALL 随倍率提升而提升
系统在导出同一导图内容时，较高导出倍率下的文本与线条边缘 SHALL 呈现更高可辨识度，且 MUST NOT 出现“倍率变化但清晰度无明显变化”的结果。

#### Scenario: 同一导图分别以 100% 与 300% 导出
- **WHEN** 用户对同一份导图先后执行 `100%` 与 `300%` PNG 导出
- **THEN** `300%` 导出的文本边缘与细节可读性明显优于 `100%` 导出结果

### Requirement: PNG export refactor SHALL preserve existing export behavior
Internal restructuring of PNG export logic SHALL preserve existing user-visible behavior, including successful file creation, expected bounds coverage, and current scale handling semantics.

#### Scenario: Export after internal module decomposition
- **WHEN** a user exports PNG after refactor with a valid scale value
- **THEN** the export succeeds and produces a valid PNG representing the current mindmap scene

### Requirement: PNG export MUST validate and reject invalid scale input safely
The PNG export flow MUST validate scale input at the IPC boundary and MUST reject invalid values without writing partial or corrupted output.

#### Scenario: Invalid scale value at export request
- **WHEN** a PNG export request provides a non-integer or out-of-range scale value
- **THEN** the request is rejected with a controlled error and no output file is written

### Requirement: PNG export SHALL maintain session continuity on failure
If PNG export fails for validation or runtime reasons, the system SHALL preserve current editor session state and keep the document available for continued editing.

#### Scenario: Export failure due to runtime capture error
- **WHEN** PNG rendering fails during export
- **THEN** the user remains in the current document session with unchanged mindmap state

