# 阶段4：开发实现（分模块小闭环）

## 目标

用 AI 按模块逐个生成应用，每个模块即开即测，完成数据层、页面和交互。

**禁止一条指令让 AI 一次性做完所有模块**——问题会堆积、互相影响、难以定位。

## 4.1 模块切片与开发排序

先把应用切成"用户可独立感知、能独立跑通"的模块（一块自带数据查询+页面+交互），再按依赖排序：

1. **数据层 / ORM 配置**（地基，先打通数据库连接和基础 CRUD）
2. 主表的列表页 + 详情页 + 新增/编辑表单
3. 其余各表的列表页 + 详情页 + 表单
4. 全局搜索 / 筛选
5. 统计仪表盘 / 数据报表
6. AI 推荐类能力
7. AI 生成类能力（方案/报告/话术）
8. 门户首页、聚合统计、收尾交互

一次只推进一个模块；强相关的两小块可合并，跨层/跨页面的不合并。

## 4.2 单模块"开发→自测→再开发"小闭环

对每个模块重复以下循环，全部通过后才进入下一模块：

1. 用【模板A】下发本模块开发指令（明确边界，先别发布）
2. AI 出方案后点"按方案执行"，完成本模块开发
3. 用【模板B】让 AI 只对本模块做自测，并在预览环境亲自验证正常路径+边界+数据来源
4. 有问题只修本模块，直到通过
5. 用【模板C】带回归约束开发下一模块

> 妙搭每次出方案都需要手动点"按方案执行"，下发指令后要持续跟进，不能发完就不管。

### 模板 A：单模块开发指令（限定边界）

```
【本次范围】只开发「模块名，如：订单管理的列表+详情+新增」，不要改动其他模块的任何文件。
【数据表】仅使用「表名」；表结构如下（以数据库真实定义为准）：
  - 字段名（类型/约束）：……
  - 关联表：……
【要实现】
  1. 列表页：表格展示、分页（page+page_size）、按状态筛选、按时间排序、搜索
  2. 详情页：展示主表信息 + 关联表数据（用 JOIN 查询，不要 N+1）
  3. 新增/编辑表单：字段验证、关联选择器、提交后返回列表
  4. 删除：软删除（更新 deleted_at），不要物理删除
【本次不做】不做搜索、不做 AI、不重构已完成模块。
【性能要求】
  - 列表查询必须用分页，禁止一次性拉全表
  - 关联查询用 JOIN，禁止逐条查关联表（N+1）
  - 所有用户输入用参数化查询，禁止 SQL 拼接
  - 多表写入必须用事务
【完成后先别发布】
  - 列出本次改动的文件；
  - 在预览自测：正常路径、边界（空数据/无匹配/分页边界）、每条数据来自哪张表；
  - 用 EXPLAIN ANALYZE 确认列表查询走索引；
  - 自测通过后报告结果，等我确认再进入下一模块。
```

### 模板 B：模块自测指令（只验证、不加功能）

```
只验证「模块名」，不要新增功能：
1) 列出本模块数据链路：表 → SQL 查询 → 页面；
2) 正常用例 + 边界用例（空数据/无匹配/分页第一页和最后一页）各跑一遍；
3) 抓接口确认：入参正确，出参非空，SQL 查询用了 JOIN 而非 N+1；
4) 用 EXPLAIN ANALYZE 检查关键查询是否走索引；
5) 多表写入场景验证事务（故意让第二步失败，看第一步是否回滚）；
6) 报告通过/失败；失败只修这个模块，不要动其他模块。
```

### 模板 C：下一模块的回归保护指令

```
继续开发「下一模块名」，范围与数据表如下：……
硬约束：不得修改或破坏已测通过的「模块A、模块B」。
完成后除自测新模块外，回归确认模块A、模块B仍正常；先别发布，等我确认。
```

## 4.3 数据层开发标准

### ORM 选择

如果妙搭支持，推荐使用 ORM（如 Prisma、TypeORM、Sequelize），好处：
- 参数化查询，防 SQL 注入
- 自动管理 created_at / updated_at
- 迁移工具管理表结构版本
- 类型安全（TypeScript）

如果不用 ORM，直接写 SQL，必须：
- 所有用户输入用参数化（Prepared Statement）
- 统一的数据库连接池配置
- 统一的错误处理和日志

### 基础 CRUD 接口规范

标准 RESTful：
- `GET /api/xxx?page=1&page_size=20&status=xxx` 列表（分页+筛选）
- `GET /api/xxx/:id` 详情
- `POST /api/xxx` 新增（返回 201）
- `PUT /api/xxx/:id` 编辑
- `DELETE /api/xxx/:id` 删除（软删除）

### 列表查询标准写法

