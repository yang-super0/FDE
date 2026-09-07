import { useCallback, useEffect, useState } from 'react';
import { Download, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  IndustryTrendComparisonItem,
  IndustryTrendListParams,
  IndustryTrendPoint,
  IndustryTrendRecord,
  IndustryTrendStats,
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
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import {
  deleteIndustryTrendRecord,
  getIndustryTrendIndustryComparison,
  getIndustryTrendPlatformComparison,
  getIndustryTrendSeries,
  getIndustryTrendStats,
  listIndustryTrendRecords,
} from '@client/src/api/support-enhance';
import {
  SE_FILTER_ALL,
  SE_INDUSTRY_OPTIONS,
  SE_PLATFORM_OPTIONS,
  toSeErrorText,
} from '../support-enhance-constants';
import { TrendStatsCards } from './TrendStatsCards';
import { TrendFormDialog } from './TrendFormDialog';
import { TrendTable } from './TrendTable';
import {
  TrendConsumptionChart,
  TrendConversionChart,
  TrendCostChangeChart,
  TrendIndustryComparisonChart,
  TrendPlatformComparisonChart,
} from './TrendCharts';
import { exportIndustryTrendRecords } from './trend-excel';

const DEFAULT_PAGE_SIZE = 20;
const EXPORT_PAGE_SIZE = 1000;

const GRANULARITY_OPTIONS: { value: string; label: string }[] = [
  { value: 'day', label: '日' },
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
  { value: 'quarter', label: '季' },
  { value: 'year', label: '年' },
];

const IndustryTrendsPanel = () => {
  const [items, setItems] = useState<IndustryTrendRecord[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState<boolean>(false);
  const [industryFilter, setIndustryFilter] = useState<string>(SE_FILTER_ALL);
  const [platformFilter, setPlatformFilter] = useState<string>(SE_FILTER_ALL);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [stats, setStats] = useState<IndustryTrendStats | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(false);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [formRecord, setFormRecord] = useState<IndustryTrendRecord | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<IndustryTrendRecord | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);
  const [seriesIndustry, setSeriesIndustry] = useState<string>(SE_FILTER_ALL);
  const [seriesPlatform, setSeriesPlatform] = useState<string>(SE_FILTER_ALL);
  const [granularity, setGranularity] = useState<string>('month');
  const [seriesPoints, setSeriesPoints] = useState<IndustryTrendPoint[]>([]);
  const [seriesLoading, setSeriesLoading] = useState<boolean>(false);
  const [industryComparison, setIndustryComparison] = useState<IndustryTrendComparisonItem[]>([]);
  const [platformComparison, setPlatformComparison] = useState<IndustryTrendComparisonItem[]>([]);
  const [comparisonLoading, setComparisonLoading] = useState<boolean>(false);

  const loadList = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const params: IndustryTrendListParams = {
        page: String(page),
        pageSize: String(pageSize),
        industry: industryFilter === SE_FILTER_ALL ? undefined : industryFilter,
        platform: platformFilter === SE_FILTER_ALL ? undefined : platformFilter,
        dateFrom: dateFrom.trim() || undefined,
        dateTo: dateTo.trim() || undefined,
      };
      const result = await listIndustryTrendRecords(params);
      setItems(result.items);
      setTotal(result.total);
    } catch (error) {
      logger.error('获取大盘列表失败', error);
      toast.error(toSeErrorText(error));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, industryFilter, platformFilter, dateFrom, dateTo]);

  const loadStats = useCallback(async (): Promise<void> => {
    setStatsLoading(true);
    try {
      const data = await getIndustryTrendStats();
      setStats(data);
    } catch (error) {
      logger.error('获取大盘统计失败', error);
      toast.error(toSeErrorText(error));
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadComparison = useCallback(async (): Promise<void> => {
    setComparisonLoading(true);
    try {
      const [industries, platforms] = await Promise.all([
        getIndustryTrendIndustryComparison(
          platformFilter === SE_FILTER_ALL ? undefined : platformFilter,
        ),
        getIndustryTrendPlatformComparison(
          industryFilter === SE_FILTER_ALL ? undefined : industryFilter,
        ),
      ]);
      setIndustryComparison(industries);
      setPlatformComparison(platforms);
    } catch (error) {
      logger.error('获取大盘对比数据失败', error);
      toast.error(toSeErrorText(error));
    } finally {
      setComparisonLoading(false);
    }
  }, [industryFilter, platformFilter]);

  const loadSeries = useCallback(async (): Promise<void> => {
    setSeriesLoading(true);
    try {
      const points = await getIndustryTrendSeries(
        seriesIndustry === SE_FILTER_ALL ? '' : seriesIndustry,
        seriesPlatform === SE_FILTER_ALL ? '' : seriesPlatform,
        granularity,
      );
      setSeriesPoints(points);
    } catch (error) {
      logger.error('获取大盘趋势序列失败', error);
      toast.error(toSeErrorText(error));
    } finally {
      setSeriesLoading(false);
    }
  }, [seriesIndustry, seriesPlatform, granularity]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    void loadComparison();
  }, [loadComparison]);

  useEffect(() => {
    void loadSeries();
  }, [loadSeries]);

  const reload = useCallback((): void => {
    void loadList();
    void loadStats();
    void loadComparison();
  }, [loadList, loadStats, loadComparison]);

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
      await deleteIndustryTrendRecord(deleteRecord.id);
      toast.success('大盘记录已删除');
      setDeleteRecord(null);
      reload();
    } catch (error) {
      logger.error('删除大盘记录失败', error);
      toast.error(toSeErrorText(error));
    }
  };

  const handleExport = async (): Promise<void> => {
    setExporting(true);
    try {
      const result = await listIndustryTrendRecords({
        page: '1',
        pageSize: String(EXPORT_PAGE_SIZE),
        industry: industryFilter === SE_FILTER_ALL ? undefined : industryFilter,
        platform: platformFilter === SE_FILTER_ALL ? undefined : platformFilter,
        dateFrom: dateFrom.trim() || undefined,
        dateTo: dateTo.trim() || undefined,
      });
      const count = await exportIndustryTrendRecords(result.items);
      toast.success(`已导出 ${count} 条大盘记录`);
    } catch (error) {
      logger.error('导出大盘记录失败', error);
      toast.error(toSeErrorText(error));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-8">
      <TrendStatsCards stats={stats} loading={statsLoading} />
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
              新建记录
            </Button>
          </div>
        </div>
        <TrendTable
          items={items}
          loading={loading}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={handlePageChange}
          onEdit={(record: IndustryTrendRecord) => {
            setFormRecord(record);
            setFormOpen(true);
          }}
          onDelete={(record: IndustryTrendRecord) => setDeleteRecord(record)}
        />
      </ReportCard>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={seriesIndustry}
            onValueChange={(v: string) => setSeriesIndustry(v)}
          >
            <SelectTrigger className="w-[140px] rounded-none">
              <SelectValue placeholder="趋势行业" />
            </SelectTrigger>
            <SelectContent className="rounded-none">
              <SelectItem value={SE_FILTER_ALL}>全部行业</SelectItem>
              {SE_INDUSTRY_OPTIONS.map((opt: string) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={seriesPlatform}
            onValueChange={(v: string) => setSeriesPlatform(v)}
          >
            <SelectTrigger className="w-[140px] rounded-none">
              <SelectValue placeholder="趋势平台" />
            </SelectTrigger>
            <SelectContent className="rounded-none">
              <SelectItem value={SE_FILTER_ALL}>全部平台</SelectItem>
              {SE_PLATFORM_OPTIONS.map((opt: string) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-1">
            {GRANULARITY_OPTIONS.map(
              (opt: { value: string; label: string }) => (
                <Button
                  key={opt.value}
                  size="sm"
                  variant={granularity === opt.value ? 'default' : 'outline'}
                  className="rounded-none"
                  onClick={() => setGranularity(opt.value)}
                >
                  {opt.label}
                </Button>
              ),
            )}
          </div>
        </div>
        <TrendConsumptionChart points={seriesPoints} loading={seriesLoading} />
        <div data-ai-section-type="card-list" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TrendCostChangeChart points={seriesPoints} loading={seriesLoading} />
          <TrendConversionChart points={seriesPoints} loading={seriesLoading} />
        </div>
        <div data-ai-section-type="card-list" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TrendIndustryComparisonChart items={industryComparison} loading={comparisonLoading} />
          <TrendPlatformComparisonChart items={platformComparison} loading={comparisonLoading} />
        </div>
      </div>
      <TrendFormDialog
        open={formOpen}
        record={formRecord}
        onOpenChange={setFormOpen}
        onSaved={reload}
      />
      <AdsConfirmDialog
        open={deleteRecord !== null}
        title="删除大盘记录"
        description={`确认删除 ${deleteRecord ? `${deleteRecord.industry} · ${deleteRecord.statDate} 的记录（${deleteRecord.trendNo}）` : ''} 吗？删除后不可恢复。`}
        confirmText="删除"
        destructive
        onOpenChange={(open: boolean) => {
          if (!open) setDeleteRecord(null);
        }}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
};

export default IndustryTrendsPanel;
