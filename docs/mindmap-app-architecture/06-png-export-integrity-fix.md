# PNG 导出完整性与清晰度探索归档

**归档日期**: `2026-04-12`  
**性质**: 探索记录，不代表问题已彻底修复  
**关联规范**:

- `openspec/specs/mindmap-png-export/spec.md`
- `openspec/changes/archive/2026-03-31-fix-png-export-font-blur/`
- `openspec/changes/archive/2026-03-31-fix-png-export-blur-and-truncation/`

## 1. 背景

当前项目中，PNG 导出长期存在两类用户感知很强的问题：

1. 导出图片偶发不完整，表现为右侧、底部或大图场景下的截断
2. 某些修复尝试会让 PNG 中的节点文字变糊，尤其在高倍率导出或放大查看时更明显

本次工作不是实现修复，而是重新审视代码、测试、OpenSpec 历史方案和当前实际调用链，判断“为什么会在完整性与清晰度之间来回摇摆”。

## 2. 本次探索后的结论

当前问题更像是**多条 PNG 导出路径叠加后的结构性问题**，而不是单个函数的小 bug。

核心判断如下：

1. **截断风险仍真实存在**
   `fitSceneForRaster` 中“内容已越过右边/下边界时如何扩画布”的计算仍有漏洞，在特定正坐标溢出场景下可能判断到了问题，但没有真正把画布扩出去。

2. **模糊问题很大概率来自频繁降级到 fallback**
   一旦 Electron 光栅化路径未通过验证，流程会回退到软件渲染；而 fallback 文字仍是伪字模方案，天然不可能和真实字体渲染一样清晰。

3. **分块捕获里存在主动制造模糊的补偿逻辑**
   当边缘瓦片尺寸小于预期时，当前逻辑会直接 `resize` 拉伸补齐，而不是明确判失败或重抓。这会把局部瓦片直接插值放大，造成局部文字和线条发糊。

4. **生产路径、兼容路径、测试路径并不完全一致**
   实际 IPC 导出已经走 `export-orchestrator -> png-renderer`，但大量测试仍直接测试 `export-service` 兼容层；这会掩盖真实生产链路的问题。

## 3. 关键思考过程

### 3.1 先确认真实入口，而不是只看旧实现

从仓库结构和架构文档看，PNG 导出的主入口已经不是单独的 `export-service`，而是：

```text
export-handlers
  -> export-orchestrator
    -> buildScene
      -> renderPng
        -> tryRenderExportPngViaElectronSvg
          -> 成功则返回 Electron 光栅化结果
          -> 失败则 fallback 到软件渲染
```

对应代码位置：

- `mindmap-app/electron/ipc/export-handlers.ts`
- `mindmap-app/electron/services/export-orchestrator.ts`
- `mindmap-app/electron/services/export/scene-builder.ts`
- `mindmap-app/electron/services/export/png-renderer.ts`
- `mindmap-app/electron/services/export-service.ts`

这一步很关键，因为如果继续只盯着 `export-service.ts`，会误以为文档里描述的修复逻辑就是当前用户真正走到的逻辑。

### 3.2 再对照文档和规范，发现“纸面修复”和“实际运行”存在偏移

旧文档把问题描述成“已完成修复并已验证通过”，但代码和测试现状并不支持这么乐观的结论：

- `openspec/specs/mindmap-png-export/spec.md` 中要求 PNG 导出既要完整，又要随着倍率提升而更清晰
- `export/png-renderer.ts` 中确实有“多级验证链”的设计
- 但真实测试结果显示，很多 case 都直接走了 fallback，而不是 Electron 真正字体渲染路径

这说明：

1. 规范方向是对的
2. 部分实现也在朝这个方向走
3. 但当前验证体系还不足以证明“生产路径已经稳定满足这些要求”

### 3.3 然后回到“为什么会截断”

最值得警惕的一处在 `fitSceneForRaster`。

当前逻辑会先判断：

