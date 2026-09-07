import { NavLink } from 'react-router-dom';
import { cn } from '@client/src/lib/utils';

interface PoolTabItem {
  to: string;
  label: string;
  end?: boolean;
}

const TAB_ITEMS: PoolTabItem[] = [
  { to: '/customers/public-pool', label: '公海客资', end: true },
  { to: '/customers/public-pool/invalid', label: '无效客资' },
  { to: '/customers/public-pool/analytics', label: '转化分析' },
  { to: '/customers/leads', label: '线索管理' },
];

export function PoolTabs() {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border">
      {TAB_ITEMS.map((item: PoolTabItem) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }: { isActive: boolean }) =>
            cn(
              'border-b-2 px-4 py-2.5 text-sm font-bold transition-colors',
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}
