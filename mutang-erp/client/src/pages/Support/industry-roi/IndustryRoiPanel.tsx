import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Plus, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  IndustryRoiBenchmark,
  IndustryRoiComparisonItem,
  IndustryRoiImportResult,
  IndustryRoiListParams,
} from '@shared/api.interface';
import { ReportCard } from '@client/src/components/blueprint';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import {
  deleteIndustryRoiBenchmark,
  getIndustryRoiIndustryComparison,
  getIndustryRoiPlatformComparison,
  importIndustryRoiBenchmarks,
  listIndustryRoiBenchmarks,
} from '@client/src/api/support-enhance';
import {
  SE_FILTER_ALL,
  SE_INDUSTRY_OPTIONS,
  SE_PLATFORM_OPTIONS,
  SE_ROI_STATUS_OPTIONS,
  toSeErrorText,
} from '../support-enhance-constants';
import { RoiFormDialog } from './RoiFormDialog';
import { RoiCorrectDialog } from './RoiCorrectDialog';
import { RoiVersionHistoryDialog } from './RoiVersionHistoryDialog';
import { RoiTable } from './RoiTable';
import {
  RoiIndustryComparisonChart,
  RoiPlatformComparisonChart,
} from './RoiCharts';
import {
  exportIndustryRoiBenchmarks,
  parseRoiImportFile,
} from './roi-excel';

const DEFAULT_PAGE_SIZE = 20;
const EXPORT_PAGE_SIZE = 1000;

