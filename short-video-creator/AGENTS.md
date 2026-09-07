# UI 设计指南

> **设计类型**: App 设计（应用架构设计）
> **确认检查**: 本指南适用于可交互的应用/网站/工具。

> ℹ️ Section 1 为设计意图与决策上下文。Code agent 实现时以 Section 2 及之后的具体参数为准。

## 1. Design Archetype (设计原型)

### 1.1 内容理解

- **目标用户**: 内容运营/创作者，高频筛选爆款素材、复盘生成效果、指导选题
- **核心目的**: 高效检索 + 数据驱动决策 + 全链路资产归档
- **情绪基调**: 专注掌控 / 避免信息过载与视觉疲劳

### 1.2 设计方向

- **Design Style**: Grid 网格 — 高密度数据工作台需结构化秩序感，等宽数字对齐+冷色克制底色突出数据本身
- **Application Type**: Admin/SaaS 工作台 — 左侧导航+主内容区紧凑布局
- **Aesthetic Direction**: 冷静理性的数据编辑器美学，让"爆款信号"成为唯一视觉焦点

## 2. Color System (色彩系统)

**色彩关系**: 深靛蓝主色 + 极浅冷灰底 + 近黑文字 + 琥珀橙作为爆款信号色
**配色设计理由**: 运营工作台需长时间注视不疲劳，低饱和冷灰底降低视觉噪音；深靛蓝传递专业可信感
**主色推导**: Primary 用于搜索/筛选/返回等核心操作；爆款标识独立使用琥珀橙，不与主交互色混淆
**使用比例**: 70% 中性底/边框 · 20% 卡片白 · 8% Primary 交互 · 2% 琥珀橙爆款信号

### 2.1 主题颜色

| Token                | HSL 值              | 说明                               |
| -------------------- | ------------------- | ---------------------------------- |
| `background`         | hsl(220 20% 97%)    | 冷灰蓝页面底色，降低长时用眼疲劳   |
| `card`               | hsl(0 0% 100%)      | 卡片/容器纯白背景                  |
| `foreground`         | hsl(222 30% 12%)    | 主文字，近黑带冷色倾向             |
| `muted-foreground`   | hsl(220 15% 50%)    | 次要文字/标签                      |
| `primary`            | hsl(225 65% 45%)    | 深靛蓝主交互色                     |
| `primary-foreground` | hsl(0 0% 100%)      | 主按钮文字                         |
| `accent`             | hsl(225 30% 95%)    | Ghost 按钮 hover/下拉 focus 背景   |
| `accent-foreground`  | hsl(225 65% 35%)    | accent 上的文字                    |
| `border`             | hsl(220 18% 90%)    | 分割线与卡片边框                   |

### 2.2 导航区配色

- **基调关系**: 复用主配色系统，侧边栏背景取 `background` 同色系略深 hsl(220 20% 95%)
- **关键状态**: 激活态使用 `bg-accent` + `text-primary`，hover 态 `bg-accent/60`
- **边界与背景**: 右侧 1px `border` 分隔，非透明背景

### 2.3 语义颜色

| 用途           | HSL 值              | 衍生说明                           |
| -------------- | ------------------- | ---------------------------------- |
| 爆款信号(highlight) | hsl(32 90% 52%) | 琥珀橙，仅用于播放量TOP标识/榜单排名 |
| 成功/已发布     | hsl(152 60% 42%)    | 处理状态=已完成                    |
| 警告/处理中     | hsl(38 85% 50%)     | 处理状态=进行中                    |
| 错误/失败       | hsl(4 75% 52%)      | 处理状态=异常                      |

## 3. Typography (字体排版)

- **Heading**: Inter, "PingFang SC", "Microsoft YaHei", sans-serif
- **Body**: Inter, "PingFang SC", "Microsoft YaHei", sans-serif
- **Monospace/数据**: JetBrains Mono, "SF Mono", monospace — 所有数值字段强制等宽对齐
- **字体策略**: Inter 提供清晰屏幕阅读体验；JetBrains Mono 确保表格/指标卡数字列对齐

## 4. Layout Strategy (布局策略)

- **导航意图**: 应用概要设计已声明左侧全局侧边导航（素材库、数据看板），原样实现；至多一套，非透明背景
- **页面架构**: Sidebar + 主内容区流式布局，主区域 `max-w-[1400px] mx-auto px-6`
- **响应式**: 移动端侧边栏折叠为底部 Tab Bar；详情页分镜图区由四列降为两列

## 5. Visual Language (视觉语言)

- **形态参数**: 圆角 `rounded-sm (0.25rem)` · 阴影 `shadow-none`（卡片用 1px border 替代） · 间距基调 `compact`
- **识别签名**: 数值字段 JetBrains Mono 等宽对齐；爆款标识使用琥珀橙小标签而非大面积色块；筛选器与列表间无多余留白
- **装饰策略**: 不使用装饰图形；仅通过数据密度与排版节奏建立专业感
- **动效原则**: 列表筛选即时刷新无过渡；hover 反馈 150ms ease-out
- **可及性**: 正文对比度 ≥ 4.5:1；琥珀橙标识仅辅助图标/标签形状区分，不单独依赖颜色传达信息

## 6. Component Principles (组件原则)

- **状态完整性**: Button/Input/Select 覆盖 Default/Hover/Focus/Disabled；表格行 hover 使用 `bg-accent/40`
- **层级清晰**: Primary 按钮填充深靛蓝；Secondary/Ghost 按钮边框或纯文字；爆款标签独立样式不与按钮混淆
- **一致性**: 数据指标统一使用 JetBrains Mono + `tabular-nums`；状态标签统一胶囊形 + 语义色背景+深色文字

## 7. Image Direction (图片与视觉资产)

- **Image Role**: 无强制图片需求；分镜图/参考图/视频封面为用户上传内容，不由设计系统生成
- **Image Art Direction**: 用户上传的图片在列表中统一 `aspect-video object-cover rounded-sm border` 展示；空状态使用纯 CSS 占位符
- **Image Prompt Keywords**: 无
- **Image Avoidance**: 禁止使用通用科技感插图、商务人物素材、抽象渐变作为空状态或装饰

## 9. 数据同步架构（多维表格双向同步）

- 多维表格为数据源：列表/详情优先实时读多维表格（`video-material-reader.service.ts`），失败自动降级本地库并在同步状态中记录；创建/编辑/删除先写多维表格，成功后才落本地，失败整体回滚不产生脏数据。
- 平台流式同步任务（`streaming_1875314847160376`）负责多维表格→本地库的增/改/删实时同步；换表时必须同步重绑。
- 同步状态：`bitable_sync_state` 表记录每次同步方向/结果，前端列表页顶部展示同步状态横幅（30s 轮询）。
- 兜底校准：触发器 `video_material_reconcile`（cron 每 30 分钟）+ `video-material.automation.ts`，全量拉取补齐本地缺失记录（只增不删）。
- 素材标识双形态：本地 uuid 与多维表格 recXXX（rec 前缀），服务端 `findByIdentifier` 统一路由。
- 字段映射集中在 `server/modules/bitable/bitable-mapping.ts`；处理状态双向映射（应用↔多维表格选项）见同文件常量。

- ❌ 卡片使用重阴影+大圆角 — 增加视觉重量，降低信息密度，违背紧凑高效的工作台定位
- ❌ 数值字段使用比例字体 — 导致表格列不对齐，扫读效率下降，丧失数据工作台的专业感