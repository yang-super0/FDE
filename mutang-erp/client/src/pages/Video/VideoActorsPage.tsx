import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type Key } from 'react';
import * as XLSX from 'xlsx';
import { Download, Plus, RotateCcw, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@client/src/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@client/src/components/ui/dialog';
import type {
  Actor, ActorListParams, CreateActorRequest,
} from '@shared/api.interface';
import { createActor, fetchActors, updateActor } from '@client/src/api/video-core/actors';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import { VideoCoreTabs } from './VideoCoreTabs';
import { ActorDetailDialog, ActorFormDialog } from './VideoActorDialogs';
import {
  ACTOR_TYPE_OPTIONS, formatVideoAmount, toVideoErrorText, VIDEO_FILTER_ALL, VideoStatusBadge,
} from './video-constants';

const PAGE_SIZE: number = 10;
const GENDER_OPTIONS: string[] = ['男', '女'];
const ACTOR_STATUS_OPTIONS: string[] = ['可用', '忙碌', '停用'];

const reportError = (context: string, error: unknown): void => {
  logger.error(`${context}: ${toVideoErrorText(error)}`);
  toast.error(toVideoErrorText(error));
};

function FilterSelect({ value, placeholder, options, allLabel, onChange }: {
  value: string; placeholder: string; options: string[]; allLabel: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-32 rounded-none"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value={VIDEO_FILTER_ALL}>{allLabel}</SelectItem>
        {options.map((option: string) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function ActionLink({ danger, onClick, children }: {
  danger?: boolean; onClick: () => void; children: string;
}) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick}
      className={`h-auto px-1 text-xs ${danger ? 'text-destructive' : 'text-primary'}`}>
      {children}
    </Button>
  );
}

/* ============ 批量导入弹窗（前端解析 xlsx，逐条创建） ============ */

interface ActorImportDialogProps {
  open: boolean; onDone: () => void; onOpenChange: (open: boolean) => void;
}

const cellText = (row: Record<string, unknown>, key: string): string =>
  String(row[key] ?? '').trim();

const cellNumber = (row: Record<string, unknown>, key: string): number | undefined => {
  const text: string = cellText(row, key);
  if (text === '') return undefined;
  const num: number = Number(text);
  return Number.isFinite(num) ? num : undefined;
};

const splitImportList = (value: string): string[] =>
  value.split(/[,，、]/).map((item: string) => item.trim()).filter(Boolean);

function ActorImportDialog({ open, onDone, onOpenChange }: ActorImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  useEffect(() => {
    if (open) setFile(null);
  }, [open]);
  const handleSubmit = async (): Promise<void> => {
    if (!file) { toast.error('请选择 .xlsx 文件'); return; }
    setSubmitting(true);
    try {
      const buffer: ArrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName: string | undefined = workbook.SheetNames[0];
      const rows: Record<string, unknown>[] = sheetName
        ? XLSX.utils.sheet_to_json(workbook.Sheets[sheetName])
        : [];
      let success: number = 0;
      let fail: number = 0;
      for (const row of rows) {
        const actorName: string = cellText(row, '名称');
        if (!actorName) { fail += 1; continue; }
        const body: CreateActorRequest = {
          actorName,
          actorType: cellText(row, '类型') || undefined,
          gender: cellText(row, '性别') || undefined,
          age: cellNumber(row, '年龄'),
          phone: cellText(row, '电话') || undefined,
          wechat: cellText(row, '微信') || undefined,
          dailyRate: cellNumber(row, '日报价'),
          halfDayRate: cellNumber(row, '半天报价'),
          skills: splitImportList(cellText(row, '特长')),
          styleTags: splitImportList(cellText(row, '风格')),
          remark: cellText(row, '备注') || undefined,
        };
        try {
          await createActor(body);
          success += 1;
        } catch (error: unknown) {
          fail += 1;
          logger.error(`导入演员失败（${actorName}）：${toVideoErrorText(error)}`);
        }
      }
      toast.success(`导入完成：成功 ${success} 条，失败 ${fail} 条`);
      onOpenChange(false);
      onDone();
    } catch (error: unknown) {
      reportError('解析导入文件失败', error);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-none">
        <DialogHeader>
          <DialogTitle>批量导入演员</DialogTitle>
          <DialogDescription>
            选择 .xlsx 文件，列依次为：名称、类型、性别、年龄、电话、微信、日报价、半天报价、特长、风格、备注
          </DialogDescription>
        </DialogHeader>
        <Input className="rounded-none" type="file" accept=".xlsx"
          onChange={(event: ChangeEvent<HTMLInputElement>) => setFile(event.target.files?.[0] ?? null)} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? '导入中...' : '开始导入'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============ 演员管理页 ============ */

export default function VideoActorsPage() {
  /* 筛选（文本防抖） */
  const [draftName, setDraftName] = useState<string>('');
  const [draftTag, setDraftTag] = useState<string>('');
  const [actorName, setActorName] = useState<string>('');
  const [tag, setTag] = useState<string>('');
  const [actorType, setActorType] = useState<string>(VIDEO_FILTER_ALL);
  const [gender, setGender] = useState<string>(VIDEO_FILTER_ALL);
  const [status, setStatus] = useState<string>(VIDEO_FILTER_ALL);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<Actor[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  /* 弹窗状态 */
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<Actor | null>(null);
  const [detailItem, setDetailItem] = useState<Actor | null>(null);
  const [disablingItem, setDisablingItem] = useState<Actor | null>(null);
  const [importOpen, setImportOpen] = useState<boolean>(false);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setActorName(draftName.trim());
      setTag(draftTag.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftName, draftTag]);

  const filterParams = useMemo(
    (): ActorListParams => ({
      actorName: actorName || undefined,
      actorType: actorType === VIDEO_FILTER_ALL ? undefined : actorType,
      gender: gender === VIDEO_FILTER_ALL ? undefined : gender,
      status: status === VIDEO_FILTER_ALL ? undefined : status,
      tag: tag || undefined,
    }),
    [actorName, actorType, gender, status, tag],
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchActors({ ...filterParams, page, pageSize: PAGE_SIZE });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      reportError('加载演员列表失败', error);
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
    setDraftName('');
    setDraftTag('');
    setActorName('');
    setTag('');
    setActorType(VIDEO_FILTER_ALL);
    setGender(VIDEO_FILTER_ALL);
    setStatus(VIDEO_FILTER_ALL);
    setPage(1);
  };

  const handleDisable = async (): Promise<void> => {
    if (!disablingItem) return;
    try {
      await updateActor(disablingItem.id, { status: '停用' });
      toast.success(`已停用「${disablingItem.actorName}」`);
      setDisablingItem(null);
      refresh();
    } catch (error: unknown) {
      reportError('停用演员失败', error);
    }
  };

  const handleEnable = async (item: Actor): Promise<void> => {
    try {
      await updateActor(item.id, { status: '可用' });
      toast.success(`已启用「${item.actorName}」`);
      refresh();
    } catch (error: unknown) {
      reportError('启用演员失败', error);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const rows: Record<string, string>[] = items.map((item: Actor) => ({
        名称: item.actorName, 类型: item.actorType, 性别: item.gender,
        年龄: item.age === null ? '' : String(item.age), 电话: item.phone,
        微信: item.wechat, 日报价: String(item.dailyRate ?? ''),
        半天报价: String(item.halfDayRate ?? ''), 特长: (item.skills ?? []).join('、'),
        风格: (item.styleTags ?? []).join('、'), 状态: item.status, 备注: item.remark,
      }));
      const count: number = await exportRowsToExcel(
        rows,
        ['名称', '类型', '性别', '年龄', '电话', '微信', '日报价', '半天报价', '特长', '风格', '状态', '备注'],
        '演员管理', '演员管理',
      );
      toast.success(`已导出 ${count} 条演员记录`);
    } catch (error: unknown) {
      reportError('导出失败', error);
    }
  };

  const columns = useMemo((): TableColumnsType<Actor> => [
    {
      title: '名称', dataIndex: 'actorName', width: 120, fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    { title: '类型', dataIndex: 'actorType', width: 90 },
    { title: '性别', dataIndex: 'gender', width: 70 },
    {
      title: '年龄', dataIndex: 'age', width: 70,
      render: (value: number | null) => (value === null ? '—' : String(value)),
    },
    { title: '电话', dataIndex: 'phone', width: 130 },
    {
      title: '日报价', dataIndex: 'dailyRate', width: 120, align: 'right',
      render: (value: number) => <span className="font-mono">{formatVideoAmount(value ?? 0)}</span>,
    },
    {
      title: '半天报价', dataIndex: 'halfDayRate', width: 120, align: 'right',
      render: (value: number) => <span className="font-mono">{formatVideoAmount(value ?? 0)}</span>,
    },
    {
      title: '特长', dataIndex: 'skills', width: 180,
      render: (value: string[]) => (
        <div className="flex flex-wrap gap-1">
          {(value ?? []).slice(0, 3).map((skill: string) => (
            <span key={skill} className="bg-accent px-1.5 py-0.5 text-[10px] font-medium">{skill}</span>
          ))}
        </div>
      ),
    },
    {
      title: '风格', dataIndex: 'styleTags', width: 130,
      render: (value: string[]) => (value ?? []).join('、') || '—',
    },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: (value: string) => <VideoStatusBadge status={value} />,
    },
    {
      title: '操作', key: 'actions', width: 200, fixed: 'right',
      render: (_: unknown, record: Actor) => (
        <div className="flex flex-wrap items-center gap-1">
          <ActionLink onClick={() => setDetailItem(record)}>详情</ActionLink>
          <ActionLink onClick={() => { setEditing(record); setFormOpen(true); }}>编辑</ActionLink>
          {record.status === '停用' ? (
            <ActionLink onClick={() => void handleEnable(record)}>启用</ActionLink>
          ) : (
            <ActionLink danger onClick={() => setDisablingItem(record)}>停用</ActionLink>
          )}
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  const {
    visibleColumns, columnMetas, hiddenIds,
    toggleColumn, resetColumns, setAllColumns,
  } = useColumnSettings(columns);

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8 px-8 py-8">
      <VideoCoreTabs active="actors" />
      <ReportCard>
        <SectionHeader no="04" label="ACTORS" subtitle="演员管理 / 导入导出 / 档期报价" />
        {/* 筛选区 */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Input className="w-36 rounded-none" placeholder="演员名称" value={draftName}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setDraftName(event.target.value)} />
          <Input className="w-40 rounded-none" placeholder="标签（特长/风格）" value={draftTag}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setDraftTag(event.target.value)} />
          <FilterSelect value={actorType} placeholder="类型" allLabel="全部类型"
            options={ACTOR_TYPE_OPTIONS}
            onChange={(value: string) => { setActorType(value); setPage(1); }} />
          <FilterSelect value={gender} placeholder="性别" allLabel="全部性别"
            options={GENDER_OPTIONS}
            onChange={(value: string) => { setGender(value); setPage(1); }} />
          <FilterSelect value={status} placeholder="状态" allLabel="全部状态"
            options={ACTOR_STATUS_OPTIONS}
            onChange={(value: string) => { setStatus(value); setPage(1); }} />
          <Button variant="ghost" size="sm" className="rounded-none" onClick={handleReset}>
            <RotateCcw className="h-3.5 w-3.5" />
            重置
          </Button>
        </div>
        {/* 操作区 */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button data-ai-section-type="button"
            onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" />
            新建演员
          </Button>
          <Button variant="outline" className="rounded-none" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" />
            批量导入
          </Button>
          <Button variant="outline" className="rounded-none" onClick={() => void handleExport()}>
            <Download className="h-4 w-4" />
            导出Excel
          </Button>
          <ColumnSettingsButton
            columnMetas={columnMetas} hiddenIds={hiddenIds}
            onToggle={toggleColumn} onReset={resetColumns} onSetAll={setAllColumns}
          />
        </div>
        {/* 表格 */}
        <Table<Actor>
          columns={visibleColumns}
          dataSource={items}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1300, y: 500 }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            onChange: (nextPage: number) => setPage(nextPage),
          }}
        />
      </ReportCard>

      {/* 新建 / 编辑弹窗 */}
      <ActorFormDialog open={formOpen} editing={editing} onSaved={refresh} onOpenChange={setFormOpen} />

      {/* 详情弹窗 */}
      <ActorDetailDialog open={detailItem !== null} actor={detailItem}
        onOpenChange={(open: boolean) => { if (!open) setDetailItem(null); }} />

      {/* 批量导入弹窗 */}
      <ActorImportDialog open={importOpen} onDone={refresh} onOpenChange={setImportOpen} />

      {/* 停用二次确认 */}
      <AdsConfirmDialog
        open={disablingItem !== null}
        title="确认停用？"
        description={`即将停用演员「${disablingItem?.actorName ?? ''}」，停用后不可在项目中选用。`}
        confirmText="确认停用"
        destructive
        onOpenChange={(open: boolean) => { if (!open) setDisablingItem(null); }}
        onConfirm={() => void handleDisable()}
      />
    </div>
  );
}
