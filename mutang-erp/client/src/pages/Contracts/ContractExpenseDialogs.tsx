import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react';
import dayjs from 'dayjs';
import { ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { extractErrorMessage } from '@client/src/utils/extract-error-message';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@client/src/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@client/src/components/ui/popover';
import {
  Command, CommandEmpty, CommandInput, CommandItem, CommandList,
} from '@client/src/components/ui/command';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@client/src/components/ui/select';
import { cn } from '@client/src/lib/utils';
import { AdsDatePickerButton } from '@client/src/pages/AdsBusiness/AdsDatePickerButton';
import type { Contract, ContractExpense } from '@shared/api.interface';
import { listContracts } from '@client/src/api/contracts';
import { createContractExpense, updateContractExpense } from '@client/src/api/contract-enhance';

export const EXPENSE_TYPE_OPTIONS: string[] = ['服务费', '制作费', '投放费', '差旅费', '其他'];
export const PAYMENT_METHOD_OPTIONS: string[] = ['银行转账', '支票', '现金', '其他'];

/** 提取后端（含 409 冲突）返回的错误 message */
export function toContractErrorText(error: unknown): string {
  return extractErrorMessage(error);
}

function ExpenseFormField({ label, required, children }: {
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

interface ContractExpenseFormDialogProps {
  open: boolean;
  editing: ContractExpense | null;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

export function ContractExpenseFormDialog({
  open, editing, onSaved, onOpenChange,
}: ContractExpenseFormDialogProps): ReactNode {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [contractsLoading, setContractsLoading] = useState<boolean>(false);
  const [contractId, setContractId] = useState<string>('');
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);
  const [expenseType, setExpenseType] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [plannedDate, setPlannedDate] = useState<Date | undefined>(undefined);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setContractId(editing.contractId);
      setExpenseType(editing.expenseType);
      setAmount(String(editing.amount));
      setDescription(editing.description);
      setPaymentMethod(editing.paymentMethod);
      setPlannedDate(
        editing.plannedPaymentDate ? new Date(editing.plannedPaymentDate) : undefined,
      );
    } else {
      setContractId('');
      setExpenseType('');
      setAmount('');
      setDescription('');
      setPaymentMethod('');
      setPlannedDate(undefined);
    }
    setPickerOpen(false);
  }, [open, editing]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const loadContracts = async (): Promise<void> => {
      setContractsLoading(true);
      try {
        const result = await listContracts({ page: 1, pageSize: 200 });
        if (!cancelled) setContracts(result.items);
      } catch (error: unknown) {
        if (!cancelled) {
          logger.error(`加载合同选项失败: ${toContractErrorText(error)}`);
          toast.error('加载合同选项失败');
        }
      } finally {
        if (!cancelled) setContractsLoading(false);
      }
    };
    void loadContracts();
    return () => { cancelled = true; };
  }, [open]);

  const selectedContract: Contract | undefined =
    contracts.find((item: Contract) => item.id === contractId);

  const handleSubmit = async (): Promise<void> => {
    if (editing === null && !contractId) {
      toast.error('请选择关联合同');
      return;
    }
    if (!expenseType) {
      toast.error('请选择费用类型');
      return;
    }
    const amountValue: number = Number(amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      toast.error('金额必须大于 0');
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        expenseType,
        amount: amountValue,
        description: description.trim() || undefined,
        plannedPaymentDate: plannedDate
          ? dayjs(plannedDate).format('YYYY-MM-DD')
          : undefined,
        paymentMethod: paymentMethod || undefined,
      };
      if (editing) {
        await updateContractExpense(editing.id, body);
        toast.success('费用已更新');
      } else {
        await createContractExpense({ ...body, contractId });
        toast.success('费用已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      logger.error(`保存合同费用失败: ${toContractErrorText(error)}`);
      toast.error(toContractErrorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑合同费用' : '新建合同费用'}</DialogTitle>
          <DialogDescription>
            {editing ? `费用编号：${editing.expenseNo}` : '登记一条新的合同费用记录'}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-1">
          <div className="flex flex-wrap gap-4">
            <ExpenseFormField label="关联合同" required>
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={pickerOpen}
                    disabled={editing !== null}
                    className={cn(
                      'w-full justify-between rounded-none font-normal',
                      !selectedContract && 'text-muted-foreground',
                    )}
                  >
                    <span className="truncate">
                      {selectedContract
                        ? `${selectedContract.code}（${selectedContract.customerName}）`
                        : '搜索选择合同'}
                    </span>
                    <ChevronsUpDown className="ml-1 size-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[--radix-popover-trigger-width] rounded-none p-0"
                  align="start"
                >
                  <Command>
                    <CommandInput placeholder="搜索合同编号 / 客户名称" />
                    <CommandList>
                      <CommandEmpty>
                        {contractsLoading ? '合同加载中...' : '未找到匹配合同'}
                      </CommandEmpty>
                      {contracts.map((item: Contract) => (
                        <CommandItem
                          key={item.id}
                          value={`${item.code} ${item.customerName}`}
                          onSelect={() => {
                            setContractId(item.id);
                            setPickerOpen(false);
                          }}
                        >
                          <span className="font-medium text-primary">{item.code}</span>
                          <span className="ml-2 text-muted-foreground">
                            {item.customerName}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </ExpenseFormField>
            <ExpenseFormField label="费用类型" required>
              <Select value={expenseType} onValueChange={setExpenseType}>
                <SelectTrigger className="w-full rounded-none">
                  <SelectValue placeholder="选择费用类型" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_TYPE_OPTIONS.map((option: string) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ExpenseFormField>
            <ExpenseFormField label="金额" required>
              <Input
                className="rounded-none"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                placeholder="费用金额"
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setAmount(event.target.value)}
              />
            </ExpenseFormField>
            <ExpenseFormField label="计划付款日期">
              <AdsDatePickerButton
                value={plannedDate}
                placeholder="计划付款日期"
                onChange={setPlannedDate}
              />
            </ExpenseFormField>
            <ExpenseFormField label="付款方式">
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="w-full rounded-none">
                  <SelectValue placeholder="选择付款方式" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHOD_OPTIONS.map((option: string) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ExpenseFormField>
            <div className="w-full space-y-1.5">
              <label className="text-sm font-medium">费用说明</label>
              <Textarea
                className="rounded-none"
                rows={2}
                value={description}
                placeholder="补充说明该项费用的用途或背景"
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                  setDescription(event.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
