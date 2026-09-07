import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import dayjs from 'dayjs';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import type {
  FinanceCostAnalysisReport,
  FinanceCostTrendItem,
  FinanceIncomeExpenseReport,
  FinanceNamedAmountItem,
  FinanceReceivablePayableItem,
  FinanceReceivablePayableReport,
  FinanceReportRangeParams,
} from '@shared/api.interface';
import {
  fetchFinanceCostAnalysisReport,
  fetchFinanceIncomeExpenseReport,
  fetchFinanceReceivablePayableReport,
} from '@client/src/api/finance-core';
import { CHART_BLUE_PALETTE, ReportCard } from '@client/src/components/blueprint';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { Button } from '@client/src/components/ui/button';
import { Skeleton } from '@client/src/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import { formatFinanceAmount as formatMoney } from './finance-constants';

type RangeProps = { range: FinanceReportRangeParams };

interface ExportRow {
  [key: string]: string | number;
}

interface PieDatum {
  name: string;
  value: number;
}

interface ShareRow {
  dimension: string;
  name: string;
  amount: number;
  ratio: number;
}

const BLUE_COLORS: string[] = [...CHART_BLUE_PALETTE];

function useReportData<T>(
  fetcher: (params: FinanceReportRangeParams) => Promise<T>,
  range: FinanceReportRangeParams,
  errorMessage: string,
): { data: T | null; loading: boolean } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  useEffect(() => {
    let cancelled: boolean = false;
    setLoading(true);
    fetcher(range)
      .then((result: T) => {
        if (!cancelled) setData(result);
      })
      .catch((error: unknown) => {
        logger.error(errorMessage, error);
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);
  return { data, loading };
}

const exportRows = (rows: ExportRow[], sheetName: string, fileName: string): void => {
  if (rows.length === 0) {
    toast.info('暂无数据可导出');
    return;
  }
  const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(rows);
  const workbook: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}_${dayjs().format('YYYYMMDD')}.xlsx`);
};

const toPieData = (items: FinanceNamedAmountItem[]): PieDatum[] => {
  const sorted: FinanceNamedAmountItem[] = [...items].sort(
    (a: FinanceNamedAmountItem, b: FinanceNamedAmountItem) => b.amount - a.amount,
  );
  const data: PieDatum[] = sorted.slice(0, 4).map((item: FinanceNamedAmountItem) => ({
    name: item.name,
    value: item.amount,
  }));
  if (sorted.length > 5) {
    const restAmount: number = sorted
      .slice(4)
      .reduce((sum: number, item: FinanceNamedAmountItem) => sum + item.amount, 0);
    data.push({ name: '其他', value: restAmount });
  }
  return data;
};

const buildPieOption = (data: PieDatum[]): EChartsOption => ({
  color: BLUE_COLORS,
  tooltip: { trigger: 'item' },
  legend: { type: 'scroll', bottom: 0 },
  series: [
    {
      type: 'pie',
      radius: ['40%', '65%'],
      center: ['50%', '45%'],
      label: { show: false },
      emphasis: { label: { show: false } },
      data,
    },
  ],
});

const buildBarOption = (names: string[], values: number[]): EChartsOption => ({
  color: BLUE_COLORS,
  tooltip: { trigger: 'axis' },
  grid: { left: '3%', right: '4%', bottom: '12%', containLabel: true },
  xAxis: { type: 'category', boundaryGap: true, data: names },
  yAxis: { type: 'value' },
  series: [
    {
      name: '金额',
      type: 'bar',
      barMaxWidth: 32,
      itemStyle: { borderRadius: [2, 2, 0, 0] },
      data: values,
    },
  ],
});

const EmptyBox = ({ text }: { text: string }) => (
  <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
    {text}
  </div>
);

interface ReportPanelProps {
  title: string;
  onExport: () => void;
  children: ReactNode;
  actions?: ReactNode;
}

const ReportPanel = ({ title, onExport, children, actions }: ReportPanelProps) => (
  <ReportCard>
    <div className="mb-4 flex items-center justify-between">
      <div className="text-sm font-bold uppercase tracking-[0.15em]">{title}</div>
      <div className="flex items-center gap-2">
        {actions}
        <Button variant="outline" size="sm" className="rounded-none" onClick={onExport}>
          <Download className="mr-1 h-4 w-4" />
          导出 Excel
        </Button>
      </div>
    </div>
    {children}
  </ReportCard>
);

interface ChartBlockProps {
  label: string;
  option: EChartsOption | null;
}

const ChartBlock = ({ label, option }: ChartBlockProps) => (
  <div className="rounded-none border border-border p-4">
    <div className="mb-2 text-xs font-black uppercase tracking-[0.15em] text-muted-foreground">
      {label}
    </div>
    {option ? (
      <ReactECharts option={option} theme="ud" className="h-[300px] w-full" />
    ) : (
      <EmptyBox text="暂无数据" />
    )}
  </div>
);

/* ---------- 应收应付 ---------- */

interface RpColumnDef {
  id: string;
  title: string;
  alignRight?: boolean;
  render: (item: FinanceReceivablePayableItem) => ReactNode;
}

const RP_COLUMN_DEFS: RpColumnDef[] = [
  {
    id: 'customerName',
    title: '客户',
    render: (item: FinanceReceivablePayableItem): ReactNode => item.customerName,
  },
  {
    id: 'receivable',
    title: '应收账款',
    alignRight: true,
    render: (item: FinanceReceivablePayableItem): ReactNode => formatMoney(item.receivable),
  },
  {
    id: 'payable',
    title: '应付账款',
    alignRight: true,
    render: (item: FinanceReceivablePayableItem): ReactNode => formatMoney(item.payable),
  },
  {
    id: 'total',
    title: '合计',
    alignRight: true,
    render: (item: FinanceReceivablePayableItem): ReactNode =>
      formatMoney(item.receivable + item.payable),
  },
];

const RP_COLUMNS: TableColumnsType<FinanceReceivablePayableItem> = RP_COLUMN_DEFS.map(
  (def: RpColumnDef) => ({
    key: def.id,
    dataIndex: def.id,
    title: def.title,
    align: def.alignRight === true ? ('right' as const) : ('left' as const),
  }),
);

const ReceivablePayableTable = ({ range }: RangeProps) => {
  const { data: report, loading } = useReportData<FinanceReceivablePayableReport>(
    fetchFinanceReceivablePayableReport,
    range,
    '获取应收应付报表失败',
  );

  const {
    columnMetas, hiddenIds,
    toggleColumn, resetColumns, setAllColumns,
  } = useColumnSettings(RP_COLUMNS);
  const visibleDefs: RpColumnDef[] = RP_COLUMN_DEFS.filter(
    (def: RpColumnDef) => !hiddenIds.includes(def.id),
  );

  const items: FinanceReceivablePayableItem[] = (report?.items ?? [])
    .slice()
    .sort(
      (a: FinanceReceivablePayableItem, b: FinanceReceivablePayableItem) =>
        b.receivable + b.payable - (a.receivable + a.payable),
    );

  const handleExport = (): void => {
    exportRows(
      items.map((item: FinanceReceivablePayableItem) => ({
        客户: item.customerName, 应收账款: item.receivable,
        应付账款: item.payable, 合计: item.receivable + item.payable,
      })),
      '应收应付',
      '应收应付报表',
    );
  };

  return (
    <ReportPanel
      title="应收应付报表 · 客户维度"
      onExport={handleExport}
      actions={
        <ColumnSettingsButton
          columnMetas={columnMetas} hiddenIds={hiddenIds}
          onToggle={toggleColumn} onReset={resetColumns} onSetAll={setAllColumns}
        />
      }
    >
      {loading ? (
        <Skeleton className="h-[280px] w-full" />
      ) : items.length === 0 ? (
        <EmptyBox text="当前时间范围内暂无应收应付数据" />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {visibleDefs.map((def: RpColumnDef) => (
                  <TableHead
                    key={def.id}
                    className={def.alignRight === true ? 'rounded-none text-right' : 'rounded-none'}
                  >
                    {def.title}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item: FinanceReceivablePayableItem) => (
                <TableRow key={item.customerName}>
                  {visibleDefs.map((def: RpColumnDef) => (
                    <TableCell
                      key={def.id}
                      className={def.alignRight === true ? 'text-right font-mono' : 'font-bold text-primary'}
                    >
                      {def.render(item)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </ReportPanel>
  );
};

/* ---------- 收支汇总 ---------- */

const IncomeExpensePanel = ({ range }: RangeProps) => {
  const { data: report, loading } = useReportData<FinanceIncomeExpenseReport>(
    fetchFinanceIncomeExpenseReport,
    range,
    '获取收支汇总报表失败',
  );

  const handleExport = (): void => {
    if (!report) {
      toast.info('暂无数据可导出');
      return;
    }
    exportRows(
      [
        ...report.incomeByType.map((item: FinanceNamedAmountItem) => ({
          维度: '收入-收款类型', 名称: item.name, 金额: item.amount,
        })),
        ...report.expenseByType.map((item: FinanceNamedAmountItem) => ({
          维度: '支出-付款类型', 名称: item.name, 金额: item.amount,
        })),
        ...report.byAccount.map((item: FinanceNamedAmountItem) => ({
          维度: '账户净收支', 名称: item.name, 金额: item.amount,
        })),
      ],
      '收支汇总',
      '收支汇总报表',
    );
  };

  const incomePie: PieDatum[] = toPieData(report?.incomeByType ?? []);
  const expensePie: PieDatum[] = toPieData(report?.expenseByType ?? []);
  const byAccount: FinanceNamedAmountItem[] = report?.byAccount ?? [];

  return (
    <ReportPanel title="收支汇总报表" onExport={handleExport}>
      {loading ? (
        <Skeleton className="h-[320px] w-full" />
      ) : !report ? (
        <EmptyBox text="当前时间范围内暂无收支数据" />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <ChartBlock
            label="收入 · 按收款类型分布"
            option={incomePie.length > 0 ? buildPieOption(incomePie) : null}
          />
          <ChartBlock
            label="支出 · 按付款类型分布"
            option={expensePie.length > 0 ? buildPieOption(expensePie) : null}
          />
          <ChartBlock
            label="账户净收支"
            option={
              byAccount.length > 0
                ? buildBarOption(
                    byAccount.map((item: FinanceNamedAmountItem) => item.name),
                    byAccount.map((item: FinanceNamedAmountItem) => item.amount),
                  )
                : null
            }
          />
        </div>
      )}
    </ReportPanel>
  );
};

/* ---------- 成本分析 ---------- */

const CostAnalysisPanel = ({ range }: RangeProps) => {
  const { data: report, loading } = useReportData<FinanceCostAnalysisReport>(
    fetchFinanceCostAnalysisReport,
    range,
    '获取成本分析报表失败',
  );

  const byType: FinanceNamedAmountItem[] = report?.byType ?? [];
  const byCategory: FinanceNamedAmountItem[] = report?.byCategory ?? [];
  const trend: FinanceCostTrendItem[] = report?.trend ?? [];

  const sumOf = (items: FinanceNamedAmountItem[]): number =>
    items.reduce((sum: number, item: FinanceNamedAmountItem) => sum + item.amount, 0);
  const typeTotal: number = sumOf(byType);
  const categoryTotal: number = sumOf(byCategory);

  const shareRows: ShareRow[] = [
    ...byType.map((item: FinanceNamedAmountItem) => ({
      dimension: '成本类型', name: item.name, amount: item.amount,
      ratio: typeTotal > 0 ? (item.amount / typeTotal) * 100 : 0,
    })),
    ...byCategory.map((item: FinanceNamedAmountItem) => ({
      dimension: '成本分类', name: item.name, amount: item.amount,
      ratio: categoryTotal > 0 ? (item.amount / categoryTotal) * 100 : 0,
    })),
  ];

  const handleExport = (): void => {
    exportRows(
      shareRows.map((row: ShareRow) => ({
        维度: row.dimension, 名称: row.name,
        金额: row.amount, 占比: `${row.ratio.toFixed(2)}%`,
      })),
      '成本分析',
      '成本分析报表',
    );
  };

  const trendOption: EChartsOption = {
    color: [CHART_BLUE_PALETTE[0]],
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '12%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: true,
      data: trend.map((item: FinanceCostTrendItem) => item.period),
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '成本',
        type: 'line',
        smooth: true,
        data: trend.map((item: FinanceCostTrendItem) => item.amount),
      },
    ],
  };

  return (
    <ReportPanel title="成本分析报表" onExport={handleExport}>
      {loading ? (
        <Skeleton className="h-[320px] w-full" />
      ) : !report || (byType.length === 0 && trend.length === 0) ? (
        <EmptyBox text="当前时间范围内暂无成本数据" />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartBlock
              label="按成本类型金额"
              option={
                byType.length > 0
                  ? buildBarOption(
                      byType.map((item: FinanceNamedAmountItem) => item.name),
                      byType.map((item: FinanceNamedAmountItem) => item.amount),
                    )
                  : null
              }
            />
            <ChartBlock label="月度成本趋势" option={trend.length > 0 ? trendOption : null} />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="rounded-none">维度</TableHead>
                  <TableHead className="rounded-none">名称</TableHead>
                  <TableHead className="rounded-none text-right">金额</TableHead>
                  <TableHead className="rounded-none text-right">占比</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shareRows.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      暂无成本占比数据
                    </TableCell>
                  </TableRow>
                ) : (
                  shareRows.map((row: ShareRow) => (
                    <TableRow key={`${row.dimension}-${row.name}`}>
                      <TableCell className="text-muted-foreground">{row.dimension}</TableCell>
                      <TableCell className="font-bold text-primary">{row.name}</TableCell>
                      <TableCell className="text-right font-mono">{formatMoney(row.amount)}</TableCell>
                      <TableCell className="text-right font-mono">{`${row.ratio.toFixed(2)}%`}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </ReportPanel>
  );
};

export { CostAnalysisPanel, IncomeExpensePanel, ReceivablePayableTable };
