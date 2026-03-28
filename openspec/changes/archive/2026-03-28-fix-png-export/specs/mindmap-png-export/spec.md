## ADDED Requirements

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

## MODIFIED Requirements

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
