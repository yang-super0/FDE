/* eslint-disable */
/** auto generated, do not edit */
import { sql } from 'drizzle-orm';
import { bigint, boolean, date, foreignKey, index, integer, jsonb, numeric, pgSequence, pgTable, text, uniqueIndex, uuid, varchar, customType } from "drizzle-orm/pg-core"

export const customTimestamptz = customType<{
  data: Date;
  driverData: string;
  config: { precision?: number };
}>({
  dataType(config) {
    const precision = typeof config?.precision !== 'undefined'
      ? ` (${config.precision})`
      : '';
    return `timestamptz${precision}`;
  },
  toDriver(value: Date | string | number) {
    if (value == null) return value as any;
    if (typeof value === 'number') return new Date(value).toISOString();
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    throw new Error('Invalid timestamp value');
  },
  fromDriver(value: string | Date): Date {
    if (value instanceof Date) return value;
    return new Date(value);
  },
});

export const userProfile = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return 'user_profile';
  },
  toDriver(value: string) {
    return sql`ROW(${value})::user_profile`;
  },
  fromDriver(value: string) {
    const [userId] = value.slice(1, -1).split(',');
    return userId.trim();
  },
});

export type FileAttachment = {
  bucket_id: string;
  file_path: string;
};

export const fileAttachment = customType<{
  data: FileAttachment;
  driverData: string;
}>({
  dataType() {
    return 'file_attachment';
  },
  toDriver(value: FileAttachment) {
    return sql`ROW(${value.bucket_id},${value.file_path})::file_attachment`;
  },
  fromDriver(value: string): FileAttachment {
    const [bucketId, filePath] = value.slice(1, -1).split(',');
    return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
  },
});

export function escapeLiteral(str: string): string {
  return "'" + str.replace(/'/g, "''") + "'";
}

export const userProfileArray = customType<{
  data: string[];
  driverData: string;
}>({
  dataType() {
    return 'user_profile[]';
  },
  toDriver(value: string[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::user_profile[]`;
    }
    const elements = value.map(id => `ROW(${escapeLiteral(id)})::user_profile`).join(',');
    return sql.raw(`ARRAY[${elements}]::user_profile[]`);
  },
  fromDriver(value: string): string[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => m.slice(1, -1).split(',')[0].trim());
  },
});

export const fileAttachmentArray = customType<{
  data: FileAttachment[];
  driverData: string;
}>({
  dataType() {
    return 'file_attachment[]';
  },
  toDriver(value: FileAttachment[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::file_attachment[]`;
    }
    const elements = value.map(f =>
      `ROW(${escapeLiteral(f.bucket_id)},${escapeLiteral(f.file_path)})::file_attachment`
    ).join(',');
    return sql.raw(`ARRAY[${elements}]::file_attachment[]`);
  },
  fromDriver(value: string): FileAttachment[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => {
      const [bucketId, filePath] = m.slice(1, -1).split(',');
      return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
    });
  },
});

export const actorsIdSeq = pgSequence("actors_id_seq");

export const adminAssetsIdSeq = pgSequence("admin_assets_id_seq");

export const adminInboundsIdSeq = pgSequence("admin_inbounds_id_seq");

export const adminInventoriesIdSeq = pgSequence("admin_inventories_id_seq");

export const adminInventoryIdSeq = pgSequence("admin_inventory_id_seq");

export const adminPurchaseDetailsIdSeq = pgSequence("admin_purchase_details_id_seq");

export const adminPurchaseOrdersIdSeq = pgSequence("admin_purchase_orders_id_seq");

export const adminPurchaseRequestsIdSeq = pgSequence("admin_purchase_requests_id_seq");

export const adminRequisitionsIdSeq = pgSequence("admin_requisitions_id_seq");

export const adminReturnsIdSeq = pgSequence("admin_returns_id_seq");

export const batchExportsIdSeq = pgSequence("batch_exports_id_seq");

export const batchImportsIdSeq = pgSequence("batch_imports_id_seq");

export const collaborationTasksIdSeq = pgSequence("collaboration_tasks_id_seq");

export const competitorMonitoringIdSeq = pgSequence("competitor_monitoring_id_seq");

export const contractCommissionApplicationsIdSeq = pgSequence("contract_commission_applications_id_seq");

export const contractExpensesIdSeq = pgSequence("contract_expenses_id_seq");

export const contractPaymentRecordsIdSeq = pgSequence("contract_payment_records_id_seq");

export const contractRemindersIdSeq = pgSequence("contract_reminders_id_seq");

export const contractTemplatesIdSeq = pgSequence("contract_templates_id_seq");

export const creativeMaterialsIdSeq = pgSequence("creative_materials_id_seq");

export const customReportsIdSeq = pgSequence("custom_reports_id_seq");

export const customerAccountsIdSeq = pgSequence("customer_accounts_id_seq");

export const customerFinanceDetailsIdSeq = pgSequence("customer_finance_details_id_seq");

export const dailyConsumptionSummaryIdSeq = pgSequence("daily_consumption_summary_id_seq");

export const departmentTargetsIdSeq = pgSequence("department_targets_id_seq");

export const fieldPermissionsIdSeq = pgSequence("field_permissions_id_seq");

export const financeAccountsIdSeq = pgSequence("finance_accounts_id_seq");

export const financeAdvancesIdSeq = pgSequence("finance_advances_id_seq");

export const financeBankAccountsIdSeq = pgSequence("finance_bank_accounts_id_seq");

export const financeCoinReturnsIdSeq = pgSequence("finance_coin_returns_id_seq");

export const financeConsumptionsIdSeq = pgSequence("finance_consumptions_id_seq");

export const financeCostsIdSeq = pgSequence("finance_costs_id_seq");

export const financeDeductionsIdSeq = pgSequence("finance_deductions_id_seq");

export const financeDepositsIdSeq = pgSequence("finance_deposits_id_seq");

export const financeExpensesIdSeq = pgSequence("finance_expenses_id_seq");

export const financeFeesIdSeq = pgSequence("finance_fees_id_seq");

export const financeIncentivesIdSeq = pgSequence("finance_incentives_id_seq");

export const financeIncomesIdSeq = pgSequence("finance_incomes_id_seq");

export const financeInvoicesIdSeq = pgSequence("finance_invoices_id_seq");

export const financePaymentsIdSeq = pgSequence("finance_payments_id_seq");

export const financePortsIdSeq = pgSequence("finance_ports_id_seq");

export const financeRebatesIdSeq = pgSequence("finance_rebates_id_seq");

export const financeReceiptsIdSeq = pgSequence("finance_receipts_id_seq");

export const financeRechargesIdSeq = pgSequence("finance_recharges_id_seq");

export const financeRefundsIdSeq = pgSequence("finance_refunds_id_seq");

export const financeSettlementsIdSeq = pgSequence("finance_settlements_id_seq");

export const hrAttendancesIdSeq = pgSequence("hr_attendances_id_seq");

export const hrCheckinsIdSeq = pgSequence("hr_checkins_id_seq");

export const hrEmployeesIdSeq = pgSequence("hr_employees_id_seq");

export const hrInterviewsIdSeq = pgSequence("hr_interviews_id_seq");

export const hrInvitationsIdSeq = pgSequence("hr_invitations_id_seq");

export const hrPerformancesIdSeq = pgSequence("hr_performances_id_seq");

export const hrRecruitmentPlansIdSeq = pgSequence("hr_recruitment_plans_id_seq");

export const hrResumesIdSeq = pgSequence("hr_resumes_id_seq");

export const hrSalariesIdSeq = pgSequence("hr_salaries_id_seq");

export const industryRoiBenchmarksIdSeq = pgSequence("industry_roi_benchmarks_id_seq");

export const industryTrendsIdSeq = pgSequence("industry_trends_id_seq");

export const inventoryCheckDetailsIdSeq = pgSequence("inventory_check_details_id_seq");

export const loginLogsIdSeq = pgSequence("login_logs_id_seq");

export const materialPerformanceRecordsIdSeq = pgSequence("material_performance_records_id_seq");

export const messageNotificationsIdSeq = pgSequence("message_notifications_id_seq");

export const myTodosIdSeq = pgSequence("my_todos_id_seq");

export const operationLogsIdSeq = pgSequence("operation_logs_id_seq");

export const orgDepartmentsIdSeq = pgSequence("org_departments_id_seq");

export const orgPositionsIdSeq = pgSequence("org_positions_id_seq");

export const outsourcingProjectsIdSeq = pgSequence("outsourcing_projects_id_seq");

export const outsourcingVendorsIdSeq = pgSequence("outsourcing_vendors_id_seq");

export const performanceTasksIdSeq = pgSequence("performance_tasks_id_seq");

export const reportDrilldownsIdSeq = pgSequence("report_drilldowns_id_seq");

export const reportTemplatesIdSeq = pgSequence("report_templates_id_seq");

export const rolePermissionsIdSeq = pgSequence("role_permissions_id_seq");

export const rolesIdSeq = pgSequence("roles_id_seq");

export const samplesIdSeq = pgSequence("samples_id_seq");

export const scheduledReportsIdSeq = pgSequence("scheduled_reports_id_seq");

export const shootingExpensesIdSeq = pgSequence("shooting_expenses_id_seq");

export const syncConfigsIdSeq = pgSequence("sync_configs_id_seq");

export const syncLogsIdSeq = pgSequence("sync_logs_id_seq");

export const systemSettingsIdSeq = pgSequence("system_settings_id_seq");

export const taskCommentsIdSeq = pgSequence("task_comments_id_seq");

export const venueExpensesIdSeq = pgSequence("venue_expenses_id_seq");

export const videoCommissionsIdSeq = pgSequence("video_commissions_id_seq");

export const videoOrdersIdSeq = pgSequence("video_orders_id_seq");

export const videoProjectsIdSeq = pgSequence("video_projects_id_seq");

export const fieldPermissionsBackup20260905 = pgTable("field_permissions_backup_20260905", {
  id: bigint("id", { mode: 'number' }),
  fieldPermNo: varchar("field_perm_no", { length: 20 }),
  roleId: bigint("role_id", { mode: 'number' }),
  roleCode: varchar("role_code", { length: 50 }),
  roleName: varchar("role_name", { length: 100 }),
  module: varchar("module", { length: 50 }),
  fieldName: varchar("field_name", { length: 100 }),
  fieldLabel: varchar("field_label", { length: 100 }),
  visible: boolean("visible"),
  editable: boolean("editable"),
  masked: boolean("masked"),
  remark: varchar("remark", { length: 500 }),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
});

export const rolePermissionsBackup20260905 = pgTable("role_permissions_backup_20260905", {
  id: bigint("id", { mode: 'number' }),
  roleId: bigint("role_id", { mode: 'number' }),
  permissionType: varchar("permission_type", { length: 10 }),
  permissionKey: varchar("permission_key", { length: 100 }),
  permissionValue: jsonb("permission_value"),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
});

