# 改动影响半径图

用于在改动前快速评估“会波及到哪里”，避免只看当前文件做局部修补。

主文件：

- `01-change-impact-radius-map.md`

建议使用方式：

1. 先在矩阵里定位你的改动入口（store、hook、component、ipc、service、types）
2. 按 R1/R2/R3 半径检查受影响区域
3. 按文档给出的测试建议做最小回归

