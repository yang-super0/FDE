import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import type {
  DrilldownDetailRow,
  DrilldownExecuteResult,
  DrilldownPathItem,
  ReportRunRow,
} from '@shared/api.interface';
import { executeDrilldown } from '@client/src/api/report-center/drilldowns';
import { Button } from '@client/src/components/ui/button';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import {
  DRILLDOWN_LEVELS,
  formatAmount,
  toRcErrorText,
} from '../report-center-constants';

interface DrilldownRunnerProps {
  reportId: number;
  reportName: string;
  path: DrilldownPathItem[];
  onPathChange: (path: DrilldownPathItem[]) => void;
}

const nextLevelOf = (level: string): string => {
  const index: number = DRILLDOWN_LEVELS.indexOf(level);
  if (index < 0 || index >= DRILLDOWN_LEVELS.length - 1) {
    return DRILLDOWN_LEVELS[DRILLDOWN_LEVELS.length - 1];
  }
  return DRILLDOWN_LEVELS[index + 1];
};

const buildRowsColumns = (
  result: DrilldownExecuteResult,
  onRowDrill: (row: ReportRunRow) => void,
): TableColumnsType<ReportRunRow> => [
  ...result.dimensions.map((dim: string) => ({
    title: dim,
    key: dim,
    render: (_: unknown, record: ReportRunRow) => (
      <span className="font-bold text-primary">{record.dims[dim] ?? '—'}</span>
    ),
  })),
  ...result.metrics.map((metric: string) => ({
    title: metric,
    key: metric,
    render: (_: unknown, record: ReportRunRow) => (
      <span className="font-mono">{formatAmount(record.values[metric] ?? 0)}</span>
    ),
  })),
  {
    title: '操作',
    key: 'drill-action',
    fixed: 'right',
    width: 90,
    render: (_: unknown, record: ReportRunRow) => (
      <Button
        data-ai-section-type="button"
        size="sm"
        variant="outline"
        className="rounded-none"
        onClick={() => onRowDrill(record)}
      >
        下钻
      </Button>
    ),
  },
];

/**
 * 下钻交互核心：面包屑可点击截断、逐级下钻、返回上一级、导出明细。
 */
const DrilldownRunner: React.FC<DrilldownRunnerProps> = ({
  reportId,
  reportName,
  path,
  onPathChange,
}) => {
  const [result, setResult] = useState<DrilldownExecuteResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const runDrilldown = useCallback(
    async (targetPath: DrilldownPathItem[]): Promise<void> => {
      if (targetPath.length === 0) {
        setResult(null);
        return;
      }
      setLoading(true);
      try {
        const data = await executeDrilldown({ reportId, path: targetPath });
        setResult(data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : toRcErrorText(error));
        setResult(null);
      } finally {
        setLoading(false);
      }
    },
    [reportId],
  );

  useEffect(() => {
    void runDrilldown(path);
  }, [path, runDrilldown]);

  const handleRowDrill = (row: ReportRunRow): void => {
    if (!result || result.rows.length === 0) {
      toast.error('已到最深层级，无明细可继续下钻');
      return;
    }
    const dimension: string =
      result.dimensions[result.dimensions.length - 1] ?? '';
    if (!dimension) {
      toast.error('当前层级缺少维度，无法继续下钻');
      return;
    }
    const value: string = row.dims[dimension] ?? '';
    onPathChange([
      ...path,
      { level: nextLevelOf(result.level), dimension, value },
    ]);
  };

  const handleBack = (): void => {
    onPathChange(path.slice(0, -1));
  };

  const handleExport = async (): Promise<void> => {
    if (!result) return;
    try {
      let count = 0;
      if (result.rows.length > 0) {
        const headers: string[] = [...result.dimensions, ...result.metrics];
        const rows: Record<string, string>[] = result.rows.map(
          (row: ReportRunRow) => {
            const item: Record<string, string> = {};
            for (const dim of result.dimensions) item[dim] = row.dims[dim] ?? '';
            for (const metric of result.metrics) {
              item[metric] = String(row.values[metric] ?? 0);
            }
            return item;
          },
        );
        count = await exportRowsToExcel(rows, headers, '下钻明细', '下钻明细');
      } else {
        const headers: string[] = ['目标表', '目标编号', ...result.columns];
        const rows: Record<string, string>[] = result.detailRows.map(
          (row: DrilldownDetailRow) => ({
            目标表: row.targetTable,
            目标编号: row.targetNo,
            ...row.fields,
          }),
        );
        count = await exportRowsToExcel(
          rows,
          headers,
          '下钻明细',
          '下钻明细',
        );
      }
      toast.success(`已导出 ${count} 条下钻明细`);
    } catch {
      toast.error('导出失败');
    }
  };

  const detailFieldKeys: string[] = result
    ? Array.from(
        new Set(result.detailRows.flatMap((row: DrilldownDetailRow) =>
          Object.keys(row.fields),
        )),
      )
    : [];

  const detailColumns: TableColumnsType<Record<string, string>> = [
    { title: '目标表', dataIndex: 'targetTable', key: 'targetTable', width: 110 },
    { title: '目标编号', dataIndex: 'targetNo', key: 'targetNo', width: 120 },
    ...detailFieldKeys.map((field: string) => ({
      title: field,
      dataIndex: field,
      key: field,
    })),
  ];

  const detailDataSource: Record<string, string>[] = result
    ? result.detailRows.map((row: DrilldownDetailRow) => ({
        targetTable: row.targetTable,
        targetNo: row.targetNo,
        ...row.fields,
      }))
    : [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1 text-sm">
          <button
            type="button"
            className="font-black text-primary hover:underline"
            onClick={() => onPathChange([])}
          >
            {reportName || `报表#${reportId}`}
          </button>
          {path.map((item: DrilldownPathItem, index: number) => (
            <span
              key={`${item.dimension}-${item.value}-${index}`}
              className="flex items-center gap-1"
            >
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              <button
                type="button"
                className="rounded-[2px] px-1 font-bold hover:bg-accent hover:underline"
                title={`${item.level}层，点击返回该级`}
                onClick={() => onPathChange(path.slice(0, index + 1))}
              >
                {item.dimension}={item.value}
              </button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button
            data-ai-section-type="button"
            size="sm"
            variant="outline"
            className="rounded-none"
            disabled={path.length === 0}
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4" />
            返回上一级
          </Button>
          <Button
            data-ai-section-type="button"
            size="sm"
            variant="outline"
            className="rounded-none"
            onClick={() => void handleExport()}
          >
            <Download className="h-4 w-4" />
            导出明细
          </Button>
        </div>
      </div>
      <Table<ReportRunRow>
        columns={buildRowsColumns(result, handleRowDrill)}
        dataSource={result?.rows ?? []}
        loading={loading}
        rowKey="key"
        scroll={{ x: 900, y: 400 }}
        locale={{ emptyText: '暂无下钻数据' }}
        pagination={false}
      />
      {result && result.rows.length === 0 && detailDataSource.length > 0 ? (
        <Table<Record<string, string>>
          columns={detailColumns}
          dataSource={detailDataSource}
          loading={loading}
          rowKey="targetNo"
          scroll={{ x: 900, y: 300 }}
          locale={{ emptyText: '暂无明细数据' }}
          pagination={false}
        />
      ) : null}
    </div>
  );
};

export { DrilldownRunner };
