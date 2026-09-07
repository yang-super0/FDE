import type { ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/src/components/ui/tabs';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { CustomerDetailsTab } from './funds/CustomerDetailsTab';
import { RechargesTab } from './funds/RechargesTab';
import { RefundsTab } from './funds/RefundsTab';
import { CoinReturnsTab } from './funds/CoinReturnsTab';
import { PortsTab } from './funds/PortsTab';
import { BankAccountsTab } from './funds/BankAccountsTab';

interface FundsTabDef {
  value: string;
  label: string;
  node: ReactNode;
}

const FUNDS_TABS: FundsTabDef[] = [
  { value: 'details', label: '客户明细', node: <CustomerDetailsTab /> },
  { value: 'recharges', label: '充值管理', node: <RechargesTab /> },
  { value: 'refunds', label: '退款管理', node: <RefundsTab /> },
  { value: 'coin-returns', label: '退币管理', node: <CoinReturnsTab /> },
  { value: 'ports', label: '端口管理', node: <PortsTab /> },
  { value: 'bank-accounts', label: '银行账户', node: <BankAccountsTab /> },
];

export default function FinanceFundsPage() {
  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8 px-8 py-8">
      <ReportCard>
        <SectionHeader
          no="04"
          label="FUNDS"
          subtitle="资金账户 / 客户明细 / 充值 / 退款 / 退币 / 端口 / 银行账户"
        />
        <Tabs defaultValue="details">
          <TabsList className="mb-6 flex flex-wrap justify-start gap-1 rounded-none">
            {FUNDS_TABS.map((tab: FundsTabDef) => (
              <TabsTrigger key={tab.value} value={tab.value} className="rounded-none">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {FUNDS_TABS.map((tab: FundsTabDef) => (
            <TabsContent key={tab.value} value={tab.value}>
              {tab.node}
            </TabsContent>
          ))}
        </Tabs>
      </ReportCard>
    </div>
  );
}
