import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Download, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table, type TableColumnsType, type TableProps } from '@lark-apaas/client-toolkit/antd-table';
import type { LoginLog, LoginLogListParams, LoginLogStats } from '@shared/api.interface';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import { WarehouseDatePicker, WarehouseFilterSelect } from '@client/src/pages/Admin/warehouse/warehouse-shared';
import { deleteLoginLog, getLoginLogStats, listLoginLogs } from '@client/src/api/system-enhance/login-logs';
import { toSystemEnhanceErrorText } from '../system-enhance-shared';
import { LOGIN_LOG_EXPORT_HEADERS, buildLoginLogColumns, buildLoginLogExportRows } from './LoginLogColumns';
import { LoginLogDetailDialog } from './LoginLogDetailDialog';

const LOG_PAGE_SIZE: number = 10;
const LOG_EXPORT_LIMIT: number = 100;
const LOG_FILTER_ALL: string = '__all__';
const LOG_STATUS_OPTIONS: string[] = ['成功', '失败', '锁定'];
const LOG_TYPE_OPTIONS: string[] = ['账号密码', '飞书授权', 'SSO'];

/* ============ 统计指标卡：零圆角 + 3px 主色顶边线 ============ */

const LoginStatCard = ({ label, value, emphasis }: {
  label: string;
  value: string;
  emphasis?: boolean;
}) => (
  <div data-ai-section-type="card-stat"
    className="rounded-none border border-border border-t-[3px] border-t-primary bg-card px-4 py-3 shadow-md">
    <div className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground">{label}</div>
    <div className={`mt-1 font-mono text-2xl font-bold ${emphasis ? 'text-[#EF4444]' : 'text-foreground'}`}>{value}</div>
  </div>
);

