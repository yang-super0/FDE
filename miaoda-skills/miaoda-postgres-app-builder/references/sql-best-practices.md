# SQL 与性能最佳实践

## 一、查询优化

### 1.1 永远用分页，禁止拉全表

```sql
-- 正确
SELECT * FROM orders WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;

-- 错误
SELECT * FROM orders; -- 数据量大了会超时、占内存
```

**深分页优化**：当 OFFSET 很大时（如第 1000 页），OFFSET 会变慢，用游标分页：

```sql
-- 游标分页（基于上一页最后一条的 id 或 created_at）
SELECT * FROM orders
WHERE id < $1  -- 上一页最后一条的 id
ORDER BY id DESC
LIMIT 20;
```

### 1.2 用 JOIN 代替 N+1 查询

```sql
-- 正确：一次 JOIN 查出订单和客户名
SELECT o.id, o.order_no, o.amount, c.name AS customer_name
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.deleted_at IS NULL
LIMIT 20;

-- 错误：N+1（先查 20 条订单，再循环 20 次查客户）
SELECT * FROM orders LIMIT 20;
-- 然后循环：SELECT * FROM customers WHERE id = ?
```

**一对多关联**：主表 + 从表，用两次查询（主表一次，从表用 IN 批量查一次），不要逐条查：

```sql
-- 查订单列表
SELECT * FROM orders WHERE deleted_at IS NULL LIMIT 20;

-- 批量查所有订单的明细（一次查询，不是 20 次）
SELECT * FROM order_items WHERE order_id IN (1,2,3,...,20);
```

### 1.3 只查需要的字段

```sql
-- 正确
SELECT id, order_no, amount, status FROM orders LIMIT 20;

-- 错误（不需要的字段也查，浪费 IO 和内存）
SELECT * FROM orders LIMIT 20;
```

尤其不要查 TEXT / JSONB 大字段，除非真的需要。

### 1.4 用数据库聚合，不要拉到代码里算

```sql
-- 正确：数据库层统计
SELECT status, COUNT(*) AS cnt, SUM(amount) AS total
FROM orders WHERE deleted_at IS NULL
GROUP BY status;

-- 错误：拉全量到代码里循环统计
SELECT * FROM orders; -- 然后代码里 count 和 sum
```

### 1.5 复杂查询用 CTE 或子查询，保持可读性

```sql
WITH monthly_stats AS (
    SELECT 
        DATE_TRUNC('month', created_at) AS month,
        COUNT(*) AS order_count,
        SUM(amount) AS total_amount
    FROM orders
    WHERE deleted_at IS NULL
    GROUP BY month
)
SELECT * FROM monthly_stats ORDER BY month DESC LIMIT 6;
```

## 二、索引优化

### 2.1 什么字段该建索引

| 场景 | 是否建索引 |
|------|-----------|
| WHERE 条件过滤的字段 | ✅ 必须 |
| JOIN 关联的字段（外键） | ✅ 必须 |
| ORDER BY 排序的字段 | ✅ 建议 |
| GROUP BY 分组的字段 | ✅ 建议 |
| UNIQUE 唯一约束 | ✅ 自动建 |
| 主键 | ✅ 自动建 |
| 很少用于查询的字段 | ❌ 不要 |
| 区分度很低的字段（如性别只有 2 个值） | ❌ 单独建效果差，适合做复合索引一部分 |

### 2.2 索引类型选择

| 索引类型 | 适用场景 | 语法 |
|---------|---------|------|
| B-tree（默认） | 等值查询、范围查询、排序 | `CREATE INDEX idx ON table(col);` |
| 复合 B-tree | 多字段同时查询 | `CREATE INDEX idx ON table(col1, col2);` |
| UNIQUE | 唯一约束 + 查询 | `CREATE UNIQUE INDEX uk ON table(col);` |
| 部分索引 | 只索引满足条件的行 | `CREATE INDEX idx ON table(col) WHERE status = 'active';` |
| GIN | JSONB、数组、全文检索 | `CREATE INDEX idx ON table USING GIN(col);` |
| GiST | 地理空间、范围类型 | `CREATE INDEX idx ON table USING GIST(col);` |

### 2.3 复合索引字段顺序

**区分度高的字段放前面**（值越不重复，区分度越高）：

```sql
-- 好：customer_id 区分度高（很多客户），status 区分度低（几个状态）
CREATE INDEX idx_orders_customer_status ON orders(customer_id, status);

-- 不好：status 区分度低，放前面索引效果差
CREATE INDEX idx_orders_status_customer ON orders(status, customer_id);
```

**最左前缀原则**：复合索引 `(a, b, c)` 可以用于 `WHERE a=?`、`WHERE a=? AND b=?`、`WHERE a=? AND b=? AND c=?`，但不能用于 `WHERE b=?`（没有 a）。

### 2.4 验证索引是否生效

```sql
EXPLAIN ANALYZE
SELECT * FROM orders WHERE customer_id = 123 ORDER BY created_at DESC LIMIT 20;
```

看执行计划：
- `Index Scan` / `Index Only Scan` → ✅ 走了索引
- `Seq Scan` → ❌ 全表扫描，索引没生效或没建
- `Bitmap Heap Scan` → 用了索引但需要回表，数据量小时正常

