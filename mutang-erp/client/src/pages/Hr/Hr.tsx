import { SectionHeader } from '@client/src/components/blueprint';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@client/src/components/ui/tabs';
import { AttendanceSection } from './AttendanceSection';
import { LeaveSection } from './LeaveSection';
import { OrgEmployeeSection } from './OrgEmployeeSection';

const Hr = () => {
  return (
    <div className="mx-auto max-w-[1280px] px-8 py-8">
      <SectionHeader
        no="01"
        label="HUMAN RESOURCES"
        subtitle="组织架构 · 员工档案 · 考勤看板 · 请假审批"
      />
      <Tabs defaultValue="org">
        <TabsList className="mb-6 rounded-none">
          <TabsTrigger value="org" className="rounded-none">
            员工与组织
          </TabsTrigger>
          <TabsTrigger value="attendance" className="rounded-none">
            考勤看板
          </TabsTrigger>
          <TabsTrigger value="leave" className="rounded-none">
            请假审批
          </TabsTrigger>
        </TabsList>
        <TabsContent value="org">
          <OrgEmployeeSection />
        </TabsContent>
        <TabsContent value="attendance">
          <AttendanceSection />
        </TabsContent>
        <TabsContent value="leave">
          <LeaveSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Hr;
