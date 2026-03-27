## 1. Theme Data Flow

- [x] 1.1 在 `MindMapCanvas` 中基于 `metadata.theme` 解析 `activeTheme`，并统一作为渲染输入。
- [x] 1.2 将画布背景与网格颜色改为读取 `activeTheme.canvas`，移除固定颜色依赖。
- [x] 1.3 将连线颜色/粗细/虚实改为读取 `activeTheme.connection` 并传递给 `ConnectionCanvas`。

## 2. Node Style Resolution

- [x] 2.1 新增节点样式解析逻辑，按 root/branch/leaf 选择主题默认样式。
- [x] 2.2 在 `NodeRenderer` 中实现字段级样式合并（`node.style` 显式值覆盖主题默认值）。
- [x] 2.3 确保主题切换不改写节点原始 `style` 数据，仅影响渲染结果。

## 3. Theme Persistence And Fallback

- [x] 3.1 保持主题选择写入 `metadata.theme` 并在文档保存/加载链路中透传该字段。
- [x] 3.2 统一未知主题回退到 `default`，保证文档可打开且 UI 选中态一致。
- [x] 3.3 校验默认主题与非法主题值在新建文档、打开文档场景下行为一致。

## 4. Tests And Verification

- [x] 4.1 补充/更新 `themes` 与 `MindMapCanvas` 测试，覆盖主题切换即时生效和样式优先级。
- [x] 4.2 增加未知主题回退与保存重开一致性的测试用例。
- [x] 4.3 运行相关测试并修正断言，确保主题能力无回归后再进入实现阶段。
