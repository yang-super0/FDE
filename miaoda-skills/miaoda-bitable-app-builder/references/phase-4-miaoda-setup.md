# 阶段4：妙搭应用创建与配置

## 目标
创建妙搭应用并配置数据源连接。

## 执行步骤

### 4.1 创建应用
1. 访问 https://miaoda.feishu.cn
2. 新建应用 → 空白应用
3. 进入AI开发界面

### 4.2 配置环境变量（关键）
在项目根目录 `.env` 文件中配置：
```env
# 日志
LOG_DIR=./logs
LOG_REQUEST_BODY=true
LOG_RESPONSE_BODY=true

# 飞书多维表格原生API通道
FEISHU_APP_ID=cli_xxxxx
FEISHU_APP_SECRET=xxxxx
FEISHU_BASE_TOKEN=xxxxx
FEISHU_BITABLE_ENABLED=true
```

### 4.3 后端数据层架构要求
实现双通道 BitableService：
```
BitableService
  ├─ FeishuBitableClient（原生HTTP，优先）
  │   └─ 用 tenant_access_token 调用飞书OpenAPI
  └─ PluginBitableClient（插件通道，兜底）
      └─ 预览环境正常，发布环境写操作报 kctx is nil
```

**初始化顺序强制要求**：
- `FeishuBitableClient` 必须在 `BitableService` 之前注册
- 否则 `onModuleInit` 时凭证未加载完，会误判原生通道不可用

### 4.4 字段映射配置
创建 `real-column-map.ts`，声明每张表的字段名和类型。
详细字段适配规则见 `field-adaptation.md`。

## 完成标准
- [ ] 应用已创建
- [ ] .env 凭证已正确配置
- [ ] 双通道数据层已实现
- [ ] provider 注册顺序正确
- [ ] 字段映射配置已创建
