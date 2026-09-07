import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@client/src/components/ui/tabs';
import { SectionHeader } from '@client/src/components/blueprint';
import { IncomesTab } from './expenses/IncomesTab';
import { ExpensesTab } from './expenses/ExpensesTab';
import { FeesTab } from './expenses/FeesTab';
import { DepositsTab } from './expenses/DepositsTab';

export default function FinanceExpensesPage() {
  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8 px-8 py-8">
      <SectionHeader
        no="05"
        label="INCOME, EXPENSE & FEES"
        subtitle="收入管理 · 支出管理 · 费用报销 · 保证金与押金"
      />
      <Tabs defaultValue="incomes">
        <TabsList className="rounded-none">
          <TabsTrigger value="incomes" className="rounded-none">收入管理</TabsTrigger>
          <TabsTrigger value="expenses" className="rounded-none">支出管理</TabsTrigger>
          <TabsTrigger value="fees" className="rounded-none">费用报销</TabsTrigger>
          <TabsTrigger value="deposits" className="rounded-none">保证金押金</TabsTrigger>
        </TabsList>
        <TabsContent value="incomes">
          <IncomesTab />
        </TabsContent>
        <TabsContent value="expenses">
          <ExpensesTab />
        </TabsContent>
        <TabsContent value="fees">
          <FeesTab />
        </TabsContent>
        <TabsContent value="deposits">
          <DepositsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
