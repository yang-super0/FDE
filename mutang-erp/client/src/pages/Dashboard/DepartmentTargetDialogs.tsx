import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import type {
  CreateDepartmentTargetRequest,
  DepartmentTarget,
  UpdateDepartmentTargetRequest,
} from '@shared/api.interface';
import {
  createDepartmentTarget,
  updateDepartmentTarget,
} from '@client/src/api/workbench-enhance';
import { toPerformanceErrorText } from '@client/src/pages/Dashboard/PerformanceTaskDialogs';

const TARGET_TYPE_OPTIONS: string[] = ['月度', '年度'];

function FormField({ label, required, children }: {
  label: string; required?: boolean; children: ReactNode;
}): ReactNode {
  return (
    <div className="w-[calc(50%-8px)] min-w-[220px] space-y-1.5">
      <label className="text-sm font-medium">
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </label>
      {children}
    </div>
  );
}

interface DepartmentTargetFormDialogProps {
  open: boolean;
  editing: DepartmentTarget | null;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

export function DepartmentTargetFormDialog({
  open, editing, onSaved, onOpenChange,
}: DepartmentTargetFormDialogProps): ReactNode {
  const [targetType, setTargetType] = useState<string>('月度');
  const [year, setYear] = useState<string>('2026');
  const [month, setMonth] = useState<string>('1');
  const [department, setDepartment] = useState<string>('');
  const [targetConsumption, setTargetConsumption] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTargetType(editing.targetType);
      setYear(String(editing.year));
      setMonth(String(editing.month));
      setDepartment(editing.department);
      setTargetConsumption(String(editing.targetConsumption));
    } else {
      setTargetType('月度');
      setYear('2026');
      setMonth('1');
      setDepartment('');
      setTargetConsumption('');
    }
  }, [open, editing]);

  const handleSubmit = async (): Promise<void> => {
    if (!department.trim()) {
      toast.error('请填写部门名称');
      return;
    }
    const amount: number = Number(targetConsumption);
    if (targetConsumption === '' || !Number.isFinite(amount) || amount <= 0 || amount >= 100000000) {
      toast.error('目标值必须是 0 到 1 亿之间的正数');
      return;
    }
    setSubmitting(true);
    try {
      const payload: CreateDepartmentTargetRequest = {
        year: Number(year),
        month: targetType === '月度' ? Number(month) : undefined,
        targetType,
        department: department.trim(),
        targetConsumption: amount,
      };
      if (editing) {
        const patch: UpdateDepartmentTargetRequest = {
          year: payload.year,
          month: payload.month,
          targetType: payload.targetType,
          department: payload.department,
          targetConsumption: payload.targetConsumption,
        };
        await updateDepartmentTarget(editing.id, patch);
        toast.success('目标已更新');
      } else {
        await createDepartmentTarget(payload);
        toast.success('目标已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(toPerformanceErrorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑部门目标' : '新建部门目标'}</DialogTitle>
          <DialogDescription>完成值与完成率由消耗汇总自动计算</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-4">
          <FormField label="目标类型" required>
            <Select value={targetType} onValueChange={setTargetType}>
              <SelectTrigger className="rounded-none w-full"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-none">
                {TARGET_TYPE_OPTIONS.map((item: string): ReactNode => (
                  <SelectItem key={item} value={item}>{item}目标</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="年份" required>
            <Input value={year} onChange={(e) => setYear(e.target.value)} type="number" className="rounded-none" />
          </FormField>
          {targetType === '月度' ? (
            <FormField label="月份" required>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="rounded-none w-full"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-none">
                  {Array.from({ length: 12 }, (_: unknown, i: number): ReactNode => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{i + 1} 月</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          ) : null}
          <FormField label="部门" required>
            <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="如：销售部" className="rounded-none" />
          </FormField>
          <FormField label="目标值（元）" required>
            <Input value={targetConsumption} onChange={(e) => setTargetConsumption(e.target.value)} type="number" className="rounded-none" />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-none" onClick={(): void => onOpenChange(false)}>取消</Button>
          <Button className="rounded-none" disabled={submitting} onClick={(): Promise<void> => handleSubmit()}>
            {submitting ? '提交中…' : editing ? '保存' : '创建'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
