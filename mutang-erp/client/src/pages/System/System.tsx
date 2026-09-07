import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/src/components/ui/tabs';
import { SectionHeader } from '@client/src/components/blueprint';
import SettingsPanel from './settings/SettingsPanel';
import OrgPanel from './org/OrgPanel';
import CustomerAccountsPanel from './customer-accounts/CustomerAccountsPanel';
import RolesPanel from './roles/RolesPanel';
import { SystemUserSection } from './SystemUserSection';
import OperationLogsPanel from './operation-logs/OperationLogsPanel';
import LoginLogsPanel from './login-logs/LoginLogsPanel';
import FieldPermissionsPanel from './roles/FieldPermissionsPanel';
import DataSyncPanel from './data-sync/DataSyncPanel';

const TAB_ITEMS: { value: string; label: string }[] = [
  { value: 'settings', label: '系统设置' },
  { value: 'org', label: '组织架构' },
  { value: 'accounts', label: '客户账户' },
  { value: 'users', label: '用户管理' },
  { value: 'roles', label: '角色权限' },
  { value: 'operation-logs', label: '操作日志' },
  { value: 'login-logs', label: '登录日志' },
  { value: 'field-permissions', label: '字段权限' },
  { value: 'data-sync', label: '数据同步' },
];

const System = () => (
  <div className="mx-auto max-w-[1280px] space-y-8 px-8 py-8">
    <SectionHeader
      no="01"
      label="SYSTEM ADMINISTRATION"
      subtitle="系统管理 / 深度功能增强"
    />
    <Tabs defaultValue="settings">
      <TabsList className="rounded-none bg-white p-1 shadow-md">
        {TAB_ITEMS.map((tab: { value: string; label: string }) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="rounded-none data-[state=active]:bg-[#0033A0] data-[state=active]:text-white"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="settings">
        <SettingsPanel />
      </TabsContent>
      <TabsContent value="org">
        <OrgPanel />
      </TabsContent>
      <TabsContent value="accounts">
        <CustomerAccountsPanel />
      </TabsContent>
      <TabsContent value="users">
        <SystemUserSection />
      </TabsContent>
      <TabsContent value="roles">
        <RolesPanel />
      </TabsContent>
      <TabsContent value="operation-logs">
        <OperationLogsPanel />
      </TabsContent>
      <TabsContent value="login-logs">
        <LoginLogsPanel />
      </TabsContent>
      <TabsContent value="field-permissions">
        <FieldPermissionsPanel />
      </TabsContent>
      <TabsContent value="data-sync">
        <DataSyncPanel />
      </TabsContent>
    </Tabs>
  </div>
);

export default System;
