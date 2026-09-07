/* 前后端共享的类型写在这里 */

/* ============ 通用 ============ */

export interface PageResult<T> {
  items: T[];
  total: number;
}

export interface PageParams {
  page: number;
  pageSize: number;
}

/* ============ 操作日志 ============ */

export type OperationActionType =
  | 'create'
  | 'update'
  | 'delete'
  | 'approve'
  | 'status_change';

export interface OperationLogRecord {
  id: string;
  module: string;
  actionType: string;
  target: string;
  operatorId: string;
  operatorName: string;
  createdAt: string;
}

export interface OperationLogListParams extends PageParams {
  actionType?: string;
  from?: string;
  to?: string;
}

export interface OperationLogListResponse
  extends PageResult<OperationLogRecord> {}

/* ============ 客户管理 ============ */

export type CustomerStatus = 'potential' | 'active' | 'churned';

export interface Customer {
  id: string;
  name: string;
  industry: string;
  contactName: string;
  contactPhone: string;
  source: string;
  status: CustomerStatus;
  createdAt: string;
}

export interface FollowRecord {
  id: string;
  customerId: string;
  method: string;
  content: string;
  nextFollowAt: string;
  creatorName: string;
  createdAt: string;
}

export type OpportunityStage =
  | 'contact'
  | 'requirement'
  | 'quotation'
  | 'closed';

export interface Opportunity {
  id: string;
  name: string;
  customerId: string;
  customerName: string;
  stage: OpportunityStage;
  amount: number;
  expectedCloseAt: string;
}

/* ============ 广告业务 ============ */

export type CampaignStatus = 'preparing' | 'running' | 'paused' | 'finished';

export interface AdCampaign {
  id: string;
  name: string;
  customerId: string;
  customerName: string;
  platform: string;
  budget: number;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
}

export interface CampaignMetrics {
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  cost: number;
}

export interface AdCampaignDetail extends AdCampaign {
  metrics: CampaignMetrics;
}

export type PerformanceGranularity = 'day' | 'week' | 'month';

export interface PerformanceTrendItem {
  period: string;
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
}

export interface PerformanceDetailItem {
  id: string;
  statDate: string;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  cost: number;
  overThreshold: boolean;
}

/* ============ 视频业务 ============ */

export type VideoStage = 'script' | 'shooting' | 'post' | 'review' | 'delivered';

export interface VideoProject {
  id: string;
  name: string;
  customerId: string;
  customerName: string;
  videoType: string;
  durationRequirement: string;
  stage: VideoStage;
  stageRemark: string;
  assigneeId: string;
  assigneeName: string;
  deadline: string;
}

export interface ReviewComment {
  id: string;
  content: string;
  creatorName: string;
  createdAt: string;
}

export interface VideoStageStat {
  stage: VideoStage;
  count: number;
}

/* ============ 合同管理 ============ */

export type ContractStatus = 'pending' | 'active' | 'expired' | 'terminated';
export type ContractApprovalAction = 'approved' | 'rejected';

export interface Contract {
  id: string;
  code: string;
  customerId: string;
  customerName: string;
  contractType: string;
  amount: number | string | null;
  signDate: string;
  expireDate: string;
  status: ContractStatus;
  rejectReason: string;
  expiringSoon: boolean;
  content: string;
}

export interface ContractApprovalRecord {
  action: ContractApprovalAction;
  comment: string;
  approverName: string;
  createdAt: string;
}

export interface ContractDetail extends Contract {
  approvals: ContractApprovalRecord[];
}

export interface ContractSummary {
  total: number;
  active: number;
  expiring: number;
}

/* ============ 财务管理 ============ */

export type FinanceRecordType = 'income' | 'expense';
export type FinanceRelatedType = 'contract' | 'campaign' | 'other';

export interface FinanceRecord {
  id: string;
  recordType: FinanceRecordType;
  relatedType: FinanceRelatedType;
  relatedId: string;
  relatedName: string;
  amount: number;
  recordDate: string;
  remark: string;
}

export interface FinanceSummary {
  income: number;
  expense: number;
  profit: number;
  incomeRatio: number;
  expenseRatio: number;
}

export interface FinanceMonthlyTrendItem {
  month: string;
  income: number;
  expense: number;
}

/* ============ 人资管理 ============ */

export interface DepartmentNode {
  id: string;
  name: string;
  parentId: string | null;
  headcount: number;
  children: DepartmentNode[];
}

export interface Employee {
  id: string;
  name: string;
  employeeNo: string;
  departmentId: string;
  departmentName: string;
  position: string;
  hireDate: string;
  phone: string;
}

export type AttendanceStatus = 'normal' | 'late' | 'early' | 'absent';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  departmentName: string;
  attendDate: string;
  status: AttendanceStatus;
}

export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
  id: string;
  applicantId: string;
  applicantName: string;
  leaveType: string;
  startTime: string;
  endTime: string;
  reason: string;
  status: LeaveStatus;
  approverName: string;
}

/* ============ 行政管理 ============ */

export type AssetStatus = 'in_stock' | 'in_use' | 'repairing';

export interface Asset {
  id: string;
  name: string;
  assetNo: string;
  holderId: string;
  holderName: string;
  status: AssetStatus;
}

export interface AssetSummary {
  total: number;
  inUse: number;
  inStock: number;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  publisherName: string;
  createdAt: string;
}

/* ============ 任务中心 ============ */

export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'doing' | 'done';
export type TaskDisplayStatus = TaskStatus | 'overdue';

export interface Task {
  id: string;
  title: string;
  description: string;
  assigneeId: string;
  assigneeName: string;
  priority: TaskPriority;
  status: TaskDisplayStatus;
  deadline: string;
}

export interface TaskSummary {
  overdueCount: number;
}

/* ============ 系统管理 ============ */

export type SystemUserStatus = 'enabled' | 'disabled';

