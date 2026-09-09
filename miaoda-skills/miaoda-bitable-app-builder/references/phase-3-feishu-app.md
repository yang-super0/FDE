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
在「权限管理」中按最小权限原则添加（不要申请用不到的宽权限）：
- ✅ `bitable:app` — 多维表格读写（必须；官方附件素材上传/临时下载接口的"开启任一"权限列表也包含它）
- ✅ `contact:user.id:readonly` — 通讯录用户ID（用到人员字段时必须）
- 涉及附件上传/下载时，按需添加素材级权限（不必申请云空间全量权限）：
  - ✅ 「上传云文档中的图片和附件」— 附件上传（官方上传接口为"开启任一"，`bitable:app` 亦满足）
  - ✅ 「下载云文档中的图片和附件」— 附件下载/预览（获取素材临时下载链接）

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
- [ ] 附件功能（如有）：素材级上传/下载权限已按需添加
- [ ] 应用已发布审批通过
- [ ] tenant_access_token 测试通过
