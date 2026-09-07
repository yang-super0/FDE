import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { Skeleton } from '@client/src/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@client/src/components/ui/dialog';
import type { HrEmployee } from '@shared/api.interface';
import { fetchHrEmployee } from '@client/src/api/hr-enhance/staff';
import { HrStatusBadge, toHrErrorText } from '../hr-enhance-constants';

interface EmployeeDetailDialogProps {
  open: boolean;
  employee: HrEmployee | null;
  onOpenChange: (open: boolean) => void;
}

interface DetailField {
  label: string;
  value: string;
}

const buildFields = (employee: HrEmployee): DetailField[] => [
  { label: '员工编号', value: employee.employeeNo },
  { label: '姓名', value: employee.name },
  { label: '性别', value: employee.gender || '—' },
  { label: '手机号', value: employee.phone || '—' },
  { label: '邮箱', value: employee.email || '—' },
  { label: '身份证号', value: employee.idCard || '—' },
  { label: '部门', value: employee.department || '—' },
  { label: '岗位', value: employee.position || '—' },
  { label: '职级', value: employee.level || '—' },
  { label: '入职日期', value: employee.entryDate ? dayjs(employee.entryDate).format('YYYY-MM-DD') : '—' },
  { label: '转正日期', value: employee.regularDate ? dayjs(employee.regularDate).format('YYYY-MM-DD') : '—' },
  { label: '离职日期', value: employee.leaveDate ? dayjs(employee.leaveDate).format('YYYY-MM-DD') : '—' },
  { label: '离职原因', value: employee.leaveReason || '—' },
  { label: '紧急联系人', value: employee.emergencyContact || '—' },
  { label: '紧急联系电话', value: employee.emergencyPhone || '—' },
  { label: '开户银行', value: employee.bankName || '—' },
  { label: '银行账号', value: employee.bankAccount || '—' },
  { label: '备注', value: employee.remark || '—' },
  {
    label: '创建时间',
    value: employee.createdAt ? dayjs(employee.createdAt).format('YYYY-MM-DD HH:mm:ss') : '—',
  },
  {
    label: '更新时间',
    value: employee.updatedAt ? dayjs(employee.updatedAt).format('YYYY-MM-DD HH:mm:ss') : '—',
  },
];

export function EmployeeDetailDialog({
  open, employee, onOpenChange,
}: EmployeeDetailDialogProps) {
  const [detail, setDetail] = useState<HrEmployee | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!open || !employee) return;
    let cancelled: boolean = false;
    setLoading(true);
    fetchHrEmployee(employee.id)
      .then((result: HrEmployee) => {
        if (!cancelled) setDetail(result);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          toast.error(toHrErrorText(error));
          setDetail(employee);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [open, employee]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>员工档案详情</DialogTitle>
          <DialogDescription>
            {employee ? `${employee.employeeNo} · ${employee.name} · ${employee.department}` : ''}
          </DialogDescription>
        </DialogHeader>
        {loading && !detail ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[0, 1, 2, 3, 4, 5].map((item: number) => (
              <Skeleton key={item} className="h-10 rounded-none" />
            ))}
          </div>
        ) : detail ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 border border-border p-3">
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                当前状态
              </span>
              <HrStatusBadge status={detail.status} />
            </div>
            <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
              {buildFields(detail).map((field: DetailField) => (
                <div key={field.label} className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-1.5">
                  <span className="shrink-0 text-xs font-bold text-muted-foreground">
                    {field.label}
                  </span>
                  <span className="break-words text-right text-sm font-medium">
                    {field.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-sm text-muted-foreground">暂无数据</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