```ts
const hasOverflowCoords = contentBounds.right > scaledScene.width
  || contentBounds.bottom > scaledScene.height;
```

这说明它已经知道内容越界了。

但后面计算需要的新宽高时，使用的是：

```ts
const requiredWidth = Math.ceil(contentBounds.right - contentBounds.left);
const requiredHeight = Math.ceil(contentBounds.bottom - contentBounds.top);
const newWidth = Math.max(scaledScene.width, requiredWidth);
const newHeight = Math.max(scaledScene.height, requiredHeight);
```

问题在于：  
如果内容整体都在正坐标中，只是右侧或底部轻微溢出，那么：

```text
left = 100
right = 1100
canvasWidth = 1000

requiredWidth = right - left = 1000
newWidth = max(1000, 1000) = 1000
```

也就是说：

- 它识别出了“右边越界”
- 但新画布宽度并没有比旧画布更大
- 结果右边仍然可能被截

这就是本次探索中最像“截断主因”的逻辑漏洞。

### 3.4 再看“为什么一修完整，字体又容易糊”

这里不是单因，而是三层叠加：

#### 第一层：fallback 本身不是高保真字体渲染

`renderSceneToPngFallback` 中的文字绘制最终还是走 `drawPseudoGlyph`。  
虽然已经从早期低分辨率字模提升到 `20x28` 网格并增加了亚像素采样，但本质上仍然是“伪字模”。

这意味着：

- fallback 可以兜底“有图”
- 但很难兜底“字体像真实渲染一样清晰”

#### 第二层：当前测试大量通过，其实是在证明 fallback 能出图

本次实际运行了：

```bash
npm test -- tests/export/export-service.test.ts tests/export/png-export-integrity.test.ts
```

结果：

- `39/39` 测试全部通过
- 但日志显示相关 PNG case 基本都输出了 `Falling back to software rendering`

这条证据非常关键。  
它说明现有测试主要证明的是：

- PNG 能生成
- 尺寸大体合理
- 图片不是空白

但并没有证明：

- Electron 真正字体渲染路径稳定可用
- 用户导出的 PNG 一定不是 fallback 产物
- 高倍率导出时清晰度真的随倍率提升

#### 第三层：分块捕获的异常补偿策略本身会放大模糊

在 `tryRenderPngViaElectronSvg` 的 tiled capture 流程里：

- 如果瓦片比预期大，会裁剪
- 如果瓦片比预期小，当前逻辑会直接 `resize`

也就是：

```text
tile smaller than expected
  -> resize to expected size
  -> stitch into final image
```

这个策略对“保证尺寸能拼起来”有帮助，但它会带来明显副作用：

- 边缘瓦片文字被插值放大
- 局部线条和边框发虚
- 用户感知上就像“图完整了，但字糊了”

所以这里很可能就是“完整性修复反而伤害清晰度”的直接机械来源。

### 3.5 最后再看一个容易被忽略的点：scale 处理存在链路分叉

生产路径中：

- `buildScene` 已经会把 `scale` 作用到场景尺寸、节点大小、字体大小
- 但 `export-orchestrator.ts` 调 `renderPng(buildScene(...))` 时，没有继续把倍率作为第二个参数传下去

而兼容层 `export-service.ts` 自己的 `exportToPNG`，又会单独提取 `scale` 再往下传。

这带来两个后果：

1. 不同入口对 `scale` 的处理不完全一致
2. 旧测试直接测兼容层时，未必能暴露生产链路里真实的倍率行为

这也是为什么“看代码像支持高倍率更清晰”和“用户实际体感不一定更清晰”之间会出现落差。

## 4. 关键证据汇总

### 4.1 真实生产链路

- `mindmap-app/electron/ipc/export-handlers.ts`
- `mindmap-app/electron/services/export-orchestrator.ts`
- `mindmap-app/electron/services/export/png-renderer.ts`

说明 PNG 主流程已经走 orchestrator，而不是直接由 handler 调旧兼容实现。

### 4.2 测试主要覆盖旧兼容层

