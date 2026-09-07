import type { ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/src/components/ui/tabs';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { SalariesTab } from './compensation/SalariesTab';
import { PerformancesTab } from './compensation/PerformancesTab';

interface CompensationTabDef {
  value: string;
  label: string;
  node: ReactNode;
}

const COMPENSATION_TABS: CompensationTabDef[] = [
  { value: 'salaries', label: '工资管理', node: <SalariesTab /> },
  { value: 'performances', label: '绩效管理', node: <PerformancesTab /> },
];

export default function HrCompensationPage() {
  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8 px-8 py-8">
      <ReportCard>
        <SectionHeader
          no="09"
          label="COMPENSATION"
          subtitle="工资核算 / 工资条 / 绩效考核"
        />
        <Tabs defaultValue="salaries">
          <TabsList className="mb-6 flex flex-wrap justify-start gap-1 rounded-none">
            {COMPENSATION_TABS.map((tab: CompensationTabDef) => (
              <TabsTrigger key={tab.value} value={tab.value} className="rounded-none">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {COMPENSATION_TABS.map((tab: CompensationTabDef) => (
            <TabsContent key={tab.value} value={tab.value}>
              {tab.node}
            </TabsContent>
          ))}
        </Tabs>
      </ReportCard>
    </div>
  );
}
