import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/src/components/ui/tabs';
import { CustomReportsPanel } from './custom/CustomReportsPanel';
import { TemplatesPanel } from './templates/TemplatesPanel';
import { SchedulesPanel } from './schedules/SchedulesPanel';
import { DrilldownPanel } from './drilldown/DrilldownPanel';

const TAB_ITEMS: { value: string; label: string }[] = [
  { value: 'custom', label: '自定义报表' },
  { value: 'templates', label: '报表模板' },
  { value: 'schedules', label: '定时推送' },
  { value: 'drilldown', label: '数据下钻' },
];

const ReportCenter: React.FC = () => {
  return (
    <div className="mx-auto max-w-[1280px] space-y-8 px-8 py-8">
      <header>
        <div className="text-[11px] font-black uppercase tracking-[0.15em] text-primary mb-1">
          01. REPORT CENTER
        </div>
        <h1 className="text-3xl font-black text-foreground">报表中心</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          自定义报表搭建、模板复用、定时推送与逐层数据下钻分析
        </p>
      </header>
      <Tabs defaultValue="custom">
        <TabsList className="rounded-none bg-white p-1 shadow-md">
          {TAB_ITEMS.map((tab: { value: string; label: string }) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="custom" className="space-y-8">
          <CustomReportsPanel />
        </TabsContent>
        <TabsContent value="templates" className="space-y-8">
          <TemplatesPanel />
        </TabsContent>
        <TabsContent value="schedules" className="space-y-8">
          <SchedulesPanel />
        </TabsContent>
        <TabsContent value="drilldown" className="space-y-8">
          <DrilldownPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportCenter;
