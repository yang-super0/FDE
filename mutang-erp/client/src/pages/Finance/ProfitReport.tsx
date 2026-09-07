import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  FinanceProfitTrendItem,
  FinanceReportRangeParams,
} from '@shared/api.interface';
import { fetchFinanceProfitReport } from '@client/src/api/finance-core';
import { CHART_BLUE_PALETTE, ReportCard } from '@client/src/components/blueprint';
import { Button } from '@client/src/components/ui/button';
import { Skeleton } from '@client/src/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import { formatFinanceAmount as formatMoney } from './finance-constants';

interface ProfitReportProps {
  range: FinanceReportRangeParams;
}

interface ProfitExportRow {
  期间: string;
  收入: number;
  成本: number;
  利润: number;
  利润率: string;
}

const profitRateOf = (item: FinanceProfitTrendItem): number =>
  item.income > 0 ? (item.profit / item.income) * 100 : 0;

const formatRate = (value: number): string => `${value.toFixed(2)}%`;

const ProfitReport = ({ range }: ProfitReportProps) => {
  const [trend, setTrend] = useState<FinanceProfitTrendItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled: boolean = false;
    setLoading(true);
    fetchFinanceProfitReport(range)
      .then((data) => {
        if (!cancelled) setTrend(data.trend ?? []);
      })
      .catch((error: unknown) => {
        logger.error('获取利润表失败', error);
        if (!cancelled) setTrend([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const handleExport = (): void => {
    if (trend.length === 0) {
      toast.info('暂无数据可导出');
      return;
    }
    const rows: ProfitExportRow[] = trend.map(
      (item: FinanceProfitTrendItem) => ({
        期间: item.period,
        收入: item.income,
        成本: item.cost,
        利润: item.profit,
        利润率: formatRate(profitRateOf(item)),
      }),
    );
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(rows);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '利润表');
    XLSX.writeFile(workbook, `利润表_${dayjs().format('YYYYMMDD')}.xlsx`);
  };

  const option: EChartsOption = {
    color: [CHART_BLUE_PALETTE[0], CHART_BLUE_PALETTE[2], CHART_BLUE_PALETTE[1]],
    tooltip: { trigger: 'axis' },
    legend: { type: 'scroll', bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '20%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: true,
      data: trend.map((item: FinanceProfitTrendItem) => item.period),
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '收入',
        type: 'bar',
        barMaxWidth: 24,
        itemStyle: { borderRadius: [2, 2, 0, 0] },
        data: trend.map((item: FinanceProfitTrendItem) => item.income),
      },
      {
        name: '成本',
        type: 'bar',
        barMaxWidth: 24,
        itemStyle: { borderRadius: [2, 2, 0, 0] },
        data: trend.map((item: FinanceProfitTrendItem) => item.cost),
      },
      {
        name: '利润',
        type: 'line',
        smooth: true,
        data: trend.map((item: FinanceProfitTrendItem) => item.profit),
      },
    ],
  };

  const totalIncome: number = trend.reduce(
    (sum: number, item: FinanceProfitTrendItem) => sum + item.income,
    0,
  );
  const totalCost: number = trend.reduce(
    (sum: number, item: FinanceProfitTrendItem) => sum + item.cost,
    0,
  );
  const totalProfit: number = trend.reduce(
    (sum: number, item: FinanceProfitTrendItem) => sum + item.profit,
    0,
  );

  return (
    <ReportCard>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-bold uppercase tracking-[0.15em]">
          利润表 · 月度收支利润趋势
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-none"
          onClick={handleExport}
        >
          <Download className="mr-1 h-4 w-4" />
          导出 Excel
        </Button>
      </div>

      {loading ? (
        <>
          <Skeleton className="mb-6 h-[320px] w-full" />
          <Skeleton className="h-[200px] w-full" />
        </>
      ) : trend.length === 0 ? (
        <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
          当前时间范围内暂无利润数据
        </div>
      ) : (
        <>
          <div className="rounded-none border border-border">
            <ReactECharts option={option} theme="ud" className="h-[320px] w-full" />
          </div>

          <div className="mt-6 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="rounded-none">期间</TableHead>
                  <TableHead className="rounded-none text-right">收入</TableHead>
                  <TableHead className="rounded-none text-right">成本</TableHead>
                  <TableHead className="rounded-none text-right">利润</TableHead>
                  <TableHead className="rounded-none text-right">利润率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trend.map((item: FinanceProfitTrendItem) => (
                  <TableRow key={item.period}>
                    <TableCell className="font-bold text-primary">
                      {item.period}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatMoney(item.income)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatMoney(item.cost)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatMoney(item.profit)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatRate(profitRateOf(item))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="hover:bg-transparent">
                  <TableCell className="font-bold">合计</TableCell>
                  <TableCell className="text-right font-mono font-bold">
                    {formatMoney(totalIncome)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold">
                    {formatMoney(totalCost)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold">
                    {formatMoney(totalProfit)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold">
                    {formatRate(totalIncome > 0 ? (totalProfit / totalIncome) * 100 : 0)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </>
      )}
    </ReportCard>
  );
};

export { ProfitReport };
