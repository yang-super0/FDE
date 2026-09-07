# 阶段2：数据库设计

## 目标

设计规范、高性能的表结构，避免后期改表。数据库表结构是应用的地基，设计不好后期改表成本高。

## 执行步骤

### 2.1 命名规范

- **表名**：小写英文，复数形式，下划线分隔，如 `customers`、`order_items`
- **字段名**：小写英文，下划线分隔，如 `order_no`、`customer_id`、`created_at`
- **主键**：统一叫 `id`
- **外键**：`关联表名单数_id`，如 `customer_id`、`order_id`
- **时间字段**：`created_at`、`updated_at`、`deleted_at`
- **布尔字段**：`is_xxx` 或 `has_xxx`，如 `is_active`、`has_paid`
- **索引名**：`idx_表名_字段名`，如 `idx_orders_customer_id`
- **唯一约束名**：`uk_表名_字段名`

### 2.2 字段类型选择

| 数据 | 推荐类型 | 示例 | 注意事项 |
|------|---------|------|---------|
| 主键 | BIGSERIAL | `id BIGSERIAL PRIMARY KEY` | 自增 64 位整数，性能好 |
| 短文本 | VARCHAR(n) | `name VARCHAR(100) NOT NULL` | 明确长度，不要都用 TEXT |
| 长文本 | TEXT | `description TEXT` | 不限长度，适合备注、内容 |
| 整数 | INTEGER / BIGINT | `quantity INTEGER` | 普通用 INTEGER，大范围用 BIGINT |
| 金额 | NUMERIC(12,2) | `amount NUMERIC(12,2) NOT NULL DEFAULT 0` | **禁止用 FLOAT/REAL**，会有精度误差 |
| 百分比/小数 | NUMERIC(5,2) | `discount NUMERIC(5,2)` | 明确精度 |
| 日期时间 | TIMESTAMPTZ | `created_at TIMESTAMPTZ NOT NULL DEFAULT now()` | **带时区**，避免时区混乱 |
| 日期 | DATE | `order_date DATE` | 只需要日期时用 |
| 布尔 | BOOLEAN | `is_active BOOLEAN NOT NULL DEFAULT true` | true/false |
| 枚举 | VARCHAR + CHECK 或 ENUM 类型 | `status VARCHAR(20) NOT NULL CHECK (status IN ('pending','paid','shipped'))` | 用 CHECK 约束保证值合法 |
| JSON | JSONB | `extra JSONB` | 可索引，适合灵活属性 |
| 数组 | TEXT[] / INTEGER[] | `tags TEXT[]` | 适合标签、多选 |
| 附件/文件 | VARCHAR（存 URL 或 file_token） | `avatar_url VARCHAR(500)` | 数据库只存引用，文件存对象存储 |

### 2.3 建表模板

```sql
-- 客户表
CREATE TABLE customers (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    phone       VARCHAR(20),
    email       VARCHAR(100),
    level       VARCHAR(20) NOT NULL DEFAULT 'normal' 
                CHECK (level IN ('normal','vip','svip')),
    is_active   BOOLEAN NOT NULL DEFAULT true,
    remark      TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ
);

-- 订单表
CREATE TABLE orders (
    id          BIGSERIAL PRIMARY KEY,
    order_no    VARCHAR(50) NOT NULL UNIQUE,
    customer_id BIGINT NOT NULL REFERENCES customers(id),
    amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
    status      VARCHAR(20) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','paid','shipped','completed','cancelled')),
    remark      TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ
);

-- 订单明细表
CREATE TABLE order_items (
    id          BIGSERIAL PRIMARY KEY,
    order_id    BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_name VARCHAR(200) NOT NULL,
    quantity    INTEGER NOT NULL CHECK (quantity > 0),
    price       NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.4 索引设计（关键！）

**凡是以下场景用到的字段，必须建索引：**
- WHERE 条件过滤
- JOIN 关联
- ORDER BY 排序
- GROUP BY 分组
- UNIQUE 唯一约束（自动建索引）

```sql
-- 普通 B-tree 索引（最常用，适合等值和范围查询）
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- 复合索引（多字段同时查询时用，字段顺序按区分度从高到低）
CREATE INDEX idx_orders_customer_status ON orders(customer_id, status);

-- 唯一索引（同时保证唯一性和查询性能）
CREATE UNIQUE INDEX uk_orders_order_no ON orders(order_no);

-- 部分索引（只索引满足条件的行，节省空间）
CREATE INDEX idx_orders_active ON orders(status) WHERE status IN ('pending','paid');

-- GIN 索引（适合 JSONB、数组、全文检索）
CREATE INDEX idx_customers_tags ON customers USING GIN(tags);
```

**索引注意事项：**
- 索引不是越多越好：每个索引都会降低写入性能（INSERT/UPDATE 时要同步更新索引）
- 区分度低的字段（如性别、状态只有几个值）单独建索引效果差，适合做复合索引的一部分
- 用 `EXPLAIN ANALYZE` 验证查询是否走了索引
- 字符串模糊查询 `LIKE '%xxx%'` 不走 B-tree 索引，需要全文检索或 trigram 索引

### 2.5 约束设计

```sql
-- NOT NULL：非空
name VARCHAR(100) NOT NULL

-- UNIQUE：唯一
order_no VARCHAR(50) UNIQUE

-- CHECK：值范围或格式
amount NUMERIC(12,2) CHECK (amount >= 0)
status VARCHAR(20) CHECK (status IN ('pending','paid','shipped'))

-- 外键：参照完整性
customer_id BIGINT REFERENCES customers(id)
-- 级联删除：主表删除时，关联表自动删除
order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE
-- 级联更新：主表 ID 更新时，关联表同步更新（一般用不到，因为主键不改）
```

### 2.6 updated_at 自动更新

```sql
-- 创建触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为每张表绑定触发器
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2.7 写入测试数据

每表录入 20~50 条测试数据，包含：
- 正常数据
- 边界值（金额为 0、日期最早/最晚、状态枚举的每个值）
- 关联数据（确保主表和从表能对应上）

```sql
INSERT INTO customers (name, phone, level) VALUES
('张三', '13800138001', 'vip'),
('李四', '13800138002', 'normal'),
('王五', '13800138003', 'svip');
```

### 2.8 验证关键查询

建表后，用典型查询语句测试，并用 `EXPLAIN ANALYZE` 确认走索引：

```sql
EXPLAIN ANALYZE
SELECT o.*, c.name AS customer_name
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.status = 'pending' AND o.created_at > '2026-01-01'
ORDER BY o.created_at DESC
LIMIT 20;
```

看执行计划中是否有 `Index Scan`，如果是 `Seq Scan`（全表扫描）说明索引没生效，需要调整。

## 完成标准

- [ ] 所有表已创建，字段类型正确
- [ ] 主键、外键、约束已添加
- [ ] 所有 WHERE/JOIN/ORDER BY 字段已建索引
- [ ] updated_at 触发器已配置
- [ ] 测试数据已录入（每表 20~50 条）
- [ ] 关键查询已用 EXPLAIN ANALYZE 验证走索引
- [ ] 表结构已经和用户确认

## 下一步

进入阶段3：妙搭应用创建与配置（读取 `phase-3-miaoda-setup.md`）
