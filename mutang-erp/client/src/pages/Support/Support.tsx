import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/src/components/ui/tabs';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { TicketSummary } from '@shared/api.interface';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { getTicketSummary } from '@client/src/api/support';
import { SupportTicketPanel } from './SupportTicketPanel';
import { SupportKnowledgePanel } from './SupportKnowledgePanel';
import IndustryRoiPanel from './industry-roi/IndustryRoiPanel';
import CompetitorsPanel from './competitors/CompetitorsPanel';
import IndustryTrendsPanel from './trends/IndustryTrendsPanel';
import MaterialsPanel from './materials/MaterialsPanel';

interface StatCardProps {
  label: string;
  value: string;
  color: string;
}

const StatCard = ({ label, value, color }: StatCardProps) => (
  <ReportCard>
    <div className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-3">
      {label}
    </div>
    <div className="text-4xl font-black font-mono" style={{ color }}>
      {value}
    </div>
  </ReportCard>
);

const TAB_ITEMS: { value: string; label: string }[] = [
  { value: 'tickets', label: '工单与知识库' },
  { value: 'roi', label: '行业ROI基准' },
  { value: 'competitors', label: '竞品监控' },
  { value: 'trends', label: '行业大盘' },
  { value: 'materials', label: '素材库' },
];

const Support = () => {
  const [summary, setSummary] = useState<TicketSummary | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      const data = await getTicketSummary();
      setSummary(data);
    } catch (error) {
      logger.error('获取工单统计失败', error);
      toast.error('获取工单统计失败');
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const handleTicketChanged = useCallback(() => {
    void loadSummary();
  }, [loadSummary]);

  return (
    <div className="mx-auto max-w-[1280px] space-y-8 px-8 py-8">
      <SectionHeader
        no="01"
        label="BUSINESS SUPPORT"
        subtitle="业务支持 / 深度功能增强"
      />
      <Tabs defaultValue="tickets">
        <TabsList className="rounded-none bg-white p-1 shadow-md">
          {TAB_ITEMS.map((tab: { value: string; label: string }) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-none data-[state=active]:bg-[#0033A0] data-[state=active]:text-white"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="tickets" className="space-y-8">
          <div
            data-ai-section-type="card-stat"
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <StatCard
              label="PENDING · 待处理工单"
              value={summary ? String(summary.pendingCount) : '—'}
              color="#0033A0"
            />
            <StatCard
              label="RESOLVED · 本周已解决"
              value={summary ? String(summary.resolvedThisWeek) : '—'}
              color="#0066FF"
            />
            <StatCard
              label="AVG RESPONSE · 平均响应时长"
              value={summary ? `${summary.avgResponseHours} 小时` : '—'}
              color="#4D94FF"
            />
          </div>
          <section>
            <SectionHeader
              no="02"
              label="TICKET MANAGEMENT"
              subtitle="问题工单提交与处理跟踪"
            />
            <SupportTicketPanel onTicketChanged={handleTicketChanged} />
          </section>
          <section>
            <SectionHeader
              no="03"
              label="KNOWLEDGE BASE"
              subtitle="常见问题与操作指引"
            />
            <SupportKnowledgePanel />
          </section>
        </TabsContent>
        <TabsContent value="roi">
          <IndustryRoiPanel />
        </TabsContent>
        <TabsContent value="competitors">
          <CompetitorsPanel />
        </TabsContent>
        <TabsContent value="trends">
          <IndustryTrendsPanel />
        </TabsContent>
        <TabsContent value="materials">
          <MaterialsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Support;
