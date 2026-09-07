import { useEffect, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import type { Contract, ContractRemindType } from '@shared/api.interface';
import { Button } from '@client/src/components/ui/button';
import { Checkbox } from '@client/src/components/ui/checkbox';
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
import { remindContract } from '@client/src/api/contract-enhance';

const REMIND_TYPE_OPTIONS: ContractRemindType[] = [
  '合同到期提醒',
  '待审批提醒',
  '付款到期提醒',
];

const REMIND_TARGET_OPTIONS: string[] = ['负责人', '部门', '全员'];

interface ContractRemindDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contracts: Contract[];
  onDone: () => void;
}

function toErrorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const ContractRemindDialog = ({
  open,
  onOpenChange,
  contracts,
  onDone,
}: ContractRemindDialogProps) => {
  const [remindType, setRemindType] = useState<ContractRemindType>(
    '合同到期提醒',
  );
  const [targets, setTargets] = useState<string[]>(['负责人']);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    setRemindType('合同到期提醒');
    setTargets(['负责人']);
  }, [open]);

  const toggleTarget = (target: string, checked: boolean) => {
    setTargets((prev: string[]) =>
      checked
        ? prev.includes(target)
          ? prev
          : [...prev, target]
        : prev.filter((item: string) => item !== target),
    );
  };

  const handleConfirm = async () => {
    if (targets.length === 0) {
      toast.error('请至少选择一个提醒对象');
      return;
    }
    setSubmitting(true);
    let successCount: number = 0;
    for (const contract of contracts) {
      try {
        await remindContract(contract.id, { remindType, targets });
        successCount += 1;
        toast.success(`「${contract.code}」提醒已发送`);
      } catch (error: unknown) {
        logger.error(`发送提醒失败: ${toErrorText(error)}`);
        toast.error(`「${contract.code}」${toErrorText(error)}`);
      }
    }
    setSubmitting(false);
    if (successCount > 0) onDone();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>一键提醒</DialogTitle>
          <DialogDescription>
            {contracts.length === 1
              ? `向合同「${contracts[0]?.code ?? ''}」发送提醒`
              : `向选中的 ${contracts.length} 份合同批量发送提醒`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
              提醒类型
            </div>
            <Select
              value={remindType}
              onValueChange={(value: string) => {
                setRemindType(value as ContractRemindType);
              }}
            >
              <SelectTrigger className="w-full rounded-none">
                <SelectValue placeholder="请选择提醒类型" />
              </SelectTrigger>
              <SelectContent>
                {REMIND_TYPE_OPTIONS.map((option: ContractRemindType) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
              提醒对象（多选）
            </div>
            <div className="flex flex-wrap gap-5">
              {REMIND_TARGET_OPTIONS.map((option: string) => (
                <label
                  key={option}
                  className="flex cursor-pointer items-center gap-2 text-sm font-medium"
                >
                  <Checkbox
                    checked={targets.includes(option)}
                    onCheckedChange={(checked: boolean | 'indeterminate') => {
                      toggleTarget(option, checked === true);
                    }}
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>
          <div className="border border-border bg-accent p-4">
            <div className="mb-1 text-[10px] font-black uppercase tracking-[0.15em] text-primary">
              将发送的内容
            </div>
            <p className="break-words text-sm text-foreground">
              将向{' '}
              {contracts.length === 1
                ? `「${contracts[0]?.code ?? ''}」`
                : `选中的 ${contracts.length} 份合同`}{' '}
              的{targets.join('、') || '（未选择）'}发送「{remindType}
              」，请及时跟进处理。
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            disabled={submitting || contracts.length === 0}
            onClick={() => void handleConfirm()}
          >
            {submitting ? '发送中...' : '确认发送'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { ContractRemindDialog };
