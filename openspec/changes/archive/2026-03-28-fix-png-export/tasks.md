## 1. 内容边界计算修复

- [x] 1.1 在 `export-service.ts` 中审查 `extendContentBoundsByPoint` 和 `extendContentBoundsByRect` 函数，确保所有节点和连线控制点都被正确记录
- [x] 1.2 修复 `buildRenderScene` 中的边界计算逻辑，确保在内容边界为无穷大时使用合理的 fallback 值而不是固定默认尺寸
- [x] 1.3 在 `fitSceneForRaster` 中增加边界验证，确保缩放后的场景边界仍然覆盖所有内容
- [x] 1.4 添加单元测试验证多节点场景下的边界计算正确性

## 2. Electron 分块捕获增强

- [x] 2.1 审查 `tryRenderPngViaElectronSvg` 中的分块捕获逻辑，确认容器位移和瓦片拼接的坐标计算
- [x] 2.2 在 `copyBgraTileToRgba` 中增加瓦片尺寸验证，确保源瓦片和目标区域的尺寸匹配
- [x] 2.3 修复边缘瓦片处理逻辑，确保最后一行/列的瓦片正确裁剪或填充
- [x] 2.4 添加大尺寸场景（超过 `MAX_PNG_CAPTURE_TILE_EDGE`）的分块捕获测试

## 3. 尺寸验证和 Fallback 链强化

- [x] 3.1 在 `renderPng` 函数中增加多级验证：Electron 捕获后验证、fallback 后验证
- [x] 3.2 增加内容完整性检查：检测空白或接近空白的 PNG 输出
- [x] 3.3 改进 fallback 错误处理，确保在 fallback 也失败时抛出明确的错误信息
- [x] 3.4 添加验证失败触发 fallback 的集成测试

## 4. 测试覆盖和跨平台验证

- [x] 4.1 在 `mindmap-app/tests/export/` 中创建 `png-export-integrity.test.ts` 测试文件
- [x] 4.2 添加测试场景：100+ 节点的导图导出完整性验证
- [x] 4.3 添加测试场景：导出后立即验证 PNG 尺寸和内容边界
- [x] 4.4 在 Windows 上手动验证 PNG 导出功能
- [x] 4.5 在 macOS 和 Linux 上进行跨平台验证（如条件允许）

## 5. 文档和回归检查

- [x] 5.1 更新 `openspec/specs/mindmap-png-export/spec.md` 归档修复后的完整规范
- [x] 5.2 检查是否有其他导出相关测试因修改而需要更新
- [x] 5.3 运行完整的 typecheck 和 build 验证
- [x] 5.4 记录已知的边缘情况和后续优化建议
