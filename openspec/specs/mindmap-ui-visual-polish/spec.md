# mindmap-ui-visual-polish Specification

## Purpose
TBD - created by archiving change polish-ui-tech-glassmorphism. Update Purpose after archive.
## Requirements
### Requirement: Technology-Inspired Visual Language
The application SHALL present a unified technology-inspired visual style across the main shell, sidebar, toolbar, and dialogs while preserving existing information hierarchy.

#### Scenario: Core surfaces render with consistent style primitives
- **WHEN** the application renders its primary UI containers
- **THEN** those containers MUST use the shared visual token system for surface, typography, border, and elevation values

### Requirement: Restrained Color Palette
The UI styling system SHALL enforce a restrained palette with neutral foundation tones and a minimal accent set to prevent color clutter.

#### Scenario: Accent usage stays constrained
- **WHEN** interactive controls and highlights are rendered
- **THEN** the UI MUST use only the configured neutral palette plus limited accent tokens defined by the shared visual system

### Requirement: Glassmorphism and Rounded Interactive Controls
Primary、secondary、ghost、icon 以及对话框与侧栏中的按钮控件 SHALL 统一使用毛玻璃风格与圆角，并且背景 MUST 为半透明；系统 MUST NOT 在常规按钮中使用不透明实色作为默认背景。  
侧栏节点编辑输入控件 SHALL 与该视觉语言一致，使用半透明背景、玻璃态模糊与统一边框层级，不得出现与主题脱节的实色输入底。

#### Scenario: 全量按钮样式统一为半透明毛玻璃
- **WHEN** 用户浏览工具栏、侧栏、弹窗和画布控制区域中的按钮与侧栏节点编辑输入区域
- **THEN** 所有按钮与编辑输入控件均呈现半透明背景、毛玻璃模糊、细边框与统一圆角

### Requirement: Behavioral Invariance During Visual Refresh
Visual restyling SHALL NOT alter existing functional behavior.

#### Scenario: Existing workflows remain unchanged
- **WHEN** users perform create, edit, save, open, and export operations
- **THEN** command handling, data persistence, keyboard shortcuts, and output behavior MUST remain functionally identical to pre-refresh behavior

### Requirement: Responsive Visual Consistency
The refreshed style SHALL remain usable and visually coherent on both desktop and mobile viewport sizes supported by the application.

#### Scenario: Visual system adapts across viewport sizes
- **WHEN** the viewport switches between desktop and mobile breakpoints
- **THEN** controls and containers MUST preserve readability, touch/click target clarity, and consistent token-driven styling

### Requirement: Button State Consistency Under Glassmorphism
按钮在 `hover`、`active`、`focus-visible`、`disabled` 状态 SHALL 使用统一的毛玻璃状态策略，并在各变体间保持一致的交互反馈层级。

#### Scenario: 用户交互触发按钮状态变化
- **WHEN** 用户悬停、按下、键盘聚焦或遇到禁用按钮
- **THEN** 按钮状态样式按统一规则变化，且不脱离半透明毛玻璃视觉语言

### Requirement: 菜单与侧栏文本 SHALL 采用分层字体色
UI SHALL 对菜单与侧栏文本使用分层字体色规范，至少包含主文本、次文本、禁用文本与强调文本四类语义层级，且不同层级在同一主题下必须保持可区分。

#### Scenario: 同一界面展示多种文本状态
- **WHEN** 菜单与侧栏同时出现普通项、说明项、禁用项与当前激活项
- **THEN** 各项文字颜色符合语义层级并可明显区分

### Requirement: 主题字体色 MUST 避免刺眼并保持可读
菜单与侧栏字体色 MUST 满足视觉舒适度与可读性要求，不得出现高亮刺眼或低对比难读的表现；若主题主色过于饱和，系统 MUST 自动降低饱和度或调整亮度以满足要求。

#### Scenario: 高饱和主题下的侧栏文本渲染
- **WHEN** 用户启用高饱和主题并打开侧栏
- **THEN** 侧栏文本颜色不会产生刺眼感，且在常规阅读距离下可清晰识别

### Requirement: 缩放控件区域 SHALL 不显示静态比例文本
系统在画布缩放控件区域 SHALL 移除无交互价值的静态比例文本（例如固定 `1:1`），以保持界面简洁，并且 MUST 保留原有缩放交互能力。

#### Scenario: 用户查看画布缩放控件
- **WHEN** 用户进入编辑界面并观察缩放控件区域
- **THEN** 界面不显示静态 `1:1` 文本，但仍可执行缩放相关操作

