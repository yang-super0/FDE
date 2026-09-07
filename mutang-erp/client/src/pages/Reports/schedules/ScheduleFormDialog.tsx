import type { ScheduledReportRecord } from '@shared/api.interface';
import ScheduleFormDialogBase from '../scheduled/ScheduleFormDialog';

interface ScheduleFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  initial?: ScheduledReportRecord;
}

/**
 * schedules 面板侧的表单弹窗适配器：
 * 复用 scheduled/ScheduleFormDialog（default export），把 onClose 适配为 onOpenChange(false)。
 */
const ScheduleFormDialog: React.FC<ScheduleFormDialogProps> = ({
  open,
  onClose,
  onSaved,
  initial,
}) => (
  <ScheduleFormDialogBase
    open={open}
    initial={initial ?? null}
    onOpenChange={(next: boolean) => {
      if (!next) onClose();
    }}
    onSaved={() => {
      if (onSaved) onSaved();
    }}
  />
);

export { ScheduleFormDialog };
