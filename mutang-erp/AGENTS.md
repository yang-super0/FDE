# UI 设计指南

> **设计类型**: App 设计（应用架构设计）
> **确认检查**: 本指南适用于可交互的应用/网站/工具。

> ℹ️ Section 1 为设计意图与决策上下文。Code agent 实现时以 Section 2 及之后的具体参数为准。

## 1. Design Archetype (设计原型)

### 1.1 内容理解

- **目标用户**: 广告代理公司管理者与业务人员，高频使用后台处理客户/项目/财务数据，期望高效精准
- **核心目的**: 信息告知 + 行动引导，通过精密数据呈现支撑经营决策
- **情绪基调**: 专业权威、精密可信 / 避免花哨装饰与廉价感

### 1.2 设计方向

- **Design Style**: Corporate Blueprint 企业蓝图报告风 — 零圆角卡片+顶部3px深蓝边线为核心签名，传达精密权威感
- **Application Type**: Admin/SaaS ERP — 11模块企业级后台管理系统
- **Aesthetic Direction**: 浅灰底白卡片网格+深蓝渐变Header开场，极端字号对比建立层级节奏

## 2. Color System (色彩系统)

**色彩关系**: 深蓝(#0033A0)主色 + 浅灰蓝(#F4F7F9)底 + 纯白卡片 + 单色蓝五级图表渐变
**配色设计理由**: 广告代理ERP需传递专业权威与数据精密感，蓝色系天然契合信任与理性决策场景
**主色推导**: #0033A0 作为卡片顶边线与关键操作色，是全局唯一视觉锚点，强化品牌识别
**使用比例**: 60% 浅灰底 / 30% 白卡片 / 10% 深蓝强调；语义色仅限徽章文字，不入图表填充

### 2.1 主题颜色

| Token                | HSL 值                  | 说明                                       |
| -------------------- | ----------------------- | ------------------------------------------ |
| `background`         | hsl(210, 25%, 97%)      | 页面底色 #F4F7F9                           |
| `card`               | hsl(0, 0%, 100%)        | 卡片/容器背景 #FFFFFF                      |
| `foreground`         | hsl(0, 0%, 10%)         | 主文字 #1A1A1A                             |
| `muted-foreground`   | hsl(215, 16%, 62%)      | 次要文字/标签 #94A3B8                      |
| `primary`            | hsl(220, 100%, 31%)     | 主交互色/卡片顶边线 #0033A0                |
| `primary-foreground` | hsl(0, 0%, 100%)        | 主交互文字                                 |
| `accent`             | hsl(210, 25%, 95%)      | 次级交互反馈(hover/focus/skeleton) #F0F4F8 |
| `accent-foreground`  | hsl(0, 0%, 10%)         | accent上文字                               |
| `border`             | hsl(214, 32%, 91%)      | 极细分隔线 #E2E8F0                         |

### 2.2 导航区配色

- **基调关系**: 侧栏复用 background 色，激活项用 accent 底色 + primary 左边线标识
- **关键状态**: 默认 muted-foreground → hover accent-bg → active primary 左2px边线+foreground文字
- **边界与背景**: 非透明背景，右侧1px border 分隔内容区

### 2.3 语义颜色

| 用途     | 色相                   | 衍生规则                              |
| -------- | ---------------------- | ------------------------------------- |
| 成功/达标 | hsl(160, 84%, 39%)    | bg: hsl(160, 63%, 96%) 仅徽章/文字   |
| 警告/中风险 | hsl(38, 92%, 50%)   | bg: hsl(45, 100%, 96%) 仅徽章/文字   |
| 错误/高风险 | hsl(0, 84%, 60%)    | bg: hsl(0, 93%, 94%) 仅徽章/文字     |

> ⚠️ 语义色严禁用于图表填充色，图表只用蓝色五级渐变

## 3. Typography (字体排版)

- **Heading**: Inter + `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Body**: Inter + 同上回退栈；数值列使用 `font-mono` 系统等宽栈
- **字体策略**: Inter 覆盖全层级，极端字号对比(9px标签 vs 4xl标题)，全大写标签 font-black tracking-[0.15em]

## 4. Layout Strategy (布局策略)

- **导航意图**: 11模块需持久型侧栏导航；至多一套；非透明背景；工作台页保留深蓝渐变Header+负边距重叠
- **页面架构**: 侧栏+内容区双栏布局，内容区 max-w-[1280px] mx-auto px-8
- **响应式**: ≥1024px 12列网格；768-1023px 表格横滚；<768px 侧栏折叠+单列堆叠

## 5. Visual Language (视觉语言)

- **形态参数**: 圆角 `rounded-none`(卡片/Tooltip/图表容器硬规) · 阴影 `shadow-md` 统一轻阴影 · 间距 standard(gap-8/p-6)
- **识别签名**: 卡片顶部3px #0033A0边线(border-t-[3px]) + Section编号标签(01. NAME) + 极细0.5px分隔线
- **装饰策略**: Header斜切几何块(bg-white/5 skew-x-[-20deg])；无其他装饰元素
- **动效原则**: 克制反馈，hover行高亮+边框变色，150ms transition-colors
- **可及性**: 正文≥4.5:1；复杂背景加遮罩；交互元素有明确focus态；柱状图顶部微圆角为例外

## 6. Component Principles (组件原则)

- **状态完整性**: Button/Input/TableRow 覆盖 Default/Hover/Focus/Disabled；表单Focus环用primary色2px outline
- **层级清晰**: Primary按钮填充primary色白字；Secondary按钮outline+primary边框；Ghost按钮hover用accent底色
- **一致性**: 所有卡片型组件复用report-card规格(3px顶边线+rounded-none+shadow-md)；表格主列用primary加粗突出

## 7. Image Direction (图片与视觉资产，按需)

- **Image Role**: 无强制图片需求
- **Image Art Direction**: 优先通过排版、色彩和局部图形建立视觉记忆点；Header斜切几何装饰块已足够
- **Image Prompt Keywords**: 无
- **Image Avoidance**: 避免通用商务人物素材、科技感插图、无主题抽象渐变

## 8. 应避免 (Anti-patterns)

- ❌ 卡片使用任何非零圆角(rounded/md/lg/xl等)，破坏蓝图精密感
- ❌ 图表使用红/绿/橙等非蓝色相填充，违反单色蓝五级渐变硬规
- ❌ 引入深色模式或手写/展示体字体，偏离企业蓝图报告风格基调