export const sysUserBackup20260905 = pgTable("sys_user_backup_20260905", {
  id: uuid("id"),
  member: userProfile("member"),
  department: varchar("department", { length: 255 }),
  roleId: uuid("role_id"),
  status: varchar("status", { length: 255 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
});

export const rolesBackup20260905 = pgTable("roles_backup_20260905", {
  id: bigint("id", { mode: 'number' }),
  roleNo: varchar("role_no", { length: 20 }),
  roleName: varchar("role_name", { length: 100 }),
  roleCode: varchar("role_code", { length: 50 }),
  description: varchar("description", { length: 500 }),
  dataScope: varchar("data_scope", { length: 20 }),
  status: varchar("status", { length: 10 }),
  isSystem: boolean("is_system"),
  remark: varchar("remark", { length: 500 }),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
});

export const roleBackup20260905 = pgTable("role_backup_20260905", {
  id: uuid("id"),
  name: varchar("name", { length: 255 }),
  description: varchar("description", { length: 255 }),
  permissions: text("permissions"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
});

export const syncLogs = pgTable("sync_logs", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  configId: bigint("config_id", { mode: 'number' }),
  tableName: varchar("table_name", { length: 100 }).notNull(),
  recordId: varchar("record_id", { length: 100 }).notNull(),
  operation: varchar("operation", { length: 10 }).notNull(),
  status: varchar("status", { length: 10 }).notNull(),
  retryCount: integer("retry_count").notNull().default(0),
  errorMessage: text("error_message"),
  durationMs: integer("duration_ms"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_sync_logs_config_id").on(table.configId),
  index("idx_sync_logs_status").on(table.status),
  index("idx_sync_logs_created_at").on(table.createdAt),
]);

export const syncConfigs = pgTable("sync_configs", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  tableName: varchar("table_name", { length: 100 }).notNull().unique(),
  bitableTableId: varchar("bitable_table_id", { length: 50 }),
  bitableTableName: varchar("bitable_table_name", { length: 100 }),
  /**
   * @type { fieldName: string, fieldType: string }[]
   */
  fieldMapping: jsonb("field_mapping"),
  enabled: boolean("enabled").notNull().default(true),
  lastSyncTime: customTimestamptz("last_sync_time", { precision: 3 }),
  syncCount: integer("sync_count").notNull().default(0),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_sync_configs_table_name").on(table.tableName),
]);

export const messageNotifications = pgTable("message_notifications", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  msgNo: varchar("msg_no", { length: 20 }).notNull().unique(),
  msgType: varchar("msg_type", { length: 20 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  targetType: varchar("target_type", { length: 10 }).notNull(),
  targetId: varchar("target_id", { length: 100 }),
  targetName: varchar("target_name", { length: 100 }),
  relatedModule: varchar("related_module", { length: 50 }),
  relatedBusinessId: varchar("related_business_id", { length: 100 }),
  relatedBusinessNo: varchar("related_business_no", { length: 50 }),
  priority: varchar("priority", { length: 10 }).notNull().default('中'),
  status: varchar("status", { length: 10 }).notNull().default('未读'),
  readAt: customTimestamptz("read_at", { precision: 3 }),
  pushStatus: varchar("push_status", { length: 10 }).notNull().default('待推送'),
  pushAt: customTimestamptz("push_at", { precision: 3 }),
  pushError: varchar("push_error", { length: 500 }),
  pushAttempts: integer("push_attempts").notNull().default(0),
  remark: varchar("remark", { length: 500 }),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_message_notifications_no").on(table.msgNo),
  index("idx_message_notifications_type").on(table.msgType),
  index("idx_message_notifications_target").on(table.targetType, table.targetId),
  index("idx_message_notifications_status").on(table.status),
  index("idx_message_notifications_push").on(table.pushStatus),
  index("idx_message_notifications_created").on(table.createdAt),
]);

export const fieldPermissions = pgTable("field_permissions", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  fieldPermNo: varchar("field_perm_no", { length: 20 }).notNull().unique(),
  roleId: bigint("role_id", { mode: 'number' }).notNull(),
  roleCode: varchar("role_code", { length: 50 }).notNull(),
  roleName: varchar("role_name", { length: 100 }).notNull(),
  module: varchar("module", { length: 50 }).notNull(),
  fieldName: varchar("field_name", { length: 100 }).notNull(),
  fieldLabel: varchar("field_label", { length: 100 }).notNull(),
  visible: boolean("visible").notNull().default(true),
  editable: boolean("editable").notNull().default(true),
  masked: boolean("masked").notNull().default(false),
  remark: varchar("remark", { length: 500 }),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_field_perm_no").on(table.fieldPermNo),
  uniqueIndex("uk_field_perm_role_field").on(table.roleId, table.module, table.fieldName),
  index("idx_field_perm_role").on(table.roleId),
  index("idx_field_perm_module").on(table.module),
]);

export const reportDrilldowns = pgTable("report_drilldowns", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  drilldownNo: varchar("drilldown_no", { length: 20 }).notNull().unique(),
  reportId: bigint("report_id", { mode: 'number' }).notNull(),
  sourceLevel: varchar("source_level", { length: 10 }),
  sourceDimension: varchar("source_dimension", { length: 50 }),
  sourceValue: varchar("source_value", { length: 200 }),
  targetLevel: varchar("target_level", { length: 10 }),
  targetTable: varchar("target_table", { length: 50 }),
  targetId: varchar("target_id", { length: 64 }),
  targetNo: varchar("target_no", { length: 50 }),
  /**
   * @type { level: string; dimension: string; value: string }[]
   */
  drilldownPath: jsonb("drilldown_path"),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  remark: varchar("remark", { length: 500 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_report_drilldowns_no").on(table.drilldownNo),
  index("idx_report_drilldowns_report").on(table.reportId),
  index("idx_report_drilldowns_created").on(table.createdAt),
]);

export const scheduledReports = pgTable("scheduled_reports", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  scheduleNo: varchar("schedule_no", { length: 20 }).notNull().unique(),
  scheduleName: varchar("schedule_name", { length: 200 }).notNull(),
  reportId: bigint("report_id", { mode: 'number' }),
  reportTemplateId: bigint("report_template_id", { mode: 'number' }),
  frequency: varchar("frequency", { length: 20 }).notNull(),
  scheduleTime: varchar("schedule_time", { length: 5 }).notNull().default('09:00'),
  dayOfWeek: integer("day_of_week"),
  dayOfMonth: integer("day_of_month"),
  targetType: varchar("target_type", { length: 20 }).notNull().default('飞书群'),
  targetId: varchar("target_id", { length: 100 }),
  targetName: varchar("target_name", { length: 200 }),
  fileFormat: varchar("file_format", { length: 10 }).notNull().default('Excel'),
  includeChart: boolean("include_chart").notNull().default(true),
  status: varchar("status", { length: 10 }).notNull().default('启用'),
  lastRunAt: customTimestamptz("last_run_at", { precision: 3 }),
  lastRunStatus: varchar("last_run_status", { length: 10 }),
  lastRunError: varchar("last_run_error", { length: 500 }),
  nextRunAt: customTimestamptz("next_run_at", { precision: 3 }),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  remark: varchar("remark", { length: 500 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_scheduled_reports_no").on(table.scheduleNo),
  index("idx_scheduled_reports_frequency").on(table.frequency),
  index("idx_scheduled_reports_status").on(table.status),
  index("idx_scheduled_reports_report").on(table.reportId),
  index("idx_scheduled_reports_template").on(table.reportTemplateId),
]);

export const reportTemplates = pgTable("report_templates", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  templateNo: varchar("template_no", { length: 20 }).notNull().unique(),
  templateName: varchar("template_name", { length: 200 }).notNull(),
  templateCategory: varchar("template_category", { length: 20 }).notNull().default('综合'),
  description: varchar("description", { length: 500 }),
  /**
   * @type string[]
   */
  dimensions: jsonb("dimensions"),
  /**
   * @type string[]
   */
  metrics: jsonb("metrics"),
  chartType: varchar("chart_type", { length: 20 }).notNull().default('表格'),
  /**
   * @type { field: string; op: string; value: string }[]
   */
  defaultFilters: jsonb("default_filters"),
  isSystem: boolean("is_system").notNull().default(false),
  isPublic: boolean("is_public").notNull().default(false),
  /**
   * @type string[]
   */
  sharedWith: jsonb("shared_with"),
  usageCount: integer("usage_count").notNull().default(0),
  rating: integer("rating").notNull().default(0),
  ratingCount: integer("rating_count").notNull().default(0),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  remark: varchar("remark", { length: 500 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_report_templates_no").on(table.templateNo),
  index("idx_report_templates_category").on(table.templateCategory),
  index("idx_report_templates_system").on(table.isSystem),
  index("idx_report_templates_public").on(table.isPublic),
]);

export const customReports = pgTable("custom_reports", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  reportNo: varchar("report_no", { length: 20 }).notNull().unique(),
  reportName: varchar("report_name", { length: 200 }).notNull(),
  reportType: varchar("report_type", { length: 20 }).notNull().default('自定义'),
  /**
   * @type string[]
   */
  dimensions: jsonb("dimensions"),
  /**
   * @type string[]
   */
  metrics: jsonb("metrics"),
  chartType: varchar("chart_type", { length: 20 }).notNull().default('表格'),
  /**
   * @type { field: string; op: string; value: string }[]
   */
  filters: jsonb("filters"),
  timeRange: varchar("time_range", { length: 20 }).notNull().default('本月'),
  customStartDate: date("custom_start_date"),
  customEndDate: date("custom_end_date"),
  groupBy: varchar("group_by", { length: 50 }),
  sortBy: varchar("sort_by", { length: 50 }),
  sortOrder: varchar("sort_order", { length: 10 }).notNull().default('降序'),
  isPublic: boolean("is_public").notNull().default(false),
  /**
   * @type string[]
   */
  sharedWith: jsonb("shared_with"),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  remark: varchar("remark", { length: 500 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_custom_reports_no").on(table.reportNo),
  index("idx_custom_reports_type").on(table.reportType),
  index("idx_custom_reports_public").on(table.isPublic),
  index("idx_custom_reports_created").on(table.createdAt),
]);

export const materialPerformanceRecords = pgTable("material_performance_records", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  recordNo: varchar("record_no", { length: 20 }).notNull().unique(),
  materialId: bigint("material_id", { mode: 'number' }).notNull(),
  platform: varchar("platform", { length: 50 }),
  statDate: date("stat_date").notNull(),
  consumption: numeric("consumption"),
  conversions: integer("conversions"),
  roi: numeric("roi"),
  ctr: numeric("ctr"),
  conversionRate: numeric("conversion_rate"),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_material_performance_no").on(table.recordNo),
  index("idx_material_performance_material").on(table.materialId),
  index("idx_material_performance_stat_date").on(table.statDate),
]);

export const creativeMaterials = pgTable("creative_materials", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  materialNo: varchar("material_no", { length: 20 }).notNull().unique(),
  materialName: varchar("material_name", { length: 200 }).notNull(),
  materialType: varchar("material_type", { length: 20 }).notNull().default('图片'),
  industry: varchar("industry", { length: 100 }),
  platform: varchar("platform", { length: 50 }),
  fileUrl: text("file_url"),
  thumbnailUrl: text("thumbnail_url"),
  fileSize: bigint("file_size", { mode: 'number' }),
  duration: integer("duration"),
  resolution: varchar("resolution", { length: 20 }),
  /**
   * @type string[]
   */
  tags: jsonb("tags"),
  description: text("description"),
  targetAudience: varchar("target_audience", { length: 200 }),
  /**
   * @type string[]
   */
  sellingPoints: jsonb("selling_points"),
  creativeStyle: varchar("creative_style", { length: 50 }),
  author: varchar("author", { length: 100 }),
  source: varchar("source", { length: 20 }).notNull().default('自制'),
  usageCount: integer("usage_count").notNull().default(0),
  totalConsumption: numeric("total_consumption").notNull().default('0'),
  totalConversions: integer("total_conversions").notNull().default(0),
  avgRoi: numeric("avg_roi").notNull().default('0'),
  avgCtr: numeric("avg_ctr").notNull().default('0'),
  avgConversionRate: numeric("avg_conversion_rate").notNull().default('0'),
  rating: integer("rating").notNull().default(3),
  status: varchar("status", { length: 10 }).notNull().default('启用'),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  remark: varchar("remark", { length: 500 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_creative_materials_no").on(table.materialNo),
  index("idx_creative_materials_type").on(table.materialType),
  index("idx_creative_materials_industry").on(table.industry),
  index("idx_creative_materials_platform").on(table.platform),
  index("idx_creative_materials_status").on(table.status),
  index("idx_creative_materials_rating").on(table.rating),
]);

export const industryTrends = pgTable("industry_trends", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  trendNo: varchar("trend_no", { length: 20 }).notNull().unique(),
  industry: varchar("industry", { length: 100 }).notNull(),
  subIndustry: varchar("sub_industry", { length: 100 }),
  platform: varchar("platform", { length: 50 }),
  statDate: date("stat_date").notNull(),
  totalConsumption: numeric("total_consumption"),
  consumptionGrowth: numeric("consumption_growth"),
  avgCpc: numeric("avg_cpc"),
  cpcChange: numeric("cpc_change"),
  avgCpm: numeric("avg_cpm"),
  cpmChange: numeric("cpm_change"),
  avgConversionRate: numeric("avg_conversion_rate"),
  conversionChange: numeric("conversion_change"),
  activeAdvertisers: integer("active_advertisers"),
  advertiserGrowth: numeric("advertiser_growth"),
  trafficIndex: numeric("traffic_index"),
  competitionIndex: numeric("competition_index"),
  dataSource: varchar("data_source", { length: 20 }).notNull().default('平台公开'),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  remark: varchar("remark", { length: 500 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_industry_trends_no").on(table.trendNo),
  index("idx_industry_trends_industry").on(table.industry),
  index("idx_industry_trends_platform").on(table.platform),
  index("idx_industry_trends_stat_date").on(table.statDate),
]);

export const competitorMonitoring = pgTable("competitor_monitoring", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  monitorNo: varchar("monitor_no", { length: 20 }).notNull().unique(),
  competitorName: varchar("competitor_name", { length: 100 }).notNull(),
  competitorIndustry: varchar("competitor_industry", { length: 100 }),
  platform: varchar("platform", { length: 50 }),
  monitorDate: date("monitor_date").notNull(),
  estimatedConsumption: numeric("estimated_consumption"),
  estimatedRoi: numeric("estimated_roi"),
  adCount: integer("ad_count"),
  creativeCount: integer("creative_count"),
  mainProducts: varchar("main_products", { length: 500 }),
  targetAudience: varchar("target_audience", { length: 200 }),
  landingPageType: varchar("landing_page_type", { length: 50 }),
  /**
   * @type string[]
   */
  keywords: jsonb("keywords"),
  strengths: varchar("strengths", { length: 1000 }),
  weaknesses: varchar("weaknesses", { length: 1000 }),
  opportunities: varchar("opportunities", { length: 1000 }),
  threats: varchar("threats", { length: 1000 }),
  dataSource: varchar("data_source", { length: 20 }).notNull().default('人工估算'),
  confidence: varchar("confidence", { length: 10 }).notNull().default('中'),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  remark: varchar("remark", { length: 500 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_competitor_monitoring_no").on(table.monitorNo),
  index("idx_competitor_name").on(table.competitorName),
  index("idx_competitor_industry").on(table.competitorIndustry),
  index("idx_competitor_platform").on(table.platform),
  index("idx_competitor_monitor_date").on(table.monitorDate),
]);

export const industryRoiBenchmarks = pgTable("industry_roi_benchmarks", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  roiNo: varchar("roi_no", { length: 20 }).notNull().unique(),
  industry: varchar("industry", { length: 100 }).notNull(),
  subIndustry: varchar("sub_industry", { length: 100 }),
  platform: varchar("platform", { length: 50 }).notNull(),
  roiBenchmark: numeric("roi_benchmark").notNull(),
  roiMin: numeric("roi_min"),
  roiMax: numeric("roi_max"),
  cpcBenchmark: numeric("cpc_benchmark"),
  cpmBenchmark: numeric("cpm_benchmark"),
  conversionRate: numeric("conversion_rate"),
  effectiveDate: date("effective_date").notNull(),
  expireDate: date("expire_date"),
  status: varchar("status", { length: 10 }).notNull().default('启用'),
  version: integer("version").notNull().default(1),
  parentId: bigint("parent_id", { mode: 'number' }),
  isCurrent: boolean("is_current").notNull().default(true),
  correctReason: varchar("correct_reason", { length: 500 }),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  remark: varchar("remark", { length: 500 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_industry_roi_no").on(table.roiNo),
  index("idx_industry_roi_industry").on(table.industry),
  index("idx_industry_roi_platform").on(table.platform),
  index("idx_industry_roi_status").on(table.status),
  index("idx_industry_roi_effective").on(table.effectiveDate),
]);

export const loginLogs = pgTable("login_logs", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  logNo: varchar("log_no", { length: 20 }).notNull().unique(),
  userId: varchar("user_id", { length: 50 }).notNull(),
  username: varchar("username", { length: 100 }).notNull(),
  loginType: varchar("login_type", { length: 20 }).notNull(),
  loginStatus: varchar("login_status", { length: 10 }).notNull(),
  failReason: varchar("fail_reason", { length: 50 }),
  ipAddress: varchar("ip_address", { length: 50 }),
  ipLocation: varchar("ip_location", { length: 100 }),
  userAgent: varchar("user_agent", { length: 500 }),
  deviceInfo: varchar("device_info", { length: 200 }),
  remark: varchar("remark", { length: 500 }),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_login_logs_no").on(table.logNo),
  index("idx_login_logs_user").on(table.userId),
  index("idx_login_logs_status").on(table.loginStatus),
  index("idx_login_logs_created").on(table.createdAt),
]);

export const operationLogs = pgTable("operation_logs", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  logNo: varchar("log_no", { length: 20 }).notNull().unique(),
  userId: varchar("user_id", { length: 50 }).notNull(),
  username: varchar("username", { length: 100 }).notNull(),
  module: varchar("module", { length: 50 }).notNull(),
  operation: varchar("operation", { length: 20 }).notNull(),
  targetType: varchar("target_type", { length: 50 }).notNull(),
  targetId: varchar("target_id", { length: 100 }),
  targetName: varchar("target_name", { length: 255 }),
  /**
   * @type Record<string, unknown> | null
   */
  beforeData: jsonb("before_data"),
  /**
   * @type Record<string, unknown> | null
   */
  afterData: jsonb("after_data"),
  riskLevel: varchar("risk_level", { length: 10 }).notNull().default('普通'),
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: varchar("user_agent", { length: 500 }),
  archived: boolean("archived").notNull().default(false),
  remark: varchar("remark", { length: 500 }),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_operation_logs_no").on(table.logNo),
  index("idx_operation_logs_module").on(table.module),
  index("idx_operation_logs_operation").on(table.operation),
  index("idx_operation_logs_user").on(table.userId),
  index("idx_operation_logs_created").on(table.createdAt),
]);

export const rolePermissions = pgTable("role_permissions", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  roleId: bigint("role_id", { mode: 'number' }).notNull(),
  permissionType: varchar("permission_type", { length: 10 }).notNull(),
  permissionKey: varchar("permission_key", { length: 100 }).notNull(),
  /**
   * @type any
   */
  permissionValue: jsonb("permission_value"),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_role_permissions_role").on(table.roleId),
  index("idx_role_permissions_type").on(table.permissionType),
]);

export const roles = pgTable("roles", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  roleNo: varchar("role_no", { length: 20 }).notNull().unique(),
  roleName: varchar("role_name", { length: 100 }).notNull(),
  roleCode: varchar("role_code", { length: 50 }).notNull().unique(),
  description: varchar("description", { length: 500 }),
  dataScope: varchar("data_scope", { length: 20 }).notNull().default('全部数据'),
  status: varchar("status", { length: 10 }).notNull().default('启用'),
  isSystem: boolean("is_system").notNull().default(false),
  remark: varchar("remark", { length: 500 }),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_roles_no").on(table.roleNo),
  uniqueIndex("uk_roles_code").on(table.roleCode),
  index("idx_roles_status").on(table.status),
]);

export const customerAccounts = pgTable("customer_accounts", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  accountNo: varchar("account_no", { length: 20 }).notNull().unique(),
  customerId: uuid("customer_id").notNull(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 100 }),
  status: varchar("status", { length: 10 }).notNull().default('启用'),
  lastLoginAt: customTimestamptz("last_login_at", { precision: 3 }),
  lastLoginIp: varchar("last_login_ip", { length: 50 }),
  loginCount: integer("login_count").notNull().default(0),
  remark: varchar("remark", { length: 500 }),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_customer_accounts_no").on(table.accountNo),
  uniqueIndex("uk_customer_accounts_username").on(table.username),
  index("idx_customer_accounts_customer").on(table.customerId),
  index("idx_customer_accounts_status").on(table.status),
]);

export const orgPositions = pgTable("org_positions", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  positionNo: varchar("position_no", { length: 20 }).notNull().unique(),
  positionName: varchar("position_name", { length: 100 }).notNull(),
  deptId: bigint("dept_id", { mode: 'number' }).notNull(),
  positionLevel: varchar("position_level", { length: 20 }).notNull().default('P3'),
  parentPositionId: bigint("parent_position_id", { mode: 'number' }),
  sortOrder: integer("sort_order").notNull().default(0),
  status: varchar("status", { length: 10 }).notNull().default('启用'),
  remark: varchar("remark", { length: 500 }),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_org_positions_no").on(table.positionNo),
  index("idx_org_positions_dept").on(table.deptId),
  index("idx_org_positions_status").on(table.status),
]);

export const orgDepartments = pgTable("org_departments", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  deptNo: varchar("dept_no", { length: 20 }).notNull().unique(),
  deptName: varchar("dept_name", { length: 100 }).notNull(),
  parentId: bigint("parent_id", { mode: 'number' }),
  deptLevel: integer("dept_level").notNull().default(1),
  deptManager: varchar("dept_manager", { length: 100 }),
  sortOrder: integer("sort_order").notNull().default(0),
  status: varchar("status", { length: 10 }).notNull().default('启用'),
  remark: varchar("remark", { length: 500 }),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_org_departments_no").on(table.deptNo),
  index("idx_org_departments_parent").on(table.parentId),
  index("idx_org_departments_status").on(table.status),
]);

export const systemSettings = pgTable("system_settings", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  settingKey: varchar("setting_key", { length: 100 }).notNull().unique(),
  settingName: varchar("setting_name", { length: 100 }).notNull(),
  settingCategory: varchar("setting_category", { length: 50 }).notNull(),
  /**
   * @type any
   */
  settingValue: jsonb("setting_value").notNull(),
  /**
   * @type any
   */
  defaultValue: jsonb("default_value").notNull(),
  valueType: varchar("value_type", { length: 20 }).notNull().default('字符串'),
  description: varchar("description", { length: 500 }),
  isSystem: boolean("is_system").notNull().default(false),
  remark: varchar("remark", { length: 500 }),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_system_settings_key").on(table.settingKey),
  index("idx_system_settings_category").on(table.settingCategory),
]);

