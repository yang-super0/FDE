import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { ReportCard } from '@client/src/components/blueprint';
import type { ActivityItem } from '@shared/api.interface';
import { useI18n } from '@client/src/i18n';

interface DashboardActivitiesProps {
  activities: ActivityItem[];
}

const MODULE_ROUTE_MAP: Record<string, string> = {
  客户管理: '/customers',
  广告业务: '/advertising',
  视频业务: '/video',
  合同管理: '/contracts',
  财务管理: '/finance',
  人资管理: '/hr',
  行政管理: '/admin',
  任务中心: '/tasks',
  系统管理: '/system',
  业务支持: '/support',
};

const ACTION_LABEL_MAP: Record<string, string> = {
  create: 'dashboard.activities.actions.create',
  update: 'dashboard.activities.actions.update',
  delete: 'dashboard.activities.actions.delete',
  approve: 'dashboard.activities.actions.approve',
  status_change: 'dashboard.activities.actions.status_change',
};

const DashboardActivities = ({ activities }: DashboardActivitiesProps) => {
  const { t } = useI18n();
  const navigate = useNavigate();

  const handleJump = (module: string): void => {
    navigate(MODULE_ROUTE_MAP[module] ?? '/');
  };

  return (
    <ReportCard className="flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[11px] font-black text-primary uppercase tracking-[0.15em]">
          {t('dashboard.activities.title')}
        </div>
        <span className="text-[10px] font-bold text-muted-foreground">
          {t('dashboard.activities.hint')}
        </span>
      </div>
      {activities.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {t('dashboard.activities.empty')}
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {activities.map((activity: ActivityItem) => (
            <li key={activity.id}>
              <button
                type="button"
                onClick={() => handleJump(activity.module)}
                className="w-full flex items-center gap-3 py-3 text-left transition-colors hover:bg-accent"
              >
                <span className="shrink-0 text-[10px] font-bold text-primary bg-accent px-2 py-0.5">
                  {activity.module}
                </span>
                <span className="flex-1 text-sm text-foreground truncate">
                  {ACTION_LABEL_MAP[activity.actionType]
                    ? t(ACTION_LABEL_MAP[activity.actionType])
                    : activity.actionType}
                  <span className="text-muted-foreground"> · </span>
                  {activity.target}
                </span>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                  {activity.operatorName || t('common.system')}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                  {dayjs(activity.time).format('MM-DD HH:mm')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </ReportCard>
  );
};

export { DashboardActivities };
export type { DashboardActivitiesProps };