```sql
-- 正确：分页 + 筛选 + JOIN + 排序
SELECT o.*, c.name AS customer_name
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.deleted_at IS NULL
  AND ($1::varchar IS NULL OR o.status = $1)
  AND ($2::varchar IS NULL OR c.name ILIKE '%' || $2 || '%')
ORDER BY o.created_at DESC
LIMIT $3 OFFSET $4;

-- 同时查总数
SELECT COUNT(*)
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.deleted_at IS NULL
  AND ($1::varchar IS NULL OR o.status = $1)
  AND ($2::varchar IS NULL OR c.name ILIKE '%' || $2 || '%');
```

**禁止写法：**
```sql
-- 错误1：不分页，拉全表
SELECT * FROM orders;

-- 错误2：N+1，先查订单再逐条查客户
SELECT * FROM orders; -- 然后循环 SELECT * FROM customers WHERE id = ?

-- 错误3：SQL 拼接（防注入）
SELECT * FROM orders WHERE status = '" + userInput + "'";
```

### 多表写入必须用事务

```sql
BEGIN;
INSERT INTO orders (order_no, customer_id, amount, status) VALUES ($1, $2, $3, 'pending') RETURNING id;
INSERT INTO order_items (order_id, product_name, quantity, price) VALUES ($1, $2, $3, $4);
UPDATE customers SET total_orders = total_orders + 1 WHERE id = $1;
COMMIT;
```

如果任何一步失败，全部回滚（ROLLBACK），不会出现"订单建了但明细没建"的情况。

### 软删除标准

```sql
-- 查询时过滤已删除
SELECT * FROM orders WHERE deleted_at IS NULL;

-- 删除时更新字段
UPDATE orders SET deleted_at = now() WHERE id = $1;

-- 恢复
UPDATE orders SET deleted_at = NULL WHERE id = $1;
```

## 4.4 页面开发标准

| 页面类型 | 必须包含 |
|---|---|
| 列表页 | 表格 + 筛选（含"全部"分支）+ 分页 + 搜索 + 新增按钮 + 行操作（编辑/删除） |
| 表单页 | 字段验证 + 关联选择器（下拉/搜索选择）+ 提交按钮 + 取消返回 |
| 详情页 | 主表信息 + 关联数据（用 JOIN 查出来的）+ 可操作按钮（编辑/删除/状态变更） |
| 仪表盘 | 指标卡 + 趋势图 + 分布图 + 排行榜（用 SQL 聚合查询，不要拉全量到前端算） |

## 4.5 统计查询开发标准

仪表盘和报表必须用数据库原生聚合，不要拉全量数据到前端或后端内存计算：

```sql
-- 正确：数据库层聚合
SELECT 
  DATE_TRUNC('month', created_at) AS month,
  COUNT(*) AS order_count,
  SUM(amount) AS total_amount
FROM orders
WHERE deleted_at IS NULL AND created_at >= NOW() - INTERVAL '6 months'
GROUP BY month
ORDER BY month;

-- 按客户统计 TOP 10
SELECT 
  c.name,
  COUNT(o.id) AS order_count,
  SUM(o.amount) AS total_amount
FROM customers c
JOIN orders o ON o.customer_id = c.id
WHERE o.deleted_at IS NULL
GROUP BY c.id, c.name
ORDER BY total_amount DESC
LIMIT 10;
```

**禁止**：`SELECT * FROM orders` 然后在代码里循环统计。数据量大了会非常慢，还占内存。

## 4.6 AI 能力开发（单独成模块，严格四层）

AI 推荐/生成放在页面模块之后单独开发，严格遵循四层防护：

1. **入参空值兜底**：禁传空字符串，空值转兜底文案
2. **规则打底**：候选数据从数据库查（用 SQL），确定性筛选排序，不依赖 AI 排序
3. **提示词约束**：禁止空返回、补足条数、不得杜撰、固定事实主体
4. **结果校验 + 兜底**：AI 返回空/异常时用规则结果，绝不空态/白屏

**利用 PostgreSQL AI 函数**：如果妙搭 PostgreSQL 支持 `ai_query` 等 AI 函数，可以在数据库层直接做 AI 处理，减少应用层调用：
```sql
SELECT review, ai_query('为评论分类：正向/负向/中立', review) AS sentiment
FROM reviews;
```

## 完成标准

- [ ] 已按模块切片，且每个模块都走过"开发→自测→确认"闭环
- [ ] 已测模块在后续开发中未被破坏（回归通过）
- [ ] 所有页面已生成，数据来自数据库
- [ ] 所有列表接口支持分页
- [ ] 关联查询用 JOIN，无 N+1
- [ ] 所有写操作使用参数化查询，无 SQL 拼接
- [ ] 多表写入使用事务
- [ ] 统计查询用 SQL 聚合，未拉全量到内存
- [ ] 关键查询已用 EXPLAIN ANALYZE 验证走索引
- [ ] 接口返回格式统一
- [ ] 表单验证已添加
- [ ] AI 能力四层防护齐全（如有）

## 下一步

进入阶段5：测试验证（读取 `phase-5-testing.md`）
