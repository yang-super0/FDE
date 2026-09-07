import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type Key,
} from 'react';
import { Download, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table } from '@lark-apaas/client-toolkit/antd-table';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import type { CommissionRule } from '@shared/api.interface';
import {
  batchUpdateCommissionRuleStatus,
  deleteCommissionRule,
  fetchCommissionRules,
  updateCommissionRule,
} from '@client/src/api/ad-business';
import { AdsTabs } from './AdsTabs';
import { AdsConfirmDialog } from './AdsConfirmDialog';
import { RuleFormDialog } from './RuleFormDialog';
import { buildRuleColumns } from './rule-columns';
import { exportRowsToExcel } from './ads-excel';
import {
  FILTER_ALL,
  PLATFORM_OPTIONS,
  RULE_STATUS_OPTIONS,
  RULE_TYPE_OPTIONS,
  formatMoney,
  toErrorText,
} from './ads-constants';

const PAGE_SIZE: number = 20;

export default function CommissionRulesPage() {
  const [draftName, setDraftName] = useState<string>('');
  const [ruleName, setRuleName] = useState<string>('');
  const [ruleType, setRuleType] = useState<string>(FILTER_ALL);
  const [platform, setPlatform] = useState<string>(FILTER_ALL);
  const [status, setStatus] = useState<string>(FILTER_ALL);
  const [page, setPage] = useState<number>(1);

  const [items, setItems] = useState<CommissionRule[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);

  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<CommissionRule | null>(null);
  const [batchAction, setBatchAction] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState<CommissionRule | null>(null);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setRuleName(draftName.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftName]);

  const filterParams = useMemo(
    () => ({
      ruleName: ruleName || undefined,
      ruleType: ruleType === FILTER_ALL ? undefined : ruleType,
      platform: platform === FILTER_ALL ? undefined : platform,
      status: status === FILTER_ALL ? undefined : status,
    }),
    [ruleName, ruleType, platform, status],
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchCommissionRules({
        ...filterParams,
        page,
        pageSize: PAGE_SIZE,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      logger.error(`加载提成规则失败: ${toErrorText(error)}`);
      toast.error('加载提成规则失败');
    } finally {
      setLoading(false);
    }
  }, [filterParams, page]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const refresh = useCallback((): void => {
    setSelectedKeys([]);
    void loadList();
  }, [loadList]);

  const handleToggle = async (item: CommissionRule): Promise<void> => {
    const nextStatus: string = item.status === '启用' ? '停用' : '启用';
    try {
      await updateCommissionRule(item.id, { status: nextStatus });
      toast.success(nextStatus === '启用' ? '已启用该规则' : '已停用该规则');
      refresh();
    } catch (error: unknown) {
      logger.error(`切换规则状态失败: ${toErrorText(error)}`);
      toast.error(`切换状态失败：${toErrorText(error)}`);
    }
  };

  const handleBatchStatus = async (): Promise<void> => {
    if (!batchAction || selectedKeys.length === 0) return;
    try {
      const ids: string[] = selectedKeys.map((key: Key) => String(key));
      await batchUpdateCommissionRuleStatus(ids, batchAction);
      toast.success(`已${batchAction} ${ids.length} 条提成规则`);
      setBatchAction(null);
      refresh();
    } catch (error: unknown) {
      logger.error(`批量${batchAction ?? ''}失败: ${toErrorText(error)}`);
      toast.error(`批量操作失败：${toErrorText(error)}`);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deletingItem) return;
    try {
      await deleteCommissionRule(deletingItem.id);
      toast.success('已删除该提成规则');
      setDeletingItem(null);
      refresh();
    } catch (error: unknown) {
      logger.error(`删除失败: ${toErrorText(error)}`);
      toast.error(`删除失败：${toErrorText(error)}`);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const result = await fetchCommissionRules({
        ...filterParams,
        page: 1,
        pageSize: 1000,
      });
      const rows: Record<string, string>[] = result.items.map(
        (item: CommissionRule) => ({
          规则名称: item.ruleName,
          规则类型: item.ruleType,
          平台: item.platform || '不限',
          端口: item.portType || '不限',
          最小消耗: item.minAmount !== null ? String(item.minAmount) : '',
          最大消耗: item.maxAmount !== null ? String(item.maxAmount) : '',
          提成比例: item.rate !== null ? `${item.rate}%` : '',
          固定金额:
            item.fixedAmount !== null ? formatMoney(item.fixedAmount) : '',
          状态: item.status,
          生效期: item.effectiveDate ?? '',
          失效期: item.expireDate ?? '',
          备注: item.remark,
        }),
      );
      const count: number = await exportRowsToExcel(
        rows,
        ['规则名称', '规则类型', '平台', '端口', '最小消耗', '最大消耗', '提成比例', '固定金额', '状态', '生效期', '失效期', '备注'],
        '提成规则',
        '提成规则',
      );
      toast.success(`已导出 ${count} 条提成规则`);
    } catch (error: unknown) {
      logger.error(`导出失败: ${toErrorText(error)}`);
      toast.error(`导出失败：${toErrorText(error)}`);
    }
  };

  const columns = useMemo(
    () =>
      buildRuleColumns({
        onEdit: (item: CommissionRule) => {
          setEditingItem(item);
          setFormOpen(true);
        },
        onToggle: (item: CommissionRule) => void handleToggle(item),
        onDelete: (item: CommissionRule) => setDeletingItem(item),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const {
    visibleColumns, columnMetas, hiddenIds,
    toggleColumn, resetColumns, setAllColumns,
  } = useColumnSettings(columns);

  const hasSelection: boolean = selectedKeys.length > 0;

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8 px-8 py-8">
      <AdsTabs />
      <ReportCard>
        <SectionHeader
          no="05"
          label="COMMISSION RULES"
          subtitle="提成规则 / 比例与固定额配置 / 启停管理"
        />
        {/* 筛选区 */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Input
            className="w-40 rounded-none"
            placeholder="规则名称"
            value={draftName}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setDraftName(event.target.value)
            }
          />
          <Select
            value={ruleType}
            onValueChange={(value: string) => {
              setRuleType(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-32 rounded-none">
              <SelectValue placeholder="类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>全部类型</SelectItem>
              {RULE_TYPE_OPTIONS.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={platform}
            onValueChange={(value: string) => {
              setPlatform(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-32 rounded-none">
              <SelectValue placeholder="平台" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>全部平台</SelectItem>
              {PLATFORM_OPTIONS.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={status}
            onValueChange={(value: string) => {
              setStatus(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-32 rounded-none">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>全部状态</SelectItem>
              {RULE_STATUS_OPTIONS.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* 操作区 */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              data-ai-section-type="button"
              onClick={() => {
                setEditingItem(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              新建规则
            </Button>
            <Button
              variant="outline"
              disabled={!hasSelection}
              onClick={() => setBatchAction('启用')}
            >
              批量启用
            </Button>
            <Button
              variant="outline"
              disabled={!hasSelection}
              onClick={() => setBatchAction('停用')}
            >
              批量停用
            </Button>
            <Button variant="outline" onClick={() => void handleExport()}>
              <Download className="h-4 w-4" />
              导出Excel
            </Button>
            <ColumnSettingsButton
              columnMetas={columnMetas}
              hiddenIds={hiddenIds}
              onToggle={toggleColumn}
              onReset={resetColumns}
              onSetAll={setAllColumns}
            />
          </div>
          {hasSelection ? (
            <span className="text-xs text-muted-foreground">
              已选 {selectedKeys.length} 条
            </span>
          ) : null}
        </div>
        {/* 表格 */}
        <Table<CommissionRule>
          columns={visibleColumns}
          dataSource={items}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1400, y: 500 }}
          rowSelection={{
            selectedRowKeys: selectedKeys,
            onChange: (keys: Key[]) => setSelectedKeys(keys),
          }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            onChange: (nextPage: number) => setPage(nextPage),
          }}
        />
      </ReportCard>

      <RuleFormDialog
        open={formOpen}
        editing={editingItem}
        onOpenChange={setFormOpen}
        onSaved={refresh}
      />
      <AdsConfirmDialog
        open={batchAction !== null}
        title={`确认批量${batchAction ?? ''}？`}
        description={`即将${batchAction ?? ''}已选中的 ${selectedKeys.length} 条提成规则，操作立即生效。`}
        confirmText={`确认${batchAction ?? ''}`}
        onOpenChange={(open: boolean) => {
          if (!open) setBatchAction(null);
        }}
        onConfirm={() => void handleBatchStatus()}
      />
      <AdsConfirmDialog
        open={deletingItem !== null}
        title="确认删除？"
        description={`即将删除提成规则「${deletingItem?.ruleName ?? ''}」，删除后不可恢复。`}
        confirmText="确认删除"
        destructive
        onOpenChange={(open: boolean) => {
          if (!open) setDeletingItem(null);
        }}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