export const taskComments = pgTable("task_comments", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  commentNo: varchar("comment_no", { length: 20 }).notNull().unique(),
  taskId: bigint("task_id", { mode: 'number' }).notNull(),
  commenter: userProfile("commenter"),
  content: text("content").notNull(),
  /**
   * @type { string[] }
   */
  attachments: jsonb("attachments"),
  deletedAt: customTimestamptz("deleted_at", { precision: 6 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 6 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 6 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  uniqueIndex("uk_task_comments_no").on(table.commentNo),
  index("idx_task_comments_task").on(table.taskId),
  index("idx_task_comments_created").on(table.createdAt),
]);

export const collaborationTasks = pgTable("collaboration_tasks", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  taskNo: varchar("task_no", { length: 20 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  taskType: varchar("task_type", { length: 20 }).notNull().default('日常工作'),
  priority: varchar("priority", { length: 10 }).notNull().default('中'),
  status: varchar("status", { length: 20 }).notNull().default('待开始'),
  creator: userProfile("creator"),
  assignee: userProfile("assignee"),
  /**
   * @type { string[] }
   */
  participants: jsonb("participants"),
  department: varchar("department", { length: 100 }),
  sourceModule: varchar("source_module", { length: 20 }),
  sourceId: varchar("source_id", { length: 64 }),
  sourceNo: varchar("source_no", { length: 50 }),
  progress: integer("progress").notNull().default(0),
  startDate: date("start_date"),
  dueDate: date("due_date"),
  completedAt: customTimestamptz("completed_at", { precision: 6 }),
  remark: varchar("remark", { length: 500 }),
  deletedAt: customTimestamptz("deleted_at", { precision: 6 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 6 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 6 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  uniqueIndex("uk_collaboration_tasks_no").on(table.taskNo),
  index("idx_collab_tasks_type").on(table.taskType),
  index("idx_collab_tasks_status").on(table.status),
  index("idx_collab_tasks_priority").on(table.priority),
  // Complex index: CREATE INDEX idx_collab_tasks_assignee ON collaboration_tasks USING btree (((assignee).user_id)),
  index("idx_collab_tasks_due").on(table.dueDate),
  index("idx_collab_tasks_created").on(table.createdAt),
]);

export const myTodos = pgTable("my_todos", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  todoNo: varchar("todo_no", { length: 20 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  todoType: varchar("todo_type", { length: 20 }).notNull().default('其他'),
  sourceModule: varchar("source_module", { length: 20 }).notNull().default('系统'),
  sourceId: varchar("source_id", { length: 64 }),
  sourceNo: varchar("source_no", { length: 50 }),
  priority: varchar("priority", { length: 10 }).notNull().default('中'),
  status: varchar("status", { length: 20 }).notNull().default('待处理'),
  assignee: userProfile("assignee"),
  dueDate: date("due_date"),
  completedAt: customTimestamptz("completed_at", { precision: 6 }),
  remark: varchar("remark", { length: 500 }),
  deletedAt: customTimestamptz("deleted_at", { precision: 6 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 6 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 6 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  uniqueIndex("uk_my_todos_no").on(table.todoNo),
  index("idx_my_todos_type").on(table.todoType),
  index("idx_my_todos_module").on(table.sourceModule),
  index("idx_my_todos_priority").on(table.priority),
  index("idx_my_todos_status").on(table.status),
  index("idx_my_todos_due").on(table.dueDate),
  // Complex index: CREATE INDEX idx_my_todos_assignee ON my_todos USING btree (((assignee).user_id)),
  index("idx_my_todos_created").on(table.createdAt),
]);

export const batchExports = pgTable("batch_exports", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  exportNo: varchar("export_no", { length: 20 }).notNull().unique(),
  exportType: varchar("export_type", { length: 50 }).notNull(),
  exportName: varchar("export_name", { length: 255 }).notNull(),
  /**
   * @type { [key: string]: string }
   */
  filters: jsonb("filters"),
  /**
   * @type { string[] }
   */
  fields: jsonb("fields"),
  totalCount: integer("total_count").notNull().default(0),
  fileUrl: text("file_url"),
  status: varchar("status", { length: 20 }).notNull().default('待处理'),
  expireAt: customTimestamptz("expire_at", { precision: 6 }),
  completedAt: customTimestamptz("completed_at", { precision: 6 }),
  remark: varchar("remark", { length: 500 }),
  deletedAt: customTimestamptz("deleted_at", { precision: 6 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 6 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 6 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  uniqueIndex("uk_batch_exports_no").on(table.exportNo),
  index("idx_batch_exports_type").on(table.exportType),
  index("idx_batch_exports_status").on(table.status),
  index("idx_batch_exports_created").on(table.createdAt),
  index("idx_batch_exports_expire").on(table.expireAt),
]);

export const batchImports = pgTable("batch_imports", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  importNo: varchar("import_no", { length: 20 }).notNull().unique(),
  importType: varchar("import_type", { length: 50 }).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: text("file_url"),
  totalCount: integer("total_count").notNull().default(0),
  successCount: integer("success_count").notNull().default(0),
  failCount: integer("fail_count").notNull().default(0),
  status: varchar("status", { length: 20 }).notNull().default('待处理'),
  errorLog: text("error_log"),
  remark: varchar("remark", { length: 500 }),
  completedAt: customTimestamptz("completed_at", { precision: 6 }),
  deletedAt: customTimestamptz("deleted_at", { precision: 6 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 6 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 6 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  uniqueIndex("uk_batch_imports_no").on(table.importNo),
  index("idx_batch_imports_type").on(table.importType),
  index("idx_batch_imports_status").on(table.status),
  index("idx_batch_imports_created").on(table.createdAt),
]);

export const inventoryCheckDetails = pgTable("inventory_check_details", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  detailNo: varchar("detail_no", { length: 20 }).notNull().unique(),
  checkId: bigint("check_id", { mode: 'number' }).notNull(),
  itemName: varchar("item_name", { length: 100 }).notNull(),
  specification: varchar("specification", { length: 100 }).notNull(),
  bookQuantity: integer("book_quantity").notNull().default(0),
  actualQuantity: integer("actual_quantity"),
  difference: integer("difference"),
  status: varchar("status", { length: 10 }).notNull().default('正常'),
  remark: varchar("remark", { length: 500 }).notNull(),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_icdt_detail_no").on(table.detailNo),
  index("idx_icdt_check_id").on(table.checkId),
]);

export const adminInventories = pgTable("admin_inventories", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  inventoryCheckNo: varchar("inventory_check_no", { length: 20 }).notNull().unique(),
  checkDate: date("check_date").notNull(),
  checker: varchar("checker", { length: 50 }).notNull(),
  department: varchar("department", { length: 50 }).notNull(),
  location: varchar("location", { length: 50 }).notNull(),
  status: varchar("status", { length: 10 }).notNull().default('盘点中'),
  totalItems: integer("total_items").notNull().default(0),
  matchedItems: integer("matched_items").notNull().default(0),
  differenceItems: integer("difference_items").notNull().default(0),
  differenceSummary: varchar("difference_summary", { length: 1000 }).notNull(),
  remark: varchar("remark", { length: 500 }).notNull(),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_aivy_check_no").on(table.inventoryCheckNo),
  index("idx_aivy_status").on(table.status),
  index("idx_aivy_check_date").on(table.checkDate),
]);

export const adminReturns = pgTable("admin_returns", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  returnNo: varchar("return_no", { length: 20 }).notNull().unique(),
  requisitionId: bigint("requisition_id", { mode: 'number' }).notNull(),
  itemName: varchar("item_name", { length: 100 }).notNull(),
  itemType: varchar("item_type", { length: 20 }).notNull().default('办公用品'),
  specification: varchar("specification", { length: 100 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  unit: varchar("unit", { length: 10 }).notNull().default('件'),
  returnDate: date("return_date"),
  operator: varchar("operator", { length: 50 }).notNull(),
  condition: varchar("condition", { length: 10 }).notNull().default('完好'),
  status: varchar("status", { length: 10 }).notNull().default('待确认'),
  damageRemark: varchar("damage_remark", { length: 500 }).notNull(),
  remark: varchar("remark", { length: 500 }).notNull(),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_aret_return_no").on(table.returnNo),
  index("idx_aret_requisition_id").on(table.requisitionId),
  index("idx_aret_status").on(table.status),
]);

export const adminRequisitions = pgTable("admin_requisitions", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  requisitionNo: varchar("requisition_no", { length: 20 }).notNull().unique(),
  applicant: varchar("applicant", { length: 50 }).notNull(),
  department: varchar("department", { length: 50 }).notNull(),
  itemName: varchar("item_name", { length: 100 }).notNull(),
  itemType: varchar("item_type", { length: 20 }).notNull().default('办公用品'),
  specification: varchar("specification", { length: 100 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  unit: varchar("unit", { length: 10 }).notNull().default('件'),
  purpose: varchar("purpose", { length: 500 }).notNull(),
  status: varchar("status", { length: 10 }).notNull().default('待审批'),
  approver: varchar("approver", { length: 50 }).notNull(),
  approveTime: customTimestamptz("approve_time", { precision: 3 }),
  approveRemark: varchar("approve_remark", { length: 500 }).notNull(),
  outboundDate: date("outbound_date"),
  operator: varchar("operator", { length: 50 }).notNull(),
  expectedReturnDate: date("expected_return_date"),
  remark: varchar("remark", { length: 500 }).notNull(),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_arqn_requisition_no").on(table.requisitionNo),
  index("idx_arqn_status").on(table.status),
  index("idx_arqn_department").on(table.department),
]);

export const adminInbounds = pgTable("admin_inbounds", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  inboundNo: varchar("inbound_no", { length: 20 }).notNull().unique(),
  purchaseOrderId: bigint("purchase_order_id", { mode: 'number' }),
  itemName: varchar("item_name", { length: 100 }).notNull(),
  itemType: varchar("item_type", { length: 20 }).notNull().default('办公用品'),
  specification: varchar("specification", { length: 100 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  unit: varchar("unit", { length: 10 }).notNull().default('件'),
  unitPrice: numeric("unit_price").notNull().default('0'),
  totalPrice: numeric("total_price").notNull().default('0'),
  supplierName: varchar("supplier_name", { length: 100 }).notNull(),
  inboundDate: date("inbound_date"),
  operator: varchar("operator", { length: 50 }).notNull(),
  status: varchar("status", { length: 10 }).notNull().default('待入库'),
  remark: varchar("remark", { length: 500 }).notNull(),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_aibd_inbound_no").on(table.inboundNo),
  index("idx_aibd_status").on(table.status),
  index("idx_aibd_supplier").on(table.supplierName),
  index("idx_aibd_po_id").on(table.purchaseOrderId),
]);

export const adminInventory = pgTable("admin_inventory", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  inventoryNo: varchar("inventory_no", { length: 20 }).notNull().unique(),
  itemName: varchar("item_name", { length: 100 }).notNull(),
  itemType: varchar("item_type", { length: 20 }).notNull().default('办公用品'),
  specification: varchar("specification", { length: 100 }).notNull(),
  unit: varchar("unit", { length: 10 }).notNull().default('件'),
  quantity: integer("quantity").notNull().default(0),
  minStock: integer("min_stock").notNull().default(0),
  maxStock: integer("max_stock").notNull().default(0),
  location: varchar("location", { length: 50 }).notNull(),
  status: varchar("status", { length: 10 }).notNull().default('正常'),
  lastInDate: date("last_in_date"),
  lastOutDate: date("last_out_date"),
  remark: varchar("remark", { length: 500 }).notNull(),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_aivt_inventory_no").on(table.inventoryNo),
  index("idx_aivt_item_type").on(table.itemType),
  index("idx_aivt_status").on(table.status),
  index("idx_aivt_item_name").on(table.itemName),
]);

export const adminAssets = pgTable("admin_assets", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  assetNo: varchar("asset_no", { length: 20 }).notNull().unique(),
  assetName: varchar("asset_name", { length: 100 }).notNull(),
  assetType: varchar("asset_type", { length: 20 }).notNull().default('电子设备'),
  specification: varchar("specification", { length: 100 }).notNull(),
  purchaseDate: date("purchase_date").notNull(),
  purchasePrice: numeric("purchase_price").notNull().default('0'),
  currentValue: numeric("current_value").notNull().default('0'),
  depreciationRate: numeric("depreciation_rate").notNull().default('0'),
  department: varchar("department", { length: 50 }).notNull(),
  userName: varchar("user_name", { length: 50 }).notNull(),
  location: varchar("location", { length: 50 }).notNull(),
  status: varchar("status", { length: 10 }).notNull().default('在用'),
  lastInventoryDate: date("last_inventory_date"),
  remark: varchar("remark", { length: 500 }).notNull(),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_aast_asset_no").on(table.assetNo),
  index("idx_aast_asset_type").on(table.assetType),
  index("idx_aast_department").on(table.department),
  index("idx_aast_status").on(table.status),
]);

export const adminPurchaseDetails = pgTable("admin_purchase_details", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  detailNo: varchar("detail_no", { length: 20 }).notNull().unique(),
  orderId: bigint("order_id", { mode: 'number' }).notNull(),
  itemName: varchar("item_name", { length: 100 }).notNull(),
  specification: varchar("specification", { length: 100 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  unit: varchar("unit", { length: 10 }).notNull().default('件'),
  unitPrice: numeric("unit_price").notNull().default('0'),
  totalPrice: numeric("total_price").notNull().default('0'),
  receivedQuantity: integer("received_quantity").notNull().default(0),
  status: varchar("status", { length: 10 }).notNull().default('待收货'),
  receiveDate: date("receive_date"),
  qualityCheck: varchar("quality_check", { length: 10 }).notNull().default('待检'),
  remark: varchar("remark", { length: 500 }).notNull(),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_apdt_detail_no").on(table.detailNo),
  index("idx_apdt_order_id").on(table.orderId),
  index("idx_apdt_status").on(table.status),
]);

export const adminPurchaseOrders = pgTable("admin_purchase_orders", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  orderNo: varchar("order_no", { length: 20 }).notNull().unique(),
  requestId: bigint("request_id", { mode: 'number' }),
  supplierName: varchar("supplier_name", { length: 100 }).notNull(),
  itemName: varchar("item_name", { length: 100 }).notNull(),
  itemType: varchar("item_type", { length: 20 }).notNull().default('办公用品'),
  quantity: integer("quantity").notNull().default(1),
  unit: varchar("unit", { length: 10 }).notNull().default('件'),
  unitPrice: numeric("unit_price").notNull().default('0'),
  totalPrice: numeric("total_price").notNull().default('0'),
  orderDate: date("order_date").notNull(),
  expectedDate: date("expected_date"),
  status: varchar("status", { length: 10 }).notNull().default('待发货'),
  logisticsNo: varchar("logistics_no", { length: 50 }).notNull(),
  remark: varchar("remark", { length: 500 }).notNull(),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_apod_order_no").on(table.orderNo),
  index("idx_apod_status").on(table.status),
  index("idx_apod_supplier").on(table.supplierName),
  index("idx_apod_request_id").on(table.requestId),
]);

export const adminPurchaseRequests = pgTable("admin_purchase_requests", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  requestNo: varchar("request_no", { length: 20 }).notNull().unique(),
  applicant: varchar("applicant", { length: 50 }).notNull(),
  department: varchar("department", { length: 50 }).notNull(),
  itemName: varchar("item_name", { length: 100 }).notNull(),
  itemType: varchar("item_type", { length: 20 }).notNull().default('办公用品'),
  quantity: integer("quantity").notNull().default(1),
  unit: varchar("unit", { length: 10 }).notNull().default('件'),
  estimatedPrice: numeric("estimated_price").notNull().default('0'),
  totalPrice: numeric("total_price").notNull().default('0'),
  reason: varchar("reason", { length: 500 }).notNull(),
  status: varchar("status", { length: 10 }).notNull().default('待审批'),
  approver: varchar("approver", { length: 50 }).notNull(),
  approveTime: customTimestamptz("approve_time", { precision: 3 }),
  approveRemark: varchar("approve_remark", { length: 500 }).notNull(),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_aprq_request_no").on(table.requestNo),
  index("idx_aprq_status").on(table.status),
  index("idx_aprq_department").on(table.department),
  index("idx_aprq_item_type").on(table.itemType),
]);

export const hrAttendances = pgTable("hr_attendances", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  attendanceNo: varchar("attendance_no", { length: 20 }).notNull().unique(),
  employeeId: bigint("employee_id", { mode: 'number' }).notNull(),
  employeeName: varchar("employee_name", { length: 50 }).notNull(),
  department: varchar("department", { length: 100 }).notNull(),
  attendanceDate: date("attendance_date").notNull(),
  checkInTime: varchar("check_in_time", { length: 8 }).notNull(),
  checkOutTime: varchar("check_out_time", { length: 8 }).notNull(),
  status: varchar("status", { length: 10 }).notNull().default('正常'),
  leaveType: varchar("leave_type", { length: 10 }).notNull(),
  leaveHours: numeric("leave_hours").notNull().default('0'),
  overtimeHours: numeric("overtime_hours").notNull().default('0'),
  remark: varchar("remark", { length: 500 }).notNull(),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_hr_attendance_no").on(table.attendanceNo),
  index("idx_hr_att_employee").on(table.employeeId),
  index("idx_hr_att_date").on(table.attendanceDate),
  index("idx_hr_att_status").on(table.status),
  index("idx_hr_att_dept").on(table.department),
]);

export const hrPerformances = pgTable("hr_performances", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  performanceNo: varchar("performance_no", { length: 20 }).notNull().unique(),
  employeeId: bigint("employee_id", { mode: 'number' }).notNull(),
  employeeName: varchar("employee_name", { length: 50 }).notNull(),
  department: varchar("department", { length: 100 }).notNull(),
  period: varchar("period", { length: 10 }).notNull().default('月度'),
  mode: varchar("mode", { length: 10 }).notNull().default('KPI'),
  goals: text("goals").notNull(),
  selfScore: integer("self_score"),
  leaderScore: integer("leader_score"),
  finalScore: numeric("final_score"),
  grade: varchar("grade", { length: 2 }).notNull(),
  status: varchar("status", { length: 10 }).notNull().default('目标设定'),
  confirmDate: date("confirm_date"),
  appealReason: varchar("appeal_reason", { length: 500 }).notNull(),
  remark: varchar("remark", { length: 500 }).notNull(),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_hr_perf_no").on(table.performanceNo),
  index("idx_hr_perf_employee").on(table.employeeId),
  index("idx_hr_perf_period").on(table.period),
  index("idx_hr_perf_grade").on(table.grade),
  index("idx_hr_perf_status").on(table.status),
  index("idx_hr_perf_dept").on(table.department),
]);

export const hrSalaries = pgTable("hr_salaries", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  salaryNo: varchar("salary_no", { length: 20 }).notNull().unique(),
  employeeId: bigint("employee_id", { mode: 'number' }).notNull(),
  employeeName: varchar("employee_name", { length: 50 }).notNull(),
  department: varchar("department", { length: 100 }).notNull(),
  position: varchar("position", { length: 100 }).notNull(),
  salaryMonth: varchar("salary_month", { length: 7 }).notNull(),
  baseSalary: numeric("base_salary").notNull().default('0'),
  performanceSalary: numeric("performance_salary").notNull().default('0'),
  allowance: numeric("allowance").notNull().default('0'),
  deduction: numeric("deduction").notNull().default('0'),
  tax: numeric("tax").notNull().default('0'),
  socialInsurance: numeric("social_insurance").notNull().default('0'),
  actualSalary: numeric("actual_salary").notNull().default('0'),
  status: varchar("status", { length: 10 }).notNull().default('待核算'),
  payDate: date("pay_date"),
  remark: varchar("remark", { length: 500 }).notNull(),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_hr_salary_no").on(table.salaryNo),
  index("idx_hr_salary_employee").on(table.employeeId),
  index("idx_hr_salary_month").on(table.salaryMonth),
  index("idx_hr_salary_status").on(table.status),
  index("idx_hr_salary_dept").on(table.department),
]);

export const hrEmployees = pgTable("hr_employees", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  employeeNo: varchar("employee_no", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 50 }).notNull(),
  gender: varchar("gender", { length: 10 }).notNull().default('男'),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 100 }).notNull(),
  idCard: varchar("id_card", { length: 30 }).notNull(),
  department: varchar("department", { length: 100 }).notNull(),
  position: varchar("position", { length: 100 }).notNull(),
  level: varchar("level", { length: 20 }).notNull().default('P4'),
  entryDate: date("entry_date").notNull().default('CURRENT_DATE'),
  regularDate: date("regular_date"),
  status: varchar("status", { length: 10 }).notNull().default('试用期'),
  leaveDate: date("leave_date"),
  leaveReason: varchar("leave_reason", { length: 500 }).notNull(),
  emergencyContact: varchar("emergency_contact", { length: 50 }).notNull(),
  emergencyPhone: varchar("emergency_phone", { length: 20 }).notNull(),
  bankAccount: varchar("bank_account", { length: 50 }).notNull(),
  bankName: varchar("bank_name", { length: 100 }).notNull(),
  remark: varchar("remark", { length: 500 }).notNull(),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_hr_employee_no").on(table.employeeNo),
  index("idx_hr_emp_department").on(table.department),
  index("idx_hr_emp_status").on(table.status),
  index("idx_hr_emp_entry_date").on(table.entryDate),
  index("idx_hr_emp_leave_date").on(table.leaveDate),
]);

