## ADDED Requirements

### Requirement: 缩放控件区域 SHALL 不显示静态比例文本
系统在画布缩放控件区域 SHALL 移除无交互价值的静态比例文本（例如固定 `1:1`），以保持界面简洁，并且 MUST 保留原有缩放交互能力。

#### Scenario: 用户查看画布缩放控件
- **WHEN** 用户进入编辑界面并观察缩放控件区域
- **THEN** 界面不显示静态 `1:1` 文本，但仍可执行缩放相关操作

## MODIFIED Requirements

### Requirement: Glassmorphism and Rounded Interactive Controls
Primary、secondary、ghost、icon 以及对话框与侧栏中的按钮控件 SHALL 统一使用毛玻璃风格与圆角，并且背景 MUST 为半透明；系统 MUST NOT 在常规按钮中使用不透明实色作为默认背景。  
侧栏节点编辑输入控件 SHALL 与该视觉语言一致，使用半透明背景、玻璃态模糊与统一边框层级，不得出现与主题脱节的实色输入底。

#### Scenario: 全量按钮样式统一为半透明毛玻璃
- **WHEN** 用户浏览工具栏、侧栏、弹窗和画布控制区域中的按钮与侧栏节点编辑输入区域
- **THEN** 所有按钮与编辑输入控件均呈现半透明背景、毛玻璃模糊、细边框与统一圆角
