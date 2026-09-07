import type { ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/src/components/ui/tabs';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { PurchaseRequestsTab } from './procurement/PurchaseRequestsTab';
import { PurchaseOrdersTab } from './procurement/PurchaseOrdersTab';
import { PurchaseDetailsTab } from './procurement/PurchaseDetailsTab';

interface ProcurementTabDef {
  value: string;
  label: string;
  node: ReactNode;
}

const PROCUREMENT_TABS: ProcurementTabDef[] = [
  { value: 'requests', label: '采购申请', node: <PurchaseRequestsTab /> },
  { value: 'orders', label: '采购订单', node: <PurchaseOrdersTab /> },
  { value: 'details', label: '采购明细', node: <PurchaseDetailsTab /> },
];

const AdminProcurementPage: React.FC = () => {
  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8 px-8 py-8">
      <ReportCard>
        <SectionHeader
          no="11"
          label="PROCUREMENT"
          subtitle="采购申请 / 采购订单 / 采购明细 / 收货入库"
        />
        <Tabs defaultValue="requests">
          <TabsList className="mb-6 flex flex-wrap justify-start gap-1 rounded-none">
            {PROCUREMENT_TABS.map((tab: ProcurementTabDef) => (
              <TabsTrigger key={tab.value} value={tab.value} className="rounded-none">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {PROCUREMENT_TABS.map((tab: ProcurementTabDef) => (
            <TabsContent key={tab.value} value={tab.value}>
              {tab.node}
            </TabsContent>
          ))}
        </Tabs>
      </ReportCard>
    </div>
  );
};

export default AdminProcurementPage;
