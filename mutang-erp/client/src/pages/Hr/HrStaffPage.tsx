import type { ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/src/components/ui/tabs';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { EmployeesTab } from './staff/EmployeesTab';
import { HrDashboardTab } from './staff/HrDashboardTab';

interface StaffTabDef {
  value: string;
  label: string;
  node: ReactNode;
}

const STAFF_TABS: StaffTabDef[] = [
  { value: 'employees', label: '员工管理', node: <EmployeesTab /> },
  { value: 'dashboard', label: '人资看板', node: <HrDashboardTab /> },
];

export default function HrStaffPage() {
  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8 px-8 py-8">
      <ReportCard>
        <SectionHeader
          no="08"
          label="STAFF"
          subtitle="员工档案 / 入职转正调岗离职 / 人资看板"
        />
        <Tabs defaultValue="employees">
          <TabsList className="mb-6 flex flex-wrap justify-start gap-1 rounded-none">
            {STAFF_TABS.map((tab: StaffTabDef) => (
              <TabsTrigger key={tab.value} value={tab.value} className="rounded-none">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {STAFF_TABS.map((tab: StaffTabDef) => (
            <TabsContent key={tab.value} value={tab.value}>
              {tab.node}
            </TabsContent>
          ))}
        </Tabs>
      </ReportCard>
    </div>
  );
}