const LoginLogsPanel: React.FC = () => {
  const [loginStatus, setLoginStatus] = useState<string>(LOG_FILTER_ALL);
  const [loginType, setLoginType] = useState<string>(LOG_FILTER_ALL);
  const [username, setUsername] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState<number>(1);
  const [sortOrder, setSortOrder] = useState<string>('desc');
  const [items, setItems] = useState<LoginLog[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [listError, setListError] = useState<boolean>(false);
  const [stats, setStats] = useState<LoginLogStats | null>(null);
  const [viewTarget, setViewTarget] = useState<LoginLog | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LoginLog | null>(null);

  const filterParams = useMemo((): LoginLogListParams => {
    const params: LoginLogListParams = { sortBy: 'createdAt', sortOrder };
    if (loginStatus !== LOG_FILTER_ALL) params.loginStatus = loginStatus;
    if (loginType !== LOG_FILTER_ALL) params.loginType = loginType;
    if (username.trim() !== '') params.username = username.trim();
    if (dateFrom) params.dateFrom = dayjs(dateFrom).format('YYYY-MM-DD');
    if (dateTo) params.dateTo = dayjs(dateTo).format('YYYY-MM-DD');
    return params;
  }, [loginStatus, loginType, username, dateFrom, dateTo, sortOrder]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setListError(false);
    try {
      const result = await listLoginLogs({
        ...filterParams,
        page: String(page),
        pageSize: String(LOG_PAGE_SIZE),
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      logger.error('加载登录日志失败', String(error));
      setListError(true);
      toast.error(toSystemEnhanceErrorText(error));
    } finally {
      setLoading(false);
    }
  }, [filterParams, page]);

  const loadStats = useCallback(async () => {
    try {
      const result: LoginLogStats = await getLoginLogStats(filterParams);
      setStats(result);
    } catch (error: unknown) {
      logger.error('加载登录日志统计失败', String(error));
      toast.error(toSystemEnhanceErrorText(error));
    }
  }, [filterParams]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const refresh = useCallback((): void => {
    void loadList();
    void loadStats();
  }, [loadList, loadStats]);

  const handleReset = (): void => {
    setLoginStatus(LOG_FILTER_ALL);
    setLoginType(LOG_FILTER_ALL);
    setUsername('');
    setDateFrom(undefined);
    setDateTo(undefined);
    setSortOrder('desc');
    setPage(1);
  };

  const handleTableChange: TableProps<LoginLog>['onChange'] = (pagination, _filters, sorter) => {
    const next: number = pagination.current ?? page;
    if (next !== page) setPage(next);
    const result = Array.isArray(sorter) ? sorter[0] : sorter;
    setSortOrder(result && result.order === 'ascend' ? 'asc' : 'desc');
  };

  const handleDeleteConfirmed = async (): Promise<void> => {
    const target: LoginLog | null = deleteTarget;
    setDeleteTarget(null);
    if (!target) return;
    try {
      await deleteLoginLog(target.id);
      toast.success(`日志「${target.logNo}」已删除`);
      refresh();
    } catch (error: unknown) {
      logger.error('删除登录日志失败', String(error));
      toast.error(toSystemEnhanceErrorText(error));
      refresh();
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const result = await listLoginLogs({
        ...filterParams,
        page: '1',
        pageSize: String(LOG_EXPORT_LIMIT),
      });
      const count: number = await exportRowsToExcel(
        buildLoginLogExportRows(result.items),
        LOGIN_LOG_EXPORT_HEADERS,
        '登录日志',
        '登录日志',
      );
      toast.success(`已导出 ${count} 条登录日志`);
    } catch (error: unknown) {
      logger.error('导出登录日志失败', String(error));
      toast.error(toSystemEnhanceErrorText(error));
    }
  };

  const columns = useMemo((): TableColumnsType<LoginLog> => {
    const built: TableColumnsType<LoginLog> = buildLoginLogColumns({
      onView: (record: LoginLog) => setViewTarget(record),
      onDelete: (record: LoginLog) => setDeleteTarget(record),
    });
    return built.map((column: TableColumnsType<LoginLog>[number]) =>
      column && column.key === 'll-created-at'
        ? { ...column, sorter: true, defaultSortOrder: 'descend' }
        : column);
  }, []);

  const { visibleColumns, columnMetas, hiddenIds, toggleColumn, resetColumns, setAllColumns } =
    useColumnSettings(columns);

  const byUser: { name: string; successCount: number; failCount: number }[] =
    stats?.byUser.slice(0, 5) ?? [];

  return (
    <div className="space-y-6">
      <div className="rounded-none border border-border border-t-[3px] border-t-primary bg-card p-6 shadow-md">
        <SectionHeader no="01" label="LOGIN OVERVIEW" subtitle="登录日志统计 · 成功失败与异常告警概览" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <LoginStatCard label="SUCCESS / 成功次数" value={String(stats?.successCount ?? 0)} />
          <LoginStatCard label="FAILED / 失败次数" value={String(stats?.failCount ?? 0)} emphasis={(stats?.failCount ?? 0) > 0} />
          <LoginStatCard label="LOCKED / 锁定次数" value={String(stats?.lockCount ?? 0)} emphasis={(stats?.lockCount ?? 0) > 0} />
          <LoginStatCard label="RATE / 成功率" value={stats ? `${stats.successRate.toFixed(1)}%` : '—'} />
          <LoginStatCard label="ABNORMAL / 异常告警数" value={String(stats?.abnormalCount ?? 0)} emphasis={(stats?.abnormalCount ?? 0) > 0} />
        </div>
        <div className="mt-6">
          <div className="mb-2 text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground">
            TOP USERS / 用户登录 TOP 5
          </div>
          {byUser.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无数据</p>
          ) : (
            <div className="space-y-1">
              {byUser.map((item: { name: string; successCount: number; failCount: number }, index: number) => (
                <div key={item.name} className="flex items-center gap-3 text-xs">
                  <span className="w-4 shrink-0 font-mono text-muted-foreground">{index + 1}</span>
                  <span className="w-24 shrink-0 truncate">{item.name}</span>
                  <span className="font-mono text-[#10B981]">成功 {item.successCount}</span>
                  <span className="font-mono text-[#EF4444]">失败 {item.failCount}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ReportCard>
        <SectionHeader no="02" label="LOGIN LOGS" subtitle="登录日志审计 · 登录行为与风险追踪" />
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <WarehouseFilterSelect value={loginStatus} placeholder="登录状态" allLabel="全部状态"
            options={LOG_STATUS_OPTIONS}
            onChange={(value: string) => { setLoginStatus(value); setPage(1); }} />
          <WarehouseFilterSelect value={loginType} placeholder="登录类型" allLabel="全部类型"
            options={LOG_TYPE_OPTIONS}
            onChange={(value: string) => { setLoginType(value); setPage(1); }} />
          <Input className="h-9 w-32 rounded-none" value={username} placeholder="用户名"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setUsername(e.target.value);
              setPage(1);
            }} />
          <WarehouseDatePicker value={dateFrom} placeholder="登录日期从"
            onChange={(value: Date | undefined) => { setDateFrom(value); setPage(1); }} />
          <WarehouseDatePicker value={dateTo} placeholder="至"
            onChange={(value: Date | undefined) => { setDateTo(value); setPage(1); }} />
          <Button variant="ghost" size="sm" className="rounded-none" onClick={handleReset}>
            <RotateCcw className="h-3.5 w-3.5" />
            重置
          </Button>
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button data-ai-section-type="button" variant="outline" onClick={() => void handleExport()}>
            <Download className="h-4 w-4" />
            导出Excel
          </Button>
          <ColumnSettingsButton columnMetas={columnMetas} hiddenIds={hiddenIds} onToggle={toggleColumn}
            onReset={resetColumns} onSetAll={setAllColumns} />
        </div>
        {listError ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-none border border-[#EF4444]/30 bg-[#FEF2F2] px-4 py-3 text-sm text-[#EF4444]">
            <span>登录日志加载失败，请稍后重试</span>
            <Button variant="outline" size="sm" onClick={refresh}>重试</Button>
          </div>
        ) : null}
        <Table<LoginLog>
          columns={visibleColumns}
          dataSource={items}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1300, y: 500 }}
          locale={{ emptyText: '暂无登录日志' }}
          pagination={{ current: page, pageSize: LOG_PAGE_SIZE, total, showSizeChanger: false }}
          onChange={handleTableChange}
        />
      </ReportCard>

      <LoginLogDetailDialog open={viewTarget !== null} target={viewTarget}
        onOpenChange={(open: boolean) => { if (!open) setViewTarget(null); }} />
      <AdsConfirmDialog
        open={deleteTarget !== null}
        title="删除登录日志？"
        description={`即将删除日志「${deleteTarget?.logNo ?? '—'}」，删除后不可恢复。`}
        confirmText="删除"
        destructive
        onOpenChange={(open: boolean) => { if (!open) setDeleteTarget(null); }}
        onConfirm={() => void handleDeleteConfirmed()}
      />
    </div>
  );
};

export default LoginLogsPanel;
