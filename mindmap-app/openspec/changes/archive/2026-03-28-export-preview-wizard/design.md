## Context

当前导出功能采用单步模式：用户在 ExportDialog 中点击格式按钮后，直接触发 `window.electronAPI.export.saveAs`，系统弹出保存对话框并立即生成文件。用户无法在保存前预览导出效果。

现有架构：
- **Renderer**: `ExportDialog.tsx` 管理导出表单状态和导出触发
- **IPC**: `export-handlers.ts` 处理 `export:saveAs` 等导出请求
- **Service**: `export-service.ts` 和 `export/*.ts` 负责场景构建和渲染

约束条件：
- 保持现有的导出服务层架构（`renderPng`、`renderSvg`、`buildScene`）
- 预览渲染应与最终导出效果尽可能一致
- 不破坏现有 `export:saveAs` API 的向后兼容性

## Goals / Non-Goals

**Goals:**
- 实现三步向导式导出流程（选格式 → 预览调整 → 保存）
- 提供 PNG 缩放比例的实时预览（拖动滑块时更新）
- 显示导出尺寸（像素）和估算文件大小
- 保持预览与导出效果的一致性
- 支持 SVG 和 PNG 两种格式的预览

**Non-Goals:**
- 不实现 Markdown 预览（纯文本格式无需预览）
- 不实现独立预览窗口（预览嵌入对话框内）
- 不修改导出文件的核心渲染逻辑（`renderPng`、`renderSvg`）
- 不实现预览图的平移/缩放交互（静态预览）

## Decisions

### 1. 预览渲染策略：SVG 直接渲染（方案 A）

**决策**: 在 Renderer 中直接使用 SVG 渲染预览，而非通过 IPC 调用主进程生成 PNG 预览。

**理由**:
- SVG 可直接在 React 组件中渲染，无需 IPC 往返
- 实时性好，拖动缩放滑块时可即时更新
- 与导出使用相同的 `renderExportSceneToSvg` 函数，保证一致性
- 文件大小估算可通过 SVG 字符串长度近似计算

**权衡**:
- SVG 预览与最终 PNG 导出效果可能存在字体渲染差异
- 无法精确估算 PNG 文件大小（显示"估算"提示）

### 2. 状态管理：组件内状态 + Store 扩展

**决策**: 在 `ExportDialog` 组件内管理向导状态，同时在 `ui-store` 中扩展持久化状态。

```typescript
// ExportDialog 内部状态
- currentStep: 1 | 2 | 3
- selectedFormat: ExportFormat
- pngScalePercent: number
- savePath: string | null

// ui-store 扩展
- lastExportFormat: ExportFormat  // 记忆上次使用的格式
- lastPngScalePercent: number     // 记忆上次的 PNG 缩放比例
```

**理由**:
- 向导状态是临时的，组件卸载后无需保留
- 用户偏好（上次使用的格式/缩放）应跨会话保留

### 3. 实时预览触发：防抖更新

**决策**: 拖动 PNG 缩放滑块时，使用 200ms 防抖触发预览更新。

**理由**:
- 避免频繁重渲染导致性能问题
- 200ms 是用户体验和性能的平衡点
- 拖动结束后立即更新，无需等待松开鼠标

### 4. IPC 扩展：新增 `export:generatePreview`

**决策**: 新增 IPC API 用于生成预览数据，但不用于实时渲染，仅用于高级功能。

```typescript
export:generatePreview(
  data: MindmapPayload,
  format: ExportFormat,
  options?: ExportScaleOptions
) => Promise<{
  svg: string;           // SVG 字符串（用于预览）
  width: number;         // 导出宽度
  height: number;        // 导出高度
  estimatedSizeKb: number // 估算大小（KB）
}>
```

**理由**:
- 为未来可能的 PNG 预览需求预留能力
- 尺寸计算在主进程进行，与导出逻辑一致

### 5. 三步流程的简化：步骤 3 合并到系统对话框

**决策**: 步骤 2 点击"确认导出"后，直接弹出系统保存对话框，不实现自定义的步骤 3 界面。

**理由**:
- 系统保存对话框提供更一致的文件管理体验
- 减少实现复杂度
- 用户已习惯"预览 → 保存"的标准流程

## Risks / Trade-offs

| 风险 | 描述 | 缓解方案 |
|------|------|----------|
| **SVG 与 PNG 效果差异** | 预览使用 SVG，导出是 PNG，字体渲染可能不同 | 在预览区显示提示"预览效果可能与最终导出略有差异" |
| **大思维导图性能问题** | 复杂思维导图的 SVG 渲染可能卡顿 | 限制预览区最大尺寸，使用 CSS `transform: scale` 缩放 |
| **文件大小估算不准** | SVG 大小与 PNG 大小无直接关系 | 显示"估算"提示，或仅显示尺寸不显示大小 |
| **状态同步问题** | 预览时用户修改思维导图，预览过时 | 监听 store 变化，检测节点变化后提示"预览已过时，点击刷新" |
| **防抖延迟感知** | 200ms 防抖可能导致更新延迟感 | 可考虑降低到 100ms，或添加加载指示器 |

## Migration Plan

本变更是纯前端功能增强，不涉及数据迁移或破坏性变更。

部署步骤：
1. 新增类型定义（`electron/shared/types/index.ts`）
2. 新增 IPC handler（`export-handlers.ts`）
3. 重构 `ExportDialog.tsx` 为向导模式
4. 扩展 `ui-store.ts` 状态
5. 新增测试用例

回滚策略：
- 保留原 `ExportDialog` 代码作为 fallback
- 如发现问题，可快速回退到单步导出模式

## Open Questions

1. **预览区尺寸**: 固定尺寸还是自适应？当前设计采用固定最大高度（300px），宽度自适应对话框。
2. **缩放范围提示**: 是否在滑块旁显示当前缩放值的实时提示？当前设计采用滑块上方显示数值。
3. **文件名默认值**: 是否基于文档标题自动生成？当前设计采用 `mindmap.png` 默认值，由系统对话框处理。
