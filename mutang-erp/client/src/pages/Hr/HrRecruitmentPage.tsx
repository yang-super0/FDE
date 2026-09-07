import type { ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/src/components/ui/tabs';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { ResumesTab } from './recruitment/ResumesTab';
import { InvitationsTab } from './recruitment/InvitationsTab';
import { InterviewsTab } from './recruitment/InterviewsTab';
import { CheckinsTab } from './recruitment/CheckinsTab';
import { PlansTab } from './recruitment/PlansTab';

interface RecruitmentTabDef {
  value: string;
  label: string;
  node: ReactNode;
}

const RECRUITMENT_TABS: RecruitmentTabDef[] = [
  { value: 'resumes', label: '简历管理', node: <ResumesTab /> },
  { value: 'invitations', label: '邀约管理', node: <InvitationsTab /> },
  { value: 'interviews', label: '面试管理', node: <InterviewsTab /> },
  { value: 'checkins', label: '签到管理', node: <CheckinsTab /> },
  { value: 'plans', label: '招聘计划', node: <PlansTab /> },
];

export default function HrRecruitmentPage() {
  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8 px-8 py-8">
      <ReportCard>
        <SectionHeader
          no="07"
          label="RECRUITMENT"
          subtitle="简历 / 邀约 / 面试 / 签到 / 招聘计划"
        />
        <Tabs defaultValue="resumes">
          <TabsList className="mb-6 flex flex-wrap justify-start gap-1 rounded-none">
            {RECRUITMENT_TABS.map((tab: RecruitmentTabDef) => (
              <TabsTrigger key={tab.value} value={tab.value} className="rounded-none">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {RECRUITMENT_TABS.map((tab: RecruitmentTabDef) => (
            <TabsContent key={tab.value} value={tab.value}>
              {tab.node}
            </TabsContent>
          ))}
        </Tabs>
      </ReportCard>
    </div>
  );
}
