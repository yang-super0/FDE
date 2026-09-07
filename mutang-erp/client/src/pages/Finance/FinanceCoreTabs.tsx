import { NavLink } from 'react-router-dom';
import { cn } from '@client/src/lib/utils';

interface FinanceCoreTabsProps {
  active: string;
}

interface FinanceTabItem {
  key: string;
  to: string;
  label: string;
}

const TAB_ITEMS: FinanceTabItem[] = [
  { key: 'overview', to: '/finance', label: '资金总览' },
  { key: 'accounts', to: '/finance/accounts', label: '资金账户' },
  { key: 'receipts', to: '/finance/receipts', label: '收款管理' },
  { key: 'payments', to: '/finance/payments', label: '付款管理' },
  { key: 'invoices', to: '/finance/invoices', label: '发票管理' },
  { key: 'costs', to: '/finance/costs', label: '成本管理' },
  { key: 'reports', to: '/finance/reports', label: '财务报表' },
];

export function FinanceCoreTabs({ active }: FinanceCoreTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border">
      {TAB_ITEMS.map((item: FinanceTabItem) => (
        <NavLink
          key={item.key}
          to={item.to}
          className={cn(
            'border-b-2 px-4 py-2.5 text-sm font-bold transition-colors',
            active === item.key
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}