export const hrRecruitmentPlans = pgTable("hr_recruitment_plans", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  planNo: varchar("plan_no", { length: 20 }).notNull().unique(),
  planName: varchar("plan_name", { length: 200 }).notNull(),
  department: varchar("department", { length: 100 }).notNull(),
  position: varchar("position", { length: 100 }).notNull(),
  headcount: integer("headcount").notNull().default(1),
  hiredCount: integer("hired_count").notNull().default(0),
  priority: varchar("priority", { length: 10 }).notNull().default('中'),
  status: varchar("status", { length: 10 }).notNull().default('规划中'),
  startDate: date("start_date"),
  endDate: date("end_date"),
  requirementDescription: text("requirement_description").notNull(),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_hr_plan_no").on(table.planNo),
  index("idx_hr_plan_department").on(table.department),
  index("idx_hr_plan_status").on(table.status),
  index("idx_hr_plan_dates").on(table.startDate, table.endDate),
]);

export const hrCheckins = pgTable("hr_checkins", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  checkinNo: varchar("checkin_no", { length: 20 }).notNull().unique(),
  candidateName: varchar("candidate_name", { length: 50 }).notNull(),
  type: varchar("type", { length: 10 }).notNull().default('面试签到'),
  relatedId: bigint("related_id", { mode: 'number' }),
  checkinTime: customTimestamptz("checkin_time", { precision: 6 }),
  location: varchar("location", { length: 200 }).notNull(),
  status: varchar("status", { length: 10 }).notNull().default('未签到'),
  remark: varchar("remark", { length: 500 }).notNull(),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_hr_checkin_no").on(table.checkinNo),
  index("idx_hr_checkin_type").on(table.type),
  index("idx_hr_checkin_status").on(table.status),
  index("idx_hr_checkin_time").on(table.checkinTime),
]);

export const hrInterviews = pgTable("hr_interviews", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  interviewNo: varchar("interview_no", { length: 20 }).notNull().unique(),
  invitationId: bigint("invitation_id", { mode: 'number' }),
  resumeId: bigint("resume_id", { mode: 'number' }).notNull(),
  candidateName: varchar("candidate_name", { length: 50 }).notNull(),
  position: varchar("position", { length: 100 }).notNull(),
  interviewer: varchar("interviewer", { length: 50 }).notNull(),
  interviewRound: varchar("interview_round", { length: 10 }).notNull().default('一面'),
  interviewTime: customTimestamptz("interview_time", { precision: 6 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  result: varchar("result", { length: 10 }).notNull().default('待定'),
  scoreProfessional: integer("score_professional").notNull().default(0),
  scoreCommunication: integer("score_communication").notNull().default(0),
  scoreGeneral: integer("score_general").notNull().default(0),
  evaluation: text("evaluation").notNull(),
  offerStatus: varchar("offer_status", { length: 20 }).notNull().default('未发offer'),
  remark: varchar("remark", { length: 500 }).notNull(),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_hr_interview_no").on(table.interviewNo),
  index("idx_hr_interview_resume").on(table.resumeId),
  index("idx_hr_interview_invitation").on(table.invitationId),
  index("idx_hr_interview_result").on(table.result),
  index("idx_hr_interview_offer").on(table.offerStatus),
]);

export const hrInvitations = pgTable("hr_invitations", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  invitationNo: varchar("invitation_no", { length: 20 }).notNull().unique(),
  resumeId: bigint("resume_id", { mode: 'number' }).notNull(),
  candidateName: varchar("candidate_name", { length: 50 }).notNull(),
  position: varchar("position", { length: 100 }).notNull(),
  department: varchar("department", { length: 100 }).notNull(),
  interviewer: varchar("interviewer", { length: 50 }).notNull(),
  interviewType: varchar("interview_type", { length: 10 }).notNull().default('现场'),
  interviewRound: varchar("interview_round", { length: 10 }).notNull().default('一面'),
  scheduledTime: customTimestamptz("scheduled_time", { precision: 6 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  location: varchar("location", { length: 200 }).notNull(),
  status: varchar("status", { length: 10 }).notNull().default('待确认'),
  remark: varchar("remark", { length: 500 }).notNull(),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_hr_invitation_no").on(table.invitationNo),
  index("idx_hr_invitation_resume").on(table.resumeId),
  index("idx_hr_invitation_status").on(table.status),
  index("idx_hr_invitation_time").on(table.scheduledTime),
]);

export const hrResumes = pgTable("hr_resumes", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  resumeNo: varchar("resume_no", { length: 20 }).notNull().unique(),
  candidateName: varchar("candidate_name", { length: 50 }).notNull(),
  gender: varchar("gender", { length: 10 }).notNull().default('男'),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 100 }).notNull(),
  positionApplied: varchar("position_applied", { length: 100 }).notNull(),
  department: varchar("department", { length: 100 }).notNull(),
  source: varchar("source", { length: 20 }).notNull().default('招聘网站'),
  workYears: integer("work_years").notNull().default(0),
  education: varchar("education", { length: 20 }).notNull().default('本科'),
  tags: varchar("tags", { length: 500 }).notNull(),
  status: varchar("status", { length: 10 }).notNull().default('新简历'),
  rating: integer("rating").notNull().default(0),
  resumeContent: text("resume_content").notNull(),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_hr_resume_no").on(table.resumeNo),
  index("idx_hr_resume_status").on(table.status),
  index("idx_hr_resume_department").on(table.department),
  index("idx_hr_resume_position").on(table.positionApplied),
  index("idx_hr_resume_source").on(table.source),
]);

export const financeDeposits = pgTable("finance_deposits", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  depositNo: varchar("deposit_no", { length: 20 }).notNull().unique(),
  customerId: varchar("customer_id", { length: 64 }).notNull(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  depositType: varchar("deposit_type", { length: 10 }).notNull().default('保证金'),
  amount: numeric("amount").notNull(),
  collectDate: date("collect_date").notNull(),
  collectAccount: varchar("collect_account", { length: 100 }).notNull(),
  status: varchar("status", { length: 10 }).notNull().default('已收取'),
  returnedAmount: numeric("returned_amount").notNull().default('0'),
  returnDate: date("return_date"),
  returnAccount: varchar("return_account", { length: 100 }).notNull(),
  operator: varchar("operator", { length: 50 }).notNull(),
  remark: varchar("remark", { length: 500 }).notNull(),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_fdep_deposit_no").on(table.depositNo),
  index("idx_fdep_customer").on(table.customerId),
  index("idx_fdep_status").on(table.status),
]);

export const financeFees = pgTable("finance_fees", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  feeNo: varchar("fee_no", { length: 20 }).notNull().unique(),
  feeType: varchar("fee_type", { length: 20 }).notNull().default('其他'),
  applicant: varchar("applicant", { length: 50 }).notNull(),
  department: varchar("department", { length: 50 }).notNull(),
  amount: numeric("amount").notNull(),
  expenseDate: date("expense_date").notNull(),
  invoiceNo: varchar("invoice_no", { length: 50 }).notNull(),
  status: varchar("status", { length: 10 }).notNull().default('待提交'),
  approver: varchar("approver", { length: 50 }).notNull(),
  approveTime: customTimestamptz("approve_time", { precision: 3 }),
  reimburseTime: customTimestamptz("reimburse_time", { precision: 3 }),
  accountId: bigint("account_id", { mode: 'number' }),
  attachmentUrl: varchar("attachment_url", { length: 500 }).notNull(),
  remark: varchar("remark", { length: 500 }).notNull(),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_ffee_fee_no").on(table.feeNo),
  index("idx_ffee_status").on(table.status),
  index("idx_ffee_applicant").on(table.applicant),
]);

export const financeExpenses = pgTable("finance_expenses", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  expenseNo: varchar("expense_no", { length: 20 }).notNull().unique(),
  expenseType: varchar("expense_type", { length: 20 }).notNull().default('其他'),
  amount: numeric("amount").notNull(),
  applicant: varchar("applicant", { length: 50 }).notNull(),
  applyDate: date("apply_date").notNull(),
  status: varchar("status", { length: 10 }).notNull().default('待审批'),
  approver: varchar("approver", { length: 50 }).notNull(),
  approveTime: customTimestamptz("approve_time", { precision: 3 }),
  payTime: customTimestamptz("pay_time", { precision: 3 }),
  accountId: bigint("account_id", { mode: 'number' }),
  operator: varchar("operator", { length: 50 }).notNull(),
  remark: varchar("remark", { length: 500 }).notNull(),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_fexp_expense_no").on(table.expenseNo),
  index("idx_fexp_status").on(table.status),
  index("idx_fexp_type").on(table.expenseType),
]);

export const financeIncomes = pgTable("finance_incomes", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  incomeNo: varchar("income_no", { length: 20 }).notNull().unique(),
  incomeType: varchar("income_type", { length: 20 }).notNull().default('其他'),
  customerId: varchar("customer_id", { length: 64 }).notNull(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  amount: numeric("amount").notNull(),
  accountId: bigint("account_id", { mode: 'number' }).notNull(),
  incomeDate: date("income_date").notNull(),
  relatedOrderNo: varchar("related_order_no", { length: 50 }).notNull(),
  status: varchar("status", { length: 10 }).notNull().default('待确认'),
  operator: varchar("operator", { length: 50 }).notNull(),
  remark: varchar("remark", { length: 500 }).notNull(),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_fincome_income_no").on(table.incomeNo),
  index("idx_fincome_status").on(table.status),
  index("idx_fincome_type").on(table.incomeType),
  index("idx_fincome_date").on(table.incomeDate),
]);

export const financeIncentives = pgTable("finance_incentives", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  incentiveNo: varchar("incentive_no", { length: 20 }).notNull().unique(),
  employeeName: varchar("employee_name", { length: 50 }).notNull(),
  department: varchar("department", { length: 50 }).notNull(),
  incentiveType: varchar("incentive_type", { length: 20 }).notNull().default('其他'),
  amount: numeric("amount").notNull(),
  reason: varchar("reason", { length: 500 }).notNull(),
  status: varchar("status", { length: 10 }).notNull().default('待审批'),
  approver: varchar("approver", { length: 50 }).notNull(),
  approveTime: customTimestamptz("approve_time", { precision: 3 }),
  issueTime: customTimestamptz("issue_time", { precision: 3 }),
  operator: varchar("operator", { length: 50 }).notNull(),
  remark: varchar("remark", { length: 500 }).notNull(),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_finc_incentive_no").on(table.incentiveNo),
  index("idx_finc_status").on(table.status),
  index("idx_finc_employee").on(table.employeeName),
]);

export const financeAdvances = pgTable("finance_advances", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  advanceNo: varchar("advance_no", { length: 20 }).notNull().unique(),
  customerId: varchar("customer_id", { length: 64 }).notNull(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  amount: numeric("amount").notNull(),
  reason: varchar("reason", { length: 500 }).notNull(),
  expectedReturnDate: date("expected_return_date"),
  status: varchar("status", { length: 10 }).notNull().default('未收回'),
  returnedAmount: numeric("returned_amount").notNull().default('0'),
  returnDeadline: date("return_deadline"),
  operator: varchar("operator", { length: 50 }).notNull(),
  remark: varchar("remark", { length: 500 }).notNull(),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_fadv_advance_no").on(table.advanceNo),
  index("idx_fadv_customer").on(table.customerId),
  index("idx_fadv_status").on(table.status),
]);

export const financeConsumptions = pgTable("finance_consumptions", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  consumptionNo: varchar("consumption_no", { length: 20 }).notNull().unique(),
  customerId: varchar("customer_id", { length: 64 }).notNull(),
  adAccountId: varchar("ad_account_id", { length: 64 }).notNull(),
  portId: bigint("port_id", { mode: 'number' }),
  consumptionDate: date("consumption_date").notNull(),
  amount: numeric("amount").notNull().default('0'),
  platformData: numeric("platform_data").notNull().default('0'),
  systemData: numeric("system_data").notNull().default('0'),
  difference: numeric("difference").notNull().default('0'),
  status: varchar("status", { length: 10 }).notNull().default('待核对'),
  checker: varchar("checker", { length: 50 }).notNull(),
  checkTime: customTimestamptz("check_time", { precision: 3 }),
  remark: varchar("remark", { length: 500 }).notNull(),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_fcsm_consumption_no").on(table.consumptionNo),
  index("idx_fcsm_customer").on(table.customerId),
  index("idx_fcsm_status").on(table.status),
  index("idx_fcsm_date").on(table.consumptionDate),
]);

export const financeDeductions = pgTable("finance_deductions", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  deductionNo: varchar("deduction_no", { length: 20 }).notNull().unique(),
  customerId: varchar("customer_id", { length: 64 }).notNull(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  accountId: bigint("account_id", { mode: 'number' }).notNull(),
  amount: numeric("amount").notNull(),
  reason: varchar("reason", { length: 500 }).notNull(),
  deductionType: varchar("deduction_type", { length: 20 }).notNull().default('其他'),
  status: varchar("status", { length: 10 }).notNull().default('待审批'),
  approver: varchar("approver", { length: 50 }).notNull(),
  approveTime: customTimestamptz("approve_time", { precision: 3 }),
  executeTime: customTimestamptz("execute_time", { precision: 3 }),
  operator: varchar("operator", { length: 50 }).notNull(),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_fdt_deduction_no").on(table.deductionNo),
  index("idx_fdt_customer").on(table.customerId),
  index("idx_fdt_status").on(table.status),
]);

