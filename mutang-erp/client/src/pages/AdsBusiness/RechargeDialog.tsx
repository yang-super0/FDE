import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { AdAccount } from '@shared/api.interface';
import { rechargeAdAccount } from '@client/src/api/ad-business';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Label } from '@client/src/components/ui/label';
import { AdsConfirmDialog } from './AdsConfirmDialog';
import { formatMoney, toErrorText } from './ads-constants';

interface RechargeDialogProps {
  account: AdAccount | null;
  onOpenChange: (open: boolean) => void;
  onRecharged: () => void;
}

export function RechargeDialog({
  account,
  onOpenChange,
  onRecharged,
}: RechargeDialogProps) {
  const [amountText, setAmountText] = useState<string>('');
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (account) {
      setAmountText('');
      setConfirmOpen(false);
    }
  }, [account]);

  const amount: number = Number(amountText);
  const amountValid: boolean =
    amountText.trim() !== '' && Number.isFinite(amount) && amount > 0;
  const previewBalance: number = account ? account.balance + amount : 0;

  const handleSubmit = async (): Promise<void> => {
    if (!account) return;
    setSubmitting(true);
    try {
      await rechargeAdAccount(account.id, { amount });
      toast.success(`已为「${account.accountName}」充值 ${formatMoney(amount)} 元`);
      setConfirmOpen(false);
      onOpenChange(false);
      onRecharged();
    } catch (error: unknown) {
      logger.error(`充值失败: ${toErrorText(error)}`);
      toast.error(`充值失败：${toErrorText(error)}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={account !== null} onOpenChange={onOpenChange}>
        <DialogContent className="rounded-none sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">账户充值</DialogTitle>
            <DialogDescription>
              {account
                ? `${account.accountName}（${account.accountNo}）· 当前余额 ￥${formatMoney(account.balance)}`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>
              充值金额 <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              placeholder="请输入充值金额（大于 0）"
              className="rounded-none font-mono"
              value={amountText}
              onChange={(event) => setAmountText(event.target.value)}
            />
            {amountValid && account ? (
              <div className="border border-border bg-accent p-3 text-xs">
                充值后余额预览：
                <span className="ml-1 font-mono text-sm font-black text-primary">
                  ￥{formatMoney(previewBalance)}
                </span>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button disabled={!amountValid} onClick={() => setConfirmOpen(true)}>
              下一步：确认充值
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AdsConfirmDialog
        open={confirmOpen}
        title="确认充值？"
        description={
          account
            ? `将向「${account.accountName}」充值 ￥${formatMoney(amount)}，充值后余额为 ￥${formatMoney(previewBalance)}。`
            : ''
        }
        confirmText={submitting ? '充值中...' : '确认充值'}
        onOpenChange={(open: boolean) => {
          if (!open) setConfirmOpen(false);
        }}
        onConfirm={() => void handleSubmit()}
      />
    </>
  );
}
