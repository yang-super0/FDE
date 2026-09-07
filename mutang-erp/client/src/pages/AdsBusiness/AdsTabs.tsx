import { NavLink } from 'react-router-dom';
import { cn } from '@client/src/lib/utils';

interface AdsTabItem {
  to: string;
  label: string;
}

const TAB_ITEMS: AdsTabItem[] = [
  { to: '/ads/account-applications', label: '开户管理' },
  { to: '/ads/accounts', label: '广告账户' },
  { to: '/ads/filings', label: '报备管理' },
  { to: '/ads/transfers', label: '转户管理' },
  { to: '/ads/commission-rules', label: '提成规则' },
  { to: '/ads/commission-records', label: '提成记录' },
];

export function AdsTabs() {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border">
      {TAB_ITEMS.map((item: AdsTabItem) => (
        <NavLink
          key={item.to}
          to={item.to}
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
