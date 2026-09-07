import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@client/src/components/ui/tabs';
import { SectionHeader } from '@client/src/components/blueprint';
import { AdvancesTab } from './advances/AdvancesTab';
import { IncentivesTab } from './advances/IncentivesTab';

export default function FinanceAdvancesPage() {
  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8 px-8 py-8">
      <SectionHeader
        no="04"
        label="ADVANCES & INCENTIVES"
        subtitle="垫款管理 · 收回登记 · 坏账登记 · 激励审批与发放"
      />
      <Tabs defaultValue="advances">
        <TabsList className="rounded-none">
          <TabsTrigger value="advances" className="rounded-none">垫款管理</TabsTrigger>
          <TabsTrigger value="incentives" className="rounded-none">激励管理</TabsTrigger>
        </TabsList>
        <TabsContent value="advances">
          <AdvancesTab />
        </TabsContent>
        <TabsContent value="incentives">
          <IncentivesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