const IndustryRoiPanel = () => {
  const [items, setItems] = useState<IndustryRoiBenchmark[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState<boolean>(false);
  const [industryFilter, setIndustryFilter] = useState<string>(SE_FILTER_ALL);
  const [platformFilter, setPlatformFilter] = useState<string>(SE_FILTER_ALL);
  const [statusFilter, setStatusFilter] = useState<string>(SE_FILTER_ALL);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [formRecord, setFormRecord] = useState<IndustryRoiBenchmark | null>(null);
  const [correctOpen, setCorrectOpen] = useState<boolean>(false);
  const [correctRecord, setCorrectRecord] = useState<IndustryRoiBenchmark | null>(null);
  const [versionOpen, setVersionOpen] = useState<boolean>(false);
  const [versionRecord, setVersionRecord] = useState<IndustryRoiBenchmark | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<IndustryRoiBenchmark | null>(null);
  const [importing, setImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<IndustryRoiImportResult | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);
  const [industryComparison, setIndustryComparison] = useState<IndustryRoiComparisonItem[]>([]);
  const [platformComparison, setPlatformComparison] = useState<IndustryRoiComparisonItem[]>([]);
  const [chartsLoading, setChartsLoading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadList = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const params: IndustryRoiListParams = {
        page: String(page),
        pageSize: String(pageSize),
        industry: industryFilter === SE_FILTER_ALL ? undefined : industryFilter,
        platform: platformFilter === SE_FILTER_ALL ? undefined : platformFilter,
        status: statusFilter === SE_FILTER_ALL ? undefined : statusFilter,
        dateFrom: dateFrom.trim() || undefined,
        dateTo: dateTo.trim() || undefined,
      };
      const result = await listIndustryRoiBenchmarks(params);
      setItems(result.items);
      setTotal(result.total);
    } catch (error) {
      logger.error('获取ROI基准列表失败', error);
      toast.error(toSeErrorText(error));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, industryFilter, platformFilter, statusFilter, dateFrom, dateTo]);

  const loadCharts = useCallback(async (): Promise<void> => {
    setChartsLoading(true);
    try {
      const [industries, platforms] = await Promise.all([
        getIndustryRoiIndustryComparison(),
        getIndustryRoiPlatformComparison(),
      ]);
      setIndustryComparison(industries);
      setPlatformComparison(platforms);
    } catch (error) {
      logger.error('获取ROI对比图数据失败', error);
      toast.error(toSeErrorText(error));
    } finally {
      setChartsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    void loadCharts();
  }, [loadCharts]);

  const reload = useCallback((): void => {
    void loadList();
    void loadCharts();
  }, [loadList, loadCharts]);

  const handleFilterChange = (
    setter: (value: string) => void,
    value: string,
  ): void => {
    setter(value);
    setPage(1);
  };

  const handlePageChange = (nextPage: number, nextPageSize: number): void => {
    setPage(nextPage);
    setPageSize(nextPageSize);
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteRecord) return;
    try {
      await deleteIndustryRoiBenchmark(deleteRecord.id);
      toast.success('ROI基准已删除');
      setDeleteRecord(null);
      reload();
    } catch (error) {
      logger.error('删除ROI基准失败', error);
      toast.error(toSeErrorText(error));
    }
  };

  const handleImportFile = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file: File | undefined = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setImporting(true);
    try {
      const rows = await parseRoiImportFile(file);
      if (rows.length === 0) {
        toast.error('未解析到有效数据，请检查表格列名');
        return;
      }
      const result = await importIndustryRoiBenchmarks(rows);
      setImportResult(result);
      toast.success(`导入完成：成功 ${result.created} 条，失败 ${result.failed} 条`);
      reload();
    } catch (error) {
      logger.error('导入ROI基准失败', error);
      toast.error(toSeErrorText(error));
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async (): Promise<void> => {
    setExporting(true);
    try {
      const result = await listIndustryRoiBenchmarks({
        page: '1',
        pageSize: String(EXPORT_PAGE_SIZE),
        industry: industryFilter === SE_FILTER_ALL ? undefined : industryFilter,
        platform: platformFilter === SE_FILTER_ALL ? undefined : platformFilter,
        status: statusFilter === SE_FILTER_ALL ? undefined : statusFilter,
        dateFrom: dateFrom.trim() || undefined,
        dateTo: dateTo.trim() || undefined,
      });
      const count = await exportIndustryRoiBenchmarks(result.items);
      toast.success(`已导出 ${count} 条ROI基准`);
    } catch (error) {
      logger.error('导出ROI基准失败', error);
      toast.error(toSeErrorText(error));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-8">
      <ReportCard>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={industryFilter}
              onValueChange={(v: string) => handleFilterChange(setIndustryFilter, v)}
            >
              <SelectTrigger className="w-[140px] rounded-none">
                <SelectValue placeholder="行业" />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                <SelectItem value={SE_FILTER_ALL}>全部行业</SelectItem>
                {SE_INDUSTRY_OPTIONS.map((opt: string) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={platformFilter}
              onValueChange={(v: string) => handleFilterChange(setPlatformFilter, v)}
            >
              <SelectTrigger className="w-[140px] rounded-none">
                <SelectValue placeholder="平台" />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                <SelectItem value={SE_FILTER_ALL}>全部平台</SelectItem>
                {SE_PLATFORM_OPTIONS.map((opt: string) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(v: string) => handleFilterChange(setStatusFilter, v)}
            >
              <SelectTrigger className="w-[120px] rounded-none">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                <SelectItem value={SE_FILTER_ALL}>全部状态</SelectItem>
                {SE_ROI_STATUS_OPTIONS.map((opt: string) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              className="w-[150px] rounded-none font-mono"
              value={dateFrom}
              onChange={(e) => handleFilterChange(setDateFrom, e.target.value)}
              placeholder="开始日期 YYYY-MM-DD"
            />
            <Input
              className="w-[150px] rounded-none font-mono"
              value={dateTo}
              onChange={(e) => handleFilterChange(setDateTo, e.target.value)}
              placeholder="结束日期 YYYY-MM-DD"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="rounded-none"
              disabled={importing}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              {importing ? '导入中...' : 'Excel导入'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(event) => void handleImportFile(event)}
            />
            <Button
              variant="outline"
              className="rounded-none"
              disabled={exporting}
              onClick={() => void handleExport()}
            >
              <Download className="h-4 w-4" />
              {exporting ? '导出中...' : 'Excel导出'}
            </Button>
            <Button
              data-ai-section-type="button"
              className="rounded-none"
              onClick={() => {
                setFormRecord(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              新建基准
            </Button>
          </div>
        </div>
        <RoiTable
          items={items}
          loading={loading}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={handlePageChange}
          onEdit={(record: IndustryRoiBenchmark) => {
            setFormRecord(record);
            setFormOpen(true);
          }}
          onCorrect={(record: IndustryRoiBenchmark) => {
            setCorrectRecord(record);
            setCorrectOpen(true);
          }}
          onVersion={(record: IndustryRoiBenchmark) => {
            setVersionRecord(record);
            setVersionOpen(true);
          }}
          onDelete={(record: IndustryRoiBenchmark) => setDeleteRecord(record)}
        />
      </ReportCard>
      <div data-ai-section-type="card-list" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RoiIndustryComparisonChart items={industryComparison} loading={chartsLoading} />
        <RoiPlatformComparisonChart items={platformComparison} loading={chartsLoading} />
      </div>
      <RoiFormDialog
        open={formOpen}
        record={formRecord}
        onOpenChange={setFormOpen}
        onSaved={reload}
      />
      <RoiCorrectDialog
        open={correctOpen}
        record={correctRecord}
        onOpenChange={setCorrectOpen}
        onSaved={reload}
      />
      <RoiVersionHistoryDialog
        open={versionOpen}
        record={versionRecord}
        onOpenChange={setVersionOpen}
      />
      <AdsConfirmDialog
        open={deleteRecord !== null}
        title="删除ROI基准"
        description={`确认删除 ${deleteRecord ? `${deleteRecord.industry} · ${deleteRecord.platform} 的基准（${deleteRecord.roiNo}）` : ''} 吗？删除后不可恢复。`}
        confirmText="删除"
        destructive
        onOpenChange={(open: boolean) => {
          if (!open) setDeleteRecord(null);
        }}
        onConfirm={() => void handleDelete()}
      />
      <Dialog
        open={importResult !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setImportResult(null);
        }}
      >
        <DialogContent className="rounded-none max-w-lg">
          <DialogHeader>
            <DialogTitle>导入结果</DialogTitle>
          </DialogHeader>
          {importResult ? (
            <div className="space-y-3">
              <div className="flex gap-6 text-sm">
                <span>
                  成功：
                  <span className="font-mono font-bold text-[#0033A0]">
                    {importResult.created}
                  </span>
                </span>
                <span>
                  失败：
                  <span className="font-mono font-bold text-destructive">
                    {importResult.failed}
                  </span>
                </span>
              </div>
              {importResult.errors.length > 0 ? (
                <div className="max-h-60 overflow-y-auto rounded-none border border-border p-2">
                  <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                    {importResult.errors.map((err: string, idx: number) => (
                      <li key={`${idx}-${err}`}>{err}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IndustryRoiPanel;
