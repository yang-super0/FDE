# 妙搭应用开发 Skills 合集

本仓库包含两套基于飞书妙搭平台的应用开发工作流 Skill，分别针对不同数据源场景，覆盖从需求分析到发布上线的完整 8 阶段流程。

## 目录结构

```
miaoda-skills/
├── README.md                          # 本说明文件
├── miaoda-bitable-app-builder/        # 妙搭 + 飞书多维表格 开发 Skill
│   ├── SKILL.md                       # 主流程文档（8阶段完整工作流）
│   ├── QUICKSTART.md                  # 开工前速查卡
│   └── references/                    # 详细参考文档
│       ├── phase-1-requirements.md    # 阶段1：需求分析
│       ├── phase-2-bitable-design.md  # 阶段2：多维表格设计
│       ├── phase-3-feishu-app.md      # 阶段3：飞书自建应用配置
│       ├── phase-4-miaoda-setup.md    # 阶段4：妙搭应用创建与配置
│       ├── phase-5-development.md     # 阶段5：开发实现（分模块）
│       ├── phase-6-testing.md         # 阶段6：测试验证
│       ├── phase-7-publish.md         # 阶段7：发布上线
│       ├── ai-component-patterns.md   # AI 组件四层兜底模式
│       ├── data-lineage.md            # 多表数据血缘与连通性
│       ├── field-adaptation.md        # 字段适配规则
│       ├── pitfalls.md                # 常见坑与解决方案
│       └── checklists.md              # 全阶段检查清单
└── miaoda-postgres-app-builder/       # 妙搭 + 内置 PostgreSQL 开发 Skill
    ├── SKILL.md                       # 主流程文档（8阶段完整工作流）
    ├── QUICKSTART.md                  # 开工前速查卡
    └── references/                    # 详细参考文档
        ├── phase-1-requirements.md    # 阶段1：需求分析
        ├── phase-2-database-design.md # 阶段2：数据库设计
        ├── phase-3-miaoda-setup.md    # 阶段3：妙搭应用创建与配置
        ├── phase-4-development.md     # 阶段4：开发实现（分模块）
        ├── phase-5-testing.md         # 阶段5：测试验证
        ├── phase-6-publish.md         # 阶段6：发布上线
        ├── sql-best-practices.md      # SQL 与性能最佳实践
        ├── pitfalls.md                # 常见坑与解决方案
        └── checklists.md              # 全阶段检查清单
```

## Skill 对比与选型

| 维度 | 妙搭 + 多维表格 | 妙搭 + 内置 PostgreSQL |
|------|----------------|----------------------|
| 数据存储 | 飞书多维表格（外部 SaaS） | 妙搭内置 Serverless PostgreSQL |
| 单次查询延迟 | 200~500ms（HTTP API） | 1~10ms（内网数据库） |
| 复杂查询 | 不支持 JOIN，需内存拼接 | 原生 SQL JOIN / 子查询 / 窗口函数 |
| 聚合统计 | 拉全量到内存算 | 原生 GROUP BY / SUM / COUNT |
| 事务 | 不支持 | 完整 ACID 事务支持 |
| 大数据量 | 单页 500 条，需多次分页 | 千万级行秒级响应（有索引） |
| 协作能力 | 多人在线编辑、评论、视图 | 无（需自己开发权限和界面） |
| 适用场景 | 协作型、轻量、快速搭建 | 高性能、复杂查询、数据量大 |

**选择原则：**
- 需要多人协作编辑数据、用多维表格自带视图 → 选 `miaoda-bitable-app-builder`
- 追求性能、复杂查询、大数据量 → 选 `miaoda-postgres-app-builder`

## 核心原则（两套 Skill 共同遵守）

1. **先设计数据结构，再写代码** — 表结构是地基，设计不好后期改表成本高
2. **小步快跑·单模块闭环** — 一次只开发一个模块，开发→预览自测通过→再做下一个
3. **预览≠发布** — 编辑器预览正常不算完成，必须到线上正式地址验证
4. **编译通过≠功能正确，AI 自查≠真的通过** — 必须以用户视角逐项实测

## 各自的避坑铁律

### 多维表格版（4 条）
1. **凡字段必核验** — 字段名/类型/单选枚举以线上真实定义为准，禁止凭假设
2. **建表≠连通** — 每张表必须能指出被哪个页面/AI 用到，并实测取到数
3. **确定性归规则，不确定才归 AI** — 筛选/排序/兜底用确定性代码，AI 只负责生成文案
4. **必须实现关联字段标题回填** — 原生 API 只返回 record_id，不返回标题

### PostgreSQL 版（4 条）
1. **凡查询必看执行计划** — 慢查询先 `EXPLAIN ANALYZE`，不要凭感觉加索引
2. **N+1 查询是万恶之源** — 列表页必须改成 JOIN 或批量 IN 查询
3. **事务边界要清晰** — 多表写入必须包在事务里，避免部分成功部分失败
4. **索引先行** — 凡是 WHERE / JOIN / ORDER BY 用到的字段，必须建索引

## 8 阶段工作流概览

| 阶段 | 多维表格版 | PostgreSQL 版 |
|------|-----------|--------------|
| 1 | 需求分析（页面/数据表/AI 三张清单） | 需求分析（含 ER 图） |
| 2 | 多维表格设计（字段类型、测试数据） | 数据库设计（表结构、索引、约束） |
| 3 | 飞书自建应用配置（获取原生 API 凭证） | 妙搭应用创建与配置（确认数据库挂载） |
| 4 | 妙搭应用创建与配置（双通道数据层） | 开发实现（分模块小闭环） |
| 5 | 开发实现（分模块小闭环） | 测试验证（全量+跨模块联调） |
| 6 | 测试验证（全量+跨模块联调） | 发布上线（线上冒烟测试） |
| 7 | 发布上线（线上冒烟测试） | 运维迭代（慢查询优化、分支管理） |
| 8 | 运维迭代（持续迭代不翻车） | — |

## 使用方式

将对应 Skill 目录放置到你的 Agent 技能目录（如 `.user_skills/`）下，系统会自动识别。开工前先阅读对应 Skill 的 `QUICKSTART.md` 速查卡，再按 `SKILL.md` 的 8 阶段流程执行。

## 关键技术决策速查

### 多维表格版
- 数据通道：原生 HTTP 优先，插件兜底（插件通道发布环境写操作报 `kctx is nil`）
- 人员字段：第一版用文本，熟练后再用人员类型
- 关联字段：必须实现标题回填
- 附件字段：第一版省略
- AI 结果：规则打底 + AI 表达 + 空值兜底 + 结果校验

### PostgreSQL 版
- 主键：BIGSERIAL（自增）或 UUID
- 金额字段：NUMERIC(12,2)，禁止用 FLOAT/REAL
- 时间字段：TIMESTAMPTZ（带时区）
- 删除方式：软删除（deleted_at）
- 关联查询：原生 SQL JOIN，避免 N+1
- 多表写入：事务（BEGIN / COMMIT）
- 用户输入：参数化查询（防 SQL 注入）
- 改表结构：先建数据库分支，验证后合并（利用 Time Travel 回退）

## 文件统计

| Skill | 文件数 | 参考文档数 |
|-------|--------|-----------|
| miaoda-bitable-app-builder | 15 | 12 |
| miaoda-postgres-app-builder | 11 | 8 |
| **合计** | **26** | **20** |
