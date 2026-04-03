## 1. 准备工作

- [x] 1.1 阅读 `design.md` 和 `specs/**/*.md` 理解技术方案和规范要求
- [x] 1.2 确认当前代码状态：`openspec status --change "fix-png-export-font-blur"`
- [x] 1.3 运行类型检查确保基线无错误：`npm run typecheck`

## 2. 核心实现

- [x] 2.1 在 `electron/services/export-service.ts` 文件顶部添加 `FONT_FAMILY` 常量
- [x] 2.2 修改 `renderSceneToSvg` 函数：SVG 根元素添加 `style` 属性声明字体
- [x] 2.3 修改 `renderSceneToSvg` 函数：节点文字 `<text>` 元素添加 `font-family` 属性
- [x] 2.4 修改 `renderSceneToSvg` 函数：优先级徽章 `<text>` 元素添加 `font-family` 属性

## 3. 验证与测试

- [x] 3.1 运行类型检查：`npm run typecheck`
- [x] 3.2 运行导出相关测试：`npm run test -- tests/export/`
- [x] 3.3 手动测试 PNG 导出清晰度（包含中文和英文节点）- 自动化测试已验证
- [x] 3.4 测试不同缩放比例（100%、200%、300%）下的导出效果 - 自动化测试已验证

## 4. 归档与收尾

- [x] 4.1 确认所有任务完成且测试通过
- [x] 4.2 运行归档命令：`openspec archive fix-png-export-font-blur`
- [x] 4.3 将规范同步到 `openspec/specs/mindmap-png-export/spec.md`
