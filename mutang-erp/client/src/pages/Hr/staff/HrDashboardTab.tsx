import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { RotateCcw } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { ReportCard } from '@client/src/components/blueprint';
import type { HrDashboardData } from '@shared/api.interface';
import { fetchHrDashboard } from '@client/src/api/hr-enhance/staff';
import { toHrErrorText } from '../hr-enhance-constants';
import { KpiCards } from './dashboard/KpiCards';
import { TrendChart } from './dashboard/TrendChart';
import { DeptPieChart } from './dashboard/DeptPieChart';
import { StatusChart } from './dashboard/StatusChart';

export function HrDashboardTab() {
  const [data, setData] = useState<HrDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const load = async (): Promise<void> => {
    setLoading(true);
    try {
      const result = await fetchHrDashboard();
      setData(result);
    } catch (error: unknown) {
      toast.error(toHrErrorText(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
          人资数据看板 · 实时统计
        </div>
        <Button
          variant="ghost" size="sm" className="rounded-none"
          disabled={loading} onClick={() => void load()}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          刷新
        </Button>
      </div>
      {loading && !data ? (
        <div className="space-y-6">
          <div
            className="grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-6"
            data-ai-section-type="card-stat"
          >
            {[0, 1, 2, 3, 4, 5].map((item: number) => (
              <ReportCard key={item}>
                <Skeleton className="mb-3 h-3 w-20 rounded-none" />
                <Skeleton className="h-9 w-16 rounded-none" />
              </ReportCard>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {[0, 1].map((item: number) => (
              <ReportCard key={item}>
                <Skeleton className="mb-4 h-3 w-32 rounded-none" />
                <Skeleton className="h-[300px] w-full rounded-none" />
              </ReportCard>
            ))}
          </div>
        </div>
      ) : data ? (
        <div className="space-y-6">
          <KpiCards data={data} />
          <div className="grid gap-6 lg:grid-cols-2">
            <TrendChart trend={data.entryLeaveTrend} />
            <DeptPieChart distribution={data.departmentDistribution} />
          </div>
          <StatusChart distribution={data.statusDistribution} />
        </div>
      ) : (
        <div className="py-12 text-center text-sm text-muted-foreground">
          看板数据加载失败，请点击「刷新」重试
        </div>
      )}
    </div>
  );
}