如果索引没生效，检查：
- 字段类型是否匹配（如 VARCHAR 传了 INTEGER）
- 是否对索引字段用了函数（如 `WHERE LOWER(name) = 'xxx'`，需要表达式索引）
- 是否用了 `LIKE '%xxx'`（前缀通配符不走索引）
- 数据量太小，优化器认为全表扫描更快（正常）

## 三、写入优化

### 3.1 批量插入

```sql
-- 正确：批量插入（一次提交）
INSERT INTO order_items (order_id, product_name, quantity, price)
VALUES 
(1, '商品A', 2, 100.00),
(1, '商品B', 1, 200.00),
(2, '商品C', 3, 50.00);

-- 错误：循环单条插入（每次一次网络往返 + 事务）
INSERT INTO order_items ... VALUES (1, '商品A', ...);
INSERT INTO order_items ... VALUES (1, '商品B', ...);
```

### 3.2 事务大小要适中

```sql
-- 好：把相关的多表写入包在一个事务里
BEGIN;
INSERT INTO orders ...;
INSERT INTO order_items ...;
UPDATE customers ...;
COMMIT;

-- 不好：把 10000 条不相关的插入包在一个大事务里（长事务会锁表、占资源）
BEGIN;
INSERT ...; -- 10000 次
COMMIT;
```

**原则**：事务只包"要么全成功要么全失败"的操作，不要把无关操作塞进去。

### 3.3 批量更新

```sql
-- 用 CASE 批量更新不同行
UPDATE orders 
SET status = CASE 
    WHEN id = 1 THEN 'paid'
    WHEN id = 2 THEN 'shipped'
    WHEN id = 3 THEN 'cancelled'
END
WHERE id IN (1, 2, 3);
```

## 四、安全最佳实践

### 4.1 永远用参数化查询，禁止 SQL 拼接

```python
# 正确：参数化
cursor.execute("SELECT * FROM users WHERE username = %s", (user_input,))

# 错误：字符串拼接（SQL 注入漏洞）
cursor.execute(f"SELECT * FROM users WHERE username = '{user_input}'")
```

### 4.2 密码存储用哈希

```sql
-- 存密码哈希，不是明文
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,  -- bcrypt/argon2 哈希
    ...
);
```

用 bcrypt 或 argon2，不要用 MD5/SHA1（不安全），不要自己加盐（用库自带的）。

### 4.3 最小权限原则

数据库用户只给需要的权限：
- 应用用户：SELECT / INSERT / UPDATE / DELETE（不要给 DROP / ALTER）
- 迁移用户：额外给 CREATE / ALTER
- 只读用户：只有 SELECT

## 五、数据类型最佳实践

| 数据 | 推荐 | 不推荐 | 原因 |
|------|------|--------|------|
| 金额 | NUMERIC(12,2) | FLOAT / REAL | 浮点有精度误差 |
| 时间 | TIMESTAMPTZ | TIMESTAMP | 不带时区会有时区混乱 |
| 主键 | BIGSERIAL | SERIAL | 32 位可能不够用 |
| 布尔 | BOOLEAN | SMALLINT(0/1) | 语义更清晰 |
| 枚举 | VARCHAR + CHECK | ENUM 类型 | ENUM 加值需要 ALTER，不灵活 |
| JSON | JSONB | JSON | JSONB 可索引、查询更快 |
| 短文本 | VARCHAR(n) | TEXT | 明确长度约束 |
| IP 地址 | INET | VARCHAR | 专用类型，支持范围查询 |

## 六、常见慢查询排查清单

遇到慢查询，按此顺序排查：

1. **看 SQL**：是不是 `SELECT *`？是不是拉全表没分页？是不是 N+1？
2. **EXPLAIN ANALYZE**：看执行计划，是 Seq Scan 还是 Index Scan？
3. **检查索引**：WHERE/JOIN/ORDER BY 的字段有没有索引？索引是否生效？
4. **检查数据量**：表有多少行？是不是需要分区表？
5. **检查锁**：是不是被其他事务锁住了？（`SELECT * FROM pg_locks WHERE NOT granted;`）
6. **检查连接池**：是不是连接数不够，请求在排队？
7. **检查服务器资源**：CPU / 内存 / IO 是否打满？

## 七、PostgreSQL 实用命令

```sql
-- 查看所有表
\dt

-- 查看表结构
\d table_name

-- 查看索引
\di

-- 查看当前连接数
SELECT count(*) FROM pg_stat_activity;

-- 查看慢查询（需开启 pg_stat_statements）
SELECT query, calls, total_exec_time, mean_exec_time 
FROM pg_stat_statements 
ORDER BY total_exec_time DESC LIMIT 10;

-- 查看表大小
SELECT pg_size_pretty(pg_total_relation_size('table_name'));

-- 查看数据库大小
SELECT pg_size_pretty(pg_database_size('database_name'));

-- 分析表（更新统计信息，让优化器选择更好的执行计划）
ANALYZE table_name;

-- 重建索引（索引膨胀时）
REINDEX INDEX index_name;
```
