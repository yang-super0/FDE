import { useCallback, useEffect, useMemo, useState } from 'react';
import { Table } from '@lark-apaas/client-toolkit/antd-table';
import { Download, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  CompetitorMonitoring,
  CompetitorMonitoringStats,
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
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import {
  SE_CONFIDENCE_OPTIONS,
  SE_FILTER_ALL,
  SE_INDUSTRY_OPTIONS,
  SE_PLATFORM_OPTIONS,
  formatSeAmount,
  formatSeNumber,
} from '../support-enhance-constants';
import {
  deleteCompetitorMonitoring,
  getCompetitorMonitoringStats,
  listCompetitorMonitorings,
} from '@client/src/api/support-enhance/competitors';
import { buildCompetitorColumns } from './competitors-columns';
import CompetitorFormDialog from './CompetitorFormDialog';
import CompetitorDetailDialog from './CompetitorDetailDialog';
import { ComparisonChart, RankingChart, TrendChart } from './CompetitorCharts';

const DEFAULT_PAGE_SIZE = 20;

const CompetitorsPanel = () => {
  const [items, setItems] = useState<CompetitorMonitoring[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState<boolean>(false);
  const [stats, setStats] = useState<CompetitorMonitoringStats | null>(null);

  const [nameFilter, setNameFilter] = useState<string>('');
  const [industryFilter, setIndustryFilter] = useState<string>(SE_FILTER_ALL);
  const [platformFilter, setPlatformFilter] = useState<string>(SE_FILTER_ALL);
  const [confidenceFilter, setConfidenceFilter] = useState<string>(
    SE_FILTER_ALL,
  );
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<CompetitorMonitoring | null>(null);
  const [detailRecord, setDetailRecord] = useState<CompetitorMonitoring | null>(
    null,
  );
  const [deleting, setDeleting] = useState<CompetitorMonitoring | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const loadList = useCallback(
    async (
      targetPage: number,
      targetPageSize: number,
    ): Promise<void> => {
      setLoading(true);
      try {
        const result = await listCompetitorMonitorings({
          page: String(targetPage),
          pageSize: String(targetPageSize),
          competitorName: nameFilter.trim() || undefined,
          competitorIndustry:
            industryFilter === SE_FILTER_ALL ? undefined : industryFilter,
          platform: platformFilter === SE_FILTER_ALL ? undefined : platformFilter,
          confidence:
            confidenceFilter === SE_FILTER_ALL ? undefined : confidenceFilter,
          dateFrom: dateFrom.trim() || undefined,
          dateTo: dateTo.trim() || undefined,
        });
        setItems(result.items);
        setTotal(result.total);
      } catch (error) {
        logger.error('获取竞品监控列表失败', error);
        toast.error('获取竞品监控列表失败');
      } finally {
        setLoading(false);
      }
    },
    [nameFilter, industryFilter, platformFilter, confidenceFilter, dateFrom, dateTo],
  );

  const loadStats = useCallback(async (): Promise<void> => {
    try {
      const data = await getCompetitorMonitoringStats();
      setStats(data);
    } catch (error) {
      logger.error('获取竞品监控统计失败', error);
    }
  }, []);

  useEffect(() => {
    void loadList(page, pageSize);
  }, [page, pageSize, loadList]);

  useEffect(() => {
    void loadStats();
  }, [loadStats, refreshKey]);

  const reloadAll = useCallback((): void => {
    setRefreshKey((prev: number) => prev + 1);
    void loadList(page, pageSize);
  }, [loadList, page, pageSize]);

  const handlePageChange = (nextPage: number, nextPageSize: number): void => {
    setPage(nextPage);
    setPageSize(nextPageSize);
  };

  const handleResetFilters = (): void => {
    setNameFilter('');
    setIndustryFilter(SE_FILTER_ALL);
    setPlatformFilter(SE_FILTER_ALL);
    setConfidenceFilter(SE_FILTER_ALL);
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleting) return;
    try {
      await deleteCompetitorMonitoring(deleting.id);
      toast.success('竞品监控记录已删除');
      setDeleting(null);
      reloadAll();
    } catch (error) {
      logger.error('删除竞品监控记录失败', error);
      toast.error('删除失败，请重试');
    }
  };

  const handleExport = async (): Promise<void> => {
    const rows: Record<string, string>[] = items.map(
      (item: CompetitorMonitoring) => ({
        监控编号: item.monitorNo,
        竞品名称: item.competitorName,
        行业: item.competitorIndustry ?? '',
        平台: item.platform ?? '',
        监控日期: item.monitorDate,
        预估消耗: String(item.estimatedConsumption ?? ''),
        预估ROI: String(item.estimatedRoi ?? ''),
        广告数: String(item.adCount ?? ''),
        素材数: String(item.creativeCount ?? ''),
        数据来源: item.dataSource,
        可信度: item.confidence,
        备注: item.remark ?? '',
      }),
    );
    try {
      const count: number = await exportRowsToExcel(
        rows,
        [
          '监控编号', '竞品名称', '行业', '平台', '监控日期',
          '预估消耗', '预估ROI', '广告数', '素材数', '数据来源', '可信度', '备注',
        ],
        '竞品监控',
        '竞品监控',
      );
      toast.success(`已导出 ${count} 条竞品监控记录`);
    } catch (error) {
      logger.error('导出竞品监控失败', error);
      toast.error('导出失败');
    }
  };

  const columns = buildCompetitorColumns({
    onView: (record: CompetitorMonitoring) => setDetailRecord(record),
    onEdit: (record: CompetitorMonitoring) => {
      setEditing(record);
      setFormOpen(true);
    },
    onDelete: (record: CompetitorMonitoring) => setDeleting(record),
  });

  const { visibleColumns, columnMetas, hiddenIds, toggleColumn, resetColumns, setAllColumns } =
    useColumnSettings(columns);

  const competitorNames: string[] = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) set.add(item.competitorName);
    return [...set];
  }, [items]);

  const alerts = stats?.alerts ?? [];

  return (
    <div className="space-y-6">
      {/* 统计卡 */}
      <div
        data-ai-section-type="card-stat"
        className="grid grid-cols-1 gap-6 md:grid-cols-4"
      >
        <ReportCard>
          <div className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-3">
            RECORDS · 监控记录数
          </div>
          <div className="text-4xl font-black font-mono text-[#0033A0]">
            {stats ? String(stats.totalMonitors) : '—'}
          </div>
        </ReportCard>
        <ReportCard>
          <div className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-3">
            COMPETITORS · 竞品数
          </div>
          <div className="text-4xl font-black font-mono text-[#0047CC]">
            {stats ? String(stats.competitorCount) : '—'}
          </div>
        </ReportCard>
        <ReportCard>
          <div className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-3">
            SPEND · 预估总消耗
          </div>
          <div className="text-4xl font-black font-mono text-[#1A66E0]">
            {stats ? formatSeAmount(stats.totalEstimatedConsumption) : '—'}
          </div>
        </ReportCard>
        <ReportCard>
          <div className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-3">
            AVG ROI · 平均预估ROI
          </div>
          <div className="text-4xl font-black font-mono text-[#4D94FF]">
            {stats ? formatSeNumber(stats.avgEstimatedRoi) : '—'}
          </div>
        </ReportCard>
      </div>

      {/* 监控提醒 */}
      <ReportCard>
        <div className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-3">
          ALERTS · 监控异常提醒
        </div>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无异常提醒</p>
        ) : (
          <div className="space-y-2">
            {alerts.map(
              (alert: { competitorName: string; alertType: string; message: string; monitorDate: string }, idx: number) => (
                <div
                  key={`${alert.competitorName}-${idx}`}
                  className="flex flex-wrap items-center gap-2 text-sm"
                >
                  <span className="inline-flex items-center rounded-[2px] bg-[#FEF2F2] px-2 py-0.5 text-[10px] font-bold text-[#EF4444]">
                    {alert.alertType}
                  </span>
                  <span className="font-bold text-primary">{alert.competitorName}</span>
                  <span className="text-foreground/80">{alert.message}</span>
                  <span className="font-mono text-xs text-muted-foreground">{alert.monitorDate}</span>
                </div>
              ),
            )}
          </div>
        )}
      </ReportCard>

      {/* 列表 */}
      <ReportCard>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Input
            className="w-44 rounded-none"
            placeholder="竞品名称搜索"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
          />
          <Select
            value={industryFilter}
            onValueChange={(v: string) => {
              setIndustryFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-28 rounded-none">
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
            onValueChange={(v: string) => {
              setPlatformFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-28 rounded-none">
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
            value={confidenceFilter}
            onValueChange={(v: string) => {
              setConfidenceFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-28 rounded-none">
              <SelectValue placeholder="可信度" />
            </SelectTrigger>
            <SelectContent className="rounded-none">
              <SelectItem value={SE_FILTER_ALL}>全部可信度</SelectItem>
              {SE_CONFIDENCE_OPTIONS.map((opt: string) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="w-32 rounded-none"
            placeholder="开始日期 YYYY-MM-DD"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <Input
            className="w-32 rounded-none"
            placeholder="结束日期 YYYY-MM-DD"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
          <Button
            data-ai-section-type="button"
            size="sm"
            variant="outline"
            className="rounded-none"
            onClick={() => {
              setPage(1);
              void loadList(1, pageSize);
            }}
          >
            查询
          </Button>
          <Button
            data-ai-section-type="button"
            size="sm"
            variant="outline"
            className="rounded-none"
            onClick={handleResetFilters}
          >
            <RefreshCw className="h-4 w-4" />
            重置
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <ColumnSettingsButton
              columnMetas={columnMetas}
              hiddenIds={hiddenIds}
              onToggle={toggleColumn}
              onReset={resetColumns}
              onSetAll={setAllColumns}
            />
            <Button
              data-ai-section-type="button"
              size="sm"
              variant="outline"
              className="rounded-none"
              onClick={() => void handleExport()}
            >
              <Download className="h-4 w-4" />
              导出
            </Button>
            <Button
              data-ai-section-type="button"
              className="rounded-none"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              新建监控记录
            </Button>
          </div>
        </div>
        <Table
          columns={visibleColumns}
          dataSource={items}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1400, y: 500 }}
          locale={{ emptyText: '暂无竞品监控记录' }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: handlePageChange,
          }}
        />
      </ReportCard>

      {/* 图表区 */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ComparisonChart refreshKey={refreshKey} />
        <TrendChart competitorNames={competitorNames} />
      </div>
      <RankingChart />

      {/* 弹窗 */}
      <CompetitorFormDialog
        open={formOpen}
        initial={editing}
        onOpenChange={setFormOpen}
        onSaved={reloadAll}
      />
      <CompetitorDetailDialog
        open={detailRecord !== null}
        record={detailRecord}
        onOpenChange={(open: boolean) => {
          if (!open) setDetailRecord(null);
        }}
      />
      <AdsConfirmDialog
        open={deleting !== null}
        title="删除竞品监控记录"
        description={`确认删除「${deleting?.competitorName ?? ''}」的监控记录吗？删除后不可恢复。`}
        confirmText="删除"
        destructive
        onOpenChange={(open: boolean) => {
          if (!open) setDeleting(null);
        }}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
};

export default CompetitorsPanel;
