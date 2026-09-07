import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Download, Plus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import type { HrInterview, HrInterviewListParams } from '@shared/api.interface';
import {
  deleteInterview, fetchInterviewList,
} from '@client/src/api/hr-enhance/recruitment';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import { InterviewsFormDialog } from './InterviewsFormDialog';
import { InterviewEvaluateDialog } from './InterviewEvaluateDialog';
import { InterviewOfferDialog } from './InterviewOfferDialog';
import {
  HR_FILTER_ALL, HR_INTERVIEW_RESULT_OPTIONS, HR_OFFER_STATUS_OPTIONS,
} from '../hr-enhance-constants';
import { buildInterviewsColumns } from './InterviewsColumns';
import {
  RECRUIT_EXPORT_LIMIT, RECRUIT_PAGE_SIZE,
  RecruitFilterSelect, reportRecruitError,
} from './recruitment-shared';

const EXPORT_HEADERS: string[] = [
  '面试编号', '候选人', '职位', '面试官', '面试轮次', '面试时间', '结果',
  '专业分', '沟通分', '综合分', '评价', 'offer状态', '备注', '创建时间',
];

export function InterviewsTab() {
  const [draftCandidate, setDraftCandidate] = useState<string>('');
  const [candidateName, setCandidateName] = useState<string>('');
  const [result, setResult] = useState<string>(HR_FILTER_ALL);
  const [offerStatus, setOfferStatus] = useState<string>(HR_FILTER_ALL);
  const [position, setPosition] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<HrInterview[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<HrInterview | null>(null);
  const [evaluateTarget, setEvaluateTarget] = useState<HrInterview | null>(null);
  const [offerTarget, setOfferTarget] = useState<HrInterview | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HrInterview | null>(null);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setCandidateName(draftCandidate.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftCandidate]);

  const filterParams = useMemo((): HrInterviewListParams => ({
    candidateName: candidateName || undefined,
    result: result === HR_FILTER_ALL ? undefined : result,
    offerStatus: offerStatus === HR_FILTER_ALL ? undefined : offerStatus,
    position: position.trim() || undefined,
  }), [candidateName, result, offerStatus, position]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const resultPage = await fetchInterviewList({
        ...filterParams,
        page: String(page),
        pageSize: String(RECRUIT_PAGE_SIZE),
      });
      setItems(resultPage.items);
      setTotal(resultPage.total);
    } catch (error: unknown) {
      reportRecruitError('加载面试记录失败', error);
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
    setResult(HR_FILTER_ALL);
    setOfferStatus(HR_FILTER_ALL);
    setPosition('');
    setPage(1);
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget) return;
    try {
      await deleteInterview(deleteTarget.id);
      toast.success('面试记录已删除');
      setDeleteTarget(null);
      refresh();
    } catch (error: unknown) {
      reportRecruitError('删除面试记录失败', error);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const resultPage = await fetchInterviewList({
        ...filterParams, page: '1', pageSize: String(RECRUIT_EXPORT_LIMIT),
      });
      const rows: Record<string, string>[] = resultPage.items.map((item: HrInterview) => ({
        面试编号: item.interviewNo,
        候选人: item.candidateName,
        职位: item.position,
        面试官: item.interviewer,
        面试轮次: item.interviewRound,
        面试时间: item.interviewTime ?? '',
        结果: item.result,
        专业分: String(item.scoreProfessional),
        沟通分: String(item.scoreCommunication),
        综合分: String(item.scoreGeneral),
        评价: item.evaluation,
        offer状态: item.offerStatus,
        备注: item.remark,
        创建时间: dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      }));
      const count: number = await exportRowsToExcel(rows, EXPORT_HEADERS, '面试管理', '面试管理');
      toast.success(`已导出 ${count} 条面试记录`);
    } catch (error: unknown) {
      reportRecruitError('导出面试记录失败', error);
    }
  };

  const columns = useMemo(
    (): TableColumnsType<HrInterview> => buildInterviewsColumns({
      onEdit: (record: HrInterview) => { setEditing(record); setFormOpen(true); },
      onEvaluate: (record: HrInterview) => setEvaluateTarget(record),
      onOffer: (record: HrInterview) => setOfferTarget(record),
      onDelete: (record: HrInterview) => setDeleteTarget(record),
    }),
    [],
  );

  const {
    visibleColumns, columnMetas, hiddenIds,
    toggleColumn, resetColumns, setAllColumns,
  } = useColumnSettings(columns);

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
          value={result} placeholder="面试结果" allLabel="全部结果"
          options={HR_INTERVIEW_RESULT_OPTIONS}
          onChange={(value: string) => { setResult(value); setPage(1); }}
        />
        <RecruitFilterSelect
          value={offerStatus} placeholder="offer状态" allLabel="全部offer状态"
          options={HR_OFFER_STATUS_OPTIONS}
          onChange={(value: string) => { setOfferStatus(value); setPage(1); }}
        />
        <Input
          className="w-28 rounded-none"
          placeholder="职位"
          value={position}
          onChange={(event) => { setPosition(event.target.value); setPage(1); }}
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
          新建面试记录
        </Button>
        <Button variant="outline" onClick={() => void handleExport()}>
          <Download className="h-4 w-4" />
          导出Excel
        </Button>
        <ColumnSettingsButton
          columnMetas={columnMetas} hiddenIds={hiddenIds}
          onToggle={toggleColumn} onReset={resetColumns} onSetAll={setAllColumns}
        />
      </div>
      {/* 表格 */}
      <Table<HrInterview>
        columns={visibleColumns}
        dataSource={items}
        loading={loading}
        rowKey="id"
        scroll={{ x: 2100, y: 500 }}
        pagination={{
          current: page,
          pageSize: RECRUIT_PAGE_SIZE,
          total,
          onChange: (nextPage: number) => setPage(nextPage),
        }}
      />
      <InterviewsFormDialog
        open={formOpen}
        editing={editing}
        onSaved={refresh}
        onOpenChange={(open: boolean) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
      />
      <InterviewEvaluateDialog
        target={evaluateTarget}
        onSaved={refresh}
        onOpenChange={(open: boolean) => {
          if (!open) setEvaluateTarget(null);
        }}
      />
      <InterviewOfferDialog
        target={offerTarget}
        onSaved={refresh}
        onOpenChange={(open: boolean) => {
          if (!open) setOfferTarget(null);
        }}
      />
      <AdsConfirmDialog
        open={deleteTarget !== null}
        title="删除面试记录？"
        description={deleteTarget
          ? `即将删除「${deleteTarget.candidateName}」的面试记录（${deleteTarget.interviewNo}），删除后不可恢复。`
          : ''}
        confirmText="删除"
        destructive
        onOpenChange={(open: boolean) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
