import type { ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/src/components/ui/tabs';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { AssetsTab } from './asset-inventory/AssetsTab';
import { InventoryTab } from './asset-inventory/InventoryTab';

interface AssetInventoryTabDef {
  value: string;
  label: string;
  node: ReactNode;
}

const ASSET_INVENTORY_TABS: AssetInventoryTabDef[] = [
  { value: 'assets', label: '资产管理', node: <AssetsTab /> },
  { value: 'inventory', label: '库存管理', node: <InventoryTab /> },
];

export default function AdminAssetInventoryPage() {
  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8 px-8 py-8">
      <ReportCard>
        <SectionHeader
          no="12"
          label="ASSETS & INVENTORY"
          subtitle="固定资产台账 / 折旧盘点 / 物资库存预警"
        />
        <Tabs defaultValue="assets">
          <TabsList className="mb-6 flex flex-wrap justify-start gap-1 rounded-none">
            {ASSET_INVENTORY_TABS.map((tab: AssetInventoryTabDef) => (
              <TabsTrigger key={tab.value} value={tab.value} className="rounded-none">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {ASSET_INVENTORY_TABS.map((tab: AssetInventoryTabDef) => (
            <TabsContent key={tab.value} value={tab.value}>
              {tab.node}
            </TabsContent>
          ))}
        </Tabs>
      </ReportCard>
    </div>
  );
}
