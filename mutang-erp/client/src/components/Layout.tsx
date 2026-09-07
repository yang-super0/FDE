import { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Target,
  Users,
  Megaphone,
  Clapperboard,
  FileText,
  LayoutTemplate,
  Receipt,
  Wallet,
  BarChart3,
  Landmark,
  Percent,
  HandCoins,
  Coins,
  UserRound,
  UserSearch,
  Contact,
  BadgeDollarSign,
  CalendarClock,
  Briefcase,
  ShoppingCart,
  Boxes,
  Warehouse,
  ListTodo,
  Settings,
  LifeBuoy,
} from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@client/src/components/ui/sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
} from '@client/src/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@client/src/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@client/src/components/ui/avatar';
import { useAppInfo } from '@lark-apaas/client-toolkit/hooks/useAppInfo';
import { useCurrentUserProfile } from '@lark-apaas/client-toolkit/hooks/useCurrentUserProfile';
import { getDataloom } from '@lark-apaas/client-toolkit/dataloom';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Image } from '@client/src/components/ui/image';
import { useI18n } from '@client/src/i18n';
import LanguageSwitcher from '@client/src/i18n/LanguageSwitcher';
import MessageBell from '@client/src/components/MessageCenter/MessageBell';
import { getCurrentRole } from '@client/src/api/system-enhance/roles';
import { recordLogin } from '@client/src/api/system-enhance/login-logs';

interface NavItem {
  path: string;
  title: string;
  icon: LucideIcon;
}

// title 存放 i18n key（menu.*），渲染时通过 t() 取当前语言文案。
const NAV_ITEMS: NavItem[] = [
  { path: '/', title: 'menu.dashboard', icon: LayoutDashboard },
  { path: '/workbench/targets', title: 'menu.targets', icon: Target },
  { path: '/customers', title: 'menu.customers', icon: Users },
  { path: '/advertising', title: 'menu.advertising', icon: Megaphone },
  { path: '/video', title: 'menu.video', icon: Clapperboard },
  { path: '/contracts', title: 'menu.contracts', icon: FileText },
  { path: '/contracts/templates', title: 'menu.contractTemplates', icon: LayoutTemplate },
  { path: '/contracts/expenses', title: 'menu.contractExpenses', icon: Receipt },
  { path: '/finance', title: 'menu.finance', icon: Wallet },
  { path: '/reports', title: 'menu.reports', icon: BarChart3 },
  { path: '/finance/funds', title: 'menu.funds', icon: Landmark },
  { path: '/finance/rebates', title: 'menu.rebates', icon: Percent },
  { path: '/finance/advances', title: 'menu.advances', icon: HandCoins },
  { path: '/finance/expenses', title: 'menu.expenses', icon: Coins },
  { path: '/hr', title: 'menu.hr', icon: UserRound },
  { path: '/hr/recruitment', title: 'menu.recruitment', icon: UserSearch },
  { path: '/hr/staff', title: 'menu.staff', icon: Contact },
  { path: '/hr/compensation', title: 'menu.compensation', icon: BadgeDollarSign },
  { path: '/hr/attendance-manage', title: 'menu.attendance', icon: CalendarClock },
  { path: '/admin', title: 'menu.admin', icon: Briefcase },
  { path: '/admin/procurement', title: 'menu.procurement', icon: ShoppingCart },
  { path: '/admin/asset-inventory', title: 'menu.assets', icon: Boxes },
  { path: '/admin/warehouse', title: 'menu.warehouse', icon: Warehouse },
  { path: '/tasks', title: 'menu.tasks', icon: ListTodo },
  { path: '/system', title: 'menu.system', icon: Settings },
  { path: '/support', title: 'menu.support', icon: LifeBuoy },
];

const GUEST_AVATAR =
  'https://lf3-static.bytednsdoc.com/obj/eden-cn/LMfspH/ljhwZthlaukjlkulzlp/miao/no-person.svg';

/** 导航路径 → 菜单模块（与角色权限配置的模块名对齐） */
const NAV_PATH_MODULE_MAP: Record<string, string> = {
  '/workbench': '工作台',
  '/customers': '客户管理',
  '/customer-pool': '公海线索',
  '/advertising': '广告投放',
  '/video': '视频业务',
  '/contracts': '合同管理',
  '/finance': '财务管理',
  '/reports': '财务管理',
  '/hr': '人资管理',
  '/admin': '行政管理',
  '/tasks': '任务中心',
  '/system': '系统管理',
  '/support': '支持中心',
};

function resolveNavModule(path: string): string | null {
  if (path === '/') return '工作台';
  const prefixes: string[] = Object.keys(NAV_PATH_MODULE_MAP).sort(
    (a: string, b: string): number => b.length - a.length,
  );
  const hit: string | undefined = prefixes.find((prefix: string): boolean =>
    path.startsWith(prefix),
  );
  return hit ? NAV_PATH_MODULE_MAP[hit] : null;
}

