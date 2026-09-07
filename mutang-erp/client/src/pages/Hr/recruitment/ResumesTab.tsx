import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Key } from 'react';
import { Download, Plus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import type { HrResume, HrResumeListParams } from '@shared/api.interface';
import {
  batchResumeStatusAction, deleteResume, fetchResumeList,
  setResumeRatingAction,
} from '@client/src/api/hr-enhance/recruitment';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import { ResumesFormDialog } from './ResumesFormDialog';
import {
  HR_EDUCATION_OPTIONS, HR_FILTER_ALL, HR_RESUME_SOURCE_OPTIONS,
  HR_RESUME_STATUS_OPTIONS,
} from '../hr-enhance-constants';
import {
  buildResumeExportRows, RESUME_EXPORT_HEADERS,
} from './resumes-export';
import { buildResumesColumns } from './ResumesColumns';
import {
  RECRUIT_EXPORT_LIMIT, RECRUIT_PAGE_SIZE,
  RecruitFilterSelect, reportRecruitError,
} from './recruitment-shared';

export function ResumesTab() {
  const [draftKeyword, setDraftKeyword] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [status, setStatus] = useState<string>(HR_FILTER_ALL);
  const [source, setSource] = useState<string>(HR_FILTER_ALL);
  const [education, setEducation] = useState<string>(HR_FILTER_ALL);
  const [department, setDepartment] = useState<string>('');
  const [positionApplied, setPositionApplied] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<HrResume[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<HrResume | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [batchStatus, setBatchStatus] = useState<string>(HR_RESUME_STATUS_OPTIONS[0]);
  const [batchConfirmOpen, setBatchConfirmOpen] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<HrResume | null>(null);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setKeyword(draftKeyword.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftKeyword]);

  const filterParams = useMemo((): HrResumeListParams => ({
    keyword: keyword || undefined,
    status: status === HR_FILTER_ALL ? undefined : status,
    source: source === HR_FILTER_ALL ? undefined : source,
    education: education === HR_FILTER_ALL ? undefined : education,
    department: department.trim() || undefined,
    positionApplied: positionApplied.trim() || undefined,
  }), [keyword, status, source, education, department, positionApplied]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchResumeList({
        ...filterParams,
        page: String(page),
        pageSize: String(RECRUIT_PAGE_SIZE),
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      reportRecruitError('加载简历列表失败', error);
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
    setDraftKeyword('');
    setKeyword('');
    setStatus(HR_FILTER_ALL);
    setSource(HR_FILTER_ALL);
    setEducation(HR_FILTER_ALL);
    setDepartment('');
    setPositionApplied('');
    setPage(1);
  };

  const handleRating = useCallback(async (id: number, rating: number): Promise<void> => {
    try {
      await setResumeRatingAction(id, { rating });
      toast.success(`评分已更新为 ${rating} 星`);
      refresh();
    } catch (error: unknown) {
      reportRecruitError('更新评分失败', error);
    }
  }, [refresh]);

  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget) return;
    try {
      await deleteResume(deleteTarget.id);
      toast.success('简历已删除');
      setDeleteTarget(null);
      refresh();
    } catch (error: unknown) {
      reportRecruitError('删除简历失败', error);
    }
  };

  const selectedIds: number[] = useMemo(
    () => selectedKeys.map((key: Key) => Number(key)),
    [selectedKeys],
  );

  const handleBatchStatus = async (): Promise<void> => {
    if (selectedIds.length === 0) {
      toast.error('请先勾选简历');
      return;
    }
    try {
      const result = await batchResumeStatusAction({
        ids: selectedIds, status: batchStatus,
      });
      toast.success(`已批量更新 ${result.updated} 条简历状态`);
      setBatchConfirmOpen(false);
      setSelectedKeys([]);
      refresh();
    } catch (error: unknown) {
      reportRecruitError('批量更新状态失败', error);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const result = await fetchResumeList({
        ...filterParams, page: '1', pageSize: String(RECRUIT_EXPORT_LIMIT),
      });
      const rows: Record<string, string>[] = buildResumeExportRows(result.items);
      const count: number = await exportRowsToExcel(
        rows, RESUME_EXPORT_HEADERS, '简历管理', '简历管理',
      );
      toast.success(`已导出 ${count} 条简历记录`);
    } catch (error: unknown) {
      reportRecruitError('导出简历记录失败', error);
    }
  };

  const columns = useMemo(
    (): TableColumnsType<HrResume> => buildResumesColumns({
      onEdit: (record: HrResume) => { setEditing(record); setFormOpen(true); },
      onDelete: (record: HrResume) => setDeleteTarget(record),
      onRating: (id: number, rating: number) => { void handleRating(id, rating); },
    }),
    [handleRating],
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
          placeholder="关键词（姓名/电话/邮箱）"
          value={draftKeyword}
          onChange={(event) => setDraftKeyword(event.target.value)}
        />
        <RecruitFilterSelect
          value={status} placeholder="状态" allLabel="全部状态"
          options={HR_RESUME_STATUS_OPTIONS}
          onChange={(value: string) => { setStatus(value); setPage(1); }}
        />
        <RecruitFilterSelect
          value={source} placeholder="来源" allLabel="全部来源"
          options={HR_RESUME_SOURCE_OPTIONS}
          onChange={(value: string) => { setSource(value); setPage(1); }}
        />
        <RecruitFilterSelect
          value={education} placeholder="学历" allLabel="全部学历"
          options={HR_EDUCATION_OPTIONS}
          onChange={(value: string) => { setEducation(value); setPage(1); }}
        />
        <Input
          className="w-28 rounded-none"
          placeholder="部门"
          value={department}
          onChange={(event) => { setDepartment(event.target.value); setPage(1); }}
        />
        <Input
          className="w-28 rounded-none"
          placeholder="应聘职位"
          value={positionApplied}
          onChange={(event) => { setPositionApplied(event.target.value); setPage(1); }}
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
          新建简历
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
          <RecruitFilterSelect
            value={batchStatus} placeholder="批量状态" allLabel="选择目标状态"
            options={HR_RESUME_STATUS_OPTIONS}
            onChange={(value: string) => setBatchStatus(value)}
          />
          <Button
            variant="outline" size="sm" className="rounded-none"
            disabled={selectedIds.length === 0}
            onClick={() => setBatchConfirmOpen(true)}
          >
            批量状态（{selectedIds.length}）
          </Button>
        </div>
      </div>
      {/* 表格 */}
      <Table<HrResume>
        columns={visibleColumns}
        dataSource={items}
        loading={loading}
        rowKey="id"
        scroll={{ x: 2000, y: 500 }}
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
      <ResumesFormDialog
        open={formOpen}
        editing={editing}
        onSaved={refresh}
        onOpenChange={(open: boolean) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
      />
      <AdsConfirmDialog
        open={deleteTarget !== null}
        title="删除简历？"
        description={deleteTarget
          ? `即将删除「${deleteTarget.candidateName}」的简历（${deleteTarget.resumeNo}），已录用的简历不可删除，删除后不可恢复。`
          : ''}
        confirmText="删除"
        destructive
        onOpenChange={(open: boolean) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={() => void handleDelete()}
      />
      <AdsConfirmDialog
        open={batchConfirmOpen}
        title="批量变更状态？"
        description={`即将把已勾选的 ${selectedIds.length} 条简历状态批量变更为「${batchStatus}」。`}
        confirmText="批量变更"
        onOpenChange={setBatchConfirmOpen}
        onConfirm={() => void handleBatchStatus()}
      />
    </div>
  );
}
