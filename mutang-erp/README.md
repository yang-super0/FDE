# 牧唐数智一体化 ERP

基于飞书妙搭平台开发的全栈企业资源管理系统，覆盖广告传媒企业从客户管理、广告投放、视频制作、合同管理、财务核算到人事行政的完整业务流程。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 19 + TypeScript 5.9 |
| 构建工具 | Vite 7 |
| 样式方案 | Tailwind CSS 4 + Radix UI |
| 状态管理 | Redux Toolkit + Zustand |
| 数据请求 | TanStack React Query + Axios |
| 路由 | React Router 6 |
| 后端框架 | NestJS 10 |
| ORM | Drizzle ORM 0.44 |
| 数据库 | PostgreSQL（妙搭内置 Serverless） |
| 富文本编辑 | Tiptap 3 |
| 图表 | ECharts 5 + Recharts |
| 测试 | Jest + ts-jest |

## 项目结构

```
mutang-erp/
├── client/                    # 前端应用
│   ├── public/                # 静态资源
│   ├── src/
│   │   ├── api/               # API 接口层（20+ 业务模块）
│   │   ├── components/        # 组件库
│   │   │   ├── business-ui/   # 业务组件
│   │   │   └── ui/            # 基础 UI 组件（270+ 个）
│   │   ├── hooks/             # 自定义 Hooks
│   │   ├── i18n/              # 国际化
│   │   ├── lib/               # 工具库
│   │   ├── pages/             # 页面模块
│   │   ├── types/             # 类型定义
│   │   ├── utils/             # 工具函数
│   │   ├── app.tsx            # 应用入口（路由配置）
│   │   └── index.tsx          # 渲染入口
│   ├── index.html
│   └── vite.config.ts
├── server/                    # 后端应用
│   ├── common/                # 公共模块（过滤器、拦截器、常量）
│   ├── database/              # 数据库 Schema 与连接
│   ├── modules/               # 业务模块（20+ 个）
│   ├── app.module.ts          # 根模块
│   └── main.ts                # 启动入口
├── shared/                    # 前后端共享
│   └── api.interface.ts       # API 接口类型定义
├── .githooks/                 # Git 钩子
├── package.json
├── tsconfig.json
├── eslint.config.js
└── tailwind.config.ts
```

## 功能模块

### 前端页面（16 个）

| 模块 | 说明 |
|------|------|
| Dashboard | 仪表盘与部门目标 |
| Customers | 客户管理 |
| CustomerPool | 客户池（公海/无效池/线索池/分析） |
| Advertising | 广告管理与详情 |
| AdsBusiness | 广告业务（账户申请、账户管理、备案、转账、佣金规则、佣金记录） |
| Video | 视频业务（视频详情、订单、项目、演员、外包、佣金、拍摄费用、场地费用、样品） |
| Contracts | 合同管理（合同模板、合同费用） |
| Finance | 财务核心（账户、收据） |
| Finance Enhance | 财务增强（预付款、费用、资金、返点） |
| Hr | 人事管理 |
| Hr Enhance | 人事增强（考勤、薪酬、招聘、员工） |
| Admin | 行政管理 |
| Admin Enhance | 行政增强（资产盘点、采购、仓库） |
| Tasks | 任务管理 |
| System | 系统设置 |
| Support | 支持中心（竞品、行业 ROI、素材、趋势） |
| Reports | 报表中心（自定义报表、下钻、定时报表、模板） |

### 后端模块（20+ 个）

| 模块 | 说明 |
|------|------|
| dashboard | 仪表盘数据 |
| customer | 客户管理 |
| customer-pool | 客户池 |
| advertising | 广告管理 |
| ad-business | 广告业务 |
| ad-campaign | 广告活动 |
| video | 视频业务 |
| contract | 合同管理 |
| contract-enhance | 合同增强 |
| finance | 财务 |
| finance-core | 财务核心 |
| finance-enhance | 财务增强 |
| hr | 人事 |
| hr-enhance | 人事增强 |
| admin-affair | 行政事务 |
| admin-enhance | 行政增强 |
| field-permission | 字段权限 |
| feishu-sync | 飞书同步 |
| message-notification | 消息通知 |
| operation-logs | 操作日志 |

## 开发命令

```bash
# 安装依赖
npm install

# 启动开发环境（前后端同时）
npm run dev

# 仅启动后端
npm run dev:server

# 仅启动前端
npm run dev:client

# 构建生产版本
npm run build

# 类型检查
npm run type:check

# 代码检查
npm run lint

# 代码格式化
npm run format

# 运行测试
npm run test
```

## 环境要求

- Node.js >= 22.0.0
- npm >= 10.0.0
- PostgreSQL（妙搭内置 Serverless PostgreSQL）

## 环境变量

项目使用 `.env` 文件配置环境变量，需包含：
- 数据库连接信息
- 飞书 API 凭证（如需飞书集成）
- 第三方服务密钥

## 代码规范

- ESLint + Prettier 统一代码风格
- Stylelint 检查 CSS
- TypeScript 严格模式
- Git pre-commit 钩子自动执行 lint 和 format

## 部署

本项目基于飞书妙搭平台开发，通过妙搭平台一键发布。发布后可通过线上地址访问。

- 发布前需通过全量测试验证
- 发布后需执行冒烟测试（打开页面、新增、编辑、删除）
- 数据库 Schema 变更需在开发分支验证后合并
