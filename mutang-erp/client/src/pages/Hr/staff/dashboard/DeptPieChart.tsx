import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { HrDashboardData } from '@shared/api.interface';
import { ReportCard } from '@client/src/components/blueprint';

/** AGENTS.md 硬规：图表只用蓝色五级渐变 */
const HR_PIE_COLORS: string[] = ['#0033A0', '#2B5FC7', '#5B8DEF', '#93B4F4', '#C3D4FA'];

const MAX_SLICES: number = 4;

interface DeptSlice {
  name: string;
  value: number;
}

/** 饼图 ≤5 类别：取人数最多的前 4 个部门，其余聚合为「其他」 */
const aggregateDepartments = (
  distribution: HrDashboardData['departmentDistribution'],
): DeptSlice[] => {
  const sorted: HrDashboardData['departmentDistribution'][number][] = [...distribution]
    .sort((a, b) => b.count - a.count);
  const top: DeptSlice[] = sorted
    .slice(0, MAX_SLICES)
    .map((item) => ({ name: item.department, value: item.count }));
  const restCount: number = sorted
    .slice(MAX_SLICES)
    .reduce((sum: number, item) => sum + item.count, 0);
  if (restCount > 0) top.push({ name: '其他', value: restCount });
  return top;
};

export function DeptPieChart({
  distribution,
}: {
  distribution: HrDashboardData['departmentDistribution'];
}) {
  const slices: DeptSlice[] = aggregateDepartments(distribution);

  const option: EChartsOption = {
    tooltip: { trigger: 'item' },
    legend: { type: 'scroll', bottom: 0 },
    series: [
      {
        type: 'pie',
        color: HR_PIE_COLORS,
        radius: '60%',
        center: ['50%', '45%'],
        data: slices,
        label: { show: false },
        emphasis: { label: { show: false } },
      },
    ],
  };

  return (
    <ReportCard>
      <div className="mb-4 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
        部门人员分布
        <span className="ml-2 font-bold text-muted-foreground/70">DEPT DISTRIBUTION</span>
      </div>
      {slices.length > 0 ? (
        <ReactECharts option={option} theme="ud" className="h-[300px]" />
      ) : (
        <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
          暂无部门数据
        </div>
      )}
    </ReportCard>
  );
}
