import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Key } from 'react';
import dayjs from 'dayjs';
import { Download, Plus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import type { HrInvitation, HrInvitationListParams } from '@shared/api.interface';
import {
  batchInvitationStatusAction, deleteInvitation, fetchInvitationList,
  updateInvitationStatusAction,
} from '@client/src/api/hr-enhance/recruitment';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import { InvitationsFormDialog } from './InvitationsFormDialog';
import {
  HR_FILTER_ALL, HR_INTERVIEW_ROUND_OPTIONS, HR_INVITATION_STATUS_OPTIONS,
} from '../hr-enhance-constants';
import {
  buildInvitationsColumns,
  INVITATION_ACTION_STATUS, INVITATION_ACTION_TEXT, type InvitationAction,
} from './InvitationsColumns';
import {
  RECRUIT_EXPORT_LIMIT, RECRUIT_PAGE_SIZE,
  RecruitFilterSelect, reportRecruitError,
} from './recruitment-shared';

const EXPORT_HEADERS: string[] = [
  '邀约编号', '候选人', '应聘职位', '部门', '面试官', '面试形式', '面试轮次',
  '面试时间', '地点', '状态', '备注', '创建时间',
];

interface PendingInvitationAction {
  item: HrInvitation;
  action: InvitationAction;
}

export function InvitationsTab() {
  const [draftCandidate, setDraftCandidate] = useState<string>('');
  const [candidateName, setCandidateName] = useState<string>('');
  const [status, setStatus] = useState<string>(HR_FILTER_ALL);
  const [round, setRound] = useState<string>(HR_FILTER_ALL);
  const [department, setDepartment] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<HrInvitation[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<HrInvitation | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [pending, setPending] = useState<PendingInvitationAction | null>(null);
  const [batchAction, setBatchAction] = useState<'confirm' | 'cancel' | null>(null);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setCandidateName(draftCandidate.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftCandidate]);

  const filterParams = useMemo((): HrInvitationListParams => ({
    candidateName: candidateName || undefined,
    status: status === HR_FILTER_ALL ? undefined : status,
    interviewRound: round === HR_FILTER_ALL ? undefined : round,
    department: department.trim() || undefined,
  }), [candidateName, status, round, department]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchInvitationList({
        ...filterParams,
        page: String(page),
        pageSize: String(RECRUIT_PAGE_SIZE),
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      reportRecruitError('加载邀约列表失败', error);
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

  const handleReset = (): void => {
    setDraftCandidate('');
    setCandidateName('');
    setStatus(HR_FILTER_ALL);
    setRound(HR_FILTER_ALL);
    setDepartment('');
    setPage(1);
  };

  const handlePending = async (): Promise<void> => {
    if (!pending) return;
    const actionText: string = INVITATION_ACTION_TEXT[pending.action];
    try {
      if (pending.action === 'delete') {
        await deleteInvitation(pending.item.id);
      } else {
        await updateInvitationStatusAction(pending.item.id, {
          status: INVITATION_ACTION_STATUS[pending.action],
        });
      }
      toast.success(`邀约已${actionText}`);
      setPending(null);
      refresh();
    } catch (error: unknown) {
      reportRecruitError(`${actionText}邀约失败`, error);
    }
  };

  const selectedIds: number[] = useMemo(
    () => selectedKeys.map((key: Key) => Number(key)),
    [selectedKeys],
  );

  const handleBatch = async (): Promise<void> => {
    if (!batchAction || selectedIds.length === 0) return;
    const targetStatus: string = INVITATION_ACTION_STATUS[batchAction];
    try {
      const result = await batchInvitationStatusAction({
        ids: selectedIds, status: targetStatus,
      });
      toast.success(`已批量${INVITATION_ACTION_TEXT[batchAction]} ${result.updated} 条邀约`);
      setBatchAction(null);
      setSelectedKeys([]);
      refresh();
    } catch (error: unknown) {
      reportRecruitError('批量操作邀约失败', error);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const result = await fetchInvitationList({
        ...filterParams, page: '1', pageSize: String(RECRUIT_EXPORT_LIMIT),
      });
      const rows: Record<string, string>[] = result.items.map((item: HrInvitation) => ({
        邀约编号: item.invitationNo,
        候选人: item.candidateName,
        应聘职位: item.position,
        部门: item.department,
        面试官: item.interviewer,
        面试形式: item.interviewType,
        面试轮次: item.interviewRound,
        面试时间: item.scheduledTime ?? '',
        地点: item.location,
        状态: item.status,
        备注: item.remark,
        创建时间: dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      }));
      const count: number = await exportRowsToExcel(rows, EXPORT_HEADERS, '邀约管理', '邀约管理');
      toast.success(`已导出 ${count} 条邀约记录`);
    } catch (error: unknown) {
      reportRecruitError('导出邀约记录失败', error);
    }
  };

  const columns = useMemo(
    (): TableColumnsType<HrInvitation> => buildInvitationsColumns({
      onEdit: (record: HrInvitation) => { setEditing(record); setFormOpen(true); },
      onAction: (record: HrInvitation, action: InvitationAction) => {
        setPending({ item: record, action });
      },
    }),
    [],
  );

  const {
    visibleColumns, columnMetas, hiddenIds,
    toggleColumn, resetColumns, setAllColumns,
  } = useColumnSettings(columns);

  const pendingText: string = pending ? INVITATION_ACTION_TEXT[pending.action] : '确认';
  const batchText: string = batchAction ? INVITATION_ACTION_TEXT[batchAction] : '';

  return (
    <div>
      {/* 筛选区 */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          className="w-36 rounded-none"
          placeholder="候选人姓名"
          value={draftCandidate}
          onChange={(event) => setDraftCandidate(event.target.value)}
        />
        <RecruitFilterSelect
          value={status} placeholder="状态" allLabel="全部状态"
          options={HR_INVITATION_STATUS_OPTIONS}
          onChange={(value: string) => { setStatus(value); setPage(1); }}
        />
        <RecruitFilterSelect
          value={round} placeholder="面试轮次" allLabel="全部轮次"
          options={HR_INTERVIEW_ROUND_OPTIONS}
          onChange={(value: string) => { setRound(value); setPage(1); }}
        />
        <Input
          className="w-28 rounded-none"
          placeholder="部门"
          value={department}
          onChange={(event) => { setDepartment(event.target.value); setPage(1); }}
        />
        <Button variant="ghost" size="sm" className="rounded-none" onClick={handleReset}>
          <RotateCcw className="h-3.5 w-3.5" />
          重置
        </Button>
      </div>
      {/* 操作区 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button data-ai-section-type="button" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" />
          新建邀约
        </Button>
        <Button variant="outline" onClick={() => void handleExport()}>
          <Download className="h-4 w-4" />
          导出Excel
        </Button>
        <ColumnSettingsButton
          columnMetas={columnMetas} hiddenIds={hiddenIds}
          onToggle={toggleColumn} onReset={resetColumns} onSetAll={setAllColumns}
        />
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-none"
            disabled={selectedIds.length === 0} onClick={() => setBatchAction('confirm')}>
            批量确认（{selectedIds.length}）
          </Button>
          <Button variant="outline" size="sm" className="rounded-none"
            disabled={selectedIds.length === 0} onClick={() => setBatchAction('cancel')}>
            批量取消（{selectedIds.length}）
          </Button>
        </div>
      </div>
      {/* 表格 */}
      <Table<HrInvitation>
        columns={visibleColumns}
        dataSource={items}
        loading={loading}
        rowKey="id"
        scroll={{ x: 1900, y: 500 }}
        rowSelection={{
          selectedRowKeys: selectedKeys,
          onChange: (keys: Key[]) => setSelectedKeys(keys),
        }}
        pagination={{
          current: page,
          pageSize: RECRUIT_PAGE_SIZE,
          total,
          onChange: (nextPage: number) => setPage(nextPage),
        }}
      />
      <InvitationsFormDialog
        open={formOpen}
        editing={editing}
        onSaved={refresh}
        onOpenChange={(open: boolean) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
      />
      <AdsConfirmDialog
        open={pending !== null}
        title={`${pendingText}邀约？`}
        description={pending
          ? `即将${pendingText}邀约「${pending.item.invitationNo}」（${pending.item.candidateName}）${pending.action === 'delete' ? '，删除后不可恢复。' : '。'}`
          : ''}
        confirmText={pendingText}
        destructive={pending?.action !== 'confirm' && pending?.action !== 'complete'}
        onOpenChange={(open: boolean) => {
          if (!open) setPending(null);
        }}
        onConfirm={() => void handlePending()}
      />
      <AdsConfirmDialog
        open={batchAction !== null}
        title={`批量${batchText}邀约？`}
        description={`即将批量${batchText}已勾选的 ${selectedIds.length} 条邀约。`}
        confirmText={`批量${batchText}`}
        destructive={batchAction === 'cancel'}
        onOpenChange={(open: boolean) => {
          if (!open) setBatchAction(null);
        }}
        onConfirm={() => void handleBatch()}
      />
    </div>
  );
}
