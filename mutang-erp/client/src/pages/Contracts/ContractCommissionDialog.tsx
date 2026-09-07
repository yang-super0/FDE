import { useEffect, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import type { ContractDetail } from '@shared/api.interface';
import { Button } from '@client/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import { applyContractCommission } from '@client/src/api/contract-enhance';
import { formatAmount } from './contract-ui';

interface ContractCommissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: ContractDetail;
  onApplied: () => void;
}

function toErrorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function defaultRate(contractType: string): number {
  if (contractType.includes('广告')) return 5;
  if (contractType.includes('视频')) return 10;
  return 5;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

const toNum = (v: number | string | null | undefined): number =>
  typeof v === 'number' ? v : Number(v) || 0;

const ContractCommissionDialog = ({
  open,
  onOpenChange,
  contract,
  onApplied,
}: ContractCommissionDialogProps) => {
  const [rate, setRate] = useState<string>('5');
  const [amount, setAmount] = useState<string>('0');
  const [remark, setRemark] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);

  const rateNumber: number = Number(rate);
  const computedAmount: number = Number.isFinite(rateNumber)
    ? round2((toNum(contract.amount) * rateNumber) / 100)
    : 0;

  useEffect(() => {
    if (!open) return;
    const initialRate: number = defaultRate(contract.contractType);
    setRate(String(initialRate));
    setAmount(formatAmount(round2((toNum(contract.amount) * initialRate) / 100)));
    setRemark('');
    setConfirmOpen(false);
  }, [open, contract]);

  const handleRateChange = (value: string) => {
    setRate(value);
    const parsed: number = Number(value);
    if (Number.isFinite(parsed)) {
      setAmount(formatAmount(round2((toNum(contract.amount) * parsed) / 100)));
    }
  };

  const handleAmountBlur = () => {
    const parsed: number = Number(amount);
    if (!Number.isFinite(parsed)) {
      setAmount(formatAmount(computedAmount));
      return;
    }
    if (Math.abs(parsed - computedAmount) > 0.005) {
      setConfirmOpen(true);
    }
  };

  const handleSubmit = async () => {
    if (!Number.isFinite(rateNumber) || rateNumber <= 0) {
      toast.error('请输入有效的提成比例');
      return;
    }
    const amountNumber: number = Number(amount);
    if (!Number.isFinite(amountNumber) || amountNumber < 0) {
      toast.error('请输入有效的提成金额');
      return;
    }
    setSubmitting(true);
    try {
      await applyContractCommission(contract.id, {
        commissionRate: rateNumber,
        commissionAmount: amountNumber,
        remark: remark.trim() || undefined,
      });
      toast.success('提成申请已提交');
      onOpenChange(false);
      onApplied();
    } catch (error: unknown) {
      logger.error(`提交提成申请失败: ${toErrorText(error)}`);
      toast.error(`提交提成申请失败：${toErrorText(error)}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>申请提成</DialogTitle>
          <DialogDescription>
            提交后进入待审批状态，审批通过后生效
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                合同编号
              </div>
              <div className="break-words font-mono text-sm font-medium">
                {contract.code}
              </div>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                合同名称（客户）
              </div>
              <div className="break-words text-sm font-medium">
                {contract.customerName}
              </div>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                合同金额（元）
              </div>
              <div className="font-mono text-sm font-medium">
                {formatAmount(toNum(contract.amount))}
              </div>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                客户
              </div>
              <div className="break-words text-sm font-medium">
                {contract.customerName}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="min-w-[180px] flex-1">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                提成比例（%）<span className="text-destructive">*</span>
              </div>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={rate}
                onChange={(event) => handleRateChange(event.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                按合同类型「{contract.contractType}」默认比例已预填
              </p>
            </div>
            <div className="min-w-[180px] flex-1">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                提成金额（元）<span className="text-destructive">*</span>
              </div>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                onBlur={handleAmountBlur}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                计算值：合同金额 × 比例 / 100 ={' '}
                {formatAmount(computedAmount)} 元
              </p>
            </div>
          </div>
          <div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
              申请说明（选填）
            </div>
            <Textarea
              placeholder="请输入申请说明"
              rows={3}
              value={remark}
              onChange={(event) => setRemark(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            disabled={submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? '提交中...' : '提交申请'}
          </Button>
        </DialogFooter>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="rounded-none sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle>提成金额与计算值不一致</DialogTitle>
              <DialogDescription>
                手填金额 {formatAmount(Number(amount) || 0)} 元，计算值{' '}
                {formatAmount(computedAmount)} 元，是否采用手填值？
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setAmount(formatAmount(computedAmount));
                  setConfirmOpen(false);
                }}
              >
                使用计算值
              </Button>
              <Button onClick={() => setConfirmOpen(false)}>
                采用手填值
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

export { ContractCommissionDialog };
