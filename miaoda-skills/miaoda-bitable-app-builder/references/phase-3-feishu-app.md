# 阶段3：飞书自建应用配置

## 目标
获取原生API凭证，确保发布环境写操作正常。**这是最关键的一步，跳过会导致发布后所有写操作报500。**

## 执行步骤

### 3.1 创建应用
1. 访问 https://open.feishu.cn
2. 创建企业自建应用，命名如「XX管理系统」
3. 记录凭证：
   - App ID（形如 cli_xxxxx）
   - App Secret（一长串字母数字）

### 3.2 配置权限
在「权限管理」中添加：
- ✅ `bitable:app` — 多维表格读写（必须）
- ✅ `bitable:app:readonly` — 多维表格只读
- ✅ `contact:user.id:readonly` — 通讯录用户ID（用到人员字段时必须）
- ✅ `drive:drive` — 云文档（附件上传可能需要）

### 3.3 发布应用
- 「版本管理与发布」→ 创建版本 → 申请发布
- 等待管理员审批通过
- ⚠️ 权限未审批通过，原生API调用会失败

### 3.4 验证凭证可用
用 curl 测试获取 tenant_access_token：
```bash
curl -X POST https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal \
  -H "Content-Type: application/json" \
  -d '{"app_id":"cli_xxx","app_secret":"xxx"}'
```
返回 `code:0` 且有 `tenant_access_token` 即为可用。

## 完成标准
- [ ] App ID 和 App Secret 已记录
- [ ] bitable:app 权限已添加
- [ ] 应用已发布审批通过
- [ ] tenant_access_token 测试通过
