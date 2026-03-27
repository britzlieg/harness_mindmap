## Why

当前 PNG 导出在节点数量很大（例如同层级 100 个）时，会出现导出结果只包含部分节点的截断现象，无法完整反映画布中的实际内容。该问题直接影响导出可用性与结果可信度，需要尽快改为“按内容边界自适应尺寸”的导出策略。

## What Changes

- 将 PNG 导出尺寸计算从固定基准尺寸改为基于导图实际边界动态计算，边界至少覆盖最上、最左、最下、最右四个方向的极值点。
- 导出时先保证“完整内容入框”，再应用用户设置的导出比例（50%-400%）生成最终像素尺寸，避免“节点多了只缩放、不保证完整性”的行为。
- 调整导出边界计算以覆盖节点矩形与连线曲线控制点，避免边缘节点或连线被裁切。
- 保持现有导出流程与会话状态语义不变（导出后仍在当前编辑上下文）。
- 为大规模节点场景补充回归测试，验证导出结果包含所有可见节点。

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `mindmap-png-export`: 更新 PNG 导出边界与尺寸计算要求，确保在高节点密度场景下也能完整导出全部可见节点，并按用户比例输出。

## Impact

- Affected code:
  - `mindmap-app/electron/services/export-service.ts`
  - `mindmap-app/electron/ipc/export-handlers.ts`（若需参数语义补充）
  - `mindmap-app/tests/export/export-service.test.ts`
  - `mindmap-app/tests/ipc/export-handlers.test.ts`（如涉及参数传递行为）
- No breaking API changes expected for renderer callers; existing PNG scale input contract remains compatible.
- Risk focus: 超大图导出性能、极端尺寸下位图渲染稳定性、与当前画布视觉一致性。
