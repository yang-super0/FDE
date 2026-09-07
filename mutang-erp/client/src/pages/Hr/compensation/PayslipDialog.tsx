import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@client/src/components/ui/dialog';
import type { HrSalary, HrSalaryPayslip } from '@shared/api.interface';
import { fetchHrSalaryPayslip } from '@client/src/api/hr-enhance/compensation';
import { HrStatusBadge, formatHrAmount } from '../hr-enhance-constants';
import { reportCompError } from './compensation-shared';

interface PayslipDialogProps {
  open: boolean;
  salary: HrSalary | null;
  onOpenChange: (open: boolean) => void;
}

const PAYSLIP_INFO_CLASS: string = 'text-sm text-muted-foreground';
const PAYSLIP_VALUE_CLASS: string = 'text-sm font-medium';

export function PayslipDialog({ open, salary, onOpenChange }: PayslipDialogProps) {
  const [payslip, setPayslip] = useState<HrSalaryPayslip | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!open || !salary) {
      setPayslip(null);
      return;
    }
    let cancelled: boolean = false;
    setLoading(true);
    setPayslip(null);
    fetchHrSalaryPayslip(salary.id)
      .then((result: HrSalaryPayslip) => {
        if (!cancelled) setPayslip(result);
      })
      .catch((error: unknown) => {
        if (!cancelled) reportCompError('加载工资条失败', error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, salary]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-none">
        <DialogHeader>
          <DialogTitle>工资条 · {salary?.salaryNo ?? ''}</DialogTitle>
          <DialogDescription>工资明细构成与实发金额</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">加载中...</div>
        ) : payslip ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 border-b border-border pb-3 md:grid-cols-3">
              <div>
                <div className={PAYSLIP_INFO_CLASS}>员工</div>
                <div className={PAYSLIP_VALUE_CLASS}>{payslip.salary.employeeName}</div>
              </div>
              <div>
                <div className={PAYSLIP_INFO_CLASS}>部门</div>
                <div className={PAYSLIP_VALUE_CLASS}>{payslip.salary.department}</div>
              </div>
              <div>
                <div className={PAYSLIP_INFO_CLASS}>月份</div>
                <div className={PAYSLIP_VALUE_CLASS}>{payslip.salary.salaryMonth}</div>
              </div>
              <div>
                <div className={PAYSLIP_INFO_CLASS}>岗位</div>
                <div className={PAYSLIP_VALUE_CLASS}>{payslip.salary.position || '—'}</div>
              </div>
              <div>
                <div className={PAYSLIP_INFO_CLASS}>状态</div>
                <HrStatusBadge status={payslip.salary.status} />
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-1.5 font-medium">项目</th>
                  <th className="py-1.5 text-right font-medium">金额</th>
                </tr>
              </thead>
              <tbody>
                {payslip.breakdown.map((row: { label: string; amount: string }) => (
                  <tr key={row.label} className="border-b border-border/60">
                    <td className="py-1.5">{row.label}</td>
                    <td className="py-1.5 text-right font-mono">{formatHrAmount(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t-[3px] border-primary bg-[#EFF6FF] px-4 py-3">
              <span className="text-sm font-bold">实发工资</span>
              <span className="font-mono text-xl font-black text-primary">
                {formatHrAmount(payslip.salary.actualSalary)}
              </span>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">暂无数据</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
