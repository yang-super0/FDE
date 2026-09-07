import { useState } from 'react';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { cn } from '@client/src/lib/utils';
import { RebatesTab } from './rebates/RebatesTab';
import { DeductionsTab } from './rebates/DeductionsTab';
import { ConsumptionsTab } from './rebates/ConsumptionsTab';

type RebateTabKey = 'rebates' | 'deductions' | 'consumptions';

interface RebateTabItem {
  key: RebateTabKey;
  label: string;
}

const REBATE_TAB_ITEMS: RebateTabItem[] = [
  { key: 'rebates', label: '后返管理' },
  { key: 'deductions', label: '扣减管理' },
  { key: 'consumptions', label: '消耗管理' },
];

export default function FinanceRebatesPage() {
  const [tab, setTab] = useState<RebateTabKey>('rebates');

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8 px-8 py-8">
      <ReportCard>
        <SectionHeader no="01" label="REBATES" subtitle="后返核算 / 扣减审批 / 消耗核对" />
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          {REBATE_TAB_ITEMS.map((item: RebateTabItem) => (
            <button
              key={item.key}
              type="button"
              className={cn(
                'rounded-none border px-4 py-1.5 text-sm font-semibold transition-colors',
                tab === item.key
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-accent',
              )}
              onClick={() => setTab(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </ReportCard>
      {tab === 'rebates' ? <RebatesTab /> : null}
      {tab === 'deductions' ? <DeductionsTab /> : null}
      {tab === 'consumptions' ? <ConsumptionsTab /> : null}
    </div>
  );
}
