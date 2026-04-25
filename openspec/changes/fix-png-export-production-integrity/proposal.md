## Why

当前 PNG 导出在真实生产链路中仍存在两类高感知问题：部分场景会在右侧或底部发生截断，另一些场景虽然能导出完整图片，但会因为频繁降级到 fallback 或瓦片补偿拉伸而出现文字与线条发糊。现有测试主要覆盖兼容层，尚不足以证明 `export-orchestrator -> png-renderer` 这条真实导出路径已经稳定满足完整性与清晰度要求，因此需要补一轮面向生产链路的规范与修复提案。

## What Changes

- 修正 PNG 导出边界扩容逻辑，确保内容在正坐标轻微溢出右侧或底部时，画布宽高会按绝对边界正确扩展，避免“识别到越界但未真正扩画布”的截断。
- 调整 Electron 分块捕获的边缘瓦片异常处理策略，不再将尺寸不足的瓦片静默 `resize` 后继续拼接，改为明确验证、记录原因，并触发重抓、降级或失败返回中的受控路径。
- 为 PNG 导出生产路径增加显式路径命中与降级原因观测，区分单帧捕获、分块捕获、尺寸校验失败、内容校验失败与异常 fallback 等关键结果。
- 补齐覆盖 `export-orchestrator -> png-renderer` 真实链路的测试，新增针对右/下边界溢出、路径命中、fallback 触发与倍率一致性的验证。
- 对齐生产链路与兼容层的 `scale` 处理语义，确保导出倍率在不同入口下的行为一致，不再因链路分叉导致“代码看似支持高倍率但真实导出不稳定”的落差。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `mindmap-png-export`: 收紧 PNG 导出在真实生产链路中的完整性、清晰度、分块捕获校验、降级可观测性与倍率一致性要求。

## Impact

- 受影响代码主要位于 `mindmap-app/electron/services/export/`、`mindmap-app/electron/services/export-orchestrator.ts`、`mindmap-app/electron/services/export-service.ts`、`mindmap-app/electron/ipc/export-handlers.ts` 与 `mindmap-app/tests/export/`、`mindmap-app/tests/ipc/`。
- 不新增外部依赖，主要影响 Electron 导出链路、共享导出协议中的观测字段，以及 PNG 导出相关测试与日志。
