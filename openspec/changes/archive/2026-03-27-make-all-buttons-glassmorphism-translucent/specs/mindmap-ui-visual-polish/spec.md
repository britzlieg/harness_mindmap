## MODIFIED Requirements

### Requirement: Glassmorphism and Rounded Interactive Controls
Primary、secondary、ghost、icon 以及对话框与侧栏中的按钮控件 SHALL 统一使用毛玻璃风格与圆角，并且背景 MUST 为半透明；系统 MUST NOT 在常规按钮中使用不透明实色作为默认背景。

#### Scenario: 全量按钮样式统一为半透明毛玻璃
- **WHEN** 用户浏览工具栏、侧栏、弹窗和画布控制区域中的按钮
- **THEN** 所有按钮均呈现半透明背景、毛玻璃模糊、细边框与统一圆角

## ADDED Requirements

### Requirement: Button State Consistency Under Glassmorphism
按钮在 `hover`、`active`、`focus-visible`、`disabled` 状态 SHALL 使用统一的毛玻璃状态策略，并在各变体间保持一致的交互反馈层级。

#### Scenario: 用户交互触发按钮状态变化
- **WHEN** 用户悬停、按下、键盘聚焦或遇到禁用按钮
- **THEN** 按钮状态样式按统一规则变化，且不脱离半透明毛玻璃视觉语言
