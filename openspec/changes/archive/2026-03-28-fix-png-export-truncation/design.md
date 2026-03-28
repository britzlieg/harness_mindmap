## Context

大型思维导图（5 层 × 5 子节点 = 781 节点）导出 PNG 时底部节点被截断，但同一场景 SVG 导出正常。问题限定在 PNG 渲染管线。

### 问题链路

```
buildRenderScene() → scene (1120 × 20340)
  ↓
scaleRenderScene(scene, 1.0) → 不变
  ↓
fitSceneForRaster() → scale = 12000/20340 ≈ 0.59
  → fitted scene: 662 × 12000
  → 每个节点从 120×36 缩小到 71×21
  ↓
renderExportSceneToSvg() → SVG (正确，用户验证)
  ↓
tryRenderExportPngViaElectronSvg()
  ├─ Path A: BrowserWindow(662, 12000) + capturePage()
  │   极端高窄窗口，Chromium 合成层可能有高度限制
  │   尺寸校验严格相等 (===)，不匹配则降级
  ├─ Path B: tiled capture (2048px 分块)
  │   DPR 影响 capturePage 返回尺寸
  │   resize 到期望尺寸可能拉伸内容
  ├─ Path C: nativeImage fallback
  └─ renderExportSceneToPngFallback() → 像素级渲染
  ↓
renderPng() → 直接返回 Buffer，无输出尺寸校验
```

### 关键缺陷

1. **renderPng 无输出尺寸校验**：返回的 PNG 可能尺寸与 fittedScene 不一致，但被直接写入文件。
2. **tiled capture tile 校验不完整**：capturePage 返回的 tile 若受 DPR 影响尺寸不匹配，resize 会拉伸内容。
3. **极端场景下的缩放**：`fitSceneForRaster` 将场景压到极端高窄比例（如 28×12000），节点矩形小到无法辨认。

## Goals / Non-Goals

**Goals:**
- 确保 PNG 导出在大型场景下不发生内容截断
- 增加渲染管线的输出校验与降级健壮性
- 保持现有导出链路架构不变（renderer → IPC → orchestrator → scene-builder → png-renderer）

**Non-Goals:**
- 不改变场景构建逻辑（bounds 计算、布局算法）
- 不改变 IPC 协议或 shared 类型
- 不引入新的外部依赖
- 不解决节点宽度固定 120px 导致的文本裁断问题（那是另一个独立问题）

## Decisions

### Decision 1: 在 renderPng 增加输出尺寸校验

**选择**：`renderPng` 返回前用 `readPngDimensions` 校验实际 PNG 尺寸是否与 `fittedScene.width/height` 匹配。不匹配时降级到 `renderExportSceneToPngFallback`。

**理由**：这是最低成本、最高收益的修复。renderPng 已有 `readPngDimensions` 工具函数，只需增加一次校验调用。即使上游 capture 路径出了问题，fallback 也能兜底。

**备选方案**：
- 修改 BrowserWindow capture 逻辑（更复杂、平台相关）
- 移除 fitSceneForRaster（会破坏大图导出能力）

### Decision 2: 增加 tiled capture 的 tile 尺寸校验

**选择**：在 tiled capture 循环中，capturePage 后立即校验 tile 尺寸。若尺寸不匹配，记录警告并尝试通过 nativeImage.createFromDataURL 重新获取正确尺寸的 tile。

**理由**：DPR 影响 capturePage 返回的尺寸是已知的 Electron 行为。当前代码有 resize 逻辑，但 resize 会拉伸内容。更好的做法是用 nativeImage 获取正确尺寸的 tile 数据。

### Decision 3: 不修改 fitSceneForRaster 的缩放策略

**选择**：保持现有的 `MAX_RASTER_EXPORT_EDGE = 12000` 上限不变。

**理由**：提高上限会增加内存消耗和渲染时间。当前上限对绝大多数场景足够。真正的保护措施是 Decision 1 的输出校验——即使缩放后有问题，也能降级到 fallback。

### Decision 4: 增加大型场景回归测试

**选择**：在 `tests/export/export-service.test.ts` 中增加测试用例：
- 5 层 × 5 子节点的 mindmap 布局导出
- 验证底部区域有非背景像素（节点未被裁切）
- 验证输出 PNG 尺寸与预期一致

**理由**：当前测试最大只有 180 节点链式布局，未覆盖多层树形场景。

## Risks / Trade-offs

- **[Risk]** fallback 渲染器质量低（伪字形文字） → **Mitigation**：仅在所有 Electron 路径失败后才降级，大多数场景不会触发。
- **[Risk]** 输出尺寸校验增加少量延迟 → **Mitigation**：readPngDimensions 只读 PNG 头部 24 字节，开销可忽略。
- **[Trade-off]** 不提高 MAX_RASTER_EXPORT_EDGE → 大图节点仍然很小，但至少不截断。
