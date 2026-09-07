import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { Download, Plus, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table } from '@lark-apaas/client-toolkit/antd-table';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Switch } from '@client/src/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import type { AdAccount, CreateAdAccountRequest } from '@shared/api.interface';
import {
  batchCreateAdAccounts,
  deleteAdAccount,
  fetchAdAccounts,
} from '@client/src/api/ad-business';
import { AdsTabs } from './AdsTabs';
import { AdsConfirmDialog } from './AdsConfirmDialog';
import { AccountFormDialog } from './AccountFormDialog';
import { AccountDetailDialog } from './AccountDetailDialog';
import { RechargeDialog } from './RechargeDialog';
import { buildAccountColumns } from './account-columns';
import { exportAdAccounts, parseAccountImportFile } from './ads-excel';
import {
  ACCOUNT_STATUS_OPTIONS,
  FILTER_ALL,
  PLATFORM_OPTIONS,
  PORT_TYPE_OPTIONS,
  toErrorText,
} from './ads-constants';

const PAGE_SIZE: number = 20;

export default function AdAccountsPage() {
  /* 文本筛选（防抖） */
  const [draftNo, setDraftNo] = useState<string>('');
  const [draftName, setDraftName] = useState<string>('');
  const [draftGroup, setDraftGroup] = useState<string>('');
  const [draftSubject, setDraftSubject] = useState<string>('');
  const [accountNo, setAccountNo] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [groupName, setGroupName] = useState<string>('');
  const [subjectName, setSubjectName] = useState<string>('');
  const [salespersonText, setSalespersonText] = useState<string>('');
  const [platform, setPlatform] = useState<string>(FILTER_ALL);
  const [portType, setPortType] = useState<string>(FILTER_ALL);
  const [status, setStatus] = useState<string>(FILTER_ALL);
  const [lowBalance, setLowBalance] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);

  const [items, setItems] = useState<AdAccount[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<AdAccount | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [rechargingItem, setRechargingItem] = useState<AdAccount | null>(null);
  const [deletingItem, setDeletingItem] = useState<AdAccount | null>(null);
  const [importing, setImporting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setAccountNo(draftNo.trim());
      setAccountName(draftName.trim());
      setGroupName(draftGroup.trim());
      setSubjectName(draftSubject.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftNo, draftName, draftGroup, draftSubject]);

  const filterParams = useMemo(
    () => ({
      accountNo: accountNo || undefined,
      accountName: accountName || undefined,
      groupName: groupName || undefined,
      subjectName: subjectName || undefined,
      platform: platform === FILTER_ALL ? undefined : platform,
      portType: portType === FILTER_ALL ? undefined : portType,
      status: status === FILTER_ALL ? undefined : status,
      salesperson: salespersonText.trim() || undefined,
      lowBalance: lowBalance || undefined,
    }),
    [accountNo, accountName, groupName, subjectName, platform, portType, status, salespersonText, lowBalance],
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdAccounts({
        ...filterParams,
        page,
        pageSize: PAGE_SIZE,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      logger.error(`加载广告账户失败: ${toErrorText(error)}`);
      toast.error('加载广告账户失败');
    } finally {
      setLoading(false);
    }
  }, [filterParams, page]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const refresh = useCallback((): void => {
    void loadList();
  }, [loadList]);

  const handleDelete = async (): Promise<void> => {
    if (!deletingItem) return;
    try {
      await deleteAdAccount(deletingItem.id);
      toast.success('已删除该广告账户');
      setDeletingItem(null);
      refresh();
    } catch (error: unknown) {
      logger.error(`删除失败: ${toErrorText(error)}`);
      toast.error(`删除失败：${toErrorText(error)}`);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const result = await fetchAdAccounts({
        ...filterParams,
        page: 1,
        pageSize: 1000,
      });
      const count: number = await exportAdAccounts(result.items);
      toast.success(`已导出 ${count} 个广告账户`);
    } catch (error: unknown) {
      logger.error(`导出失败: ${toErrorText(error)}`);
      toast.error(`导出失败：${toErrorText(error)}`);
    }
  };

  const handleImportFile = async (
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file: File | undefined = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setImporting(true);
    try {
      const parsed: CreateAdAccountRequest[] = await parseAccountImportFile(file);
      if (parsed.length === 0) {
        toast.error('未解析到有效数据（需包含「账户名称/投放平台」列）');
        return;
      }
      const result = await batchCreateAdAccounts(parsed);
      toast.success(`成功导入 ${result.created} 个广告账户`);
      refresh();
    } catch (error: unknown) {
      logger.error(`导入失败: ${toErrorText(error)}`);
      toast.error(`导入失败：${toErrorText(error)}`);
    } finally {
      setImporting(false);
    }
  };

  const columns = useMemo(
    () =>
      buildAccountColumns({
        onDetail: (item: AdAccount) => setDetailId(item.id),
        onRecharge: (item: AdAccount) => setRechargingItem(item),
        onEdit: (item: AdAccount) => {
          setEditingItem(item);
          setFormOpen(true);
        },
        onDelete: (item: AdAccount) => setDeletingItem(item),
      }),
    [],
  );

  const {
    visibleColumns, columnMetas, hiddenIds,
    toggleColumn, resetColumns, setAllColumns,
  } = useColumnSettings(columns);

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8 px-8 py-8">
      <AdsTabs />
      <ReportCard>
        <SectionHeader
          no="02"
          label="AD ACCOUNTS"
          subtitle="广告账户 / 资金充值 / 余额预警 / 导入导出"
        />
        {/* 筛选区 */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Input
            className="w-32 rounded-none"
            placeholder="账户编号"
            value={draftNo}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setDraftNo(event.target.value)
            }
          />
          <Input
            className="w-36 rounded-none"
            placeholder="账户名称"
            value={draftName}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setDraftName(event.target.value)
            }
          />
          <Input
            className="w-32 rounded-none"
            placeholder="集团名称"
            value={draftGroup}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setDraftGroup(event.target.value)
            }
          />
          <Input
            className="w-32 rounded-none"
            placeholder="主体名称"
            value={draftSubject}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setDraftSubject(event.target.value)
            }
          />
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
            value={portType}
            onValueChange={(value: string) => {
              setPortType(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-32 rounded-none">
              <SelectValue placeholder="端口" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>全部端口</SelectItem>
              {PORT_TYPE_OPTIONS.map((option: string) => (
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
              {ACCOUNT_STATUS_OPTIONS.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="w-32 rounded-none"
            placeholder="商务"
            value={salespersonText}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setSalespersonText(event.target.value);
              setPage(1);
            }}
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">余额预警</span>
            <Switch
              checked={lowBalance}
              onCheckedChange={(checked: boolean) => {
                setLowBalance(checked);
                setPage(1);
              }}
            />
          </div>
        </div>
        {/* 操作区 */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button
            data-ai-section-type="button"
            onClick={() => {
              setEditingItem(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            新增
          </Button>
          <Button
            variant="outline"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            {importing ? '导入中...' : '批量导入'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              void handleImportFile(event)
            }
          />
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
        {/* 表格 */}
        <Table<AdAccount>
          columns={visibleColumns}
          dataSource={items}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1700, y: 500 }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            onChange: (nextPage: number) => setPage(nextPage),
          }}
        />
      </ReportCard>

      <AccountFormDialog
        open={formOpen}
        editing={editingItem}
        onOpenChange={setFormOpen}
        onSaved={refresh}
      />
      <AccountDetailDialog
        accountId={detailId}
        onOpenChange={(open: boolean) => {
          if (!open) setDetailId(null);
        }}
      />
      <RechargeDialog
        account={rechargingItem}
        onOpenChange={(open: boolean) => {
          if (!open) setRechargingItem(null);
        }}
        onRecharged={refresh}
      />
      <AdsConfirmDialog
        open={deletingItem !== null}
        title="确认删除？"
        description={`即将删除广告账户「${deletingItem?.accountName ?? ''}」，删除后不可恢复。`}
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
