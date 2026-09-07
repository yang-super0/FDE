# 阶段3：妙搭应用创建与配置

## 目标

创建完整应用，确认内置 PostgreSQL 可用，配置好开发环境。

## 执行步骤

### 3.1 创建完整应用

1. 访问 https://miaoda.feishu.cn
2. 点击「新建应用」
3. **选择「完整应用」**（不是「仅前端页面」）
   - 完整应用：自动挂载 Serverless PostgreSQL，有后端、有数据库
   - 仅前端页面：没有后端和数据库，只能调用外部 API
4. 填写应用名称和描述
5. 等待应用创建完成（通常几秒到几十秒）

### 3.2 确认内置 PostgreSQL 可用

创建完成后，确认数据库已自动挂载：

1. 进入应用后台，找到「数据库」或「数据」相关菜单
2. 确认能看到数据库实例信息
3. 尝试执行一条简单 SQL 验证连接：
   ```sql
   SELECT version();
   ```
   应该返回 PostgreSQL 版本信息。

**妙搭内置 PostgreSQL 的特性：**
- 基于火山云 PostgreSQL Serverless 版
- 秒级创建实例
- 支持数据库分支（一个代码分支对应一个数据库分支）
- 支持 Schema Diff 对比和安全合并
- 支持 Time Travel 秒级回退
- 非活跃项目自动释放资源，节省成本
- 支持 AI 函数（如 `ai_query`，可在 SQL 中直接调用 AI）

### 3.3 配置环境变量

在应用的「环境变量」或 `.env` 配置中，添加需要的变量：

```env
# 应用配置
APP_NAME=我的应用
APP_ENV=production

# AI 相关（如果用到 AI 能力）
AI_API_KEY=your_api_key_here
AI_MODEL=gpt-4o-mini

# 第三方服务（如果用到）
# SMS_API_KEY=xxx
# OSS_ACCESS_KEY=xxx

# 日志
LOG_LEVEL=info
```

**注意**：数据库连接信息（host、port、user、password、database）通常由妙搭自动注入，不需要手动配置。如果需要手动连接（如用外部工具），在后台查看连接信息。

### 3.4 建立数据库分支策略

妙搭 PostgreSQL 支持数据库分支，建议这样使用：

```
main（主分支，生产环境）
  └── dev（开发分支，日常开发用）
        └── feature/xxx（功能分支，大功能开发用）
```

**分支使用规则：**
1. **生产数据只在 main 分支**，不要在开发分支操作生产数据
2. **新功能开发**：从 dev 建 feature 分支，开发完合并回 dev
3. **改表结构**：先在 dev 或 feature 分支验证，确认无误后再合并到 main
4. **出问题**：用 Time Travel 回退到之前的状态，或切换回上一个分支

### 3.5 初始化数据库表结构

根据阶段2的设计，在数据库中创建表：

**方式一：通过妙搭的数据库管理界面执行 SQL**
- 找到 SQL 控制台或查询编辑器
- 粘贴建表语句，执行
- 确认表创建成功

**方式二：让妙搭 AI 自动创建**
- 在 AI 对话框中描述表结构需求
- AI 生成建表语句并执行
- **必须人工核对**生成的表结构是否与设计一致

**方式三：通过 ORM / 迁移工具**
- 如果应用代码用了 ORM（如 Prisma、TypeORM、Sequelize），用迁移工具管理表结构
- 更规范，适合团队协作和版本管理

**无论哪种方式，建表后必须：**
1. 核对字段名、类型、约束是否与设计一致
2. 确认索引已创建
3. 录入测试数据
4. 用 `EXPLAIN ANALYZE` 验证关键查询

### 3.6 配置用户认证和权限（如需要）

如果应用需要登录和权限控制：

1. 确认妙搭是否提供内置用户系统
2. 如果有，配置角色和权限（管理员、普通用户、只读用户等）
3. 如果没有，自己设计用户表和权限表：
   ```sql
   CREATE TABLE users (
       id BIGSERIAL PRIMARY KEY,
       username VARCHAR(50) NOT NULL UNIQUE,
       password_hash VARCHAR(255) NOT NULL,
       role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user','viewer')),
       is_active BOOLEAN NOT NULL DEFAULT true,
       created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
       updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
   );
   ```

## 完成标准

- [ ] 完整应用已创建（不是仅前端页面）
- [ ] 内置 PostgreSQL 可用，能执行 SQL
- [ ] 环境变量已配置
- [ ] 数据库分支策略已建立
- [ ] 所有表已创建，字段、约束、索引与设计一致
- [ ] 测试数据已录入
- [ ] 关键查询已验证走索引
- [ ] 用户认证和权限已配置（如需要）

## 下一步

进入阶段4：开发实现（读取 `phase-4-development.md`）
