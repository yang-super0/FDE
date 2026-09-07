# 短视频创作助手

基于飞书妙搭平台开发的短视频素材管理与 AI 创作辅助工具，支持视频链接解析、多平台嵌入播放、AI 分镜脚本生成、爆款结构分析等功能。

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
| 第三方集成 | 飞书开放平台 + 多维表格 |

## 项目结构

```
short-video-creator/
├── client/                    # 前端应用
│   ├── public/                # 静态资源
│   ├── src/
│   │   ├── api/               # API 接口层
│   │   ├── components/        # 组件库（业务组件 + 基础 UI）
│   │   ├── hooks/             # 自定义 Hooks
│   │   ├── lib/               # 工具库
│   │   ├── pages/             # 页面模块
│   │   │   ├── MaterialsPage/      # 素材列表页
│   │   │   ├── MaterialDetailPage/ # 素材详情页
│   │   │   ├── DashboardPage/      # 仪表盘
│   │   │   ├── ExamplePage/        # 示例页
│   │   │   └── NotFound/           # 404 页
│   │   ├── types/             # 类型定义
│   │   ├── utils/             # 工具函数
│   │   ├── app.tsx            # 应用入口（路由配置）
│   │   └── index.tsx          # 渲染入口
│   ├── index.html
│   └── vite.config.ts
├── server/                    # 后端应用
│   ├── capabilities/          # 平台能力封装
│   ├── common/                # 公共模块（过滤器、拦截器、常量）
│   ├── database/              # 数据库 Schema 与连接
│   ├── modules/               # 业务模块
│   │   ├── bitable/           # 飞书多维表格集成
│   │   ├── dashboard/         # 仪表盘数据
│   │   ├── feishu/            # 飞书 API 封装（token 管理）
│   │   ├── video-material/    # 视频素材管理
│   │   ├── view/              # 视图路由
│   │   └── hello/             # 示例模块
│   ├── app.module.ts          # 根模块
│   └── main.ts                # 启动入口
├── shared/                    # 前后端共享
│   └── api.interface.ts       # API 接口类型定义
├── package.json
├── tsconfig.json
├── eslint.config.js
└── tailwind.config.ts
```

## 功能模块

### 前端页面

| 页面 | 路由 | 说明 |
|------|------|------|
| 素材列表 | `/` | 视频素材列表展示与管理 |
| 素材详情 | `/materials/:id` | 单个素材详情、视频播放、AI 分析结果 |
| 仪表盘 | `/dashboard` | 数据统计与概览 |

### 后端模块

| 模块 | 说明 |
|------|------|
| video-material | 视频素材 CRUD、链接解析、状态管理 |
| bitable | 飞书多维表格数据同步（字段映射、读写） |
| feishu | 飞书开放平台 API 封装（tenant_access_token 缓存与刷新） |
| dashboard | 仪表盘统计数据 |
| view | 前端视图路由 |

## 核心特性

### 视频平台支持

| 平台 | 播放方式 | 说明 |
|------|---------|------|
| B站 | 官方 embed 播放器 | 支持 BV 号链接直接嵌入 |
| YouTube | 官方 embed 播放器 | 支持 watch?v=、youtu.be、shorts 链接 |
| 抖音/小红书/快手/微信视频号 | 打开视频/复制链接 | 平台不支持第三方 iframe 嵌入 |

### AI 创作辅助

- 分镜脚本自动生成
- 原创文案生成
- 爆款结构分析
- 视频文案提取与整理

### 飞书多维表格集成

- 素材数据双向同步
- 字段自动映射（视频链接、处理状态、分镜脚本等）
- 支持批量处理与状态跟踪

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
- 飞书自建应用（需开通多维表格权限）

## 环境变量与凭证

项目使用飞书开放平台 API，需配置以下凭证（已脱敏，部署时替换）：

- `FEISHU_APP_ID` — 飞书自建应用 App ID
- `FEISHU_APP_SECRET` — 飞书自建应用 App Secret
- `BASE_TOKEN` — 飞书多维表格 Base Token
- `TABLE_ID` — 多维表格数据表 ID

凭证位于：
- `server/modules/feishu/feishu.service.ts`
- `server/modules/bitable/bitable.service.ts`

## 代码规范

- ESLint + Prettier 统一代码风格
- Stylelint 检查 CSS
- TypeScript 严格模式
- Git pre-commit 钩子自动执行 lint 和 format

## 部署

本项目基于飞书妙搭平台开发，通过妙搭平台一键发布。发布后可通过线上地址访问。

- 发布前需通过全量测试验证
- 发布后需执行冒烟测试（打开页面、新增、编辑、删除）
- 飞书应用需发布并审批通过相关权限