export const financeRebates = pgTable("finance_rebates", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  rebateNo: varchar("rebate_no", { length: 20 }).notNull().unique(),
  customerId: varchar("customer_id", { length: 64 }).notNull(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  portId: bigint("port_id", { mode: 'number' }).notNull(),
  period: varchar("period", { length: 7 }).notNull(),
  consumptionBase: numeric("consumption_base").notNull().default('0'),
  rebateRate: numeric("rebate_rate").notNull().default('0'),
  rebateAmount: numeric("rebate_amount").notNull().default('0'),
  status: varchar("status", { length: 10 }).notNull().default('待核算'),
  calculateTime: customTimestamptz("calculate_time", { precision: 3 }),
  issueTime: customTimestamptz("issue_time", { precision: 3 }),
  operator: varchar("operator", { length: 50 }).notNull(),
  remark: varchar("remark", { length: 500 }).notNull(),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_frb_rebate_no").on(table.rebateNo),
  index("idx_frb_customer").on(table.customerId),
  index("idx_frb_status").on(table.status),
  index("idx_frb_period").on(table.period),
]);

export const financeBankAccounts = pgTable("finance_bank_accounts", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  bankNo: varchar("bank_no", { length: 20 }).notNull().unique(),
  bankName: varchar("bank_name", { length: 100 }).notNull(),
  accountName: varchar("account_name", { length: 100 }).notNull(),
  accountNo: varchar("account_no", { length: 50 }).notNull(),
  branch: varchar("branch", { length: 100 }).notNull(),
  accountType: varchar("account_type", { length: 10 }).notNull().default('基本户'),
  balance: numeric("balance").notNull().default('0'),
  status: varchar("status", { length: 10 }).notNull().default('启用'),
  remark: varchar("remark", { length: 500 }).notNull(),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_fba_bank_no").on(table.bankNo),
  index("idx_fba_status").on(table.status),
]);

export const financePorts = pgTable("finance_ports", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  portNo: varchar("port_no", { length: 20 }).notNull().unique(),
  portName: varchar("port_name", { length: 100 }).notNull(),
  portType: varchar("port_type", { length: 20 }).notNull().default('内部端口'),
  platform: varchar("platform", { length: 50 }).notNull(),
  balance: numeric("balance").notNull().default('0'),
  frozenBalance: numeric("frozen_balance").notNull().default('0'),
  contactPerson: varchar("contact_person", { length: 50 }).notNull(),
  contactPhone: varchar("contact_phone", { length: 30 }).notNull(),
  status: varchar("status", { length: 10 }).notNull().default('启用'),
  remark: varchar("remark", { length: 500 }).notNull(),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_fp_port_no").on(table.portNo),
  index("idx_fp_status").on(table.status),
  index("idx_fp_port_type").on(table.portType),
]);

export const financeCoinReturns = pgTable("finance_coin_returns", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  returnNo: varchar("return_no", { length: 20 }).notNull().unique(),
  customerId: varchar("customer_id", { length: 64 }).notNull(),
  adAccountId: varchar("ad_account_id", { length: 64 }).notNull(),
  platform: varchar("platform", { length: 20 }).notNull().default('巨量千川'),
  coinAmount: numeric("coin_amount").notNull(),
  rmbEquivalent: numeric("rmb_equivalent").notNull().default('0'),
  status: varchar("status", { length: 10 }).notNull().default('待处理'),
  operator: varchar("operator", { length: 50 }).notNull(),
  finishTime: customTimestamptz("finish_time", { precision: 3 }),
  remark: varchar("remark", { length: 500 }).notNull(),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_fcr_return_no").on(table.returnNo),
  index("idx_fcr_customer").on(table.customerId),
  index("idx_fcr_status").on(table.status),
]);

export const financeRefunds = pgTable("finance_refunds", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  refundNo: varchar("refund_no", { length: 20 }).notNull().unique(),
  customerId: varchar("customer_id", { length: 64 }).notNull(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  accountId: bigint("account_id", { mode: 'number' }).notNull(),
  amount: numeric("amount").notNull(),
  reason: varchar("reason", { length: 500 }).notNull(),
  status: varchar("status", { length: 10 }).notNull().default('待审批'),
  approver: varchar("approver", { length: 50 }).notNull(),
  approveTime: customTimestamptz("approve_time", { precision: 3 }),
  approveRemark: varchar("approve_remark", { length: 500 }).notNull(),
  refundTime: customTimestamptz("refund_time", { precision: 3 }),
  operator: varchar("operator", { length: 50 }).notNull(),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_frf_refund_no").on(table.refundNo),
  index("idx_frf_customer").on(table.customerId),
  index("idx_frf_status").on(table.status),
]);

export const financeRecharges = pgTable("finance_recharges", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  rechargeNo: varchar("recharge_no", { length: 20 }).notNull().unique(),
  customerId: varchar("customer_id", { length: 64 }).notNull(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  adAccountId: varchar("ad_account_id", { length: 64 }).notNull(),
  accountId: bigint("account_id", { mode: 'number' }).notNull(),
  amount: numeric("amount").notNull(),
  paymentMethod: varchar("payment_method", { length: 20 }).notNull().default('银行转账'),
  status: varchar("status", { length: 10 }).notNull().default('待确认'),
  confirmTime: customTimestamptz("confirm_time", { precision: 3 }),
  operator: varchar("operator", { length: 50 }).notNull(),
  remark: varchar("remark", { length: 500 }).notNull(),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_fr_recharge_no").on(table.rechargeNo),
  index("idx_fr_customer").on(table.customerId),
  index("idx_fr_status").on(table.status),
]);

