# 字段适配层详细参考

## 核心原则
多维表格字段类型与普通数据库不同，必须建立适配层统一处理。

## 开工前：先核验真实字段（强制，不可跳过）
**禁止凭需求文档、字段名或截图想当然地写字段映射。** 单选/多选/人员/关联/公式等类型的读写方式各不相同，误判类型会直接导致读取为空或写入失败。

在写任何字段相关代码前，先回读线上表的真实定义并记录：
1. **真实字段名**（以线上为准，可能与需求文档用词不同）
2. **字段类型**（文本/单选/多选/数字/日期/人员/关联/附件/公式…）
3. **单选/多选的全部枚举选项文本**（写入必须逐字一致）
4. 标注并**忽略空列、废列**（线上表常残留无内容的占位字段）

把核对结果作为适配层 `COLUMN_MAP` 的唯一依据；后续若线上改了字段，重新回读并同步，而不是沿用旧假设。

> 高频误判：字段叫"所属行业/客户规模/推荐类型"，看起来像文本，实际是**单选**。单选读取拿到的是选项文本（结构与纯文本不同），按文本字段处理会取空。详见 `pitfalls.md` 坑11。

## 各字段类型适配规则

### 文本（Text）
- 写入：`string`
- 读取：`string`
- 注意：空值可能是 `null` 或 `""`，需统一处理

### 数字（Number）
- 写入：`number`
- 读取：`number`
- 注意：NaN 会导致写入失败，写入前必须校验

### 日期（DateTime）
- 写入：`number`（毫秒时间戳）
- 读取：`number`（毫秒时间戳）
- 前端需转换为可读日期格式
- 注意：秒级时间戳会导致日期错误，必须用毫秒

### 单选（SingleSelect）⚠️ 易被误当文本
- 写入：`string`（选项文本，必须与线上选项逐字一致，含大小写/空格）
- 读取：选项文本 `string`，但其字段类型是单选，**不要因为"值是一段文字"就按文本字段处理**
- 注意：
  - 写入值必须与表中选项完全一致（大小写、空格），否则写入失败（坑6）
  - 匹配/筛选时按"选项文本相等或包含"处理；要支持简称/关键词匹配到完整选项（如输入行业简称能命中对应完整选项），并提供"其他/通用"回退项，匹配不到时不返回空
  - 开工前先拉取全部选项枚举，代码中用常量定义，不硬编码猜测值

### 多选（MultiSelect）
- 写入：`string[]`
- 读取：`string[]`
- 注意：空值可能是 `null` 或 `[]`；选项文本同样需与线上一致

### 人员（User）⚠️ 高风险
- 写入：`[{"id": "<ID字符串>"}]`（对象数组；记录写接口仅支持传入 `id` 参数，ID 类型由接口 `user_id_type` 参数决定，支持 open_id/union_id/user_id，均为字符串，默认 open_id）
- 读取：`[{id: string, name: string, en_name: string}]`
- 要求：飞书应用必须有 `contact:user.id:readonly` 权限——无此权限时无法通过通讯录接口把业务侧的姓名/手机号/邮箱换成可写入的用户 ID
- 无权限时：在表单层禁用人员字段并提示「需管理员开通通讯录权限后启用」，或改用文本字段存人名（设计期降级建议见阶段2.3）；插件通道在发布环境写操作必失败（坑1），禁止作为降级路径

### 关联（Link）⚠️ 高风险
- 写入：`[{id: "rec_xxx"}]`
- 读取原生API：`{link_record_ids: ["rec_xxx"], text: []}`
- 读取插件：`[{id: "rec_xxx", title: "名称"}]`
- **关键差异**：原生API不返回关联记录标题，必须二次查询回填
- 回填实现：
  1. 收集所有 link_record_ids
  2. 批量查询关联表（用 search 接口，filter 用 record_ids）
  3. 建立 ID→标题 映射
  4. 回填到主表数据

### 附件（Attachment）⚠️ 高风险
- 写入：`[{file_token: "xxx"}]`
- 读取：`[{file_token: string, name: string, type: string, size: number, url: string, tmp_url: string}]`——`url` 需 access token 鉴权、不能直接给前端当下载地址；`tmp_url` 是获取临时链接的接口地址，同样不可直用
- 流程：先上传文件获取 file_token（上传用素材上传接口，权限为"开启任一"，见阶段3.2），再写入记录
- **下载/预览正确姿势**：后端以 file_token 现调 `GET /open-apis/drive/v1/medias/batch_get_tmp_download_url`（高级权限多维表格需带 extra 参数）换取 `tmp_download_url` 给前端；**临时链接 24 小时失效、一次最多 5 个 file_token**——每次展示现取，禁止缓存、禁止落库、禁止当永久地址
- 不要用占位链接或只做按钮样式（坑16）

### 公式（Formula）
- 写入：只读，不可写入
- 读取：计算结果（可能是 string/number/boolean）
- 注意：公式字段返回类型不确定，需做类型判断

### 创建时间/修改时间
- 系统自动生成，只读
- 读取：毫秒时间戳

## real-column-map.ts 配置示例
```typescript
// 依据"回读真实字段"的结果填写，type 必须与线上一致
export const COLUMN_MAP = {
  orders: {
    orderNo: { type: 'text', name: '订单编号' },
    customer: { type: 'link', name: '关联客户', linkTable: 'customers', linkField: 'name' },
    amount: { type: 'number', name: '订单金额' },
    status: { type: 'select', name: '订单状态' }, // 单选，不是 text
    salesperson: { type: 'user', name: '销售员' },
    createdAt: { type: 'date', name: '创建时间' },
  },
}
```

## 双通道数据返回格式统一
原生API和插件API返回格式不同，适配层必须统一输出格式：
```typescript
// 统一输出格式
interface BitableRecord {
  record_id: string;
  fields: Record<string, any>; // 已转换为业务字段名和标准类型
}
```
