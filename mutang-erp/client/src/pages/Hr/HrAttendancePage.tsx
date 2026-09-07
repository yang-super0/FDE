import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { AttendanceTab } from './attendance/AttendanceTab';

export default function HrAttendancePage() {
  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8 px-8 py-8">
      <ReportCard>
        <SectionHeader
          no="10"
          label="ATTENDANCE"
          subtitle="出勤 / 打卡 / 请假审批 / 加班登记"
        />
        <AttendanceTab />
      </ReportCard>
    </div>
  );
}