export const customerFinanceDetails = pgTable("customer_finance_details", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  detailNo: varchar("detail_no", { length: 20 }).notNull().unique(),
  customerId: varchar("customer_id", { length: 64 }).notNull(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  accountId: bigint("account_id", { mode: 'number' }),
  transactionType: varchar("transaction_type", { length: 20 }).notNull(),
  amount: numeric("amount").notNull(),
  balanceAfter: numeric("balance_after").notNull().default('0'),
  relatedOrderNo: varchar("related_order_no", { length: 50 }).notNull(),
  remark: varchar("remark", { length: 500 }).notNull(),
  transactionTime: customTimestamptz("transaction_time", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("uk_cfd_detail_no").on(table.detailNo),
  index("idx_cfd_customer").on(table.customerId),
  index("idx_cfd_transaction_time").on(table.transactionTime),
  index("idx_cfd_type").on(table.transactionType),
]);

export const performanceTasks = pgTable("performance_tasks", {
  id: bigint("id", { mode: 'number' }).primaryKey().default(sql`nextval('performance_tasks_id_seq'::regclass)`),
  taskNo: varchar("task_no", { length: 50 }).unique(),
  taskName: varchar("task_name", { length: 200 }).notNull(),
  taskType: varchar("task_type", { length: 50 }).notNull().default('其他'),
  department: varchar("department", { length: 100 }).notNull(),
  personInCharge: varchar("person_in_charge", { length: 100 }).notNull(),
  assignee: varchar("assignee", { length: 100 }).notNull(),
  score: numeric("score"),
  maxScore: numeric("max_score").notNull().default('100'),
  status: varchar("status", { length: 20 }).notNull().default('待确认'),
  confirmDate: date("confirm_date"),
  confirmRemark: text("confirm_remark").notNull(),
  dueDate: date("due_date"),
  description: text("description").notNull(),
  createdBy: varchar("created_by", { length: 100 }).notNull(),
  createdAt: customTimestamptz("created_at", { precision: 6 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: customTimestamptz("updated_at", { precision: 6 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  deletedAt: customTimestamptz("deleted_at", { precision: 6 }),
}, (table) => [
  uniqueIndex("performance_tasks_task_no_key").on(table.taskNo),
  index("idx_pt_assignee").on(table.assignee),
  index("idx_pt_department").on(table.department),
  index("idx_pt_status").on(table.status),
]);

export const departmentTargets = pgTable("department_targets", {
  id: bigint("id", { mode: 'number' }).primaryKey().default(sql`nextval('department_targets_id_seq'::regclass)`),
  targetNo: varchar("target_no", { length: 50 }).unique(),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  targetType: varchar("target_type", { length: 20 }).notNull().default('月度'),
  department: varchar("department", { length: 100 }).notNull(),
  targetConsumption: numeric("target_consumption").notNull().default('0'),
  actualConsumption: numeric("actual_consumption").notNull().default('0'),
  completionRate: numeric("completion_rate").notNull().default('0'),
  status: varchar("status", { length: 20 }).notNull().default('未开始'),
  createdBy: varchar("created_by", { length: 100 }).notNull(),
  createdAt: customTimestamptz("created_at", { precision: 6 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: customTimestamptz("updated_at", { precision: 6 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  deletedAt: customTimestamptz("deleted_at", { precision: 6 }),
}, (table) => [
  uniqueIndex("department_targets_target_no_key").on(table.targetNo),
  index("idx_dt_year_month").on(table.year, table.month),
  index("idx_dt_department").on(table.department),
]);

export const dailyConsumptionSummary = pgTable("daily_consumption_summary", {
  id: bigint("id", { mode: 'number' }).primaryKey().default(sql`nextval('daily_consumption_summary_id_seq'::regclass)`),
  summaryDate: date("summary_date").notNull(),
  businessType: varchar("business_type", { length: 50 }).notNull(),
  salesperson: varchar("salesperson", { length: 100 }).notNull(),
  department: varchar("department", { length: 100 }).notNull(),
  groupName: varchar("group_name", { length: 100 }).notNull(),
  port: varchar("port", { length: 50 }).notNull(),
  industry: varchar("industry", { length: 100 }).notNull(),
  customerId: varchar("customer_id", { length: 100 }).notNull(),
  customerName: varchar("customer_name", { length: 200 }).notNull(),
  consumption: numeric("consumption").notNull().default('0'),
  newAccountCount: integer("new_account_count").notNull().default(0),
  createdAt: customTimestamptz("created_at", { precision: 6 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: customTimestamptz("updated_at", { precision: 6 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  deletedAt: customTimestamptz("deleted_at", { precision: 6 }),
}, (table) => [
  index("idx_dcs_date").on(table.summaryDate),
  index("idx_dcs_salesperson").on(table.salesperson),
  index("idx_dcs_customer").on(table.customerName),
  index("idx_dcs_port").on(table.port),
  index("idx_dcs_industry").on(table.industry),
]);

export const contractCommissionApplications = pgTable("contract_commission_applications", {
  id: bigint("id", { mode: 'number' }).primaryKey().default(sql`nextval('contract_commission_applications_id_seq'::regclass)`),
  applicationNo: varchar("application_no", { length: 50 }).notNull().unique(),
  contractId: uuid("contract_id").notNull(),
  commissionRate: numeric("commission_rate").notNull().default('0'),
  commissionAmount: numeric("commission_amount").notNull().default('0'),
  applicant: varchar("applicant", { length: 100 }),
  remark: text("remark"),
  status: varchar("status", { length: 20 }).notNull().default('待审批'),
  approver: varchar("approver", { length: 100 }),
  approvedAt: customTimestamptz("approved_at", { precision: 6 }),
  rejectReason: text("reject_reason"),
  createdBy: varchar("created_by", { length: 100 }),
  deletedAt: customTimestamptz("deleted_at", { precision: 6 }),
  createdAt: customTimestamptz("created_at", { precision: 6 }).notNull().default(sql`now()`),
  updatedAt: customTimestamptz("updated_at", { precision: 6 }).notNull().default(sql`now()`),
}, (table) => [
  uniqueIndex("contract_commission_applications_application_no_key").on(table.applicationNo),
  index("idx_contract_commission_applications_contract_id").on(table.contractId),
  index("idx_contract_commission_applications_status").on(table.status),
  index("idx_contract_commission_applications_deleted_at").on(table.deletedAt),
  foreignKey({
    columns: [table.contractId],
    foreignColumns: [contract.id],
    name: "contract_commission_applications_contract_fkey",
  }),
]);

export const contractReminders = pgTable("contract_reminders", {
  id: bigint("id", { mode: 'number' }).primaryKey().default(sql`nextval('contract_reminders_id_seq'::regclass)`),
  contractId: uuid("contract_id").notNull(),
  remindType: varchar("remind_type", { length: 20 }).notNull().default('合同到期提醒'),
  content: text("content").notNull(),
  targets: text("targets").default('[]'),
  isRead: boolean("is_read").notNull().default(false),
  createdBy: varchar("created_by", { length: 100 }),
  deletedAt: customTimestamptz("deleted_at", { precision: 6 }),
  createdAt: customTimestamptz("created_at", { precision: 6 }).notNull().default(sql`now()`),
  updatedAt: customTimestamptz("updated_at", { precision: 6 }).notNull().default(sql`now()`),
}, (table) => [
  index("idx_contract_reminders_contract_id").on(table.contractId),
  index("idx_contract_reminders_remind_type").on(table.remindType),
  index("idx_contract_reminders_deleted_at").on(table.deletedAt),
  foreignKey({
    columns: [table.contractId],
    foreignColumns: [contract.id],
    name: "contract_reminders_contract_fkey",
  }),
]);

export const contractPaymentRecords = pgTable("contract_payment_records", {
  id: bigint("id", { mode: 'number' }).primaryKey().default(sql`nextval('contract_payment_records_id_seq'::regclass)`),
  recordNo: varchar("record_no", { length: 50 }).notNull().unique(),
  contractExpenseId: bigint("contract_expense_id", { mode: 'number' }).notNull(),
  contractId: uuid("contract_id").notNull(),
  amount: numeric("amount").notNull(),
  paymentDate: customTimestamptz("payment_date", { precision: 6 }).notNull().default(sql`now()`),
  paymentMethod: varchar("payment_method", { length: 20 }),
  bankAccount: varchar("bank_account", { length: 200 }),
  voucherNo: varchar("voucher_no", { length: 100 }),
  remark: text("remark"),
  createdBy: varchar("created_by", { length: 100 }),
  deletedAt: customTimestamptz("deleted_at", { precision: 6 }),
  createdAt: customTimestamptz("created_at", { precision: 6 }).notNull().default(sql`now()`),
  updatedAt: customTimestamptz("updated_at", { precision: 6 }).notNull().default(sql`now()`),
}, (table) => [
  uniqueIndex("contract_payment_records_record_no_key").on(table.recordNo),
  index("idx_contract_payment_records_expense_id").on(table.contractExpenseId),
  index("idx_contract_payment_records_contract_id").on(table.contractId),
  index("idx_contract_payment_records_payment_date").on(table.paymentDate),
  index("idx_contract_payment_records_deleted_at").on(table.deletedAt),
  foreignKey({
    columns: [table.contractExpenseId],
    foreignColumns: [contractExpenses.id],
    name: "contract_payment_records_expense_fkey",
  }),
  foreignKey({
    columns: [table.contractId],
    foreignColumns: [contract.id],
    name: "contract_payment_records_contract_fkey",
  }),
]);

export const contractExpenses = pgTable("contract_expenses", {
  id: bigint("id", { mode: 'number' }).primaryKey().default(sql`nextval('contract_expenses_id_seq'::regclass)`),
  expenseNo: varchar("expense_no", { length: 50 }).notNull().unique(),
  contractId: uuid("contract_id").notNull(),
  expenseType: varchar("expense_type", { length: 50 }).notNull().default('其他'),
  amount: numeric("amount").notNull().default('0'),
  description: text("description"),
  paymentStatus: varchar("payment_status", { length: 20 }).notNull().default('未付款'),
  paidAmount: numeric("paid_amount").notNull().default('0'),
  plannedPaymentDate: customTimestamptz("planned_payment_date", { precision: 6 }),
  actualPaymentDate: customTimestamptz("actual_payment_date", { precision: 6 }),
  paymentMethod: varchar("payment_method", { length: 20 }),
  createdBy: varchar("created_by", { length: 100 }),
  deletedAt: customTimestamptz("deleted_at", { precision: 6 }),
  createdAt: customTimestamptz("created_at", { precision: 6 }).notNull().default(sql`now()`),
  updatedAt: customTimestamptz("updated_at", { precision: 6 }).notNull().default(sql`now()`),
}, (table) => [
  uniqueIndex("contract_expenses_expense_no_key").on(table.expenseNo),
  index("idx_contract_expenses_contract_id").on(table.contractId),
  index("idx_contract_expenses_expense_type").on(table.expenseType),
  index("idx_contract_expenses_payment_status").on(table.paymentStatus),
  index("idx_contract_expenses_deleted_at").on(table.deletedAt),
  foreignKey({
    columns: [table.contractId],
    foreignColumns: [contract.id],
    name: "contract_expenses_contract_id_fkey",
  }),
]);

export const contractTemplates = pgTable("contract_templates", {
  id: bigint("id", { mode: 'number' }).primaryKey().default(sql`nextval('contract_templates_id_seq'::regclass)`),
  templateNo: varchar("template_no", { length: 50 }).notNull().unique(),
  templateName: varchar("template_name", { length: 200 }).notNull(),
  category: varchar("category", { length: 50 }).notNull().default('其他'),
  content: text("content").notNull(),
  applicableIndustry: text("applicable_industry").default('[]'),
  status: varchar("status", { length: 20 }).notNull().default('启用'),
  version: varchar("version", { length: 20 }).notNull().default('v1.0'),
  createdBy: varchar("created_by", { length: 100 }),
  deletedAt: customTimestamptz("deleted_at", { precision: 6 }),
  createdAt: customTimestamptz("created_at", { precision: 6 }).notNull().default(sql`now()`),
  updatedAt: customTimestamptz("updated_at", { precision: 6 }).notNull().default(sql`now()`),
}, (table) => [
  uniqueIndex("contract_templates_template_no_key").on(table.templateNo),
  index("idx_contract_templates_category").on(table.category),
  index("idx_contract_templates_status").on(table.status),
  index("idx_contract_templates_deleted_at").on(table.deletedAt),
]);

export const samples = pgTable("samples", {
  id: bigint("id", { mode: 'number' }).primaryKey().default(sql`nextval('samples_id_seq'::regclass)`),
  sampleNo: varchar("sample_no", { length: 50 }).notNull().unique(),
  projectId: bigint("project_id", { mode: 'number' }),
  orderId: bigint("order_id", { mode: 'number' }),
  customerName: varchar("customer_name", { length: 200 }),
  productName: varchar("product_name", { length: 200 }).notNull(),
  productModel: varchar("product_model", { length: 100 }),
  quantity: integer("quantity").default(1),
  unit: varchar("unit", { length: 20 }).default('件'),
  status: varchar("status", { length: 20 }).notNull().default('待邮寄'),
  sender: varchar("sender", { length: 50 }),
  senderPhone: varchar("sender_phone", { length: 20 }),
  senderAddress: text("sender_address"),
  receiver: varchar("receiver", { length: 50 }),
  receiverPhone: varchar("receiver_phone", { length: 20 }),
  receiverAddress: text("receiver_address"),
  expressCompany: varchar("express_company", { length: 50 }),
  expressNo: varchar("express_no", { length: 50 }),
  mailedAt: customTimestamptz("mailed_at", { precision: 6 }),
  receivedAt: customTimestamptz("received_at", { precision: 6 }),
  returnedAt: customTimestamptz("returned_at", { precision: 6 }),
  returnExpressNo: varchar("return_express_no", { length: 50 }),
  remark: text("remark"),
  deletedAt: customTimestamptz("deleted_at", { precision: 6 }),
  createdAt: customTimestamptz("created_at", { precision: 6 }).notNull().default(sql`now()`),
  updatedAt: customTimestamptz("updated_at", { precision: 6 }).notNull().default(sql`now()`),
}, (table) => [
  uniqueIndex("samples_sample_no_key").on(table.sampleNo),
  index("idx_samples_project_id").on(table.projectId),
  index("idx_samples_order_id").on(table.orderId),
  index("idx_samples_status").on(table.status),
  index("idx_samples_mailed_at").on(table.mailedAt),
  foreignKey({
    columns: [table.projectId],
    foreignColumns: [videoProjects.id],
    name: "samples_project_id_fkey",
  }),
  foreignKey({
    columns: [table.orderId],
    foreignColumns: [videoOrders.id],
    name: "samples_order_id_fkey",
  }),
]);

export const venueExpenses = pgTable("venue_expenses", {
  id: bigint("id", { mode: 'number' }).primaryKey().default(sql`nextval('venue_expenses_id_seq'::regclass)`),
  venueNo: varchar("venue_no", { length: 50 }).notNull().unique(),
  projectId: bigint("project_id", { mode: 'number' }),
  venueName: varchar("venue_name", { length: 200 }).notNull(),
  venueType: varchar("venue_type", { length: 50 }).default('影棚'),
  address: text("address"),
  contactPerson: varchar("contact_person", { length: 50 }),
  phone: varchar("phone", { length: 20 }),
  rentalDate: customTimestamptz("rental_date", { precision: 6 }),
  rentalDuration: varchar("rental_duration", { length: 50 }),
  rentalFee: numeric("rental_fee").default('0'),
  deposit: numeric("deposit").notNull().default('0'),
  depositStatus: varchar("deposit_status", { length: 20 }).notNull().default('未退还'),
  status: varchar("status", { length: 20 }).notNull().default('待审批'),
  applicant: varchar("applicant", { length: 50 }),
  approver: varchar("approver", { length: 50 }),
  approvedAt: customTimestamptz("approved_at", { precision: 6 }),
  depositReturnedAt: customTimestamptz("deposit_returned_at", { precision: 6 }),
  remark: text("remark"),
  deletedAt: customTimestamptz("deleted_at", { precision: 6 }),
  createdAt: customTimestamptz("created_at", { precision: 6 }).notNull().default(sql`now()`),
  updatedAt: customTimestamptz("updated_at", { precision: 6 }).notNull().default(sql`now()`),
}, (table) => [
  uniqueIndex("venue_expenses_venue_no_key").on(table.venueNo),
  index("idx_venue_expenses_project_id").on(table.projectId),
  index("idx_venue_expenses_status").on(table.status),
  index("idx_venue_expenses_rental_date").on(table.rentalDate),
  index("idx_venue_expenses_venue_name").on(table.venueName),
  foreignKey({
    columns: [table.projectId],
    foreignColumns: [videoProjects.id],
    name: "venue_expenses_project_id_fkey",
  }),
]);

export const shootingExpenses = pgTable("shooting_expenses", {
  id: bigint("id", { mode: 'number' }).primaryKey().default(sql`nextval('shooting_expenses_id_seq'::regclass)`),
  expenseNo: varchar("expense_no", { length: 50 }).notNull().unique(),
  projectId: bigint("project_id", { mode: 'number' }),
  expenseType: varchar("expense_type", { length: 50 }).default('其他'),
  expenseCategory: varchar("expense_category", { length: 100 }),
  amount: numeric("amount").notNull().default('0'),
  expenseDate: customTimestamptz("expense_date", { precision: 6 }),
  applicant: varchar("applicant", { length: 50 }),
  status: varchar("status", { length: 20 }).notNull().default('待审批'),
  approver: varchar("approver", { length: 50 }),
  approvedAt: customTimestamptz("approved_at", { precision: 6 }),
  rejectReason: text("reject_reason"),
  invoiceStatus: varchar("invoice_status", { length: 20 }).notNull().default('无发票'),
  remark: text("remark"),
  deletedAt: customTimestamptz("deleted_at", { precision: 6 }),
  createdAt: customTimestamptz("created_at", { precision: 6 }).notNull().default(sql`now()`),
  updatedAt: customTimestamptz("updated_at", { precision: 6 }).notNull().default(sql`now()`),
}, (table) => [
  uniqueIndex("shooting_expenses_expense_no_key").on(table.expenseNo),
  index("idx_shooting_expenses_project_id").on(table.projectId),
  index("idx_shooting_expenses_expense_type").on(table.expenseType),
  index("idx_shooting_expenses_status").on(table.status),
  index("idx_shooting_expenses_expense_date").on(table.expenseDate),
  foreignKey({
    columns: [table.projectId],
    foreignColumns: [videoProjects.id],
    name: "shooting_expenses_project_id_fkey",
  }),
]);

export const videoCommissions = pgTable("video_commissions", {
  id: bigint("id", { mode: 'number' }).primaryKey().default(sql`nextval('video_commissions_id_seq'::regclass)`),
  commissionNo: varchar("commission_no", { length: 50 }).notNull().unique(),
  orderId: bigint("order_id", { mode: 'number' }),
  projectId: bigint("project_id", { mode: 'number' }),
  salesperson: varchar("salesperson", { length: 50 }),
  projectManager: varchar("project_manager", { length: 50 }),
  orderAmount: numeric("order_amount").notNull().default('0'),
  costAmount: numeric("cost_amount").notNull().default('0'),
  profitAmount: numeric("profit_amount").notNull().default('0'),
  commissionRate: numeric("commission_rate").notNull().default('0'),
  commissionAmount: numeric("commission_amount").notNull().default('0'),
  status: varchar("status", { length: 20 }).notNull().default('待计算'),
  period: varchar("period", { length: 20 }),
  calculatedBy: varchar("calculated_by", { length: 50 }),
  calculatedAt: customTimestamptz("calculated_at", { precision: 6 }),
  paidAt: customTimestamptz("paid_at", { precision: 6 }),
  remark: text("remark"),
  deletedAt: customTimestamptz("deleted_at", { precision: 6 }),
  createdAt: customTimestamptz("created_at", { precision: 6 }).notNull().default(sql`now()`),
  updatedAt: customTimestamptz("updated_at", { precision: 6 }).notNull().default(sql`now()`),
}, (table) => [
  uniqueIndex("video_commissions_commission_no_key").on(table.commissionNo),
  index("idx_video_commissions_order_id").on(table.orderId),
  index("idx_video_commissions_project_id").on(table.projectId),
  index("idx_video_commissions_status").on(table.status),
  index("idx_video_commissions_period").on(table.period),
  foreignKey({
    columns: [table.orderId],
    foreignColumns: [videoOrders.id],
    name: "video_commissions_order_id_fkey",
  }),
  foreignKey({
    columns: [table.projectId],
    foreignColumns: [videoProjects.id],
    name: "video_commissions_project_id_fkey",
  }),
]);

export const outsourcingProjects = pgTable("outsourcing_projects", {
  id: bigint("id", { mode: 'number' }).primaryKey().default(sql`nextval('outsourcing_projects_id_seq'::regclass)`),
  projectNo: varchar("project_no", { length: 50 }).notNull().unique(),
  projectName: varchar("project_name", { length: 200 }).notNull(),
  vendorId: bigint("vendor_id", { mode: 'number' }),
  relatedProjectId: bigint("related_project_id", { mode: 'number' }),
  serviceContent: text("service_content"),
  amount: numeric("amount").default('0'),
  status: varchar("status", { length: 20 }).notNull().default('待审批'),
  applicant: varchar("applicant", { length: 50 }),
  approver: varchar("approver", { length: 50 }),
  approvedAt: customTimestamptz("approved_at", { precision: 6 }),
  rejectReason: text("reject_reason"),
  startDate: customTimestamptz("start_date", { precision: 6 }),
  endDate: customTimestamptz("end_date", { precision: 6 }),
  settlementStatus: varchar("settlement_status", { length: 20 }).notNull().default('未结算'),
  settledAmount: numeric("settled_amount").notNull().default('0'),
  remark: text("remark"),
  deletedAt: customTimestamptz("deleted_at", { precision: 6 }),
  createdAt: customTimestamptz("created_at", { precision: 6 }).notNull().default(sql`now()`),
  updatedAt: customTimestamptz("updated_at", { precision: 6 }).notNull().default(sql`now()`),
}, (table) => [
  uniqueIndex("outsourcing_projects_project_no_key").on(table.projectNo),
  index("idx_outsourcing_projects_vendor_id").on(table.vendorId),
  index("idx_outsourcing_projects_related_project_id").on(table.relatedProjectId),
  index("idx_outsourcing_projects_status").on(table.status),
  foreignKey({
    columns: [table.vendorId],
    foreignColumns: [outsourcingVendors.id],
    name: "outsourcing_projects_vendor_id_fkey",
  }),
  foreignKey({
    columns: [table.relatedProjectId],
    foreignColumns: [videoProjects.id],
    name: "outsourcing_projects_related_project_id_fkey",
  }),
]);

export const outsourcingVendors = pgTable("outsourcing_vendors", {
  id: bigint("id", { mode: 'number' }).primaryKey().default(sql`nextval('outsourcing_vendors_id_seq'::regclass)`),
  vendorName: varchar("vendor_name", { length: 200 }).notNull(),
  vendorType: varchar("vendor_type", { length: 50 }).default('其他'),
  contactPerson: varchar("contact_person", { length: 50 }),
  phone: varchar("phone", { length: 20 }),
  wechat: varchar("wechat", { length: 50 }),
  email: varchar("email", { length: 100 }),
  address: text("address"),
  cooperationLevel: varchar("cooperation_level", { length: 20 }).default('普通'),
  settlementMethod: varchar("settlement_method", { length: 20 }).default('月结'),
  taxRate: numeric("tax_rate").default('0'),
  bankAccount: varchar("bank_account", { length: 50 }),
  bankName: varchar("bank_name", { length: 100 }),
  status: varchar("status", { length: 20 }).notNull().default('合作中'),
  remark: text("remark"),
  deletedAt: customTimestamptz("deleted_at", { precision: 6 }),
  createdAt: customTimestamptz("created_at", { precision: 6 }).notNull().default(sql`now()`),
  updatedAt: customTimestamptz("updated_at", { precision: 6 }).notNull().default(sql`now()`),
}, (table) => [
  index("idx_outsourcing_vendors_vendor_type").on(table.vendorType),
  index("idx_outsourcing_vendors_status").on(table.status),
  index("idx_outsourcing_vendors_vendor_name").on(table.vendorName),
]);

export const actors = pgTable("actors", {
  id: bigint("id", { mode: 'number' }).primaryKey().default(sql`nextval('actors_id_seq'::regclass)`),
  actorName: varchar("actor_name", { length: 100 }).notNull(),
  actorType: varchar("actor_type", { length: 20 }).default('素人'),
  gender: varchar("gender", { length: 10 }),
  age: integer("age"),
  phone: varchar("phone", { length: 20 }),
  wechat: varchar("wechat", { length: 50 }),
  email: varchar("email", { length: 100 }),
  dailyRate: numeric("daily_rate").default('0'),
  halfDayRate: numeric("half_day_rate").default('0'),
  skills: text("skills").default('[]'),
  styleTags: text("style_tags").default('[]'),
  schedule: text("schedule").default('[]'),
  portfolio: text("portfolio"),
  status: varchar("status", { length: 20 }).notNull().default('可用'),
  remark: text("remark"),
  deletedAt: customTimestamptz("deleted_at", { precision: 6 }),
  createdAt: customTimestamptz("created_at", { precision: 6 }).notNull().default(sql`now()`),
  updatedAt: customTimestamptz("updated_at", { precision: 6 }).notNull().default(sql`now()`),
}, (table) => [
  index("idx_actors_actor_type").on(table.actorType),
  index("idx_actors_status").on(table.status),
  index("idx_actors_actor_name").on(table.actorName),
]);

export const videoProjects = pgTable("video_projects", {
  id: bigint("id", { mode: 'number' }).primaryKey().default(sql`nextval('video_projects_id_seq'::regclass)`),
  projectNo: varchar("project_no", { length: 50 }).notNull().unique(),
  projectName: varchar("project_name", { length: 200 }).notNull(),
  orderId: bigint("order_id", { mode: 'number' }),
  customerName: varchar("customer_name", { length: 200 }),
  projectType: varchar("project_type", { length: 50 }),
  status: varchar("status", { length: 20 }).notNull().default('筹备中'),
  projectManager: varchar("project_manager", { length: 50 }),
  teamMembers: text("team_members").default('[]'),
  nodes: text("nodes").default('[]'),
  deliverables: text("deliverables").default('[]'),
  progress: integer("progress").notNull().default(0),
  startDate: customTimestamptz("start_date", { precision: 6 }),
  endDate: customTimestamptz("end_date", { precision: 6 }),
  remark: text("remark"),
  deletedAt: customTimestamptz("deleted_at", { precision: 6 }),
  createdAt: customTimestamptz("created_at", { precision: 6 }).notNull().default(sql`now()`),
  updatedAt: customTimestamptz("updated_at", { precision: 6 }).notNull().default(sql`now()`),
}, (table) => [
  uniqueIndex("video_projects_project_no_key").on(table.projectNo),
  index("idx_video_projects_status").on(table.status),
  index("idx_video_projects_order_id").on(table.orderId),
  index("idx_video_projects_start_date").on(table.startDate),
  index("idx_video_projects_project_manager").on(table.projectManager),
  foreignKey({
    columns: [table.orderId],
    foreignColumns: [videoOrders.id],
    name: "video_projects_order_id_fkey",
  }),
]);

export const videoOrders = pgTable("video_orders", {
  id: bigint("id", { mode: 'number' }).primaryKey().default(sql`nextval('video_orders_id_seq'::regclass)`),
  orderNo: varchar("order_no", { length: 50 }).notNull().unique(),
  groupName: varchar("group_name", { length: 200 }).notNull(),
  subjectName: varchar("subject_name", { length: 200 }),
  videoType: varchar("video_type", { length: 50 }).default('产品展示'),
  quantity: integer("quantity").default(1),
  unitPrice: numeric("unit_price").default('0'),
  totalAmount: numeric("total_amount").default('0'),
  status: varchar("status", { length: 20 }).notNull().default('待审核'),
  salesperson: varchar("salesperson", { length: 50 }),
  projectManager: varchar("project_manager", { length: 50 }),
  orderDate: customTimestamptz("order_date", { precision: 6 }),
  deliveryDate: customTimestamptz("delivery_date", { precision: 6 }),
  rejectReason: text("reject_reason"),
  remark: text("remark"),
  deletedAt: customTimestamptz("deleted_at", { precision: 6 }),
  createdAt: customTimestamptz("created_at", { precision: 6 }).notNull().default(sql`now()`),
  updatedAt: customTimestamptz("updated_at", { precision: 6 }).notNull().default(sql`now()`),
}, (table) => [
  uniqueIndex("video_orders_order_no_key").on(table.orderNo),
  index("idx_video_orders_status").on(table.status),
  index("idx_video_orders_order_date").on(table.orderDate),
  index("idx_video_orders_group_name").on(table.groupName),
]);

export const financeSettlements = pgTable("finance_settlements", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  settlementNo: varchar("settlement_no", { length: 50 }).notNull().unique(),
  customerName: varchar("customer_name", { length: 200 }),
  groupName: varchar("group_name", { length: 200 }),
  period: varchar("period", { length: 20 }).notNull(),
  consumeAmount: numeric("consume_amount").notNull().default('0'),
  receiptAmount: numeric("receipt_amount").notNull().default('0'),
  costAmount: numeric("cost_amount").notNull().default('0'),
  profitAmount: numeric("profit_amount").notNull().default('0'),
  status: varchar("status", { length: 20 }).notNull().default('待结算'),
  settlementDate: customTimestamptz("settlement_date", { precision: 6 }).default(sql`now()`),
  confirmedBy: varchar("confirmed_by", { length: 50 }),
  confirmedAt: customTimestamptz("confirmed_at", { precision: 6 }),
  remark: text("remark"),
  deletedAt: customTimestamptz("deleted_at", { precision: 6 }),
  createdAt: customTimestamptz("created_at", { precision: 6 }).notNull().default(sql`now()`),
  updatedAt: customTimestamptz("updated_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("idx_fin_settlements_no").on(table.settlementNo),
  index("idx_fin_settlements_period").on(table.period),
  index("idx_fin_settlements_status").on(table.status),
  index("idx_fin_settlements_created_at").on(table.createdAt),
]);

export const financeCosts = pgTable("finance_costs", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  costNo: varchar("cost_no", { length: 50 }).notNull().unique(),
  costType: varchar("cost_type", { length: 50 }).notNull().default('媒体成本'),
  costCategory: varchar("cost_category", { length: 50 }),
  amount: numeric("amount").notNull(),
  relatedAccount: varchar("related_account", { length: 200 }),
  relatedCustomer: varchar("related_customer", { length: 200 }),
  costDate: customTimestamptz("cost_date", { precision: 6 }).default(sql`now()`),
  period: varchar("period", { length: 20 }),
  status: varchar("status", { length: 20 }).notNull().default('待核算'),
  calculatedBy: varchar("calculated_by", { length: 50 }),
  calculatedAt: customTimestamptz("calculated_at", { precision: 6 }),
  remark: text("remark"),
  deletedAt: customTimestamptz("deleted_at", { precision: 6 }),
  createdAt: customTimestamptz("created_at", { precision: 6 }).notNull().default(sql`now()`),
  updatedAt: customTimestamptz("updated_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("idx_fin_costs_no").on(table.costNo),
  index("idx_fin_costs_type").on(table.costType),
  index("idx_fin_costs_status").on(table.status),
  index("idx_fin_costs_period").on(table.period),
  index("idx_fin_costs_date").on(table.costDate),
  index("idx_fin_costs_created_at").on(table.createdAt),
]);

export const financeInvoices = pgTable("finance_invoices", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  invoiceNo: varchar("invoice_no", { length: 50 }).notNull().unique(),
  invoiceType: varchar("invoice_type", { length: 20 }).default('增值税普通发票'),
  title: varchar("title", { length: 200 }).notNull(),
  taxNumber: varchar("tax_number", { length: 50 }),
  amount: numeric("amount").notNull(),
  taxAmount: numeric("tax_amount").default('0'),
  totalAmount: numeric("total_amount").default('0'),
  invoiceDate: customTimestamptz("invoice_date", { precision: 6 }).default(sql`now()`),
  customerName: varchar("customer_name", { length: 200 }),
  status: varchar("status", { length: 20 }).notNull().default('待开具'),
  drawer: varchar("drawer", { length: 50 }),
  expressNo: varchar("express_no", { length: 50 }),
  expressDate: customTimestamptz("express_date", { precision: 6 }),
  remark: text("remark"),
  deletedAt: customTimestamptz("deleted_at", { precision: 6 }),
  createdAt: customTimestamptz("created_at", { precision: 6 }).notNull().default(sql`now()`),
  updatedAt: customTimestamptz("updated_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("idx_fin_invoices_no").on(table.invoiceNo),
  index("idx_fin_invoices_status").on(table.status),
  index("idx_fin_invoices_date").on(table.invoiceDate),
  index("idx_fin_invoices_created_at").on(table.createdAt),
]);

export const financePayments = pgTable("finance_payments", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  paymentNo: varchar("payment_no", { length: 50 }).notNull().unique(),
  payeeName: varchar("payee_name", { length: 200 }).notNull(),
  amount: numeric("amount").notNull(),
  paymentType: varchar("payment_type", { length: 20 }).default('服务费'),
  paymentMethod: varchar("payment_method", { length: 20 }).default('银行转账'),
  accountId: bigint("account_id", { mode: 'number' }),
  status: varchar("status", { length: 20 }).notNull().default('待审批'),
  paymentDate: customTimestamptz("payment_date", { precision: 6 }).default(sql`now()`),
  applicant: varchar("applicant", { length: 50 }),
  approver: varchar("approver", { length: 50 }),
  approvedAt: customTimestamptz("approved_at", { precision: 6 }),
  rejectReason: text("reject_reason"),
  remark: text("remark"),
  deletedAt: customTimestamptz("deleted_at", { precision: 6 }),
  createdAt: customTimestamptz("created_at", { precision: 6 }).notNull().default(sql`now()`),
  updatedAt: customTimestamptz("updated_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("idx_fin_payments_no").on(table.paymentNo),
  index("idx_fin_payments_account").on(table.accountId),
  index("idx_fin_payments_status").on(table.status),
  index("idx_fin_payments_date").on(table.paymentDate),
  index("idx_fin_payments_created_at").on(table.createdAt),
  foreignKey({
    columns: [table.accountId],
    foreignColumns: [financeAccounts.id],
    name: "fk_fin_payments_account",
  }),
]);

export const financeReceipts = pgTable("finance_receipts", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  receiptNo: varchar("receipt_no", { length: 50 }).notNull().unique(),
  customerName: varchar("customer_name", { length: 200 }).notNull(),
  groupName: varchar("group_name", { length: 200 }),
  amount: numeric("amount").notNull(),
  receiptType: varchar("receipt_type", { length: 20 }).default('广告费'),
  paymentMethod: varchar("payment_method", { length: 20 }).default('银行转账'),
  accountId: bigint("account_id", { mode: 'number' }),
  status: varchar("status", { length: 20 }).notNull().default('待确认'),
  receiptDate: customTimestamptz("receipt_date", { precision: 6 }).default(sql`now()`),
  confirmedBy: varchar("confirmed_by", { length: 50 }),
  confirmedAt: customTimestamptz("confirmed_at", { precision: 6 }),
  settlementId: bigint("settlement_id", { mode: 'number' }),
  relatedContract: varchar("related_contract", { length: 200 }),
  remark: text("remark"),
  deletedAt: customTimestamptz("deleted_at", { precision: 6 }),
  createdAt: customTimestamptz("created_at", { precision: 6 }).notNull().default(sql`now()`),
  updatedAt: customTimestamptz("updated_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("idx_fin_receipts_no").on(table.receiptNo),
  index("idx_fin_receipts_account").on(table.accountId),
  index("idx_fin_receipts_status").on(table.status),
  index("idx_fin_receipts_date").on(table.receiptDate),
  index("idx_fin_receipts_settlement").on(table.settlementId),
  index("idx_fin_receipts_created_at").on(table.createdAt),
  foreignKey({
    columns: [table.accountId],
    foreignColumns: [financeAccounts.id],
    name: "fk_fin_receipts_account",
  }),
  foreignKey({
    columns: [table.settlementId],
    foreignColumns: [financeSettlements.id],
    name: "fk_fin_receipts_settlement",
  }),
]);

export const financeAccounts = pgTable("finance_accounts", {
  id: bigint("id", { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  accountName: varchar("account_name", { length: 100 }).notNull(),
  accountType: varchar("account_type", { length: 20 }).default('银行账户'),
  bankName: varchar("bank_name", { length: 100 }),
  bankAccount: varchar("bank_account", { length: 50 }),
  balance: numeric("balance").notNull().default('0'),
  initialBalance: numeric("initial_balance").notNull().default('0'),
  status: varchar("status", { length: 20 }).notNull().default('启用'),
  remark: text("remark"),
  deletedAt: customTimestamptz("deleted_at", { precision: 6 }),
  createdAt: customTimestamptz("created_at", { precision: 6 }).notNull().default(sql`now()`),
  updatedAt: customTimestamptz("updated_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const commissionRecords = pgTable("commission_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  recordNo: varchar("record_no", { length: 20 }).notNull().unique(),
  salesperson: varchar("salesperson", { length: 50 }).notNull(),
  accountId: uuid("account_id"),
  accountName: varchar("account_name", { length: 200 }).notNull(),
  groupName: varchar("group_name", { length: 100 }).notNull(),
  platform: varchar("platform", { length: 50 }).notNull(),
  period: varchar("period", { length: 10 }).notNull(),
  consumeAmount: numeric("consume_amount").notNull().default('0'),
  ruleId: uuid("rule_id"),
  commissionAmount: numeric("commission_amount").notNull().default('0'),
  status: varchar("status", { length: 20 }).notNull().default('待发放'),
  calculatedAt: customTimestamptz("calculated_at", { precision: 6 }),
  paidAt: customTimestamptz("paid_at", { precision: 6 }),
  paidBy: varchar("paid_by", { length: 50 }),
  remark: text("remark").notNull(),
  deletedAt: customTimestamptz("deleted_at", { precision: 6 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("commission_records_record_no_key").on(table.recordNo),
  index("idx_comm_records_status").on(table.status),
  index("idx_comm_records_salesperson").on(table.salesperson),
  index("idx_comm_records_account").on(table.accountId),
  index("idx_comm_records_period").on(table.period),
  index("idx_comm_records_rule").on(table.ruleId),
  index("idx_comm_records_deleted").on(table.deletedAt),
  index("idx_comm_records_created_at").on(table.createdAt),
  foreignKey({
    columns: [table.accountId],
    foreignColumns: [adAccounts.id],
    name: "commission_records_account_id_fkey",
  }),
  foreignKey({
    columns: [table.ruleId],
    foreignColumns: [commissionRules.id],
    name: "commission_records_rule_id_fkey",
  }),
]);

export const commissionRules = pgTable("commission_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  ruleName: varchar("rule_name", { length: 100 }).notNull(),
  ruleType: varchar("rule_type", { length: 20 }).notNull(),
  platform: varchar("platform", { length: 50 }).notNull(),
  portType: varchar("port_type", { length: 20 }).notNull(),
  minAmount: numeric("min_amount"),
  maxAmount: numeric("max_amount"),
  rate: numeric("rate"),
  fixedAmount: numeric("fixed_amount"),
  status: varchar("status", { length: 20 }).notNull().default('启用'),
  effectiveDate: date("effective_date"),
  expireDate: date("expire_date"),
  createdBy: varchar("created_by", { length: 50 }).notNull(),
  remark: text("remark").notNull(),
  deletedAt: customTimestamptz("deleted_at", { precision: 6 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_comm_rules_status").on(table.status),
  index("idx_comm_rules_type").on(table.ruleType),
  index("idx_comm_rules_platform").on(table.platform),
  index("idx_comm_rules_deleted").on(table.deletedAt),
  index("idx_comm_rules_created_at").on(table.createdAt),
]);

export const adAccountTransfers = pgTable("ad_account_transfers", {
  id: uuid("id").primaryKey().defaultRandom(),
  transferNo: varchar("transfer_no", { length: 20 }).notNull().unique(),
  accountId: uuid("account_id"),
  accountName: varchar("account_name", { length: 200 }).notNull(),
  fromSubject: varchar("from_subject", { length: 200 }).notNull(),
  toSubject: varchar("to_subject", { length: 200 }).notNull(),
  fromPort: varchar("from_port", { length: 20 }).notNull(),
  toPort: varchar("to_port", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default('待审批'),
  applicant: varchar("applicant", { length: 50 }).notNull(),
  approver: varchar("approver", { length: 50 }),
  approvedAt: customTimestamptz("approved_at", { precision: 6 }),
  rejectReason: text("reject_reason"),
  transferReason: text("transfer_reason").notNull(),
  remark: text("remark").notNull(),
  deletedAt: customTimestamptz("deleted_at", { precision: 6 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("ad_account_transfers_transfer_no_key").on(table.transferNo),
  index("idx_ad_transfers_status").on(table.status),
  index("idx_ad_transfers_account").on(table.accountId),
  index("idx_ad_transfers_from").on(table.fromSubject),
  index("idx_ad_transfers_to").on(table.toSubject),
  index("idx_ad_transfers_applicant").on(table.applicant),
  index("idx_ad_transfers_deleted").on(table.deletedAt),
  index("idx_ad_transfers_created_at").on(table.createdAt),
  foreignKey({
    columns: [table.accountId],
    foreignColumns: [adAccounts.id],
    name: "ad_account_transfers_account_id_fkey",
  }),
]);

export const adFilings = pgTable("ad_filings", {
  id: uuid("id").primaryKey().defaultRandom(),
  filingNo: varchar("filing_no", { length: 20 }).notNull().unique(),
  accountId: uuid("account_id"),
  accountName: varchar("account_name", { length: 200 }).notNull(),
  groupName: varchar("group_name", { length: 100 }).notNull(),
  subjectName: varchar("subject_name", { length: 200 }).notNull(),
  platform: varchar("platform", { length: 50 }).notNull(),
  industry: varchar("industry", { length: 100 }).notNull(),
  productName: varchar("product_name", { length: 200 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default('待审核'),
  applicant: varchar("applicant", { length: 50 }).notNull(),
  reviewer: varchar("reviewer", { length: 50 }),
  reviewedAt: customTimestamptz("reviewed_at", { precision: 6 }),
  rejectReason: text("reject_reason"),
  filingMaterial: text("filing_material").notNull(),
  remark: text("remark").notNull(),
  deletedAt: customTimestamptz("deleted_at", { precision: 6 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("ad_filings_filing_no_key").on(table.filingNo),
  index("idx_ad_filings_status").on(table.status),
  index("idx_ad_filings_account").on(table.accountId),
  index("idx_ad_filings_platform").on(table.platform),
  index("idx_ad_filings_group").on(table.groupName),
  index("idx_ad_filings_applicant").on(table.applicant),
  index("idx_ad_filings_deleted").on(table.deletedAt),
  index("idx_ad_filings_created_at").on(table.createdAt),
  foreignKey({
    columns: [table.accountId],
    foreignColumns: [adAccounts.id],
    name: "ad_filings_account_id_fkey",
  }),
]);

export const adAccounts = pgTable("ad_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountNo: varchar("account_no", { length: 30 }).notNull().unique(),
  accountName: varchar("account_name", { length: 200 }).notNull(),
  groupName: varchar("group_name", { length: 100 }).notNull(),
  subjectName: varchar("subject_name", { length: 200 }).notNull(),
  platform: varchar("platform", { length: 50 }).notNull(),
  portType: varchar("port_type", { length: 20 }).notNull().default('内部'),
  status: varchar("status", { length: 20 }).notNull().default('正常'),
  balance: numeric("balance").notNull().default('0'),
  totalRecharge: numeric("total_recharge").notNull().default('0'),
  totalConsume: numeric("total_consume").notNull().default('0'),
  salesperson: varchar("salesperson", { length: 50 }).notNull(),
  openedAt: customTimestamptz("opened_at", { precision: 6 }),
  applicationId: uuid("application_id"),
  remark: text("remark").notNull(),
  deletedAt: customTimestamptz("deleted_at", { precision: 6 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("ad_accounts_account_no_key").on(table.accountNo),
  index("idx_ad_accounts_status").on(table.status),
  index("idx_ad_accounts_platform").on(table.platform),
  index("idx_ad_accounts_group").on(table.groupName),
  index("idx_ad_accounts_salesperson").on(table.salesperson),
  index("idx_ad_accounts_application").on(table.applicationId),
  index("idx_ad_accounts_deleted").on(table.deletedAt),
  index("idx_ad_accounts_created_at").on(table.createdAt),
  foreignKey({
    columns: [table.applicationId],
    foreignColumns: [adAccountApplications.id],
    name: "ad_accounts_application_id_fkey",
  }),
]);

export const adAccountApplications = pgTable("ad_account_applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationNo: varchar("application_no", { length: 20 }).notNull().unique(),
  groupName: varchar("group_name", { length: 100 }).notNull(),
  subjectName: varchar("subject_name", { length: 200 }).notNull(),
  platform: varchar("platform", { length: 50 }).notNull(),
  portType: varchar("port_type", { length: 20 }).notNull().default('内部'),
  accountType: varchar("account_type", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default('待审批'),
  applicant: varchar("applicant", { length: 50 }).notNull(),
  approver: varchar("approver", { length: 50 }),
  approvedAt: customTimestamptz("approved_at", { precision: 6 }),
  rejectReason: text("reject_reason"),
  remark: text("remark").notNull(),
  deletedAt: customTimestamptz("deleted_at", { precision: 6 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("ad_account_applications_application_no_key").on(table.applicationNo),
  index("idx_ad_apps_status").on(table.status),
  index("idx_ad_apps_platform").on(table.platform),
  index("idx_ad_apps_group").on(table.groupName),
  index("idx_ad_apps_applicant").on(table.applicant),
  index("idx_ad_apps_deleted").on(table.deletedAt),
  index("idx_ad_apps_created_at").on(table.createdAt),
]);

export const leadFollowUps = pgTable("lead_follow_ups", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id").notNull(),
  followUpType: varchar("follow_up_type", { length: 20 }),
  content: text("content").notNull(),
  followUpAt: customTimestamptz("follow_up_at", { precision: 6 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  followUpBy: varchar("follow_up_by", { length: 50 }),
  nextAction: varchar("next_action", { length: 200 }),
  deletedAt: customTimestamptz("deleted_at", { precision: 6 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_lead_follow_ups_lead").on(table.leadId),
  index("idx_lead_follow_ups_at").on(table.followUpAt),
  index("idx_lead_follow_ups_deleted").on(table.deletedAt),
  foreignKey({
    columns: [table.leadId],
    foreignColumns: [leads.id],
    name: "lead_follow_ups_lead_id_fkey",
  }),
]);

export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadName: varchar("lead_name", { length: 200 }).notNull(),
  contactPerson: varchar("contact_person", { length: 50 }),
  contactPhone: varchar("contact_phone", { length: 20 }),
  industry: varchar("industry", { length: 100 }),
  source: varchar("source", { length: 50 }),
  status: varchar("status", { length: 20 }).notNull().default('待跟进'),
  owner: varchar("owner", { length: 50 }),
  nextFollowUpAt: customTimestamptz("next_follow_up_at", { precision: 6 }),
  convertedCustomerId: uuid("converted_customer_id"),
  convertedAt: customTimestamptz("converted_at", { precision: 6 }),
  remark: text("remark").notNull(),
  deletedAt: customTimestamptz("deleted_at", { precision: 6 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_leads_status").on(table.status),
  index("idx_leads_source").on(table.source),
  index("idx_leads_owner").on(table.owner),
  index("idx_leads_next_follow").on(table.nextFollowUpAt),
  index("idx_leads_deleted").on(table.deletedAt),
  index("idx_leads_created_at").on(table.createdAt),
  index("idx_leads_converted_customer").on(table.convertedCustomerId),
  foreignKey({
    columns: [table.convertedCustomerId],
    foreignColumns: [customer.id],
    name: "leads_converted_customer_id_fkey",
  }),
]);

export const publicPoolLeads = pgTable("public_pool_leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  subjectName: varchar("subject_name", { length: 200 }).notNull(),
  leadLevel: varchar("lead_level", { length: 20 }),
  industry1: varchar("industry_1", { length: 100 }),
  industry2: varchar("industry_2", { length: 100 }),
  contactPerson: varchar("contact_person", { length: 50 }),
  contactPhone: varchar("contact_phone", { length: 20 }),
  status: varchar("status", { length: 20 }).notNull().default('未分配'),
  assignedTo: varchar("assigned_to", { length: 50 }),
  assignedAt: customTimestamptz("assigned_at", { precision: 6 }),
  createdBy: varchar("created_by", { length: 50 }),
  remark: text("remark").notNull(),
  deletedAt: customTimestamptz("deleted_at", { precision: 6 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_pool_leads_status").on(table.status),
  index("idx_pool_leads_level").on(table.leadLevel),
  index("idx_pool_leads_industry").on(table.industry1, table.industry2),
  index("idx_pool_leads_assigned_to").on(table.assignedTo),
  index("idx_pool_leads_created_by").on(table.createdBy),
  index("idx_pool_leads_deleted").on(table.deletedAt),
  index("idx_pool_leads_created_at").on(table.createdAt),
]);

export const knowledgeDoc = pgTable("knowledge_doc", {
  id: uuid("id").primaryKey().defaultRandom(),
  category: varchar("category", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  summary: varchar("summary", { length: 500 }).notNull(),
  content: text("content").notNull(),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const ticket = pgTable("ticket", {
  id: uuid("id").primaryKey().defaultRandom(),
  category: varchar("category", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  status: varchar("status", { length: 255 }).notNull().default('pending'),
  resolution: text("resolution").notNull(),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const sysConfig = pgTable("sys_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  configKey: varchar("config_key", { length: 255 }).notNull().unique(),
  configValue: text("config_value").notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("idx_sys_config_key").on(table.configKey),
]);

export const roleDeprecated20260905 = pgTable("role_deprecated_20260905", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  permissions: text("permissions").notNull().default('[]'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const sysUser = pgTable("sys_user", {
  id: uuid("id").primaryKey().defaultRandom(),
  member: userProfile("member").notNull(),
  department: varchar("department", { length: 255 }).notNull(),
  status: varchar("status", { length: 255 }).notNull().default('enabled'),
  roleId: bigint("role_id", { mode: 'number' }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  foreignKey({
    columns: [table.roleId],
    foreignColumns: [roles.id],
    name: "fk_sys_user_role",
  }),
]);

export const task = pgTable("task", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  assignee: userProfile("assignee"),
  priority: varchar("priority", { length: 255 }).notNull().default('medium'),
  status: varchar("status", { length: 255 }).notNull().default('todo'),
  deadline: customTimestamptz("deadline", { precision: 6 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_task_deadline").on(table.deadline),
]);

export const announcement = pgTable("announcement", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const asset = pgTable("asset", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  assetNo: varchar("asset_no", { length: 50 }).notNull(),
  holder: userProfile("holder"),
  status: varchar("status", { length: 255 }).notNull().default('in_stock'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const leaveRequest = pgTable("leave_request", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicant: userProfile("applicant"),
  leaveType: varchar("leave_type", { length: 255 }).notNull(),
  startTime: customTimestamptz("start_time", { precision: 6 }).notNull(),
  endTime: customTimestamptz("end_time", { precision: 6 }).notNull(),
  reason: text("reason").notNull(),
  status: varchar("status", { length: 255 }).notNull().default('pending'),
  approver: userProfile("approver"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const attendance = pgTable("attendance", {
  id: uuid("id").primaryKey().defaultRandom(),
  employeeId: uuid("employee_id").notNull(),
  attendDate: customTimestamptz("attend_date", { precision: 6 }).notNull(),
  status: varchar("status", { length: 255 }).notNull().default('normal'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_attendance_employee").on(table.employeeId),
]);

export const employee = pgTable("employee", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  employeeNo: varchar("employee_no", { length: 50 }).notNull(),
  departmentId: uuid("department_id"),
  position: varchar("position", { length: 255 }).notNull(),
  hireDate: customTimestamptz("hire_date", { precision: 6 }),
  phone: varchar("phone", { length: 50 }).notNull(),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_employee_department").on(table.departmentId),
]);

export const department = pgTable("department", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  parentId: uuid("parent_id"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const financeRecord = pgTable("finance_record", {
  id: uuid("id").primaryKey().defaultRandom(),
  recordType: varchar("record_type", { length: 255 }).notNull(),
  relatedType: varchar("related_type", { length: 255 }).notNull().default('other'),
  relatedId: uuid("related_id"),
  relatedName: varchar("related_name", { length: 255 }).notNull(),
  amount: numeric("amount").notNull().default('0'),
  recordDate: customTimestamptz("record_date", { precision: 6 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  remark: text("remark").notNull(),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_finance_record_date").on(table.recordDate),
]);

export const contractApproval = pgTable("contract_approval", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractId: uuid("contract_id").notNull(),
  action: varchar("action", { length: 255 }).notNull(),
  comment: text("comment").notNull(),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_contract_approval_contract").on(table.contractId),
]);

export const contract = pgTable("contract", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 255 }).notNull(),
  customerId: uuid("customer_id").notNull(),
  contractType: varchar("contract_type", { length: 255 }).notNull(),
  amount: numeric("amount").notNull().default('0'),
  signDate: customTimestamptz("sign_date", { precision: 6 }),
  expireDate: customTimestamptz("expire_date", { precision: 6 }),
  status: varchar("status", { length: 255 }).notNull().default('pending'),
  rejectReason: text("reject_reason").notNull(),
  content: text("content"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const reviewComment = pgTable("review_comment", {
  id: uuid("id").primaryKey().defaultRandom(),
  videoProjectId: uuid("video_project_id").notNull(),
  content: text("content").notNull(),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_review_comment_project").on(table.videoProjectId),
]);

export const videoProject = pgTable("video_project", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  customerId: uuid("customer_id").notNull(),
  videoType: varchar("video_type", { length: 255 }).notNull(),
  durationRequirement: varchar("duration_requirement", { length: 255 }).notNull(),
  stage: varchar("stage", { length: 255 }).notNull().default('script'),
  assignee: userProfile("assignee"),
  deadline: customTimestamptz("deadline", { precision: 6 }),
  stageRemark: text("stage_remark").notNull(),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const adPerformance = pgTable("ad_performance", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id").notNull(),
  statDate: customTimestamptz("stat_date", { precision: 6 }).notNull(),
  impressions: integer("impressions").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  conversions: integer("conversions").notNull().default(0),
  cost: numeric("cost").notNull().default('0'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_ad_performance_campaign").on(table.campaignId),
]);

export const adCampaign = pgTable("ad_campaign", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  customerId: uuid("customer_id").notNull(),
  platform: varchar("platform", { length: 255 }).notNull(),
  budget: numeric("budget").notNull().default('0'),
  status: varchar("status", { length: 255 }).notNull().default('preparing'),
  startDate: customTimestamptz("start_date", { precision: 6 }),
  endDate: customTimestamptz("end_date", { precision: 6 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const opportunity = pgTable("opportunity", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  customerId: uuid("customer_id").notNull(),
  stage: varchar("stage", { length: 255 }).notNull().default('contact'),
  amount: numeric("amount").notNull().default('0'),
  expectedCloseAt: customTimestamptz("expected_close_at", { precision: 6 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_opportunity_customer").on(table.customerId),
]);

export const followRecord = pgTable("follow_record", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id").notNull(),
  method: varchar("method", { length: 255 }).notNull(),
  content: text("content").notNull(),
  nextFollowAt: customTimestamptz("next_follow_at", { precision: 6 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_follow_record_customer").on(table.customerId),
]);

export const customer = pgTable("customer", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  industry: varchar("industry", { length: 255 }).notNull(),
  contactName: varchar("contact_name", { length: 255 }).notNull(),
  contactPhone: varchar("contact_phone", { length: 50 }).notNull(),
  source: varchar("source", { length: 255 }).notNull(),
  status: varchar("status", { length: 255 }).notNull().default('potential'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const operationLog = pgTable("operation_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  module: varchar("module", { length: 255 }).notNull(),
  actionType: varchar("action_type", { length: 255 }).notNull(),
  target: varchar("target", { length: 255 }).notNull(),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_operation_log_created_at").on(table.createdAt),
]);

// table aliases
export const actorsTable = actors;
export const adAccountApplicationsTable = adAccountApplications;
export const adAccountTransfersTable = adAccountTransfers;
export const adAccountsTable = adAccounts;
export const adCampaignTable = adCampaign;
export const adFilingsTable = adFilings;
export const adPerformanceTable = adPerformance;
export const adminAssetsTable = adminAssets;
export const adminInboundsTable = adminInbounds;
export const adminInventoriesTable = adminInventories;
export const adminInventoryTable = adminInventory;
export const adminPurchaseDetailsTable = adminPurchaseDetails;
export const adminPurchaseOrdersTable = adminPurchaseOrders;
export const adminPurchaseRequestsTable = adminPurchaseRequests;
export const adminRequisitionsTable = adminRequisitions;
export const adminReturnsTable = adminReturns;
export const announcementTable = announcement;
export const assetTable = asset;
export const attendanceTable = attendance;
export const batchExportsTable = batchExports;
export const batchImportsTable = batchImports;
export const collaborationTasksTable = collaborationTasks;
export const commissionRecordsTable = commissionRecords;
export const commissionRulesTable = commissionRules;
export const competitorMonitoringTable = competitorMonitoring;
export const contractTable = contract;
export const contractApprovalTable = contractApproval;
export const contractCommissionApplicationsTable = contractCommissionApplications;
export const contractExpensesTable = contractExpenses;
export const contractPaymentRecordsTable = contractPaymentRecords;
export const contractRemindersTable = contractReminders;
export const contractTemplatesTable = contractTemplates;
export const creativeMaterialsTable = creativeMaterials;
export const customReportsTable = customReports;
export const customerTable = customer;
export const customerAccountsTable = customerAccounts;
export const customerFinanceDetailsTable = customerFinanceDetails;
export const dailyConsumptionSummaryTable = dailyConsumptionSummary;
export const departmentTable = department;
export const departmentTargetsTable = departmentTargets;
export const employeeTable = employee;
export const fieldPermissionsTable = fieldPermissions;
export const fieldPermissionsBackup20260905Table = fieldPermissionsBackup20260905;
export const financeAccountsTable = financeAccounts;
export const financeAdvancesTable = financeAdvances;
export const financeBankAccountsTable = financeBankAccounts;
export const financeCoinReturnsTable = financeCoinReturns;
export const financeConsumptionsTable = financeConsumptions;
export const financeCostsTable = financeCosts;
export const financeDeductionsTable = financeDeductions;
export const financeDepositsTable = financeDeposits;
export const financeExpensesTable = financeExpenses;
export const financeFeesTable = financeFees;
export const financeIncentivesTable = financeIncentives;
export const financeIncomesTable = financeIncomes;
export const financeInvoicesTable = financeInvoices;
export const financePaymentsTable = financePayments;
export const financePortsTable = financePorts;
export const financeRebatesTable = financeRebates;
export const financeReceiptsTable = financeReceipts;
export const financeRechargesTable = financeRecharges;
export const financeRecordTable = financeRecord;
export const financeRefundsTable = financeRefunds;
export const financeSettlementsTable = financeSettlements;
export const followRecordTable = followRecord;
export const hrAttendancesTable = hrAttendances;
export const hrCheckinsTable = hrCheckins;
export const hrEmployeesTable = hrEmployees;
export const hrInterviewsTable = hrInterviews;
export const hrInvitationsTable = hrInvitations;
export const hrPerformancesTable = hrPerformances;
export const hrRecruitmentPlansTable = hrRecruitmentPlans;
export const hrResumesTable = hrResumes;
export const hrSalariesTable = hrSalaries;
export const industryRoiBenchmarksTable = industryRoiBenchmarks;
export const industryTrendsTable = industryTrends;
export const inventoryCheckDetailsTable = inventoryCheckDetails;
export const knowledgeDocTable = knowledgeDoc;
export const leadFollowUpsTable = leadFollowUps;
export const leadsTable = leads;
export const leaveRequestTable = leaveRequest;
export const loginLogsTable = loginLogs;
export const materialPerformanceRecordsTable = materialPerformanceRecords;
export const messageNotificationsTable = messageNotifications;
export const myTodosTable = myTodos;
export const operationLogTable = operationLog;
export const operationLogsTable = operationLogs;
export const opportunityTable = opportunity;
export const orgDepartmentsTable = orgDepartments;
export const orgPositionsTable = orgPositions;
export const outsourcingProjectsTable = outsourcingProjects;
export const outsourcingVendorsTable = outsourcingVendors;
export const performanceTasksTable = performanceTasks;
export const publicPoolLeadsTable = publicPoolLeads;
export const reportDrilldownsTable = reportDrilldowns;
export const reportTemplatesTable = reportTemplates;
export const reviewCommentTable = reviewComment;
export const roleBackup20260905Table = roleBackup20260905;
export const roleDeprecated20260905Table = roleDeprecated20260905;
export const rolePermissionsTable = rolePermissions;
export const rolePermissionsBackup20260905Table = rolePermissionsBackup20260905;
export const rolesTable = roles;
export const rolesBackup20260905Table = rolesBackup20260905;
export const samplesTable = samples;
export const scheduledReportsTable = scheduledReports;
export const shootingExpensesTable = shootingExpenses;
export const syncConfigsTable = syncConfigs;
export const syncLogsTable = syncLogs;
export const sysConfigTable = sysConfig;
export const sysUserTable = sysUser;
export const sysUserBackup20260905Table = sysUserBackup20260905;
export const systemSettingsTable = systemSettings;
export const taskTable = task;
export const taskCommentsTable = taskComments;
export const ticketTable = ticket;
export const venueExpensesTable = venueExpenses;
export const videoCommissionsTable = videoCommissions;
export const videoOrdersTable = videoOrders;
export const videoProjectTable = videoProject;
export const videoProjectsTable = videoProjects;