const UserPanel = () => {
  const userInfo = useCurrentUserProfile();
  const isLoggedIn: boolean = Boolean(userInfo?.user_id);
  const { t } = useI18n();

  const handleLogout = async () => {
    const dataloom = await getDataloom();
    const result = await dataloom.service.session.signOut();
    if (result.error) {
      logger.error('退出登录失败:', result.error.message);
      return;
    }
    window.location.reload();
  };

  const handleLogin = async () => {
    const dataloom = await getDataloom();
    dataloom.service.session.redirectToLogin();
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="h-auto py-2">
              <Avatar className="size-7 rounded-none">
                <AvatarImage
                  src={isLoggedIn ? userInfo.avatar : GUEST_AVATAR}
                  alt={isLoggedIn ? userInfo.name : t('common.guest')}
                />
                <AvatarFallback className="rounded-none">
                  {isLoggedIn
                    ? (userInfo.name ?? t('common.user')).slice(0, 1)
                    : t('common.guest').slice(0, 1)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-bold">
                {isLoggedIn ? userInfo.name : t('common.guest')}
              </span>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="rounded-none w-40">
            {isLoggedIn ? (
              <DropdownMenuItem onClick={handleLogout}>
                {t('common.logout')}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={handleLogin}>
                {t('common.login')}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};

const LayoutContent = () => {
  const { pathname } = useLocation();
  const { appName, appLogo } = useAppInfo();
  const { t } = useI18n();
  const userInfo = useCurrentUserProfile();
  const [allowedMenus, setAllowedMenus] = useState<string[] | null>(null);

  // 拉取当前用户生效角色对应的菜单权限；null 表示全量（admin 或接口异常兼容）
  useEffect(() => {
    let cancelled = false;
    getCurrentRole()
      .then((role): void => {
        if (!cancelled) {
          setAllowedMenus(role.isAdmin ? null : role.menus);
        }
      })
      .catch((): void => {
        if (!cancelled) setAllowedMenus(null);
      });
    return (): void => {
      cancelled = true;
    };
  }, []);

  // 登录成功后上报登录日志（每会话同用户只报一次）
  const loginUserId: string | undefined = userInfo?.user_id
    ? String(userInfo.user_id)
    : undefined;
  useEffect((): void => {
    if (!loginUserId) return;
    const flag = `login_log_reported_${loginUserId}`;
    if (sessionStorage.getItem(flag)) return;
    sessionStorage.setItem(flag, '1');
    recordLogin().catch((error: unknown): void => {
      sessionStorage.removeItem(flag);
      logger.error(
        `登录日志上报失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });
  }, [loginUserId]);

  const visibleNavItems: NavItem[] = useMemo((): NavItem[] => {
    if (!allowedMenus) return NAV_ITEMS;
    return NAV_ITEMS.filter((item: NavItem): boolean => {
      const moduleName: string | null = resolveNavModule(item.path);
      return moduleName === null || allowedMenus.includes(moduleName);
    });
  }, [allowedMenus]);

  const activeItem: NavItem =
    NAV_ITEMS.find((item: NavItem) =>
      item.path === '/'
        ? pathname === '/'
        : pathname.startsWith(item.path),
    ) ?? NAV_ITEMS[0];

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link to="/">
                  <div className="flex size-8 items-center justify-center bg-primary text-primary-foreground text-sm font-black rounded-none">
                    {appLogo ? (
                      <Image src={appLogo} alt={appName} className="size-5" />
                    ) : (
                      '牧'
                    )}
                  </div>
                  <div className="group-data-[collapsible=icon]:hidden">
                    <div className="text-sm font-bold leading-tight">
                      {appName || '牧唐数智'}
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                      ERP SYSTEM
                    </div>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleNavItems.map((item: NavItem) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={
                        item.path === '/'
                          ? pathname === '/'
                          : pathname.startsWith(item.path)
                      }
                    >
                      <Link to={item.path}>
                        <item.icon className="size-4" />
                        <span>{t(item.title)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <div className="px-2 pb-1 group-data-[collapsible=icon]:hidden">
            <LanguageSwitcher />
          </div>
          <UserPanel />
        </SidebarFooter>
      </Sidebar>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center gap-3 h-14 px-6 border-b border-border bg-card shrink-0">
          <SidebarTrigger />
          <div className="h-4 w-px bg-border" />
          <Breadcrumb className="self-center">
            <BreadcrumbList>
            <BreadcrumbItem className="text-foreground font-bold text-sm">
              {t(activeItem.title)}
            </BreadcrumbItem>
          </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex items-center gap-3">
            <MessageBell />
          </div>
        </header>
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </>
  );
};

const Layout = () => {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

export default Layout;
