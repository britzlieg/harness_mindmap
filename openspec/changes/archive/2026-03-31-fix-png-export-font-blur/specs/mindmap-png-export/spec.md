# mindmap-png-export Specification (Delta)

## ADDED Requirements

### Requirement: PNG 导出 SVG 光栅化 MUST 使用无衬线字体族

系统在生成 PNG 导出时，SVG 光栅化流程 MUST 使用无衬线字体族（sans-serif）进行文字渲染，MUST NOT 使用浏览器默认衬线字体（如 Times New Roman）。

#### Scenario: SVG 根元素包含字体声明
- **WHEN** 导出流程生成 SVG 时
- **THEN** SVG 根元素 `<svg>` 包含 `style="font-family: system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"` 属性

#### Scenario: 节点文字元素包含字体声明
- **WHEN** 导出流程生成节点文字 `<text>` 元素时
- **THEN** 每个 `<text>` 元素包含 `font-family="system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"` 属性

#### Scenario: 优先级徽章文字包含字体声明
- **WHEN** 节点包含优先级（priority > 0）时生成优先级徽章
- **THEN** 徽章内的 `<text>` 元素同样包含 `font-family` 属性

#### Scenario: 导出 PNG 文字清晰度符合预期
- **WHEN** 用户以 100% 缩放比例导出包含中文和英文的思维导图
- **THEN** 生成的 PNG 中文字边缘清晰，使用无衬线字体，与屏幕渲染效果视觉一致

#### Scenario: 高倍率导出文字更清晰
- **WHEN** 用户以 200% 或更高倍率导出同一份导图
- **THEN** 文字边缘细节更清晰，字体渲染质量随倍率提升而提升，MUST NOT 出现模糊或锯齿
