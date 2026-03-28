## ADDED Requirements

### Requirement: Save-family test coverage MUST exercise real file-flow safeguards
文件保存相关测试 MUST 覆盖保存、另存为和无效输入场景中的关键保护行为，确保无效路径、无效载荷或失败分支不会破坏当前会话状态。

#### Scenario: 保存链路遇到无效输入
- **WHEN** 测试向保存或另存为链路提供非法路径、非法载荷或异常返回值
- **THEN** 操作以受控方式失败，且当前文档状态与活动会话保持不变

### Requirement: Auto-save behavior SHALL be directly verified
自动保存逻辑 SHALL 通过直接测试验证其定时触发、文本规范化与失败兜底行为，而不是仅依赖 App 集成测试间接覆盖。

#### Scenario: 自动保存触发成功
- **WHEN** 定时自动保存触发且当前存在有效文件路径与元数据
- **THEN** 系统使用规范化后的节点内容执行保存，并保持应用状态一致

#### Scenario: 自动保存触发失败
- **WHEN** 自动保存过程中的持久化步骤失败
- **THEN** 系统记录受控失败结果且不会导致应用崩溃或清空当前编辑状态
