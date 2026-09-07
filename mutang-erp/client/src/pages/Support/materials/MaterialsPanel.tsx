import { useCallback, useEffect, useMemo, useState, type Key } from 'react';
import { Table } from '@lark-apaas/client-toolkit/antd-table';
import { Archive, Download, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { CreativeMaterial, MaterialStats } from '@shared/api.interface';
import { ReportCard } from '@client/src/components/blueprint';
import { Button } from '@client/src/components/ui/button';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import {
  SE_FILTER_ALL,
  formatSeAmount,
  formatSeNumber,
  toSeErrorText,
} from '../support-enhance-constants';
import {
  batchArchiveCreativeMaterials,
  deleteCreativeMaterial,
  getMaterialStats,
  listCreativeMaterials,
  updateCreativeMaterialStatus,
} from '@client/src/api/support-enhance/materials';
import MaterialFormDialog from './MaterialFormDialog';
import MaterialDetailDialog from './MaterialDetailDialog';
import MaterialRatingDialog from './MaterialRatingDialog';
import MaterialRecordsDialog from './MaterialRecordsDialog';
import MaterialBatchTagDialog from './MaterialBatchTagDialog';
import { buildMaterialColumns } from './materials-columns';
import MaterialsFilters, {
  type MaterialFilterState,
} from './MaterialsFilters';
import {
  CompareChart,
  PerformanceChart,
  RankingChart,
  RecommendList,
  type MaterialOption,
} from './MaterialCharts';

const DEFAULT_PAGE_SIZE = 20;

interface StatDef {
  label: string;
  value: string;
  color: string;
}

const MaterialsPanel = () => {
  const [items, setItems] = useState<CreativeMaterial[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState<boolean>(false);
  const [stats, setStats] = useState<MaterialStats | null>(null);
  const [selectedIds, setSelectedIds] = useState<Key[]>([]);

  const [nameFilter, setNameFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>(SE_FILTER_ALL);
  const [industryFilter, setIndustryFilter] = useState<string>(SE_FILTER_ALL);
  const [platformFilter, setPlatformFilter] = useState<string>(SE_FILTER_ALL);
  const [tagFilter, setTagFilter] = useState<string>('');
  const [ratingFilter, setRatingFilter] = useState<string>(SE_FILTER_ALL);
  const [statusFilter, setStatusFilter] = useState<string>(SE_FILTER_ALL);

  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<CreativeMaterial | null>(null);
  const [detailRecord, setDetailRecord] = useState<CreativeMaterial | null>(null);
  const [ratingRecord, setRatingRecord] = useState<CreativeMaterial | null>(null);
  const [recordsRecord, setRecordsRecord] = useState<CreativeMaterial | null>(null);
  const [deleting, setDeleting] = useState<CreativeMaterial | null>(null);
  const [batchTagOpen, setBatchTagOpen] = useState<boolean>(false);
  const [batchArchiveOpen, setBatchArchiveOpen] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const loadList = useCallback(
    async (targetPage: number, targetPageSize: number): Promise<void> => {
      setLoading(true);
      try {
        const result = await listCreativeMaterials({
          page: String(targetPage),
          pageSize: String(targetPageSize),
          materialName: nameFilter.trim() || undefined,
          materialType: typeFilter === SE_FILTER_ALL ? undefined : typeFilter,
          industry: industryFilter === SE_FILTER_ALL ? undefined : industryFilter,
          platform: platformFilter === SE_FILTER_ALL ? undefined : platformFilter,
          tag: tagFilter.trim() || undefined,
          rating: ratingFilter === SE_FILTER_ALL ? undefined : ratingFilter,
          status: statusFilter === SE_FILTER_ALL ? undefined : statusFilter,
        });
        setItems(result.items);
        setTotal(result.total);
      } catch (error) {
        logger.error('获取素材列表失败', error);
        toast.error('获取素材列表失败');
      } finally {
        setLoading(false);
      }
    },
    [
      nameFilter, typeFilter, industryFilter, platformFilter,
      tagFilter, ratingFilter, statusFilter,
    ],
  );

  const loadStats = useCallback(async (): Promise<void> => {
    try {
      const data = await getMaterialStats();
      setStats(data);
    } catch (error) {
      logger.error('获取素材统计失败', error);
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

  const applyFilterPatch = (patch: Partial<MaterialFilterState>): void => {
    if (patch.nameFilter !== undefined) setNameFilter(patch.nameFilter);
    if (patch.typeFilter !== undefined) setTypeFilter(patch.typeFilter);
    if (patch.industryFilter !== undefined) setIndustryFilter(patch.industryFilter);
    if (patch.platformFilter !== undefined) setPlatformFilter(patch.platformFilter);
    if (patch.tagFilter !== undefined) setTagFilter(patch.tagFilter);
    if (patch.ratingFilter !== undefined) setRatingFilter(patch.ratingFilter);
    if (patch.statusFilter !== undefined) setStatusFilter(patch.statusFilter);
    if (patch.nameFilter === undefined && patch.tagFilter === undefined) {
      setPage(1);
    }
  };

  const handleResetFilters = (): void => {
    setNameFilter('');
    setTypeFilter(SE_FILTER_ALL);
    setIndustryFilter(SE_FILTER_ALL);
    setPlatformFilter(SE_FILTER_ALL);
    setTagFilter('');
    setRatingFilter(SE_FILTER_ALL);
    setStatusFilter(SE_FILTER_ALL);
    setPage(1);
  };

  const handleStatusChange = async (
    record: CreativeMaterial,
    status: string,
  ): Promise<void> => {
    try {
      await updateCreativeMaterialStatus(record.id, status);
      toast.success(`素材「${record.materialName}」已${status}`);
      reloadAll();
    } catch (error) {
      logger.error('更新素材状态失败', error);
      toast.error(toSeErrorText(error));
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleting) return;
    try {
      await deleteCreativeMaterial(deleting.id);
      toast.success('素材已删除');
      setDeleting(null);
      reloadAll();
    } catch (error) {
      logger.error('删除素材失败', error);
      toast.error(toSeErrorText(error));
    }
  };

  const handleBatchArchive = async (): Promise<void> => {
    const ids: number[] = selectedIds.map((key: Key) => Number(key));
    try {
      const result = await batchArchiveCreativeMaterials(ids);
      toast.success(`已归档 ${result.updated} 个素材`);
      setBatchArchiveOpen(false);
      setSelectedIds([]);
      reloadAll();
    } catch (error) {
      logger.error('批量归档失败', error);
      toast.error(toSeErrorText(error));
    }
  };

  const handleExport = async (): Promise<void> => {
    const rows: Record<string, string>[] = items.map(
      (item: CreativeMaterial) => ({
        素材编号: item.materialNo,
        素材名称: item.materialName,
        类型: item.materialType,
        行业: item.industry ?? '',
        平台: item.platform ?? '',
        标签: (item.tags ?? []).join(','),
        使用次数: String(item.usageCount),
        累计消耗: String(item.totalConsumption),
        累计转化: String(item.totalConversions),
        平均ROI: String(item.avgRoi),
        平均CTR: String(item.avgCtr),
        平均转化率: String(item.avgConversionRate),
        评分: String(item.rating),
        状态: item.status,
      }),
    );
    try {
      const count: number = await exportRowsToExcel(
        rows,
        [
          '素材编号', '素材名称', '类型', '行业', '平台', '标签', '使用次数',
          '累计消耗', '累计转化', '平均ROI', '平均CTR', '平均转化率', '评分', '状态',
        ],
        '素材库',
        '素材库',
      );
      toast.success(`已导出 ${count} 条素材记录`);
    } catch (error) {
      logger.error('导出素材失败', error);
      toast.error('导出失败');
    }
  };

  const columns = buildMaterialColumns({
    onView: (record: CreativeMaterial) => setDetailRecord(record),
    onEdit: (record: CreativeMaterial) => {
      setEditing(record);
      setFormOpen(true);
    },
    onRate: (record: CreativeMaterial) => setRatingRecord(record),
    onRecords: (record: CreativeMaterial) => setRecordsRecord(record),
    onStatusChange: (record: CreativeMaterial, status: string) => {
      void handleStatusChange(record, status);
    },
    onDelete: (record: CreativeMaterial) => setDeleting(record),
  });

  const { visibleColumns, columnMetas, hiddenIds, toggleColumn, resetColumns, setAllColumns } =
    useColumnSettings(columns);

  const materialOptions: MaterialOption[] = useMemo(
    () =>
      items.map((item: CreativeMaterial) => ({
        id: item.id,
        name: item.materialName,
      })),
    [items],
  );

  const selectedIdList: number[] = useMemo(
    () => selectedIds.map((key: Key) => Number(key)),
    [selectedIds],
  );

  const statDefs: StatDef[] = stats
    ? [
        { label: 'TOTAL · 素材总数', value: String(stats.totalMaterials), color: '#0033A0' },
        { label: 'ACTIVE · 启用数', value: String(stats.activeMaterials), color: '#0047CC' },
        { label: 'ARCHIVED · 归档数', value: String(stats.archivedMaterials), color: '#1A66E0' },
        { label: 'SPEND · 累计消耗', value: formatSeAmount(stats.totalConsumption), color: '#4D94FF' },
        { label: 'CONV · 累计转化', value: formatSeNumber(stats.totalConversions, 0), color: '#0033A0' },
        { label: 'AVG ROI · 平均ROI', value: formatSeNumber(stats.avgRoi), color: '#0047CC' },
        { label: 'AVG CTR · 平均CTR', value: formatSeNumber(stats.avgCtr), color: '#1A66E0' },
        { label: 'AVG CVR · 平均转化率', value: formatSeNumber(stats.avgConversionRate), color: '#4D94FF' },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* 统计卡 */}
      <div
        data-ai-section-type="card-stat"
        className="grid grid-cols-1 gap-6 md:grid-cols-4"
      >
        {statDefs.map((stat: StatDef) => (
          <ReportCard key={stat.label}>
            <div className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-3">
              {stat.label}
            </div>
            <div
              className="text-4xl font-black font-mono"
              style={{ color: stat.color }}
            >
              {stat.value}
            </div>
          </ReportCard>
        ))}
        <ReportCard className="md:col-span-4">
          <div className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-3">
            BY TYPE · 类型分布
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-1">
            {(stats?.byType ?? []).map(
              (entry: { name: string; count: number }) => (
                <span key={entry.name} className="text-sm font-mono">
                  {entry.name}：
                  <span className="font-bold text-primary">{entry.count}</span>
                </span>
              ),
            )}
            {stats && stats.byType.length === 0 ? (
              <span className="text-sm text-muted-foreground">暂无数据</span>
            ) : null}
          </div>
        </ReportCard>
      </div>

      {/* 列表 */}
      <ReportCard>
        <MaterialsFilters
          state={{
            nameFilter,
            typeFilter,
            industryFilter,
            platformFilter,
            tagFilter,
            ratingFilter,
            statusFilter,
          }}
          onChange={applyFilterPatch}
          onSearch={() => {
            setPage(1);
            void loadList(1, pageSize);
          }}
          onReset={handleResetFilters}
        />
        <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
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
              新建素材
            </Button>
        </div>
        {selectedIdList.length > 0 ? (
          <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-border pb-3">
            <span className="text-sm font-bold text-primary">
              已选 {selectedIdList.length} 项
            </span>
            <Button
              data-ai-section-type="button"
              size="sm"
              variant="outline"
              className="rounded-none"
              onClick={() => setBatchTagOpen(true)}
            >
              批量打标签
            </Button>
            <Button
              data-ai-section-type="button"
              size="sm"
              variant="outline"
              className="rounded-none"
              onClick={() => setBatchArchiveOpen(true)}
            >
              <Archive className="h-4 w-4" />
              批量归档
            </Button>
            <Button
              data-ai-section-type="button"
              size="sm"
              variant="ghost"
              className="rounded-none"
              onClick={() => setSelectedIds([])}
            >
              清除选择
            </Button>
          </div>
        ) : null}
        <Table
          columns={visibleColumns}
          dataSource={items}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1700, y: 500 }}
          locale={{ emptyText: '暂无素材记录' }}
          rowSelection={{
            selectedRowKeys: selectedIds,
            onChange: (keys: Key[]) => setSelectedIds(keys),
          }}
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
        <RankingChart refreshKey={refreshKey} />
        <RecommendList refreshKey={refreshKey} />
        <PerformanceChart options={materialOptions} />
        <CompareChart options={materialOptions} />
      </div>

      {/* 弹窗 */}
      <MaterialFormDialog
        open={formOpen}
        initial={editing}
        onOpenChange={setFormOpen}
        onSaved={reloadAll}
      />
      <MaterialDetailDialog
        open={detailRecord !== null}
        record={detailRecord}
        onOpenChange={(open: boolean) => {
          if (!open) setDetailRecord(null);
        }}
      />
      <MaterialRatingDialog
        open={ratingRecord !== null}
        record={ratingRecord}
        onOpenChange={(open: boolean) => {
          if (!open) setRatingRecord(null);
        }}
        onRated={reloadAll}
      />
      <MaterialRecordsDialog
        open={recordsRecord !== null}
        record={recordsRecord}
        onOpenChange={(open: boolean) => {
          if (!open) setRecordsRecord(null);
        }}
        onRecordAdded={reloadAll}
      />
      <MaterialBatchTagDialog
        open={batchTagOpen}
        ids={selectedIdList}
        onOpenChange={setBatchTagOpen}
        onDone={() => {
          setSelectedIds([]);
          reloadAll();
        }}
      />
      <AdsConfirmDialog
        open={deleting !== null}
        title="删除素材"
        description={`确认删除素材「${deleting?.materialName ?? ''}」吗？删除后不可恢复。`}
        confirmText="删除"
        destructive
        onOpenChange={(open: boolean) => {
          if (!open) setDeleting(null);
        }}
        onConfirm={() => void handleDelete()}
      />
      <AdsConfirmDialog
        open={batchArchiveOpen}
        title="批量归档素材"
        description={`确认将选中的 ${selectedIdList.length} 个素材归档吗？`}
        confirmText="归档"
        onOpenChange={setBatchArchiveOpen}
        onConfirm={() => void handleBatchArchive()}
      />
    </div>
  );
};

export default MaterialsPanel;
