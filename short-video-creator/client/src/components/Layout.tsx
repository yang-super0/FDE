import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { BarChart3, Clapperboard, LogOut } from 'lucide-react';
import { useAppInfo } from '@lark-apaas/client-toolkit/hooks/useAppInfo';
import { useCurrentUserProfile } from '@lark-apaas/client-toolkit/hooks/useCurrentUserProfile';
import { getDataloom } from '@lark-apaas/client-toolkit/dataloom';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@client/src/components/ui/alert-dialog';
import { Image } from '@client/src/components/ui/image';

const GUEST_AVATAR_URL =
  'https://lf3-static.bytednsdoc.com/obj/eden-cn/LMfspH/ljhwZthlaukjlkulzlp/miao/no-person.svg';

interface NavItem {
  path: string;
  title: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { path: '/', title: '素材库', icon: Clapperboard },
  { path: '/dashboard', title: '数据看板', icon: BarChart3 },
];

const getActiveTitle = (pathname: string): string => {
  const matched: NavItem | undefined = navItems.find(
    (item: NavItem) => item.path === pathname,
  );
  if (matched) {
    return matched.title;
  }
  if (pathname.startsWith('/materials/')) {
    return '素材详情';
  }
  return '';
};

const UserMenu: React.FC = () => {
  const userInfo = useCurrentUserProfile();
  const [logoutOpen, setLogoutOpen] = useState<boolean>(false);
  const isLoggedIn: boolean = Boolean(userInfo?.user_id);

  const handleLogout = async (): Promise<void> => {
    const dataloom = await getDataloom();
    const result = await dataloom.service.session.signOut();
    if (result.error) {
      logger.error(`退出登录失败: ${result.error.message}`);
      return;
    }
    window.location.reload();
  };

  const handleLogin = async (): Promise<void> => {
    const dataloom = await getDataloom();
    dataloom.service.session.redirectToLogin();
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="hover:bg-accent/60">
              <Image
                src={isLoggedIn ? userInfo.avatar : GUEST_AVATAR_URL}
                alt={isLoggedIn ? userInfo.name : '游客'}
                className="size-6 rounded-full object-cover"
              />
              <span className="truncate">
                {isLoggedIn ? userInfo.name : '游客'}
              </span>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            {isLoggedIn ? (
              <DropdownMenuItem onClick={() => setLogoutOpen(true)}>
                <LogOut className="size-4" />
                <span>退出登录</span>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={handleLogin}>
                <span>登录</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认退出登录？</AlertDialogTitle>
            <AlertDialogDescription>
              退出后需要重新登录才能继续使用应用。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>
              退出登录
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarMenu>
  );
};

const LayoutContent: React.FC = () => {
  const { pathname } = useLocation();
  const { appName, appLogo } = useAppInfo();
  const activeTitle: string = getActiveTitle(pathname);

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link to="/">
                  <div className="flex size-8 items-center justify-center rounded-sm bg-primary text-primary-foreground">
                    {appLogo ? (
                      <Image
                        src={appLogo}
                        alt={appName}
                        className="size-5 object-contain"
                      />
                    ) : (
                      <Clapperboard className="size-4" />
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                    <span className="font-semibold">{appName || '爆款素材工作台'}</span>
                    <span className="text-xs text-muted-foreground">
                      内容运营素材中心
                    </span>
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
                {navItems.map((item: NavItem) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.path}
                      className="transition-colors duration-150 ease-out"
                    >
                      <Link to={item.path}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <UserMenu />
        </SidebarFooter>
      </Sidebar>
      <main className="flex flex-1 flex-col overflow-hidden p-6">
        <header className="mb-6 flex items-center gap-2">
          <SidebarTrigger />
          <Breadcrumb className="self-center">
            <BreadcrumbList>
              <BreadcrumbItem className="font-medium text-foreground">
                {activeTitle}
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex-1 overflow-auto">
          <div className="mx-auto max-w-[1400px]">
            <Outlet />
          </div>
        </div>
      </main>
    </>
  );
};

const Layout: React.FC = () => {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

export default Layout;