export interface SystemUser {
  id: string;
  memberId: string;
  memberName: string;
  department: string;
  roleId: string;
  roleName: string;
  status: SystemUserStatus;
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

export interface SysConfig {
  id: string;
  configKey: string;
  configValue: string;
  description: string;
}

/* ============ 业务支持 ============ */

export type TicketStatus = 'pending' | 'processing' | 'resolved';

export interface Ticket {
  id: string;
  category: string;
  title: string;
  description: string;
  status: TicketStatus;
  resolution: string;
  submitterName: string;
  createdAt: string;
}

export interface TicketSummary {
  pendingCount: number;
  resolvedThisWeek: number;
  avgResponseHours: number;
}

export interface KnowledgeDoc {
  id: string;
  category: string;
  title: string;
  summary: string;
}

export interface KnowledgeDocDetail extends KnowledgeDoc {
  content: string;
  createdAt: string;
}

/* ============ 工作台看板 ============ */

export interface DashboardSummary {
  monthRevenue: number;
  monthRevenueRatio: number;
  customerTotal: number;
  customerRatio: number;
  runningCampaigns: number;
  pendingTasks: number;
  expiringContracts: number;
}

export interface RevenueTrendItem {
  month: string;
  revenue: number;
}

export interface BusinessShareItem {
  name: string;
  value: number;
}

export interface TodoItem {
  id: string;
  title: string;
  priority: TaskPriority;
  deadline: string;
  assigneeName: string;
}

export interface ActivityItem {
  id: string;
  module: string;
  actionType: string;
  target: string;
  operatorName: string;
  time: string;
}

// ===== 客户公海与线索管理 =====
export type PoolLeadStatus =
  | '未分配'
  | '已领取'
  | '已分配'
  | '已转化'
  | '无效';

export interface PoolLead {
  id: string;
  subjectName: string;
  leadLevel: string;
  industry1: string;
  industry2: string;
  contactPerson: string;
  contactPhone: string;
  status: PoolLeadStatus;
  assignedTo: string;
  assignedAt: string | null;
  createdBy: string;
  remark: string;
  createdAt: string;
}

export interface CreatePoolLeadRequest {
  subjectName: string;
  leadLevel?: string;
  industry1?: string;
  industry2?: string;
  contactPerson?: string;
  contactPhone?: string;
  remark?: string;
}

export type UpdatePoolLeadRequest = Partial<CreatePoolLeadRequest>;

export interface PoolLeadListParams {
  subjectName?: string;
  leadLevel?: string;
  industry1?: string;
  industry2?: string;
  status?: string;
  createdBy?: string;
  startTime?: string;
  endTime?: string;
  page?: number;
  pageSize?: number;
}

export interface PoolLeadListResult extends PageResult<PoolLead> {}

export interface PoolAssignRequest {
  ids: string[];
  assignee: string;
}

export interface PoolAnalyticsSummary {
  total: number;
  claimed: number;
  converted: number;
  claimRate: number;
  convertRate: number;
  avgCycleDays: number;
}

export interface PoolMonthlyTrendItem {
  month: string;
  claimRate: number;
  convertRate: number;
}

export interface PoolCycleDistributionItem {
  range: string;
  count: number;
}

export interface PoolPersonComparisonItem {
  assignee: string;
  claimed: number;
  converted: number;
  convertRate: number;
}

export interface PoolAnalytics {
  summary: PoolAnalyticsSummary;
  monthlyTrend: PoolMonthlyTrendItem[];
  cycleDistribution: PoolCycleDistributionItem[];
  personComparison: PoolPersonComparisonItem[];
}

export type LeadStatus = '待跟进' | '跟进中' | '已转化' | '已放弃';

export interface Lead {
  id: string;
  leadName: string;
  contactPerson: string;
  contactPhone: string;
  industry: string;
  source: string;
  status: LeadStatus;
  owner: string;
  nextFollowUpAt: string | null;
  convertedCustomerId: string | null;
  convertedAt: string | null;
  remark: string;
  createdAt: string;
}

export interface CreateLeadRequest {
  leadName: string;
  contactPerson?: string;
  contactPhone?: string;
  industry?: string;
  source?: string;
  owner?: string;
  nextFollowUpAt?: string;
  remark?: string;
}

export type UpdateLeadRequest = Partial<CreateLeadRequest>;

export interface LeadListParams {
  leadName?: string;
  contactPerson?: string;
  industry?: string;
  source?: string;
  status?: string;
  owner?: string;
  startTime?: string;
  endTime?: string;
  page?: number;
  pageSize?: number;
}

export interface LeadListResult extends PageResult<Lead> {}

export interface LeadFollowUp {
  id: string;
  followUpType: string;
  content: string;
  followUpAt: string;
  followUpBy: string;
  nextAction: string;
}

export interface LeadDetail extends Lead {
  followUps: LeadFollowUp[];
}

export interface AddFollowUpRequest {
  followUpType: string;
  content: string;
  followUpAt?: string;
  nextAction?: string;
  nextFollowUpAt?: string;
}

export interface ConvertLeadRequest {
  customerName: string;
  industry?: string;
  contactName?: string;
  contactPhone?: string;
}

export interface AbandonLeadRequest {
  reason: string;
}

// ===== 广告业务模块 =====
export type AdApplicationStatus =
  | '待审批'
  | '通过'
  | '驳回'
  | '已开户'
  | '取消';

export interface AdApplication {
  id: string;
  applicationNo: string;
  groupName: string;
  subjectName: string;
  platform: string;
  portType: string;
  accountType: string;
  status: AdApplicationStatus;
  applicant: string;
  approver: string;
  approvedAt: string | null;
  rejectReason: string;
  remark: string;
  createdAt: string;
}

export interface CreateAdApplicationRequest {
  groupName: string;
  subjectName: string;
  platform: string;
  portType?: string;
  accountType?: string;
  remark?: string;
}

export type UpdateAdApplicationRequest = Partial<CreateAdApplicationRequest>;

export interface AdApplicationListParams {
  applicationNo?: string;
  groupName?: string;
  subjectName?: string;
  platform?: string;
  portType?: string;
  status?: string;
  startTime?: string;
  endTime?: string;
  page?: number;
  pageSize?: number;
}

export interface AdApplicationListResult
  extends PageResult<AdApplication> {}

export interface ApproveApplicationRequest {
  approved: boolean;
  rejectReason?: string;
}

export interface AdApplicationDetail extends AdApplication {
  account: AdAccount | null;
}

export type AdAccountStatus = '正常' | '暂停' | '欠费' | '注销';

export interface AdAccount {
  id: string;
  accountNo: string;
  accountName: string;
  groupName: string;
  subjectName: string;
  platform: string;
  portType: string;
  status: AdAccountStatus;
  balance: number;
  totalRecharge: number;
  totalConsume: number;
  salesperson: string;
  openedAt: string | null;
  applicationId: string | null;
  remark: string;
  createdAt: string;
}

export interface CreateAdAccountRequest {
  accountName: string;
  platform: string;
  groupName?: string;
  subjectName?: string;
  portType?: string;
  balance?: number;
  salesperson?: string;
  remark?: string;
}

export type UpdateAdAccountRequest = Partial<CreateAdAccountRequest> & {
  status?: string;
};

export interface AdAccountListParams {
  accountNo?: string;
  accountName?: string;
  groupName?: string;
  subjectName?: string;
  platform?: string;
  portType?: string;
  status?: string;
  salesperson?: string;
  lowBalance?: boolean;
  page?: number;
  pageSize?: number;
}

export interface AdAccountListResult extends PageResult<AdAccount> {}

export interface AdFilingBrief {
  id: string;
  filingNo: string;
  productName: string;
  status: string;
  createdAt: string;
}

export interface AdTransferBrief {
  id: string;
  transferNo: string;
  toSubject: string;
  status: string;
  createdAt: string;
}

export interface AdAccountDetail extends AdAccount {
  filings: AdFilingBrief[];
  transfers: AdTransferBrief[];
}

export interface RechargeRequest {
  amount: number;
}

export type AdFilingStatus = '待审核' | '通过' | '驳回' | '已报备';

export interface AdFiling {
  id: string;
  filingNo: string;
  accountId: string | null;
  accountName: string;
  groupName: string;
  subjectName: string;
  platform: string;
  industry: string;
  productName: string;
  status: AdFilingStatus;
  applicant: string;
  reviewer: string;
  reviewedAt: string | null;
  rejectReason: string;
  filingMaterial: string;
  remark: string;
  createdAt: string;
}

export interface CreateAdFilingRequest {
  accountId: string;
  industry?: string;
  productName?: string;
  filingMaterial?: string;
  remark?: string;
}

export interface AdFilingListParams {
  filingNo?: string;
  accountName?: string;
  groupName?: string;
  subjectName?: string;
  platform?: string;
  industry?: string;
  status?: string;
  startTime?: string;
  endTime?: string;
  page?: number;
  pageSize?: number;
}

export interface AdFilingListResult extends PageResult<AdFiling> {}

export interface ReviewFilingRequest {
  approved: boolean;
  rejectReason?: string;
}

export type AdTransferStatus =
  | '待审批'
  | '通过'
  | '驳回'
  | '已转户'
  | '取消';

export interface AdTransfer {
  id: string;
  transferNo: string;
  accountId: string | null;
  accountName: string;
  fromSubject: string;
  toSubject: string;
  fromPort: string;
  toPort: string;
  status: AdTransferStatus;
  applicant: string;
  approver: string;
  approvedAt: string | null;
  rejectReason: string;
  transferReason: string;
  remark: string;
  createdAt: string;
}

export interface CreateAdTransferRequest {
  accountId: string;
  toSubject: string;
  toPort: string;
  transferReason?: string;
}

export interface AdTransferListParams {
  transferNo?: string;
  accountName?: string;
  fromSubject?: string;
  toSubject?: string;
  status?: string;
  startTime?: string;
  endTime?: string;
  page?: number;
  pageSize?: number;
}

export interface AdTransferListResult extends PageResult<AdTransfer> {}

export interface ApproveTransferRequest {
  approved: boolean;
  rejectReason?: string;
}

export type CommissionRuleType = '按比例' | '固定金额' | '阶梯';
export type CommissionRuleStatus = '启用' | '停用';

export interface CommissionRule {
  id: string;
  ruleName: string;
  ruleType: CommissionRuleType;
  platform: string;
  portType: string;
  minAmount: number | null;
  maxAmount: number | null;
  rate: number | null;
  fixedAmount: number | null;
  status: CommissionRuleStatus;
  effectiveDate: string | null;
  expireDate: string | null;
  createdBy: string;
  remark: string;
  createdAt: string;
}

export interface CreateCommissionRuleRequest {
  ruleName: string;
  ruleType: CommissionRuleType;
  platform?: string;
  portType?: string;
  minAmount?: number;
  maxAmount?: number;
  rate?: number;
  fixedAmount?: number;
  effectiveDate?: string;
  expireDate?: string;
  remark?: string;
}

export type UpdateCommissionRuleRequest =
  Partial<CreateCommissionRuleRequest> & { status?: string };

export interface CommissionRuleListParams {
  ruleName?: string;
  ruleType?: string;
  platform?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface CommissionRuleListResult
  extends PageResult<CommissionRule> {}

export type CommissionRecordStatus = '待发放' | '已发放' | '取消';

export interface CommissionRecord {
  id: string;
  recordNo: string;
  salesperson: string;
  accountId: string | null;
  accountName: string;
  groupName: string;
  platform: string;
  period: string;
  consumeAmount: number;
  ruleId: string | null;
  commissionAmount: number;
  status: CommissionRecordStatus;
  calculatedAt: string | null;
  paidAt: string | null;
  paidBy: string;
  remark: string;
  createdAt: string;
}

export interface CommissionRecordDetail extends CommissionRecord {
  rule: CommissionRule | null;
}

export interface CommissionRecordListParams {
  recordNo?: string;
  salesperson?: string;
  accountName?: string;
  groupName?: string;
  platform?: string;
  period?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface CommissionRecordListResult
  extends PageResult<CommissionRecord> {}

export interface CalculateCommissionRequest {
  period: string;
  salesperson?: string;
}

// ==================== 财务核心 ====================

export type FinanceAccountStatus = '启用' | '停用';

export interface FinanceAccount {
  id: number;
  accountName: string;
  accountType: string;
  bankName: string;
  bankAccount: string;
  /** 字段级权限：null=不可见，string=脱敏占位 */
  balance: number | string | null;
  initialBalance: number;
  status: string;
  remark: string;
  createdAt: string;
}

export interface CreateFinanceAccountRequest {
  accountName: string;
  accountType?: string;
  bankName?: string;
  bankAccount?: string;
  initialBalance?: number;
  remark?: string;
}

export interface UpdateFinanceAccountRequest {
  accountName?: string;
  accountType?: string;
  bankName?: string;
  bankAccount?: string;
  remark?: string;
}

export interface FinanceAccountListParams {
  accountName?: string;
  accountType?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface FinanceAccountListResult
  extends PageResult<FinanceAccount> {}

export interface FinanceAccountTxn {
  direction: '收入' | '支出';
  bizNo: string;
  bizType: string;
  amount: number;
  counterparty: string;
  status: string;
  occurredAt: string;
}

// ---------- 收款 ----------

export type FinanceReceiptStatus = '待确认' | '已确认' | '已核销' | '已取消';

export interface FinanceReceipt {
  id: number;
  receiptNo: string;
  customerName: string;
  groupName: string;
  /** 字段级权限：null=不可见，string=脱敏占位 */
  amount: number | string | null;
  receiptType: string;
  paymentMethod: string;
  accountId: number | null;
  accountName: string;
  status: string;
  receiptDate: string;
  confirmedBy: string;
  confirmedAt: string | null;
  settlementId: number | null;
  settlementNo: string;
  relatedContract: string;
  remark: string;
  createdAt: string;
}

export interface CreateFinanceReceiptRequest {
  customerName: string;
  amount: number;
  groupName?: string;
  receiptType?: string;
  paymentMethod?: string;
  accountId?: number | null;
  receiptDate?: string;
  relatedContract?: string;
  remark?: string;
}

export interface UpdateFinanceReceiptRequest {
  customerName?: string;
  amount?: number;
  groupName?: string;
  receiptType?: string;
  paymentMethod?: string;
  accountId?: number | null;
  receiptDate?: string;
  relatedContract?: string;
  remark?: string;
}

export interface FinanceReceiptListParams {
  receiptNo?: string;
  customerName?: string;
  groupName?: string;
  receiptType?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface FinanceReceiptListResult
  extends PageResult<FinanceReceipt> {}

// ---------- 付款 ----------

export type FinancePaymentStatus =
  | '待审批'
  | '审批通过'
  | '审批驳回'
  | '已付款'
  | '已取消';

export interface FinancePayment {
  id: number;
  paymentNo: string;
  payeeName: string;
  /** 字段级权限：null=不可见，string=脱敏占位 */
  amount: number | string | null;
  paymentType: string;
  paymentMethod: string;
  accountId: number | null;
  accountName: string;
  status: string;
  paymentDate: string;
  applicant: string;
  approver: string;
  approvedAt: string | null;
  rejectReason: string;
  remark: string;
  createdAt: string;
}

export interface CreateFinancePaymentRequest {
  payeeName: string;
  amount: number;
  paymentType?: string;
  paymentMethod?: string;
  accountId?: number | null;
  paymentDate?: string;
  remark?: string;
}

export interface UpdateFinancePaymentRequest {
  payeeName?: string;
  amount?: number;
  paymentType?: string;
  paymentMethod?: string;
  accountId?: number | null;
  paymentDate?: string;
  remark?: string;
}

export interface FinancePaymentListParams {
  paymentNo?: string;
  payeeName?: string;
  paymentType?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface FinancePaymentListResult
  extends PageResult<FinancePayment> {}

export interface ApproveFinancePaymentRequest {
  approved: boolean;
  rejectReason?: string;
}

// ---------- 发票 ----------

export type FinanceInvoiceStatus =
  | '待开具'
  | '已开具'
  | '已寄出'
  | '已收讫'
  | '已作废';

export interface FinanceInvoice {
  id: number;
  invoiceNo: string;
  invoiceType: string;
  title: string;
  taxNumber: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  invoiceDate: string;
  customerName: string;
  status: string;
  drawer: string;
  expressNo: string;
  expressDate: string | null;
  remark: string;
  createdAt: string;
}

export interface CreateFinanceInvoiceRequest {
  title: string;
  amount: number;
  invoiceType?: string;
  taxNumber?: string;
  taxAmount?: number;
  customerName?: string;
  invoiceDate?: string;
  remark?: string;
}

export interface UpdateFinanceInvoiceRequest {
  title?: string;
  amount?: number;
  invoiceType?: string;
  taxNumber?: string;
  taxAmount?: number;
  customerName?: string;
  invoiceDate?: string;
  remark?: string;
}

export interface FinanceInvoiceListParams {
  invoiceNo?: string;
  title?: string;
  customerName?: string;
  invoiceType?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface FinanceInvoiceListResult
  extends PageResult<FinanceInvoice> {}

export interface SendFinanceInvoiceRequest {
  expressNo: string;
}

// ---------- 成本 ----------

export type FinanceCostStatus = '待核算' | '已核算' | '已结转';

export interface FinanceCost {
  id: number;
  costNo: string;
  costType: string;
  costCategory: string;
  /** 字段级权限：null=不可见，string=脱敏占位 */
  amount: number | string | null;
  relatedAccount: string;
  relatedCustomer: string;
  costDate: string;
  period: string;
  status: string;
  calculatedBy: string;
  calculatedAt: string | null;
  remark: string;
  createdAt: string;
}

export interface CreateFinanceCostRequest {
  costType: string;
  amount: number;
  costCategory?: string;
  relatedAccount?: string;
  relatedCustomer?: string;
  costDate?: string;
  period?: string;
  remark?: string;
}

export interface UpdateFinanceCostRequest {
  costType?: string;
  amount?: number;
  costCategory?: string;
  relatedAccount?: string;
  relatedCustomer?: string;
  costDate?: string;
  period?: string;
  remark?: string;
}

export interface FinanceCostListParams {
  costNo?: string;
  costType?: string;
  costCategory?: string;
  relatedAccount?: string;
  relatedCustomer?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface FinanceCostListResult extends PageResult<FinanceCost> {}

export interface FinanceCostSummaryItem {
  key: string;
  amount: number;
  count: number;
}

export interface FinanceCostTrendItem {
  period: string;
  amount: number;
}

export interface FinanceCostStats {
  byType: FinanceCostSummaryItem[];
  trend: FinanceCostTrendItem[];
}

// ---------- 结算单 ----------

export interface FinanceSettlement {
  id: number;
  settlementNo: string;
  customerName: string;
  groupName: string;
  period: string;
  consumeAmount: number;
  receiptAmount: number;
  costAmount: number;
  profitAmount: number;
  status: string;
  settlementDate: string;
  remark: string;
  createdAt: string;
}

export interface FinanceSettlementListParams {
  customerName?: string;
  period?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface FinanceSettlementListResult
  extends PageResult<FinanceSettlement> {}

export interface WriteOffFinanceReceiptRequest {
  settlementId: number;
}

// ---------- 财务报表 ----------

export interface FinanceReportRangeParams {
  preset?: 'month' | 'lastMonth' | 'quarter' | 'year';
  startDate?: string;
  endDate?: string;
}

export interface FinanceReportTotals {
  totalIncome: number;
  totalCost: number;
  totalProfit: number;
  profitRate: number;
  receivable: number;
  payable: number;
}

export interface FinanceProfitTrendItem {
  period: string;
  income: number;
  cost: number;
  profit: number;
}

export interface FinanceProfitReport {
  totals: FinanceReportTotals;
  trend: FinanceProfitTrendItem[];
}

export interface FinanceNamedAmountItem {
  name: string;
  amount: number;
}

export interface FinanceIncomeExpenseReport {
  totals: FinanceReportTotals;
  byAccount: FinanceNamedAmountItem[];
  incomeByType: FinanceNamedAmountItem[];
  expenseByType: FinanceNamedAmountItem[];
  trend: FinanceProfitTrendItem[];
}

export interface FinanceCostAnalysisReport {
  totals: FinanceReportTotals;
  byType: FinanceNamedAmountItem[];
  byCategory: FinanceNamedAmountItem[];
  trend: FinanceCostTrendItem[];
}

export interface FinanceReceivablePayableItem {
  customerName: string;
  receivable: number;
  payable: number;
}

export interface FinanceReceivablePayableReport {
  totals: FinanceReportTotals;
  items: FinanceReceivablePayableItem[];
}

// ==================== 视频业务核心 ====================

export interface VideoApproveRequest {
  approved: boolean;
  rejectReason?: string;
}

// ---------- 视频订单 ----------

export type VideoOrderStatus =
  | '待审核'
  | '已通过'
  | '已驳回'
  | '制作中'
  | '已交付'
  | '已完成';

export interface VideoOrder {
  id: number;
  orderNo: string;
  groupName: string;
  subjectName: string;
  videoType: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: string;
  salesperson: string;
  projectManager: string;
  orderDate: string;
  deliveryDate: string;
  rejectReason: string;
  remark: string;
  createdAt: string;
}

export interface CreateVideoOrderRequest {
  groupName: string;
  subjectName?: string;
  videoType?: string;
  quantity?: number;
  unitPrice?: number;
  totalAmount?: number;
  salesperson?: string;
  projectManager?: string;
  orderDate?: string;
  deliveryDate?: string;
  remark?: string;
}

export interface UpdateVideoOrderRequest {
  groupName?: string;
  subjectName?: string;
  videoType?: string;
  quantity?: number;
  unitPrice?: number;
  totalAmount?: number;
  salesperson?: string;
  projectManager?: string;
  orderDate?: string;
  deliveryDate?: string;
  remark?: string;
}

export interface VideoOrderListParams {
  orderNo?: string;
  groupName?: string;
  subjectName?: string;
  videoType?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface VideoOrderListResult extends PageResult<VideoOrder> {}

export interface BatchIdsApproveRequest {
  ids: number[];
  approved: boolean;
  rejectReason?: string;
}

export interface VideoOrderStatusRequest {
  status: '制作中' | '已交付' | '已完成';
}

// ---------- 视频项目 ----------

export type VideoCoreProjectStatus =
  | '筹备中'
  | '拍摄中'
  | '后期中'
  | '待审核'
  | '已交付'
  | '已完成';

export interface VideoCoreProjectNode {
  name: string;
  plannedAt: string;
  actualAt: string;
  status: '未开始' | '进行中' | '已完成';
}

export interface VideoCoreDeliverable {
  name: string;
  type: string;
  link: string;
  submittedAt: string;
}

export interface VideoCoreProject {
  id: number;
  projectNo: string;
  projectName: string;
  orderId: number | null;
  orderNo: string;
  customerName: string;
  projectType: string;
  status: string;
  projectManager: string;
  teamMembers: string[];
  nodes: VideoCoreProjectNode[];
  deliverables: VideoCoreDeliverable[];
  progress: number;
  startDate: string;
  endDate: string;
  remark: string;
  createdAt: string;
}

export interface CreateVideoCoreProjectRequest {
  projectName: string;
  orderId?: number;
  customerName?: string;
  projectType?: string;
  projectManager?: string;
  teamMembers?: string[];
  startDate?: string;
  endDate?: string;
  remark?: string;
}

export interface UpdateVideoCoreProjectRequest {
  projectName?: string;
  customerName?: string;
  projectType?: string;
  projectManager?: string;
  teamMembers?: string[];
  startDate?: string;
  endDate?: string;
  remark?: string;
}

export interface VideoCoreProjectListParams {
  projectNo?: string;
  projectName?: string;
  customerName?: string;
  status?: string;
  projectManager?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface VideoCoreProjectListResult extends PageResult<VideoCoreProject> {}

export interface VideoCoreProjectStatusRequest {
  status: VideoCoreProjectStatus;
}

// ---------- 演员管理 ----------

export interface Actor {
  id: number;
  actorName: string;
  actorType: string;
  gender: string;
  age: number | null;
  phone: string;
  wechat: string;
  email: string;
  dailyRate: number;
  halfDayRate: number;
  skills: string[];
  styleTags: string[];
  schedule: string[];
  portfolio: string;
  status: string;
  remark: string;
  createdAt: string;
}

export interface CreateActorRequest {
  actorName: string;
  actorType?: string;
  gender?: string;
  age?: number;
  phone?: string;
  wechat?: string;
  email?: string;
  dailyRate?: number;
  halfDayRate?: number;
  skills?: string[];
  styleTags?: string[];
  schedule?: string[];
  portfolio?: string;
  status?: string;
  remark?: string;
}

export interface UpdateActorRequest {
  actorName?: string;
  actorType?: string;
  gender?: string;
  age?: number;
  phone?: string;
  wechat?: string;
  email?: string;
  dailyRate?: number;
  halfDayRate?: number;
  skills?: string[];
  styleTags?: string[];
  schedule?: string[];
  portfolio?: string;
  status?: string;
  remark?: string;
}

export interface ActorListParams {
  actorName?: string;
  actorType?: string;
  gender?: string;
  status?: string;
  tag?: string;
  page?: number;
  pageSize?: number;
}

export interface ActorListResult extends PageResult<Actor> {}

// ---------- 外包供应商 ----------

export interface OutsourcingVendor {
  id: number;
  vendorName: string;
  vendorType: string;
  contactPerson: string;
  phone: string;
  wechat: string;
  email: string;
  address: string;
  cooperationLevel: string;
  settlementMethod: string;
  taxRate: number;
  bankAccount: string;
  bankName: string;
  status: string;
  remark: string;
  createdAt: string;
}

export interface CreateOutsourcingVendorRequest {
  vendorName: string;
  vendorType?: string;
  contactPerson?: string;
  phone?: string;
  wechat?: string;
  email?: string;
  address?: string;
  cooperationLevel?: string;
  settlementMethod?: string;
  taxRate?: number;
  bankAccount?: string;
  bankName?: string;
  status?: string;
  remark?: string;
}

export interface UpdateOutsourcingVendorRequest {
  vendorName?: string;
  vendorType?: string;
  contactPerson?: string;
  phone?: string;
  wechat?: string;
  email?: string;
  address?: string;
  cooperationLevel?: string;
  settlementMethod?: string;
  taxRate?: number;
  bankAccount?: string;
  bankName?: string;
  status?: string;
  remark?: string;
}

export interface OutsourcingVendorListParams {
  vendorName?: string;
  vendorType?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface OutsourcingVendorListResult
  extends PageResult<OutsourcingVendor> {}

// ---------- 外包项目 ----------

export interface OutsourcingProject {
  id: number;
  projectNo: string;
  projectName: string;
  vendorId: number | null;
  vendorName: string;
  relatedProjectId: number | null;
  relatedProjectNo: string;
  serviceContent: string;
  amount: number;
  status: string;
  applicant: string;
  approver: string;
  approvedAt: string;
  rejectReason: string;
  startDate: string;
  endDate: string;
  settlementStatus: string;
  settledAmount: number;
  remark: string;
  createdAt: string;
}

export interface CreateOutsourcingProjectRequest {
  projectName: string;
  vendorId?: number;
  relatedProjectId?: number;
  serviceContent?: string;
  amount?: number;
  startDate?: string;
  endDate?: string;
  remark?: string;
}

export interface OutsourcingProjectListParams {
  projectNo?: string;
  projectName?: string;
  vendorId?: number;
  status?: string;
  settlementStatus?: string;
  page?: number;
  pageSize?: number;
}

export interface OutsourcingProjectListResult
  extends PageResult<OutsourcingProject> {}

export interface SettleOutsourcingRequest {
  amount: number;
}

export interface OutsourcingProjectStatusRequest {
  status: '进行中' | '已完成' | '已取消';
}

// ---------- 提成管理 ----------

export interface VideoCommission {
  id: number;
  commissionNo: string;
  orderId: number | null;
  orderNo: string;
  projectId: number | null;
  projectNo: string;
  salesperson: string;
  projectManager: string;
  orderAmount: number;
  costAmount: number;
  profitAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: string;
  period: string;
  calculatedBy: string;
  calculatedAt: string;
  paidAt: string;
  remark: string;
  createdAt: string;
}

export interface VideoCommissionListParams {
  commissionNo?: string;
  salesperson?: string;
  projectManager?: string;
  status?: string;
  period?: string;
  page?: number;
  pageSize?: number;
}

export interface VideoCommissionListResult
  extends PageResult<VideoCommission> {}

export interface CalculateCommissionsRequest {
  orderIds: number[];
  commissionRate?: number;
}

export interface VideoCommissionStats {
  monthTotal: number;
  paid: number;
  pending: number;
}

// ---------- 拍摄费用 ----------

export interface ShootingExpense {
  id: number;
  expenseNo: string;
  projectId: number | null;
  projectNo: string;
  expenseType: string;
  expenseCategory: string;
  amount: number;
  expenseDate: string;
  applicant: string;
  status: string;
  approver: string;
  approvedAt: string;
  rejectReason: string;
  invoiceStatus: string;
  remark: string;
  createdAt: string;
}

export interface CreateShootingExpenseRequest {
  projectId: number;
  expenseType: string;
  expenseCategory?: string;
  amount: number;
  expenseDate?: string;
  invoiceStatus?: string;
  remark?: string;
}

export interface UpdateShootingExpenseRequest {
  expenseType?: string;
  expenseCategory?: string;
  amount?: number;
  expenseDate?: string;
  invoiceStatus?: string;
  remark?: string;
}

export interface ShootingExpenseListParams {
  expenseNo?: string;
  projectId?: number;
  expenseType?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface ShootingExpenseListResult
  extends PageResult<ShootingExpense> {}

export interface ShootingExpenseStats {
  monthTotal: number;
  byType: FinanceNamedAmountItem[];
}

// ---------- 场地费用 ----------

export interface VenueExpense {
  id: number;
  venueNo: string;
  projectId: number | null;
  projectNo: string;
  venueName: string;
  venueType: string;
  address: string;
  contactPerson: string;
  phone: string;
  rentalDate: string;
  rentalDuration: string;
  rentalFee: number;
  deposit: number;
  depositStatus: string;
  status: string;
  applicant: string;
  approver: string;
  approvedAt: string;
  depositReturnedAt: string;
  remark: string;
  createdAt: string;
}

export interface CreateVenueExpenseRequest {
  venueName: string;
  venueType?: string;
  address?: string;
  contactPerson?: string;
  phone?: string;
  projectId?: number;
  rentalDate?: string;
  rentalDuration?: string;
  rentalFee?: number;
  deposit?: number;
  remark?: string;
}

export interface UpdateVenueExpenseRequest {
  venueName?: string;
  venueType?: string;
  address?: string;
  contactPerson?: string;
  phone?: string;
  projectId?: number;
  rentalDate?: string;
  rentalDuration?: string;
  rentalFee?: number;
  deposit?: number;
  remark?: string;
}

export interface VenueExpenseListParams {
  venueNo?: string;
  venueName?: string;
  venueType?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface VenueExpenseListResult extends PageResult<VenueExpense> {}

export interface VenueExpenseStatusRequest {
  status: '已使用' | '已结算' | '已取消';
}

// ---------- 样品管理 ----------

export interface Sample {
  id: number;
  sampleNo: string;
  projectId: number | null;
  projectNo: string;
  orderId: number | null;
  orderNo: string;
  customerName: string;
  productName: string;
  productModel: string;
  quantity: number;
  unit: string;
  status: string;
  sender: string;
  senderPhone: string;
  senderAddress: string;
  receiver: string;
  receiverPhone: string;
  receiverAddress: string;
  expressCompany: string;
  expressNo: string;
  mailedAt: string;
  receivedAt: string;
  returnedAt: string;
  returnExpressNo: string;
  remark: string;
  createdAt: string;
}

export interface CreateSampleRequest {
  productName: string;
  productModel?: string;
  quantity?: number;
  unit?: string;
  customerName?: string;
  projectId?: number;
  orderId?: number;
  sender?: string;
  senderPhone?: string;
  senderAddress?: string;
  receiver?: string;
  receiverPhone?: string;
  receiverAddress?: string;
  remark?: string;
}

export interface UpdateSampleRequest {
  productName?: string;
  productModel?: string;
  quantity?: number;
  unit?: string;
  customerName?: string;
  sender?: string;
  senderPhone?: string;
  senderAddress?: string;
  receiver?: string;
  receiverPhone?: string;
  receiverAddress?: string;
  remark?: string;
}

export interface SampleListParams {
  sampleNo?: string;
  productName?: string;
  customerName?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface SampleListResult extends PageResult<Sample> {}

export interface MailSampleRequest {
  expressCompany: string;
  expressNo: string;
}

export interface BatchMailSamplesRequest {
  ids: number[];
  expressCompany: string;
  expressNo: string;
}

export interface ReturnSampleRequest {
  returnExpressNo: string;
}

export interface SampleMarkRequest {
  status: '已丢失' | '已消耗';
}

/* ============ 合同增强：模板/费用/提醒/提成 ============ */

export type ContractTemplateStatus = '启用' | '停用';

export interface ContractTemplate {
  id: number;
  templateNo: string;
  templateName: string;
  category: string;
  content: string;
  applicableIndustry: string[];
  status: ContractTemplateStatus;
  version: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContractTemplateListParams {
  page: number;
  pageSize: number;
  category?: string;
  status?: string;
  industry?: string;
  keyword?: string;
}

export interface ContractTemplateListResult extends PageResult<ContractTemplate> {}

export interface CreateContractTemplateRequest {
  templateName: string;
  category: string;
  content: string;
  applicableIndustry?: string[];
  status?: string;
  version?: string;
}

export interface UpdateContractTemplateRequest {
  templateName?: string;
  category?: string;
  content?: string;
  applicableIndustry?: string[];
  status?: string;
  version?: string;
}

export interface ApplyContractTemplateResult {
  templateNo: string;
  templateName: string;
  category: string;
  content: string;
}

export interface BatchToggleTemplateStatusRequest {
  ids: number[];
  status: ContractTemplateStatus;
}

export type ContractPaymentStatus = '未付款' | '部分付款' | '已付款';

export interface ContractExpense {
  id: number;
  expenseNo: string;
  contractId: string;
  contractCode: string;
  customerName: string;
  expenseType: string;
  amount: number;
  description: string;
  paymentStatus: ContractPaymentStatus;
  paidAmount: number;
  plannedPaymentDate: string | null;
  actualPaymentDate: string | null;
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContractExpenseListParams {
  page: number;
  pageSize: number;
  contractId?: string;
  keyword?: string;
  expenseType?: string;
  paymentStatus?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ContractExpenseListResult extends PageResult<ContractExpense> {}

export interface CreateContractExpenseRequest {
  contractId: string;
  expenseType: string;
  amount: number;
  description?: string;
  plannedPaymentDate?: string;
  paymentMethod?: string;
}

export interface UpdateContractExpenseRequest {
  expenseType?: string;
  amount?: number;
  description?: string;
  plannedPaymentDate?: string;
  paymentMethod?: string;
}

export interface ContractExpenseDetail extends ContractExpense {
  paymentRecords: ContractPaymentRecord[];
}

export interface ContractPaymentRecord {
  id: number;
  recordNo: string;
  contractExpenseId: number;
  contractId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  bankAccount: string;
  voucherNo: string;
  remark: string;
  createdAt: string;
}

export interface CreateContractPaymentRecordRequest {
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  bankAccount?: string;
  voucherNo?: string;
  remark?: string;
}

export type ContractRemindType = '合同到期提醒' | '待审批提醒' | '付款到期提醒';

export interface ContractReminder {
  id: number;
  contractId: string;
  remindType: ContractRemindType;
  content: string;
  targets: string[];
  isRead: boolean;
  createdBy: string;
  createdAt: string;
}

export interface CreateContractReminderRequest {
  remindType: ContractRemindType;
  targets: string[];
}

export type ContractCommissionApplicationStatus = '待审批' | '已通过' | '已驳回';

export interface ContractCommissionApplication {
  id: number;
  applicationNo: string;
  contractId: string;
  contractCode: string;
  customerName: string;
  contractAmount: number;
  commissionRate: number;
  commissionAmount: number;
  applicant: string;
  remark: string;
  status: ContractCommissionApplicationStatus;
  approver: string;
  approvedAt: string | null;
  rejectReason: string;
  createdAt: string;
}

export interface ContractCommissionApplicationListParams {
  page: number;
  pageSize: number;
  status?: string;
  contractId?: string;
}

export interface ContractCommissionApplicationListResult
  extends PageResult<ContractCommissionApplication> {}

export interface ApplyContractCommissionRequest {
  commissionRate: number;
  commissionAmount: number;
  remark?: string;
}

export interface RejectContractCommissionRequest {
  reason: string;
}

/* ============ 工作台增强：排行榜/目标/绩效任务 ============ */

export type RankTimeRange = '今日' | '本周' | '本月' | '本年';
export type RankPortFilter = '全部' | '内部' | '外部' | '集团';

export interface RankQueryParams {
  timeRange: RankTimeRange;
  port: RankPortFilter;
}

export interface SalespersonRankItem {
  rank: number;
  salesperson: string;
  totalConsumption: number;
  internalConsumption: number;
  externalConsumption: number;
}

export interface GroupRankItem {
  rank: number;
  groupName: string;
  totalConsumption: number;
  deltaConsumption: number;
  growthRate: number;
}

export interface PortRankItem {
  rank: number;
  port: string;
  totalConsumption: number;
}

export interface IndustryRankItem {
  rank: number;
  industry: string;
  totalConsumption: number;
}

export interface NewAccountRankItem {
  rank: number;
  dimension: string;
  newAccountCount: number;
  consumption: number;
}

export interface RankListResult {
  items: Array<
    SalespersonRankItem | GroupRankItem | PortRankItem | IndustryRankItem | NewAccountRankItem
  >;
  lastSyncedAt: string | null;
}

export interface ConsumptionSummarySyncResult {
  syncedDate: string;
  inserted: number;
}

export type TargetType = '年度' | '月度';
export type TargetStatus = '未开始' | '进行中' | '已完成' | '未达标';

export interface DepartmentTarget {
  id: number;
  targetNo: string;
  year: number;
  month: number;
  targetType: TargetType;
  department: string;
  targetConsumption: number;
  actualConsumption: number;
  completionRate: number;
  status: TargetStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentTargetListParams {
  page: number;
  pageSize: number;
  year?: number;
  targetType?: string;
  department?: string;
  status?: string;
}

export interface DepartmentTargetListResult extends PageResult<DepartmentTarget> {}

export interface CreateDepartmentTargetRequest {
  year: number;
  month: number;
  targetType: string;
  department: string;
  targetConsumption: number;
}

export interface UpdateDepartmentTargetRequest {
  year?: number;
  month?: number;
  targetType?: string;
  department?: string;
  targetConsumption?: number;
}

export interface DashboardTargetSummaryItem {
  department: string;
  targetConsumption: number;
  actualConsumption: number;
  completionRate: number;
  status: TargetStatus;
}

export interface DashboardTargetSummary {
  targetType: TargetType;
  items: DashboardTargetSummaryItem[];
}

export type PerformanceTaskStatus = '待确认' | '已确认' | '已驳回';

export interface PerformanceTask {
  id: number;
  taskNo: string;
  taskName: string;
  taskType: string;
  department: string;
  personInCharge: string;
  assignee: string;
  score: number | null;
  maxScore: number;
  status: PerformanceTaskStatus;
  confirmDate: string | null;
  confirmRemark: string;
  dueDate: string | null;
  description: string;
  createdAt: string;
}

export interface PerformanceTaskListParams {
  page: number;
  pageSize: number;
  status?: string;
  department?: string;
  keyword?: string;
}

export interface PerformanceTaskListResult extends PageResult<PerformanceTask> {}

export interface CreatePerformanceTaskRequest {
  taskName: string;
  taskType: string;
  department: string;
  personInCharge: string;
  assignee: string;
  maxScore?: number;
  dueDate?: string;
  description?: string;
}

export interface UpdatePerformanceTaskRequest {
  taskName?: string;
  taskType?: string;
  department?: string;
  personInCharge?: string;
  assignee?: string;
  maxScore?: number;
  dueDate?: string;
  description?: string;
}

export interface ConfirmPerformanceTaskRequest {
  score: number;
}

export interface RejectPerformanceTaskRequest {
  confirmRemark: string;
}

export interface PerformanceTaskSummary {
  departmentAvgScore: number;
  personInCharge: string;
  employeeScore: number;
  totalTasks: number;
  confirmedCount: number;
  pendingCount: number;
}

/* ==================== 财务增强（P2-4） ==================== */

// ---------- 客户明细 ----------

export interface CustomerFinanceDetail {
  id: number;
  detailNo: string;
  customerId: string;
  customerName: string;
  accountId: number | null;
  transactionType: string;
  amount: number;
  balanceAfter: number;
  relatedOrderNo: string;
  remark: string;
  transactionTime: string;
}

export interface CustomerFinanceDetailListParams {
  customerId?: string;
  transactionType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface CustomerFinanceDetailListResult
  extends PageResult<CustomerFinanceDetail> {}

// ---------- 充值管理 ----------

export interface FinanceRecharge {
  id: number;
  rechargeNo: string;
  customerId: string;
  customerName: string;
  adAccountId: string;
  accountId: number;
  amount: number;
  paymentMethod: string;
  status: string;
  confirmTime: string | null;
  operator: string;
  remark: string;
  createdAt: string;
}

export interface CreateFinanceRechargeRequest {
  customerId: string;
  customerName: string;
  adAccountId?: string;
  accountId: number;
  amount: number;
  paymentMethod: string;
  remark?: string;
}

export interface FinanceRechargeListParams {
  customerName?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface FinanceRechargeListResult
  extends PageResult<FinanceRecharge> {}

// ---------- 退款管理 ----------

export interface FinanceRefund {
  id: number;
  refundNo: string;
  customerId: string;
  customerName: string;
  accountId: number;
  amount: number;
  reason: string;
  status: string;
  approver: string;
  approveTime: string | null;
  approveRemark: string;
  refundTime: string | null;
  operator: string;
  createdAt: string;
}

export interface CreateFinanceRefundRequest {
  customerId: string;
  customerName: string;
  accountId: number;
  amount: number;
  reason: string;
}

export interface RefundApproveRequest {
  approved: boolean;
  approveRemark?: string;
}

export interface FinanceRefundListParams {
  customerName?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface FinanceRefundListResult
  extends PageResult<FinanceRefund> {}

// ---------- 退币管理 ----------

export interface FinanceCoinReturn {
  id: number;
  returnNo: string;
  customerId: string;
  adAccountId: string;
  platform: string;
  coinAmount: number;
  rmbEquivalent: number;
  status: string;
  operator: string;
  finishTime: string | null;
  remark: string;
  createdAt: string;
}

export interface CreateFinanceCoinReturnRequest {
  customerId: string;
  adAccountId?: string;
  platform: string;
  coinAmount: number;
  rmbEquivalent: number;
  remark?: string;
}

export interface FinanceCoinReturnListParams {
  status?: string;
  platform?: string;
  page?: number;
  pageSize?: number;
}

export interface FinanceCoinReturnListResult
  extends PageResult<FinanceCoinReturn> {}

// ---------- 端口管理 ----------

export interface FinancePort {
  id: number;
  portNo: string;
  portName: string;
  portType: string;
  platform: string;
  balance: number;
  frozenBalance: number;
  contactPerson: string;
  contactPhone: string;
  status: string;
  remark: string;
  createdAt: string;
}

export interface CreateFinancePortRequest {
  portName: string;
  portType: string;
  platform?: string;
  balance?: number;
  contactPerson?: string;
  contactPhone?: string;
  remark?: string;
}

export interface UpdateFinancePortRequest {
  portName?: string;
  portType?: string;
  platform?: string;
  contactPerson?: string;
  contactPhone?: string;
  remark?: string;
}

export interface FinancePortListParams {
  portName?: string;
  portType?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface FinancePortListResult extends PageResult<FinancePort> {}

// ---------- 银行账户管理 ----------

export interface FinanceBankAccount {
  id: number;
  bankNo: string;
  bankName: string;
  accountName: string;
  accountNo: string;
  branch: string;
  accountType: string;
  balance: number;
  status: string;
  remark: string;
  createdAt: string;
}

export interface CreateFinanceBankAccountRequest {
  bankName: string;
  accountName: string;
  accountNo: string;
  branch?: string;
  accountType: string;
  balance?: number;
  remark?: string;
}

export interface UpdateFinanceBankAccountRequest {
  bankName?: string;
  accountName?: string;
  accountNo?: string;
  branch?: string;
  accountType?: string;
  remark?: string;
}

export interface FinanceBankAccountListParams {
  bankName?: string;
  accountType?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface FinanceBankAccountListResult
  extends PageResult<FinanceBankAccount> {}

// ---------- 后返管理 ----------

export interface FinanceRebate {
  id: number;
  rebateNo: string;
  customerId: string;
  customerName: string;
  portId: number;
  portName: string;
  period: string;
  consumptionBase: number;
  rebateRate: number;
  rebateAmount: number;
  status: string;
  calculateTime: string | null;
  issueTime: string | null;
  operator: string;
  remark: string;
  createdAt: string;
}

export interface CreateFinanceRebateRequest {
  customerId: string;
  customerName: string;
  portId: number;
  period: string;
  consumptionBase: number;
  rebateRate: number;
  remark?: string;
}

export interface FinanceRebateListParams {
  customerName?: string;
  status?: string;
  period?: string;
  page?: number;
  pageSize?: number;
}

export interface FinanceRebateListResult
  extends PageResult<FinanceRebate> {}

// ---------- 扣减管理 ----------

export interface FinanceDeduction {
  id: number;
  deductionNo: string;
  customerId: string;
  customerName: string;
  accountId: number;
  amount: number;
  reason: string;
  deductionType: string;
  status: string;
  approver: string;
  approveTime: string | null;
  executeTime: string | null;
  operator: string;
  createdAt: string;
}

export interface CreateFinanceDeductionRequest {
  customerId: string;
  customerName: string;
  accountId: number;
  amount: number;
  reason: string;
  deductionType: string;
}

export interface DeductionApproveRequest {
  approved: boolean;
}

export interface FinanceDeductionListParams {
  customerName?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface FinanceDeductionListResult
  extends PageResult<FinanceDeduction> {}

// ---------- 消耗管理 ----------

export interface FinanceConsumption {
  id: number;
  consumptionNo: string;
  customerId: string;
  adAccountId: string;
  portId: number | null;
  consumptionDate: string;
  amount: number;
  platformData: number;
  systemData: number;
  difference: number;
  status: string;
  checker: string;
  checkTime: string | null;
  remark: string;
  createdAt: string;
}

export interface CreateFinanceConsumptionRequest {
  customerId: string;
  adAccountId?: string;
  portId?: number;
  consumptionDate: string;
  amount: number;
  platformData?: number;
  systemData?: number;
  remark?: string;
}

export interface FinanceConsumptionListParams {
  consumptionDateFrom?: string;
  consumptionDateTo?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface FinanceConsumptionListResult
  extends PageResult<FinanceConsumption> {}

// ---------- 垫款管理 ----------

export interface FinanceAdvance {
  id: number;
  advanceNo: string;
  customerId: string;
  customerName: string;
  amount: number;
  reason: string;
  expectedReturnDate: string | null;
  status: string;
  returnedAmount: number;
  returnDeadline: string | null;
  operator: string;
  remark: string;
  createdAt: string;
}

export interface CreateFinanceAdvanceRequest {
  customerId: string;
  customerName: string;
  amount: number;
  reason: string;
  expectedReturnDate?: string;
  remark?: string;
}

export interface AdvanceReturnRequest {
  returnAmount: number;
  accountId: number;
  returnDate?: string;
}

export interface FinanceAdvanceListParams {
  customerName?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface FinanceAdvanceListResult
  extends PageResult<FinanceAdvance> {}

// ---------- 激励管理 ----------

export interface FinanceIncentive {
  id: number;
  incentiveNo: string;
  employeeName: string;
  department: string;
  incentiveType: string;
  amount: number;
  reason: string;
  status: string;
  approver: string;
  approveTime: string | null;
  issueTime: string | null;
  operator: string;
  remark: string;
  createdAt: string;
}

export interface CreateFinanceIncentiveRequest {
  employeeName: string;
  department?: string;
  incentiveType: string;
  amount: number;
  reason: string;
}

export interface IncentiveIssueRequest {
  accountId: number;
}

export interface FinanceIncentiveListParams {
  employeeName?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface FinanceIncentiveListResult
  extends PageResult<FinanceIncentive> {}

// ---------- 收入管理 ----------

export interface FinanceIncome {
  id: number;
  incomeNo: string;
  incomeType: string;
  customerId: string;
  customerName: string;
  amount: number;
  accountId: number;
  incomeDate: string;
  relatedOrderNo: string;
  status: string;
  operator: string;
  remark: string;
  createdAt: string;
}

export interface CreateFinanceIncomeRequest {
  incomeType: string;
  customerId?: string;
  customerName?: string;
  amount: number;
  accountId: number;
  incomeDate: string;
  relatedOrderNo?: string;
  remark?: string;
}

export interface FinanceIncomeListParams {
  incomeType?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface FinanceIncomeListResult
  extends PageResult<FinanceIncome> {}

// ---------- 支出管理 ----------

export interface FinanceExpense {
  id: number;
  expenseNo: string;
  expenseType: string;
  amount: number;
  applicant: string;
  applyDate: string;
  status: string;
  approver: string;
  approveTime: string | null;
  payTime: string | null;
  accountId: number | null;
  operator: string;
  remark: string;
  createdAt: string;
}

export interface CreateFinanceExpenseRequest {
  expenseType: string;
  amount: number;
  applicant: string;
  applyDate: string;
  remark?: string;
}

export interface ExpensePayRequest {
  accountId: number;
}

export interface FinanceExpenseListParams {
  expenseType?: string;
  status?: string;
  applicant?: string;
  page?: number;
  pageSize?: number;
}

export interface FinanceExpenseListResult
  extends PageResult<FinanceExpense> {}

// ---------- 费用报销 ----------

export interface FinanceFee {
  id: number;
  feeNo: string;
  feeType: string;
  applicant: string;
  department: string;
  amount: number;
  expenseDate: string;
  invoiceNo: string;
  status: string;
  approver: string;
  approveTime: string | null;
  reimburseTime: string | null;
  accountId: number | null;
  attachmentUrl: string;
  remark: string;
  createdAt: string;
}

export interface CreateFinanceFeeRequest {
  feeType: string;
  applicant: string;
  department?: string;
  amount: number;
  expenseDate: string;
  invoiceNo?: string;
  attachmentUrl?: string;
  remark?: string;
}

export interface FeeReimburseRequest {
  accountId: number;
}

export interface FinanceFeeListParams {
  feeType?: string;
  status?: string;
  applicant?: string;
  page?: number;
  pageSize?: number;
}

export interface FinanceFeeListResult extends PageResult<FinanceFee> {}

// ---------- 保证金与押金 ----------

export interface FinanceDeposit {
  id: number;
  depositNo: string;
  customerId: string;
  customerName: string;
  depositType: string;
  amount: number;
  collectDate: string;
  collectAccount: string;
  status: string;
  returnedAmount: number;
  returnDate: string | null;
  returnAccount: string;
  operator: string;
  remark: string;
  createdAt: string;
}

export interface CreateFinanceDepositRequest {
  customerId: string;
  customerName: string;
  depositType: string;
  amount: number;
  collectDate: string;
  collectAccount: string;
  remark?: string;
}

export interface DepositReturnRequest {
  returnAmount: number;
  accountId: number;
  returnDate?: string;
}

export interface FinanceDepositListParams {
  customerName?: string;
  depositType?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface FinanceDepositListResult
  extends PageResult<FinanceDeposit> {}

// ====== hr-enhance ======

// ---------- 简历管理 ----------

export interface HrResume {
  id: number;
  resumeNo: string;
  candidateName: string;
  gender: string;
  phone: string;
  email: string;
  positionApplied: string;
  department: string;
  source: string;
  workYears: number;
  education: string;
  tags: string;
  status: string;
  rating: number;
  resumeContent: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  deletedAt: string | null;
}

export interface CreateHrResumeBody {
  candidateName: string;
  phone: string;
  email: string;
  positionApplied: string;
  department: string;
  resumeContent: string;
  gender?: string;
  source?: string;
  workYears?: number;
  education?: string;
  tags?: string;
  status?: string;
  rating?: number;
}

export interface UpdateHrResumeBody {
  candidateName?: string;
  phone?: string;
  email?: string;
  positionApplied?: string;
  department?: string;
  resumeContent?: string;
  gender?: string;
  source?: string;
  workYears?: number;
  education?: string;
  tags?: string;
  status?: string;
  rating?: number;
}

export interface HrResumeListParams {
  status?: string;
  department?: string;
  positionApplied?: string;
  source?: string;
  education?: string;
  keyword?: string;
  page?: string;
  pageSize?: string;
}

export interface HrResumePage {
  items: HrResume[];
  total: number;
  page: number;
  pageSize: number;
}

export interface HrBatchStatusBody {
  ids: number[];
  status: string;
}

export interface HrResumeRatingBody {
  rating: number;
}

// ---------- 面试邀约 ----------

export interface HrInvitation {
  id: number;
  invitationNo: string;
  resumeId: number;
  candidateName: string;
  position: string;
  department: string;
  interviewer: string;
  interviewType: string;
  interviewRound: string;
  scheduledTime: string;
  location: string;
  status: string;
  remark: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  deletedAt: string | null;
}

export interface CreateHrInvitationBody {
  resumeId: number;
  candidateName: string;
  position: string;
  department: string;
  interviewer: string;
  location: string;
  interviewType?: string;
  interviewRound?: string;
  scheduledTime?: string;
  status?: string;
  remark?: string;
}

export interface UpdateHrInvitationBody {
  resumeId?: number;
  candidateName?: string;
  position?: string;
  department?: string;
  interviewer?: string;
  location?: string;
  interviewType?: string;
  interviewRound?: string;
  scheduledTime?: string;
  status?: string;
  remark?: string;
}

export interface HrInvitationListParams {
  status?: string;
  department?: string;
  candidateName?: string;
  interviewRound?: string;
  page?: string;
  pageSize?: string;
}

export interface HrInvitationPage {
  items: HrInvitation[];
  total: number;
  page: number;
  pageSize: number;
}

// ---------- 面试记录 ----------

export interface HrInterview {
  id: number;
  interviewNo: string;
  invitationId: number | null;
  resumeId: number;
  candidateName: string;
  position: string;
  interviewer: string;
  interviewRound: string;
  interviewTime: string;
  result: string;
  scoreProfessional: number;
  scoreCommunication: number;
  scoreGeneral: number;
  evaluation: string;
  offerStatus: string;
  remark: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  deletedAt: string | null;
}

export interface CreateHrInterviewBody {
  resumeId: number;
  candidateName: string;
  position: string;
  interviewer: string;
  invitationId?: number | null;
  interviewRound?: string;
  interviewTime?: string;
  result?: string;
  scoreProfessional?: number;
  scoreCommunication?: number;
  scoreGeneral?: number;
  evaluation?: string;
  offerStatus?: string;
  remark?: string;
}

export interface UpdateHrInterviewBody {
  resumeId?: number;
  candidateName?: string;
  position?: string;
  interviewer?: string;
  invitationId?: number | null;
  interviewRound?: string;
  interviewTime?: string;
  result?: string;
  scoreProfessional?: number;
  scoreCommunication?: number;
  scoreGeneral?: number;
  evaluation?: string;
  offerStatus?: string;
  remark?: string;
}

export interface HrInterviewListParams {
  result?: string;
  offerStatus?: string;
  candidateName?: string;
  position?: string;
  page?: string;
  pageSize?: string;
}

export interface HrInterviewPage {
  items: HrInterview[];
  total: number;
  page: number;
  pageSize: number;
}

export interface HrInterviewEvaluateBody {
  result: string;
  scoreProfessional: number;
  scoreCommunication: number;
  scoreGeneral: number;
  evaluation: string;
}

export interface HrInterviewOfferBody {
  offerStatus: string;
}

// ---------- 签到管理 ----------

export interface HrCheckin {
  id: number;
  checkinNo: string;
  candidateName: string;
  type: string;
  relatedId: number | null;
  checkinTime: string | null;
  location: string;
  status: string;
  remark: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  deletedAt: string | null;
}

export interface CreateHrCheckinBody {
  candidateName: string;
  location: string;
  type?: string;
  relatedId?: number | null;
  checkinTime?: string | null;
  status?: string;
  remark?: string;
}

export interface UpdateHrCheckinBody {
  candidateName?: string;
  location?: string;
  type?: string;
  relatedId?: number | null;
  checkinTime?: string | null;
  status?: string;
  remark?: string;
}

export interface HrCheckinListParams {
  type?: string;
  status?: string;
  dateStart?: string;
  dateEnd?: string;
  page?: string;
  pageSize?: string;
}

export interface HrCheckinPage {
  items: HrCheckin[];
  total: number;
  page: number;
  pageSize: number;
}

export interface HrCheckinStats {
  total: number;
  checkedIn: number;
  notCheckedIn: number;
  late: number;
  byType: { type: string; count: number }[];
}

// ---------- 招聘计划 ----------

export interface HrRecruitmentPlan {
  id: number;
  planNo: string;
  planName: string;
  department: string;
  position: string;
  headcount: number;
  hiredCount: number;
  priority: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  requirementDescription: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  deletedAt: string | null;
}

export interface CreateHrRecruitmentPlanBody {
  planName: string;
  department: string;
  position: string;
  requirementDescription: string;
  headcount?: number;
  hiredCount?: number;
  priority?: string;
  status?: string;
  startDate?: string | null;
  endDate?: string | null;
}

export interface UpdateHrRecruitmentPlanBody {
  planName?: string;
  department?: string;
  position?: string;
  requirementDescription?: string;
  headcount?: number;
  hiredCount?: number;
  priority?: string;
  status?: string;
  startDate?: string | null;
  endDate?: string | null;
}

export interface HrRecruitmentPlanListParams {
  department?: string;
  status?: string;
  keyword?: string;
  page?: string;
  pageSize?: string;
}

export interface HrRecruitmentPlanPage {
  items: HrRecruitmentPlan[];
  total: number;
  page: number;
  pageSize: number;
}

export interface HrPlanStatusBody {
  status: string;
}

export interface HrPlanDepartmentStat {
  department: string;
  planCount: number;
  totalHeadcount: number;
  totalHired: number;
}

// ---------- 员工管理 ----------

export interface HrEmployee {
  id: number;
  employeeNo: string;
  name: string;
  gender: string;
  phone: string;
  email: string;
  idCard: string;
  department: string;
  position: string;
  level: string;
  entryDate: string;
  regularDate: string | null;
  status: string;
  leaveDate: string | null;
  leaveReason: string;
  emergencyContact: string;
  emergencyPhone: string;
  bankAccount: string;
  bankName: string;
  remark: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  deletedAt: string | null;
}

export interface CreateHrEmployeeBody {
  name: string;
  phone: string;
  email: string;
  idCard: string;
  department: string;
  position: string;
  gender?: string;
  level?: string;
  entryDate?: string;
  regularDate?: string | null;
  status?: string;
  leaveDate?: string | null;
  leaveReason?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  bankAccount?: string;
  bankName?: string;
  remark?: string;
}

export interface UpdateHrEmployeeBody {
  name?: string;
  phone?: string;
  email?: string;
  idCard?: string;
  department?: string;
  position?: string;
  gender?: string;
  level?: string;
  entryDate?: string;
  regularDate?: string | null;
  status?: string;
  leaveDate?: string | null;
  leaveReason?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  bankAccount?: string;
  bankName?: string;
  remark?: string;
}

export interface HrEmployeeListParams {
  department?: string;
  status?: string;
  keyword?: string;
  page?: string;
  pageSize?: string;
}

export interface HrEmployeePage {
  items: HrEmployee[];
  total: number;
  page: number;
  pageSize: number;
}

export interface HrEmployeeRegularBody {
  regularDate: string;
}

export interface HrEmployeeTransferConfirmBody {
  department: string;
  position: string;
}

export interface HrEmployeeLeaveApplyBody {
  leaveReason: string;
  leaveDate: string;
}

export interface HrDashboardData {
  totalEmployees: number;
  activeCount: number;
  leftCount: number;
  probationCount: number;
  regularCount: number;
  leavingCount: number;
  departmentDistribution: { department: string; count: number }[];
  statusDistribution: { status: string; count: number }[];
  entryLeaveTrend: { month: string; entryCount: number; leaveCount: number }[];
  recruitmentProgress: {
    monthPlanCount: number;
    totalHeadcount: number;
    totalHired: number;
    pendingInterviewCount: number;
  };
}

// ---------- 薪资管理 ----------

export interface HrSalary {
  id: number;
  salaryNo: string;
  employeeId: number;
  employeeName: string;
  department: string;
  position: string;
  salaryMonth: string;
  /** 字段级权限：null=不可见，string=脱敏占位 */
  baseSalary: string | null;
  performanceSalary: string | null;
  allowance: string | null;
  deduction: string | null;
  tax: string | null;
  socialInsurance: string | null;
  actualSalary: string | null;
  status: string;
  payDate: string | null;
  remark: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  deletedAt: string | null;
}

export interface CreateHrSalaryBody {
  employeeId: number;
  employeeName: string;
  department: string;
  position: string;
  salaryMonth: string;
  baseSalary?: string;
  performanceSalary?: string;
  allowance?: string;
  deduction?: string;
  tax?: string;
  socialInsurance?: string;
  actualSalary?: string;
  status?: string;
  payDate?: string | null;
  remark?: string;
}

export interface UpdateHrSalaryBody {
  employeeId?: number;
  employeeName?: string;
  department?: string;
  position?: string;
  salaryMonth?: string;
  baseSalary?: string;
  performanceSalary?: string;
  allowance?: string;
  deduction?: string;
  tax?: string;
  socialInsurance?: string;
  actualSalary?: string;
  status?: string;
  payDate?: string | null;
  remark?: string;
}

export interface HrSalaryListParams {
  salaryMonth?: string;
  department?: string;
  employeeName?: string;
  status?: string;
  page?: string;
  pageSize?: string;
}

export interface HrSalaryPage {
  items: HrSalary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface HrSalaryBatchCalculateBody {
  salaryMonth: string;
}

export interface HrSalaryPayslip {
  salary: HrSalary;
  breakdown: { label: string; amount: string }[];
}

// ---------- 绩效管理 ----------

export interface HrPerformance {
  id: number;
  performanceNo: string;
  employeeId: number;
  employeeName: string;
  department: string;
  period: string;
  mode: string;
  goals: string;
  selfScore: number | null;
  leaderScore: number | null;
  finalScore: string | null;
  grade: string;
  status: string;
  confirmDate: string | null;
  appealReason: string;
  remark: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  deletedAt: string | null;
}

export interface CreateHrPerformanceBody {
  employeeId: number;
  employeeName: string;
  department: string;
  goals: string;
  grade: string;
  period?: string;
  mode?: string;
  selfScore?: number | null;
  leaderScore?: number | null;
  finalScore?: string | null;
  status?: string;
  confirmDate?: string | null;
  appealReason?: string;
  remark?: string;
}

export interface UpdateHrPerformanceBody {
  employeeId?: number;
  employeeName?: string;
  department?: string;
  goals?: string;
  grade?: string;
  period?: string;
  mode?: string;
  selfScore?: number | null;
  leaderScore?: number | null;
  finalScore?: string | null;
  status?: string;
  confirmDate?: string | null;
  appealReason?: string;
  remark?: string;
}

export interface HrPerformanceListParams {
  period?: string;
  mode?: string;
  grade?: string;
  status?: string;
  employeeName?: string;
  page?: string;
  pageSize?: string;
}

export interface HrPerformancePage {
  items: HrPerformance[];
  total: number;
  page: number;
  pageSize: number;
}

export interface HrPerformanceSelfScoreBody {
  selfScore: number;
}

export interface HrPerformanceLeaderScoreBody {
  leaderScore: number;
}

export interface HrPerformanceAppealBody {
  reason: string;
}

// ---------- 考勤管理 ----------

export interface HrAttendance {
  id: number;
  attendanceNo: string;
  employeeId: number;
  employeeName: string;
  department: string;
  attendanceDate: string;
  checkInTime: string;
  checkOutTime: string;
  status: string;
  leaveType: string;
  leaveHours: string;
  overtimeHours: string;
  remark: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  deletedAt: string | null;
}

export interface CreateHrAttendanceBody {
  employeeId: number;
  employeeName: string;
  department: string;
  attendanceDate: string;
  checkInTime: string;
  checkOutTime: string;
  status?: string;
  leaveType?: string;
  leaveHours?: string;
  overtimeHours?: string;
  remark?: string;
}

export interface UpdateHrAttendanceBody {
  employeeId?: number;
  employeeName?: string;
  department?: string;
  attendanceDate?: string;
  checkInTime?: string;
  checkOutTime?: string;
  status?: string;
  leaveType?: string;
  leaveHours?: string;
  overtimeHours?: string;
  remark?: string;
}

export interface HrAttendanceListParams {
  month?: string;
  department?: string;
  employeeName?: string;
  status?: string;
  page?: string;
  pageSize?: string;
}

export interface HrAttendancePage {
  items: HrAttendance[];
  total: number;
  page: number;
  pageSize: number;
}

export interface HrAttendanceCheckinBody {
  checkInTime?: string;
  checkOutTime?: string;
}

export interface HrAttendanceLeaveApplyBody {
  leaveType: string;
  leaveHours: string;
  remark?: string;
}

export interface HrAttendanceOvertimeBody {
  overtimeHours: string;
}

export interface HrAttendanceStats {
  totalRecords: number;
  normalCount: number;
  lateCount: number;
  earlyLeaveCount: number;
  absentCount: number;
  leaveCount: number;
  overtimeCount: number;
  leaveHours: string;
  overtimeHours: string;
}

// ====== admin-enhance (P2-6 行政管理深度增强) ======

// ---------- 采购申请 ----------

export interface AdminPurchaseRequest {
  id: number;
  requestNo: string;
  applicant: string;
  department: string;
  itemName: string;
  itemType: string;
  quantity: number;
  unit: string;
  estimatedPrice: number;
  totalPrice: number;
  reason: string;
  status: string;
  approver: string;
  approveTime: string | null;
  approveRemark: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdminPurchaseRequestDto {
  applicant: string;
  department: string;
  itemName: string;
  itemType: string;
  quantity: number;
  unit: string;
  estimatedPrice: number;
  totalPrice?: number;
  reason: string;
}

export type UpdateAdminPurchaseRequestDto = Partial<CreateAdminPurchaseRequestDto>;

export interface AdminEnhanceApproveDto {
  approve: boolean;
  remark: string;
}

// ---------- 采购订单 ----------

export interface AdminPurchaseOrder {
  id: number;
  orderNo: string;
  requestId: number | null;
  supplierName: string;
  itemName: string;
  itemType: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  orderDate: string;
  expectedDate: string | null;
  status: string;
  logisticsNo: string;
  remark: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdminPurchaseOrderDto {
  requestId?: number | null;
  supplierName: string;
  itemName: string;
  itemType: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice?: number;
  orderDate: string;
  expectedDate?: string | null;
  logisticsNo?: string;
  remark?: string;
}

export type UpdateAdminPurchaseOrderDto = Partial<CreateAdminPurchaseOrderDto>;

export interface AdminEnhanceShipDto {
  logisticsNo: string;
}

export interface AdminEnhanceBatchIdsDto {
  ids: number[];
}

// ---------- 采购明细 ----------

export interface AdminPurchaseDetail {
  id: number;
  detailNo: string;
  orderId: number;
  itemName: string;
  specification: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  receivedQuantity: number;
  status: string;
  receiveDate: string | null;
  qualityCheck: string;
  remark: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdminPurchaseDetailDto {
  orderId: number;
  itemName: string;
  specification?: string;
  quantity: number;
  unit?: string;
  unitPrice?: number;
  totalPrice?: number;
  remark?: string;
}

export type UpdateAdminPurchaseDetailDto = Partial<CreateAdminPurchaseDetailDto>;

export interface AdminEnhanceReceiveDto {
  receivedQuantity: number;
  qualityCheck: string;
}

// ---------- 资产管理 ----------

export interface AdminAsset {
  id: number;
  assetNo: string;
  assetName: string;
  assetType: string;
  specification: string;
  purchaseDate: string;
  purchasePrice: number;
  currentValue: number;
  depreciationRate: number;
  department: string;
  userName: string;
  location: string;
  status: string;
  lastInventoryDate: string | null;
  remark: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdminAssetDto {
  assetName: string;
  assetType: string;
  specification?: string;
  purchaseDate: string;
  purchasePrice: number;
  depreciationRate: number;
  department?: string;
  userName?: string;
  location?: string;
  status?: string;
  remark?: string;
}

export type UpdateAdminAssetDto = Partial<CreateAdminAssetDto>;

export interface AdminEnhanceAssetStats {
  total: number;
  inUse: number;
  idle: number;
  repairing: number;
  scrapped: number;
  totalPurchaseValue: number;
  totalCurrentValue: number;
}

// ---------- 库存管理 ----------

export interface AdminInventoryItem {
  id: number;
  inventoryNo: string;
  itemName: string;
  itemType: string;
  specification: string;
  unit: string;
  quantity: number;
  minStock: number;
  maxStock: number;
  location: string;
  status: string;
  lastInDate: string | null;
  lastOutDate: string | null;
  remark: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdminInventoryItemDto {
  itemName: string;
  itemType?: string;
  specification?: string;
  unit?: string;
  quantity?: number;
  minStock?: number;
  maxStock?: number;
  location: string;
  status?: string;
  remark?: string;
}

export type UpdateAdminInventoryItemDto = Partial<CreateAdminInventoryItemDto>;

export interface AdminEnhanceInventoryStats {
  totalItems: number;
  totalQuantity: number;
  warningCount: number;
  shortageCount: number;
}

// ---------- 入库管理 ----------

export interface AdminInbound {
  id: number;
  inboundNo: string;
  purchaseOrderId: number | null;
  itemName: string;
  itemType: string;
  specification: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  supplierName: string;
  inboundDate: string | null;
  operator: string;
  status: string;
  remark: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdminInboundDto {
  purchaseOrderId?: number | null;
  itemName: string;
  itemType?: string;
  specification?: string;
  quantity: number;
  unit?: string;
  unitPrice?: number;
  totalPrice?: number;
  supplierName?: string;
  remark?: string;
}

export type UpdateAdminInboundDto = Partial<CreateAdminInboundDto>;

// ---------- 领用管理 ----------

export interface AdminRequisition {
  id: number;
  requisitionNo: string;
  applicant: string;
  department: string;
  itemName: string;
  itemType: string;
  specification: string;
  quantity: number;
  unit: string;
  purpose: string;
  status: string;
  approver: string;
  approveTime: string | null;
  approveRemark: string;
  outboundDate: string | null;
  operator: string;
  expectedReturnDate: string | null;
  remark: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdminRequisitionDto {
  applicant: string;
  department: string;
  itemName: string;
  itemType?: string;
  specification?: string;
  quantity: number;
  unit?: string;
  purpose: string;
  expectedReturnDate?: string | null;
  remark?: string;
}

export type UpdateAdminRequisitionDto = Partial<CreateAdminRequisitionDto>;

// ---------- 归还管理 ----------

export interface AdminReturnRecord {
  id: number;
  returnNo: string;
  requisitionId: number;
  itemName: string;
  itemType: string;
  specification: string;
  quantity: number;
  unit: string;
  returnDate: string | null;
  operator: string;
  condition: string;
  status: string;
  damageRemark: string;
  remark: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdminReturnRecordDto {
  requisitionId: number;
  itemName?: string;
  itemType?: string;
  specification?: string;
  quantity: number;
  unit?: string;
  returnDate?: string;
  operator?: string;
  condition?: string;
  damageRemark?: string;
  remark?: string;
}

export type UpdateAdminReturnRecordDto = Partial<CreateAdminReturnRecordDto>;

// ---------- 盘点管理 ----------

export interface AdminInventoryCheck {
  id: number;
  inventoryCheckNo: string;
  checkDate: string;
  checker: string;
  department: string;
  location: string;
  status: string;
  totalItems: number;
  matchedItems: number;
  differenceItems: number;
  differenceSummary: string;
  remark: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdminInventoryCheckDto {
  checkDate: string;
  checker: string;
  department?: string;
  location?: string;
  remark?: string;
}

export type UpdateAdminInventoryCheckDto = Partial<CreateAdminInventoryCheckDto>;

export interface InventoryCheckDetail {
  id: number;
  detailNo: string;
  checkId: number;
  itemName: string;
  specification: string;
  bookQuantity: number;
  actualQuantity: number | null;
  difference: number | null;
  status: string;
  remark: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryCheckDetailListResponse {
  items: InventoryCheckDetail[];
}

export interface AdminEnhanceCheckDetailInput {
  itemName: string;
  specification?: string;
  bookQuantity: number;
  actualQuantity?: number | null;
  remark?: string;
}

export interface AdminEnhanceCheckSubmitDto {
  details: AdminEnhanceCheckDetailInput[];
}

// ---------- admin-enhance 通用查询与分页 ----------

export interface AdminEnhanceListParams {
  page?: string;
  pageSize?: string;
  status?: string;
  department?: string;
  itemType?: string;
  assetType?: string;
  location?: string;
  supplierName?: string;
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
  orderId?: number;
  requisitionId?: number;
  purchaseOrderId?: number;
}

export interface AdminEnhanceListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ---------- task-enhance 批量导入 ----------

export interface TaskEnhanceListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BatchImport {
  id: number;
  importNo: string;
  importType: string;
  fileName: string;
  fileUrl: string | null;
  totalCount: number;
  successCount: number;
  failCount: number;
  status: string;
  errorLog: string | null;
  remark: string | null;
  createdBy: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface BatchImportCreateDto {
  importType: string;
  fileName: string;
  fileUrl?: string;
  totalCount: number;
  remark?: string;
}

export interface BatchImportFinishDto {
  successCount?: number;
  failCount?: number;
  errorLog?: string;
}

export interface TaskEnhanceListParams {
  page?: string;
  pageSize?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface BatchImportListParams extends TaskEnhanceListParams {
  importType?: string;
}

// ---------- task-enhance 批量导出 ----------

export interface BatchExport {
  id: number;
  exportNo: string;
  exportType: string;
  exportName: string;
  filters: Record<string, string> | null;
  fields: string[] | null;
  totalCount: number;
  fileUrl: string | null;
  status: string;
  expired: boolean;
  createdAt: string;
  createdBy: string | null;
  completedAt: string | null;
  expireAt: string | null;
  remark: string | null;
}

export interface BatchExportCreateDto {
  exportType: string;
  exportName: string;
  filters?: Record<string, string>;
  fields?: string[];
  totalCount?: number;
  expireDays?: number;
  remark?: string;
}

export interface BatchExportFinishDto {
  fileUrl?: string;
  totalCount?: number;
  failed?: boolean;
}

export interface BatchExportListParams extends TaskEnhanceListParams {
  exportType?: string;
}

// ---------- task-enhance 我的待办 ----------

export interface MyTodo {
  id: number;
  todoNo: string;
  title: string;
  todoType: string;
  sourceModule: string;
  sourceId: string | null;
  sourceNo: string | null;
  priority: string;
  status: string;
  assignee: string | null;
  dueDate: string | null;
  remark: string | null;
  createdBy: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface MyTodoCreateDto {
  title: string;
  todoType?: string;
  sourceModule?: string;
  sourceId?: string;
  sourceNo?: string;
  priority?: string;
  assignee?: string;
  dueDate?: string;
  remark?: string;
}

export interface MyTodoListParams {
  page?: string;
  pageSize?: string;
  todoType?: string;
  sourceModule?: string;
  priority?: string;
  status?: string;
  assignee?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface MyTodoSummary {
  pendingCount: number;
  dueTodayCount: number;
  overdueCount: number;
  highPriorityCount: number;
}

export interface MyTodoBatchActionDto {
  ids: number[];
  action: string;
}

// ---------- task-enhance 协作任务与评论 ----------

export interface CollaborationTask {
  id: number;
  taskNo: string;
  title: string;
  description: string | null;
  taskType: string;
  priority: string;
  status: string;
  creator: string | null;
  assignee: string | null;
  participants: string[] | null;
  department: string | null;
  sourceModule: string | null;
  sourceId: string | null;
  sourceNo: string | null;
  progress: number;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CollaborationTaskCreateDto {
  title: string;
  description?: string;
  taskType?: string;
  priority?: string;
  assignee?: string;
  participants?: string[];
  department?: string;
  sourceModule?: string;
  sourceId?: string;
  sourceNo?: string;
  startDate?: string;
  dueDate?: string;
  remark?: string;
}

export interface CollaborationTaskUpdateDto {
  title?: string;
  description?: string;
  taskType?: string;
  priority?: string;
  assignee?: string;
  participants?: string[];
  department?: string;
  startDate?: string;
  dueDate?: string;
  status?: string;
  progress?: number;
  remark?: string;
}

export interface CollaborationTaskListParams {
  page?: string;
  pageSize?: string;
  taskType?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  department?: string;
  keyword?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface TaskStatItem {
  name: string;
  count: number;
}

export interface CollaborationTaskStats {
  total: number;
  byStatus: TaskStatItem[];
  byPriority: TaskStatItem[];
  byAssignee: TaskStatItem[];
}

export interface CollaborationTaskBatchUpdateDto {
  ids: number[];
  status?: string;
  priority?: string;
  assignee?: string;
}

export interface TaskComment {
  id: number;
  commentNo: string;
  taskId: number;
  commenter: string | null;
  content: string;
  attachments: string[] | null;
  createdAt: string;
}

export interface TaskCommentCreateDto {
  content: string;
  attachments?: string[];
}

// ---------- system-enhance 系统设置 ----------

export interface SystemSetting {
  id: number;
  settingKey: string;
  settingName: string;
  settingCategory: string;
  settingValue: unknown;
  defaultValue: unknown;
  valueType: string;
  description: string | null;
  isSystem: boolean;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SystemSettingListParams {
  category?: string;
  keyword?: string;
}

export interface SystemSettingUpdateDto {
  settingValue: unknown;
  remark?: string;
}

export interface SystemSettingCreateDto {
  settingKey: string;
  settingName: string;
  settingCategory: string;
  settingValue: unknown;
  valueType: string;
  description?: string;
  remark?: string;
}

// ---------- system-enhance 组织架构 ----------

export interface OrgDepartment {
  id: number;
  deptNo: string;
  deptName: string;
  parentId: number | null;
  parentName: string | null;
  deptLevel: number;
  deptManager: string | null;
  sortOrder: number;
  status: string;
  positionCount: number;
  employeeCount: number;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrgDepartmentTreeNode {
  id: number;
  deptNo: string;
  deptName: string;
  parentId: number | null;
  deptLevel: number;
  deptManager: string | null;
  sortOrder: number;
  status: string;
  positionCount: number;
  employeeCount: number;
  children: OrgDepartmentTreeNode[];
}

export interface OrgDepartmentCreateDto {
  deptName: string;
  parentId?: number;
  deptManager?: string;
  sortOrder?: number;
  status?: string;
  remark?: string;
}

export interface OrgDepartmentUpdateDto {
  deptName?: string;
  parentId?: number | null;
  deptManager?: string | null;
  sortOrder?: number;
  status?: string;
  remark?: string;
}

export interface OrgPosition {
  id: number;
  positionNo: string;
  positionName: string;
  deptId: number;
  deptName: string | null;
  positionLevel: string;
  parentPositionId: number | null;
  parentPositionName: string | null;
  sortOrder: number;
  status: string;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrgPositionCreateDto {
  positionName: string;
  deptId: number;
  positionLevel?: string;
  parentPositionId?: number;
  sortOrder?: number;
  status?: string;
  remark?: string;
}

export interface OrgPositionUpdateDto {
  positionName?: string;
  deptId?: number;
  positionLevel?: string;
  parentPositionId?: number | null;
  sortOrder?: number;
  status?: string;
  remark?: string;
}

export interface OrgStats {
  departmentCount: number;
  positionCount: number;
  employeeCount: number;
  byDepartment: { name: string; positionCount: number; employeeCount: number }[];
}

export interface OrgSortDto {
  items: { id: number; sortOrder: number }[];
}

// ---------- system-enhance 客户账户 ----------

export interface CustomerAccount {
  id: number;
  accountNo: string;
  customerId: string;
  customerName: string;
  username: string;
  phone: string | null;
  email: string | null;
  status: string;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  loginCount: number;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerAccountListParams extends TaskEnhanceListParams {
  customerId?: string;
  customerName?: string;
  username?: string;
}

export interface CustomerAccountCreateDto {
  customerId: string;
  username: string;
  password: string;
  phone?: string;
  email?: string;
  remark?: string;
}

export interface CustomerAccountUpdateDto {
  phone?: string;
  email?: string;
  status?: string;
  remark?: string;
}

// ---------- system-enhance 角色权限 ----------

export interface RolePermissionItem {
  id: number;
  roleId: number;
  permissionType: string;
  permissionKey: string;
  permissionValue: unknown;
}

export interface RolePermissionSaveDto {
  permissions: {
    permissionType: string;
    permissionKey: string;
    permissionValue?: unknown;
  }[];
}

export interface CurrentUserRole {
  roleCode: string;
  roleName: string;
  dataScope: string;
  menus: string[];
  isAdmin: boolean;
}

export interface LoginLogRecordResult {
  recorded: boolean;
}

export interface SystemRole {
  id: number;
  roleNo: string;
  roleName: string;
  roleCode: string;
  description: string | null;
  dataScope: string;
  status: string;
  isSystem: boolean;
  permissionCount: number;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SystemRoleListParams extends TaskEnhanceListParams {
  roleName?: string;
  roleCode?: string;
}

export interface SystemRoleCreateDto {
  roleName: string;
  roleCode: string;
  description?: string;
  dataScope?: string;
  remark?: string;
}

export interface SystemRoleUpdateDto {
  roleName?: string;
  description?: string;
  dataScope?: string;
  status?: string;
  remark?: string;
}

export interface RoleCopyDto {
  roleName: string;
  roleCode: string;
  includePermissions: boolean;
}

// ---------- system-enhance 操作日志 ----------

export interface OperationLogEnhance {
  id: number;
  logNo: string;
  userId: string;
  username: string;
  module: string;
  operation: string;
  targetType: string;
  targetId: string | null;
  targetName: string | null;
  beforeData: Record<string, unknown> | null;
  afterData: Record<string, unknown> | null;
  riskLevel: string;
  ipAddress: string | null;
  userAgent: string | null;
  archived: boolean;
  remark: string | null;
  createdAt: string;
}

export interface OperationLogEnhanceListParams extends TaskEnhanceListParams {
  module?: string;
  operation?: string;
  username?: string;
  riskLevel?: string;
  includeArchived?: string;
}

export interface OperationLogStatItem {
  name: string;
  count: number;
}

export interface OperationLogStats {
  totalCount: number;
  byModule: OperationLogStatItem[];
  byOperation: OperationLogStatItem[];
  byUser: OperationLogStatItem[];
}

export interface OperationLogCreateDto {
  module: string;
  operation: string;
  targetType: string;
  targetId?: string;
  targetName?: string;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
  remark?: string;
}

// ---------- system-enhance 登录日志 ----------

export interface LoginLog {
  id: number;
  logNo: string;
  userId: string;
  username: string;
  loginType: string;
  loginStatus: string;
  failReason: string | null;
  ipAddress: string | null;
  ipLocation: string | null;
  userAgent: string | null;
  deviceInfo: string | null;
  riskFlags: string[];
  remark: string | null;
  createdAt: string;
}

export interface LoginLogListParams extends TaskEnhanceListParams {
  loginStatus?: string;
  loginType?: string;
  username?: string;
}

export interface LoginLogStats {
  successCount: number;
  failCount: number;
  lockCount: number;
  successRate: number;
  byUser: { name: string; successCount: number; failCount: number }[];
  trend: { date: string; successCount: number; failCount: number }[];
  abnormalCount: number;
}

export interface LoginLogCreateDto {
  userId: string;
  username: string;
  loginType: string;
  loginStatus: string;
  failReason?: string;
  ipAddress?: string;
  ipLocation?: string;
  userAgent?: string;
  deviceInfo?: string;
  remark?: string;
}

// ---------- support-enhance 行业ROI基准 ----------

export interface SupportEnhanceListParams {
  page?: string;
  pageSize?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface IndustryRoiBenchmark {
  id: number;
  roiNo: string;
  industry: string;
  subIndustry?: string | null;
  platform: string;
  roiBenchmark: number;
  roiMin?: number | null;
  roiMax?: number | null;
  cpcBenchmark?: number | null;
  cpmBenchmark?: number | null;
  conversionRate?: number | null;
  effectiveDate: string;
  expireDate?: string | null;
  status: string;
  version: number;
  parentId?: number | null;
  isCurrent: boolean;
  correctReason?: string | null;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IndustryRoiListParams extends SupportEnhanceListParams {
  industry?: string;
  platform?: string;
  status?: string;
  onlyCurrent?: string;
}

export interface IndustryRoiCreateDto {
  industry: string;
  subIndustry?: string;
  platform: string;
  roiBenchmark: number;
  roiMin?: number;
  roiMax?: number;
  cpcBenchmark?: number;
  cpmBenchmark?: number;
  conversionRate?: number;
  effectiveDate: string;
  expireDate?: string;
  status?: string;
  remark?: string;
}

export interface IndustryRoiUpdateDto extends IndustryRoiCreateDto {}

export interface IndustryRoiCorrectDto {
  roiBenchmark: number;
  roiMin?: number;
  roiMax?: number;
  cpcBenchmark?: number;
  cpmBenchmark?: number;
  conversionRate?: number;
  expireDate?: string;
  correctReason: string;
}

export interface IndustryRoiImportRow {
  industry: string;
  platform: string;
  roiBenchmark: number | string;
  effectiveDate: string;
  roiMin?: number | string;
  roiMax?: number | string;
  cpcBenchmark?: number | string;
  cpmBenchmark?: number | string;
  conversionRate?: number | string;
  subIndustry?: string;
  expireDate?: string;
  remark?: string;
}

export interface IndustryRoiImportResult {
  created: number;
  failed: number;
  errors: string[];
}

export interface IndustryRoiComparisonItem {
  industry: string;
  platform: string;
  avgRoiBenchmark: number;
  avgCpcBenchmark: number;
  avgCpmBenchmark: number;
  benchmarkCount: number;
}

// ---------- support-enhance 竞品监控 ----------

export interface CompetitorMonitoring {
  id: number;
  monitorNo: string;
  competitorName: string;
  competitorIndustry?: string | null;
  platform?: string | null;
  monitorDate: string;
  estimatedConsumption?: number | null;
  estimatedRoi?: number | null;
  adCount?: number | null;
  creativeCount?: number | null;
  mainProducts?: string | null;
  targetAudience?: string | null;
  landingPageType?: string | null;
  keywords?: string[] | null;
  strengths?: string | null;
  weaknesses?: string | null;
  opportunities?: string | null;
  threats?: string | null;
  dataSource: string;
  confidence: string;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompetitorListParams extends SupportEnhanceListParams {
  competitorName?: string;
  competitorIndustry?: string;
  platform?: string;
  confidence?: string;
}

export interface CompetitorCreateDto {
  competitorName: string;
  competitorIndustry?: string;
  platform?: string;
  monitorDate: string;
  estimatedConsumption?: number;
  estimatedRoi?: number;
  adCount?: number;
  creativeCount?: number;
  mainProducts?: string;
  targetAudience?: string;
  landingPageType?: string;
  keywords?: string[];
  strengths?: string;
  weaknesses?: string;
  opportunities?: string;
  threats?: string;
  dataSource?: string;
  confidence?: string;
  remark?: string;
}

export interface CompetitorUpdateDto extends CompetitorCreateDto {}

export interface CompetitorComparisonItem {
  competitorName: string;
  estimatedConsumption: number;
  estimatedRoi: number;
  adCount: number;
  creativeCount: number;
  monitorCount: number;
}

export interface CompetitorTrendPoint {
  monitorDate: string;
  estimatedConsumption: number;
  estimatedRoi: number;
}

export interface CompetitorRankItem {
  competitorName: string;
  competitorIndustry?: string | null;
  estimatedConsumption: number;
  estimatedRoi: number;
}

export interface CompetitorAlertItem {
  competitorName: string;
  alertType: string;
  message: string;
  monitorDate: string;
}

export interface CompetitorMonitoringStats {
  totalMonitors: number;
  competitorCount: number;
  totalEstimatedConsumption: number;
  avgEstimatedRoi: number;
  byConfidence: { name: string; count: number }[];
  alerts: CompetitorAlertItem[];
}

// ---------- support-enhance 行业大盘 ----------

export interface IndustryTrendRecord {
  id: number;
  trendNo: string;
  industry: string;
  subIndustry?: string | null;
  platform?: string | null;
  statDate: string;
  totalConsumption?: number | null;
  consumptionGrowth?: number | null;
  avgCpc?: number | null;
  cpcChange?: number | null;
  avgCpm?: number | null;
  cpmChange?: number | null;
  avgConversionRate?: number | null;
  conversionChange?: number | null;
  activeAdvertisers?: number | null;
  advertiserGrowth?: number | null;
  trafficIndex?: number | null;
  competitionIndex?: number | null;
  dataSource: string;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IndustryTrendListParams extends SupportEnhanceListParams {
  industry?: string;
  platform?: string;
}

export interface IndustryTrendCreateDto {
  industry: string;
  subIndustry?: string;
  platform?: string;
  statDate: string;
  totalConsumption?: number;
  consumptionGrowth?: number;
  avgCpc?: number;
  cpcChange?: number;
  avgCpm?: number;
  cpmChange?: number;
  avgConversionRate?: number;
  conversionChange?: number;
  activeAdvertisers?: number;
  advertiserGrowth?: number;
  trafficIndex?: number;
  competitionIndex?: number;
  dataSource?: string;
  remark?: string;
}

export interface IndustryTrendUpdateDto extends IndustryTrendCreateDto {}

export interface IndustryTrendPoint {
  statDate: string;
  totalConsumption: number;
  avgCpc: number;
  avgCpm: number;
  avgConversionRate: number;
  activeAdvertisers: number;
  trafficIndex: number;
  competitionIndex: number;
}

export interface IndustryTrendComparisonItem {
  industry: string;
  totalConsumption: number;
  avgCpc: number;
  avgCpm: number;
  avgConversionRate: number;
}

export interface IndustryTrendAlertItem {
  industry: string;
  alertType: string;
  message: string;
  statDate: string;
}

export interface IndustryTrendStats {
  totalRecords: number;
  industryCount: number;
  totalConsumption: number;
  avgCpc: number;
  avgCpm: number;
  avgConversionRate: number;
  alerts: IndustryTrendAlertItem[];
}

// ---------- support-enhance 素材库 ----------

export interface CreativeMaterial {
  id: number;
  materialNo: string;
  materialName: string;
  materialType: string;
  industry?: string | null;
  platform?: string | null;
  fileUrl?: string | null;
  thumbnailUrl?: string | null;
  fileSize?: number | null;
  duration?: number | null;
  resolution?: string | null;
  tags?: string[] | null;
  description?: string | null;
  targetAudience?: string | null;
  sellingPoints?: string[] | null;
  creativeStyle?: string | null;
  author?: string | null;
  source: string;
  usageCount: number;
  totalConsumption: number;
  totalConversions: number;
  avgRoi: number;
  avgCtr: number;
  avgConversionRate: number;
  rating: number;
  status: string;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialListParams extends SupportEnhanceListParams {
  materialName?: string;
  materialType?: string;
  industry?: string;
  platform?: string;
  tag?: string;
  rating?: string;
  status?: string;
}

export interface MaterialCreateDto {
  materialName: string;
  materialType?: string;
  industry?: string;
  platform?: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  fileSize?: number;
  duration?: number;
  resolution?: string;
  tags?: string[];
  description?: string;
  targetAudience?: string;
  sellingPoints?: string[];
  creativeStyle?: string;
  author?: string;
  source?: string;
  rating?: number;
  status?: string;
  remark?: string;
}

export interface MaterialUpdateDto extends MaterialCreateDto {}

export interface MaterialPerformanceRecord {
  id: number;
  recordNo: string;
  materialId: number;
  platform?: string | null;
  statDate: string;
  consumption?: number | null;
  conversions?: number | null;
  roi?: number | null;
  ctr?: number | null;
  conversionRate?: number | null;
  createdAt: string;
}

export interface PerformanceRecordCreateDto {
  materialId: number;
  platform?: string;
  statDate: string;
  consumption?: number;
  conversions?: number;
  roi?: number;
  ctr?: number;
  conversionRate?: number;
}

export interface MaterialPerformancePoint {
  statDate: string;
  consumption: number;
  conversions: number;
  roi: number;
  ctr: number;
  conversionRate: number;
}

export interface MaterialRankItem {
  materialNo: string;
  materialName: string;
  materialType: string;
  totalConsumption: number;
  avgRoi: number;
  avgConversionRate: number;
  usageCount: number;
  rating: number;
}

export interface MaterialRecommendItem extends MaterialRankItem {
  recommendScore: number;
}

export interface MaterialStats {
  totalMaterials: number;
  activeMaterials: number;
  archivedMaterials: number;
  totalConsumption: number;
  totalConversions: number;
  avgRoi: number;
  avgCtr: number;
  avgConversionRate: number;
  byType: { name: string; count: number }[];
}

// ===================== 报表中心（report-center） =====================

export interface ReportFilterCondition {
  field: string;
  op: string;
  value: string;
}

export interface CustomReportRecord {
  id: number;
  reportNo: string;
  reportName: string;
  reportType: string;
  dimensions: string[];
  metrics: string[];
  chartType: string;
  filters: ReportFilterCondition[];
  timeRange: string;
  customStartDate: string | null;
  customEndDate: string | null;
  groupBy: string | null;
  sortBy: string | null;
  sortOrder: string;
  isPublic: boolean;
  sharedWith: string[];
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  remark: string | null;
}

export interface CustomReportListParams {
  page: string;
  pageSize: string;
  reportType?: string;
  keyword?: string;
  createdBy?: string;
  publicOnly?: string;
  from?: string;
  to?: string;
}

export interface CustomReportListResponse {
  items: CustomReportRecord[];
  total: number;
}

export interface CustomReportCreateInput {
  reportName: string;
  reportType?: string;
  dimensions: string[];
  metrics: string[];
  chartType?: string;
  filters?: ReportFilterCondition[];
  timeRange?: string;
  customStartDate?: string;
  customEndDate?: string;
  groupBy?: string;
  sortBy?: string;
  sortOrder?: string;
  isPublic?: boolean;
  sharedWith?: string[];
  remark?: string;
}

export interface CustomReportUpdateInput {
  reportName?: string;
  reportType?: string;
  dimensions?: string[];
  metrics?: string[];
  chartType?: string;
  filters?: ReportFilterCondition[];
  timeRange?: string;
  customStartDate?: string | null;
  customEndDate?: string | null;
  groupBy?: string | null;
  sortBy?: string | null;
  sortOrder?: string;
  isPublic?: boolean;
  sharedWith?: string[];
  remark?: string | null;
}

export interface CustomReportShareInput {
  isPublic: boolean;
  sharedWith?: string[];
}

export interface ReportRunParams {
  timeRange?: string;
  customStartDate?: string;
  customEndDate?: string;
  dimensions?: string[];
  metrics?: string[];
  chartType?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: string;
  pageSize?: string;
}

export interface ReportRunRow {
  key: string;
  dims: Record<string, string>;
  values: Record<string, number>;
}

export interface ReportRunResult {
  rows: ReportRunRow[];
  total: number;
  totals: Record<string, number>;
  dimensions: string[];
  metrics: string[];
  chartType: string;
  timeRange: string;
  rangeStart: string;
  rangeEnd: string;
}

export interface ReportTemplateRecord {
  id: number;
  templateNo: string;
  templateName: string;
  templateCategory: string;
  description: string | null;
  dimensions: string[];
  metrics: string[];
  chartType: string;
  defaultFilters: ReportFilterCondition[];
  isSystem: boolean;
  isPublic: boolean;
  sharedWith: string[];
  usageCount: number;
  rating: number;
  ratingCount: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  remark: string | null;
}

export interface ReportTemplateListParams {
  page: string;
  pageSize: string;
  category?: string;
  keyword?: string;
  isSystem?: string;
  isPublic?: string;
}

export interface ReportTemplateListResponse {
  items: ReportTemplateRecord[];
  total: number;
}

export interface ReportTemplateCreateInput {
  templateName: string;
  templateCategory?: string;
  description?: string;
  dimensions: string[];
  metrics: string[];
  chartType?: string;
  defaultFilters?: ReportFilterCondition[];
  isPublic?: boolean;
  sharedWith?: string[];
  remark?: string;
}

export interface ReportTemplateUpdateInput {
  templateName?: string;
  templateCategory?: string;
  description?: string | null;
  dimensions?: string[];
  metrics?: string[];
  chartType?: string;
  defaultFilters?: ReportFilterCondition[];
  isPublic?: boolean;
  sharedWith?: string[];
  remark?: string | null;
}

export interface ReportTemplateApplyInput {
  reportName?: string;
}

export interface ReportTemplateRatingInput {
  rating: number;
}

export interface ReportTemplateRatingResponse {
  rating: number;
  ratingCount: number;
}

export interface ScheduledReportRecord {
  id: number;
  scheduleNo: string;
  scheduleName: string;
  reportId: number | null;
  reportTemplateId: number | null;
  frequency: string;
  scheduleTime: string;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  targetType: string;
  targetId: string | null;
  targetName: string | null;
  fileFormat: string;
  includeChart: boolean;
  status: string;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  lastRunError: string | null;
  nextRunAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  remark: string | null;
}

export interface ScheduledReportListParams {
  page: string;
  pageSize: string;
  frequency?: string;
  status?: string;
  keyword?: string;
}

export interface ScheduledReportListResponse {
  items: ScheduledReportRecord[];
  total: number;
}

export interface ScheduledReportCreateInput {
  scheduleName: string;
  reportId?: number;
  reportTemplateId?: number;
  frequency: string;
  scheduleTime?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  fileFormat?: string;
  includeChart?: boolean;
  remark?: string;
}

export interface ScheduledReportUpdateInput {
  scheduleName?: string;
  reportId?: number | null;
  reportTemplateId?: number | null;
  frequency?: string;
  scheduleTime?: string;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  targetType?: string;
  targetId?: string | null;
  targetName?: string | null;
  fileFormat?: string;
  includeChart?: boolean;
  remark?: string | null;
}

export interface ScheduledReportRunResponse {
  success: boolean;
  attempts: number;
  message: string;
  schedule: ScheduledReportRecord;
}

export interface ScheduledRunLog {
  id: number;
  scheduleNo: string;
  scheduleName: string;
  status: string;
  detail: string;
  runAt: string;
}

export interface ScheduledPreviewResponse {
  schedule: ScheduledReportRecord;
  result: ReportRunResult;
}

export interface DrilldownPathItem {
  level: string;
  dimension: string;
  value: string;
}

export interface DrilldownRecord {
  id: number;
  drilldownNo: string;
  reportId: number;
  sourceLevel: string | null;
  sourceDimension: string | null;
  sourceValue: string | null;
  targetLevel: string | null;
  targetTable: string | null;
  targetId: string | null;
  targetNo: string | null;
  drilldownPath: DrilldownPathItem[];
  createdBy: string | null;
  createdAt: string;
}

export interface DrilldownListParams {
  reportId?: string;
  page: string;
  pageSize: string;
}

export interface DrilldownListResponse {
  items: DrilldownRecord[];
  total: number;
}

export interface DrilldownDetailRow {
  key: string;
  targetTable: string;
  targetNo: string;
  targetId: string;
  fields: Record<string, string>;
}

export interface DrilldownExecuteInput {
  reportId: number;
  path: DrilldownPathItem[];
  metric?: string;
  targetTable?: string;
  targetNo?: string;
}

export interface DrilldownExecuteResult {
  drilldownNo: string;
  level: string;
  breadcrumb: DrilldownPathItem[];
  rows: ReportRunRow[];
  detailRows: DrilldownDetailRow[];
  columns: string[];
  dimensions: string[];
  metrics: string[];
  rangeStart: string;
  rangeEnd: string;
}

export interface DrilldownConfigResponse {
  dimensionTargets: { dimension: string; targetTable: string; targetLabel: string }[];
}

// ===== P3-5 字段级数据权限 =====
export interface FieldPermissionItem {
  id: number;
  fieldPermNo: string;
  roleId: number;
  roleCode: string;
  roleName: string;
  module: string;
  fieldName: string;
  fieldLabel: string;
  visible: boolean;
  editable: boolean;
  masked: boolean;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FieldPermissionListParams {
  roleId?: string;
  module?: string;
  page?: string;
  pageSize?: string;
}

export interface FieldPermissionListResponse {
  items: FieldPermissionItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FieldPermissionUpsertDto {
  roleId: number;
  module: string;
  fieldName: string;
  fieldLabel: string;
  visible: boolean;
  editable: boolean;
  masked: boolean;
  remark?: string;
}

export interface FieldPermissionBatchDto {
  items: FieldPermissionUpsertDto[];
}

export interface SensitiveFieldCatalogItem {
  module: string;
  fieldName: string;
  fieldLabel: string;
}

export interface FieldPermissionCatalogResponse {
  items: SensitiveFieldCatalogItem[];
}

export interface MyFieldPermissionItem {
  module: string;
  fieldName: string;
  visible: boolean;
  editable: boolean;
  masked: boolean;
}

export interface MyFieldPermissionsResponse {
  roleCode: string;
  roleName: string | null;
  fields: MyFieldPermissionItem[];
}

// ===== P3-5 消息通知 =====
export interface MessageNotificationItem {
  id: number;
  msgNo: string;
  msgType: string;
  title: string;
  content: string;
  targetType: string;
  targetId: string | null;
  targetName: string | null;
  relatedModule: string | null;
  relatedBusinessId: string | null;
  relatedBusinessNo: string | null;
  priority: string;
  status: string;
  readAt: string | null;
  pushStatus: string;
  pushAt: string | null;
  pushError: string | null;
  pushAttempts: number;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MessageNotificationListParams {
  msgType?: string;
  status?: string;
  keyword?: string;
  page?: string;
  pageSize?: string;
}

export interface MessageNotificationListResponse {
  items: MessageNotificationItem[];
  total: number;
  page: number;
  pageSize: number;
  unreadCount: number;
}

export interface MessageNotificationCreateDto {
  msgType: string;
  title: string;
  content: string;
  targetType: string;
  targetId?: string;
  targetName?: string;
  relatedModule?: string;
  relatedBusinessId?: string;
  relatedBusinessNo?: string;
  priority?: string;
  remark?: string;
}

export interface MessageNotificationPushStatsResponse {
  total: number;
  pushed: number;
  failed: number;
  pending: number;
  byType: { msgType: string; total: number; pushed: number; failed: number }[];
}

// ===== Feishu Bitable Sync =====
export type SyncOperation = 'create' | 'update' | 'delete';
export type SyncStatus = 'success' | 'failed' | 'retrying';

export interface SyncFieldMappingItem {
  fieldName: string;
  fieldType: 'text' | 'number' | 'checkbox' | 'date';
  bitableFieldName?: string;
}

export interface SyncConfigItem {
  id: number;
  tableName: string;
  displayName: string;
  bitableTableId: string | null;
  bitableTableName: string | null;
  fieldMapping: SyncFieldMappingItem[] | null;
  enabled: boolean;
  lastSyncTime: string | null;
  syncCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SyncConfigListResponse {
  items: SyncConfigItem[];
  credentialsConfigured: boolean;
}

export interface SyncConfigUpdateDto {
  enabled?: boolean;
  fieldMapping?: SyncFieldMappingItem[];
}

export interface SyncLogItem {
  id: number;
  configId: number | null;
  tableName: string;
  recordId: string;
  operation: SyncOperation;
  status: SyncStatus;
  retryCount: number;
  errorMessage: string | null;
  durationMs: number | null;
  createdAt: string;
}

export interface SyncLogListParams {
  tableName?: string;
  status?: string;
  operation?: string;
  startTime?: string;
  endTime?: string;
  page?: string;
  pageSize?: string;
}

export interface SyncLogListResponse {
  items: SyncLogItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SyncTableStat {
  tableName: string;
  displayName: string;
  enabled: boolean;
  syncCount: number;
  successCount: number;
  failedCount: number;
  successRate: number;
  lastSyncTime: string | null;
}

export interface SyncStatsResponse {
  total: number;
  success: number;
  failed: number;
  retrying: number;
  successRate: number;
  todayCount: number;
  credentialsConfigured: boolean;
  tables: SyncTableStat[];
}

export interface SyncFullSyncResult {
  tableName: string;
  synced: number;
  skipped?: boolean;
  message?: string;
}
