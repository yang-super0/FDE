import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { GradientHeader, SectionHeader } from '@client/src/components/blueprint';
import {
  getActivities,
  getBusinessShare,
  getRevenueTrend,
  getSummary,
  getTodos,
} from '@client/src/api/dashboard';
import type {
  ActivityItem,
  BusinessShareItem,
  DashboardSummary,
  RevenueTrendItem,
  TodoItem,
} from '@shared/api.interface';
import { DashboardKpiBand } from './DashboardKpiBand';
import { DashboardCharts } from './DashboardCharts';
import { DashboardTodos } from './DashboardTodos';
import { DashboardActivities } from './DashboardActivities';
import { DashboardRankSection } from './DashboardRankSection';
import { DashboardTargetSection } from './DashboardTargetSection';
import { DashboardPerformanceSection } from './DashboardPerformanceSection';
import { useI18n } from '@client/src/i18n';

const Dashboard = () => {
  const { t } = useI18n();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trend, setTrend] = useState<RevenueTrendItem[]>([]);
  const [share, setShare] = useState<BusinessShareItem[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [updatedAt] = useState<string>(() =>
    dayjs().format('YYYY-MM-DD HH:mm'),
  );

  useEffect(() => {
    let mounted: boolean = true;
    const loadAll = async (): Promise<void> => {
      try {
        const [summaryRes, trendRes, shareRes, todosRes, activitiesRes] =
          await Promise.all([
            getSummary(),
            getRevenueTrend(),
            getBusinessShare(),
            getTodos(),
            getActivities(),
          ]);
        if (!mounted) return;
        setSummary(summaryRes);
        setTrend(trendRes.items);
        setShare(shareRes.items);
        setTodos(todosRes.items);
        setActivities(activitiesRes.items);
      } catch {
        if (mounted) {
          setError(t('dashboard.loadFailed'));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void loadAll();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <GradientHeader
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle')}
        meta={`${t('dashboard.dataUpdatedAt')} ${updatedAt}`}
      />
      <main className="relative max-w-[1280px] mx-auto px-8 -mt-10 pb-16 space-y-10">
        {error ? (
          <div className="bg-card border-t-[3px] border-t-[#EF4444] rounded-none shadow-md p-6 text-sm text-[#EF4444]">
            {error}
          </div>
        ) : null}
        {loading ? (
          <div className="bg-card border-t-[3px] border-t-[#0033A0] rounded-none shadow-md p-12 text-center text-sm text-muted-foreground">
            {t('dashboard.loading')}
          </div>
        ) : (
          <>
            <section>
              <SectionHeader
                no="01"
                label="OVERVIEW"
                subtitle={t('dashboard.sections.overview')}
              />
              {summary ? <DashboardKpiBand summary={summary} /> : null}
            </section>
            <section>
              <SectionHeader
                no="02"
                label="TREND ANALYSIS"
                subtitle={t('dashboard.sections.trend')}
              />
              <DashboardCharts trend={trend} share={share} />
            </section>
            <section>
              <SectionHeader
                no="03"
                label="TODOS & ACTIVITIES"
                subtitle={t('dashboard.sections.todos')}
              />
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <DashboardTodos todos={todos} />
                <DashboardActivities activities={activities} />
              </div>
            </section>
            <section>
              <SectionHeader
                no="04"
                label="CONSUMPTION RANKING"
                subtitle={t('dashboard.sections.rank')}
              />
              <DashboardRankSection />
            </section>
            <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
              <div>
                <SectionHeader
                  no="05"
                  label="TARGET DETAILS"
                  subtitle={t('dashboard.sections.target')}
                />
                <DashboardTargetSection />
              </div>
              <div>
                <SectionHeader
                  no="06"
                  label="PERFORMANCE TASKS"
                  subtitle={t('dashboard.sections.performance')}
                />
                <DashboardPerformanceSection />
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
