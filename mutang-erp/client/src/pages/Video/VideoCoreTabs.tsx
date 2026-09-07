import { NavLink } from 'react-router-dom';
import { cn } from '@client/src/lib/utils';

interface VideoCoreTabsProps {
  active: string;
}

interface VideoTabItem {
  key: string;
  to: string;
  label: string;
}

const TAB_ITEMS: VideoTabItem[] = [
  { key: 'overview', to: '/video', label: '视频列表' },
  { key: 'orders', to: '/video/orders', label: '视频订单' },
  { key: 'projects', to: '/video/projects', label: '视频项目' },
  { key: 'actors', to: '/video/actors', label: '演员管理' },
  { key: 'outsourcing', to: '/video/outsourcing', label: '外包管理' },
  { key: 'commissions', to: '/video/commissions', label: '提成管理' },
  { key: 'shooting', to: '/video/shooting-expenses', label: '拍摄费用' },
  { key: 'venue', to: '/video/venue-expenses', label: '场地费用' },
  { key: 'samples', to: '/video/samples', label: '样品管理' },
];

export function VideoCoreTabs({ active }: VideoCoreTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border">
      {TAB_ITEMS.map((item: VideoTabItem) => (
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
