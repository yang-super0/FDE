import { Button } from '@client/src/components/ui/button';
import type { HrEmployee } from '@shared/api.interface';
import type { HrEmployeeFlowPending } from './EmployeeFlowDialogs';

export type HrEmployeeDirectAction = 'leave-confirm' | 'delete';

const DIRECT_ACTION_TEXT: Record<HrEmployeeDirectAction, string> = {
  'leave-confirm': '离职确认',
  delete: '删除',
};

export { DIRECT_ACTION_TEXT };

function ActionLink({ danger, onClick, children }: {
  danger?: boolean; onClick: () => void; children: string;
}) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick}
      className={`h-auto px-1 text-xs ${danger ? 'text-destructive' : 'text-primary'}`}>
      {children}
    </Button>
  );
}

interface EmployeeActionsCellProps {
  record: HrEmployee;
  onViewDetail: (item: HrEmployee) => void;
  onEdit: (item: HrEmployee) => void;
  onFlow: (pending: HrEmployeeFlowPending) => void;
  onDirect: (item: HrEmployee, action: HrEmployeeDirectAction) => void;
}

export function EmployeeActionsCell({
  record, onViewDetail, onEdit, onFlow, onDirect,
}: EmployeeActionsCellProps) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <ActionLink onClick={() => onViewDetail(record)}>详情</ActionLink>
      <ActionLink onClick={() => onEdit(record)}>编辑</ActionLink>
      {record.status === '试用期' ? (
        <ActionLink onClick={() => onFlow({ item: record, action: 'regular' })}>
          转正
        </ActionLink>
      ) : null}
      {record.status === '试用期' || record.status === '正式' ? (
        <>
          <ActionLink onClick={() => onFlow({ item: record, action: 'transfer-apply' })}>
            调岗申请
          </ActionLink>
          <ActionLink danger onClick={() => onFlow({ item: record, action: 'leave-apply' })}>
            离职申请
          </ActionLink>
        </>
      ) : null}
      {record.status === '调岗中' ? (
        <ActionLink onClick={() => onFlow({ item: record, action: 'transfer-confirm' })}>
          调岗确认
        </ActionLink>
      ) : null}
      {record.status === '离职中' ? (
        <ActionLink danger onClick={() => onDirect(record, 'leave-confirm')}>
          离职确认
        </ActionLink>
      ) : null}
      <ActionLink danger onClick={() => onDirect(record, 'delete')}>删除</ActionLink>
    </div>
  );
}
