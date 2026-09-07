import type { ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/src/components/ui/tabs';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { InboundsTab } from './warehouse/InboundsTab';
import { RequisitionsTab } from './warehouse/RequisitionsTab';
import { ReturnsTab } from './warehouse/ReturnsTab';
import { InventoryChecksTab } from './warehouse/InventoryChecksTab';

interface WarehouseTabDef {
  value: string;
  label: string;
  node: ReactNode;
}

const WAREHOUSE_TABS: WarehouseTabDef[] = [
  { value: 'inbounds', label: '入库管理', node: <InboundsTab /> },
  { value: 'requisitions', label: '领用管理', node: <RequisitionsTab /> },
  { value: 'returns', label: '归还管理', node: <ReturnsTab /> },
  { value: 'checks', label: '盘点管理', node: <InventoryChecksTab /> },
];

export default function AdminWarehousePage() {
  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8 px-8 py-8">
      <ReportCard>
        <SectionHeader
          no="13"
          label="WAREHOUSE"
          subtitle="入库登记 / 领用归还 / 库存盘点"
        />
        <Tabs defaultValue="inbounds">
          <TabsList className="mb-6 flex flex-wrap justify-start gap-1 rounded-none">
            {WAREHOUSE_TABS.map((tab: WarehouseTabDef) => (
              <TabsTrigger key={tab.value} value={tab.value} className="rounded-none">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {WAREHOUSE_TABS.map((tab: WarehouseTabDef) => (
            <TabsContent key={tab.value} value={tab.value}>
              {tab.node}
            </TabsContent>
          ))}
        </Tabs>
      </ReportCard>
    </div>
  );
}