- `mindmap-app/tests/export/export-service.test.ts`
- `mindmap-app/tests/export/png-export-integrity.test.ts`

大量测试直接 import：

```ts
from '../../electron/services/export-service'
```

这会导致测试对真实生产链路的覆盖不足。

### 4.3 IPC 测试没有验证真正渲染行为

`mindmap-app/tests/ipc/export-handlers.test.ts` 中对 `export-orchestrator` 做了整体 mock。  
因此这些测试只能验证：

- 参数是否传递
- handler 是否调用对了服务

但不能验证：

- 最终是否走 Electron 光栅化
- 是否频繁 fallback
- 是否出现分块错位或字体模糊

### 4.4 实测结果显示当前测试环境下 PNG 基本都走 fallback

本次在 `mindmap-app/` 下运行：

```bash
npm test -- tests/export/export-service.test.ts tests/export/png-export-integrity.test.ts
```

结果：

- `2` 个测试文件通过
- `39` 个测试用例通过
- 日志中相关 PNG case 基本都出现 `Falling back to software rendering`

这意味着当前绿测并不等价于“用户一定拿到清晰的 Electron 渲染 PNG”。

## 5. 当前最可信的问题排序

按可信度从高到低排序：

1. **右/下边界扩容公式仍可能导致截断**
2. **频繁 fallback 导致字体清晰度整体偏低**
3. **边缘瓦片 `resize` 补齐会制造局部模糊**
4. **生产链路与测试链路分叉，放大了误判风险**
5. **倍率相关行为在不同入口之间并不完全一致**

## 6. 对“为什么会来回摇摆”的一句话解释

可以把当前现象总结成一句话：

> 只要 Electron 路径不够稳定，系统就会偏向 fallback 来保证“有图”；而 fallback 又天然比真实字体渲染更糊，于是问题就会在“导出完整”与“字体清晰”之间反复拉扯。

## 7. 后续建议

本节只记录探索后建议，不表示已实施。

### 7.1 先修复逻辑正确性，再谈视觉质量

优先级最高的是重新审视 `fitSceneForRaster` 的扩容公式，确保：

- 右侧溢出时新宽度真正覆盖到 `contentBounds.right`
- 底部溢出时新高度真正覆盖到 `contentBounds.bottom`
- 偏移与扩画布逻辑统一使用“绝对画布坐标”思路，而不是只用 `right - left`

### 7.2 不要把“瓦片过小”静默转成拉伸补偿

对于边缘瓦片尺寸异常，更稳妥的方向通常是：

- 记录清晰日志
- 判定当前捕获无效
- 重抓、降级、或整体失败返回更明确原因

而不是直接 `resize` 后继续拼接。

### 7.3 增加真正覆盖生产路径的测试

至少应补三类测试：

1. `export-orchestrator -> png-renderer` 的集成测试
2. 明确断言“本次走了 Electron 路径还是 fallback 路径”的测试
3. 针对右边界/下边界轻微溢出的定向测试

### 7.4 将“路径命中情况”变成显式观测项

建议在日志中明确区分：

- 单帧捕获成功
- 分块捕获成功
- 因尺寸验证失败 fallback
- 因内容验证失败 fallback
- 因异常捕获失败 fallback

否则现场排查时只能看到“图糊了”，很难知道究竟是哪一步触发了降级。

## 8. 本次探索的边界

本次仅完成：

- 架构与调用链梳理
- 代码级原因分析
- 规范与历史方案对照
- 现有测试的真实含义校验

本次**没有**完成：

- 代码修复
- 新增自动化测试
- 视觉回归对比
- 用户环境下的手工导出复现采样

因此，这份文档的定位应是：

> 为下一轮 PNG 导出修复提供更可靠的问题地图，而不是作为“问题已解决”的结案说明。

## 9. 参考资料

- Electron `webContents` API  
  https://www.electronjs.org/docs/latest/api/web-contents

- Electron Offscreen Rendering  
  https://www.electronjs.org/docs/latest/tutorial/offscreen-rendering
