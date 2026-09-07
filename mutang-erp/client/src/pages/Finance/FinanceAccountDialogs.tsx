import { useEffect, useState, type ChangeEvent } from 'react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table } from '@lark-apaas/client-toolkit/antd-table';
import type { TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
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
  CreateFinanceAccountRequest,
  FinanceAccount,
  FinanceAccountTxn,
} from '@shared/api.interface';
import {
  createFinanceAccount,
  fetchFinanceAccountTxns,
  updateFinanceAccount,
} from '@client/src/api/finance-core';
import {
  ACCOUNT_TYPE_OPTIONS,
  FinanceFormField,
  FinanceStatusBadge,
  formatFinanceAmount,
  toFinanceErrorText,
} from './finance-constants';

const PAGE_SIZE: number = 10;

interface AccountFormState {
  accountName: string;
  accountType: string;
  bankName: string;
  bankAccount: string;
  initialBalance: string;
  remark: string;
}

const EMPTY_FORM: AccountFormState = {
  accountName: '',
  accountType: ACCOUNT_TYPE_OPTIONS[0],
  bankName: '',
  bankAccount: '',
  initialBalance: '0',
  remark: '',
};

interface AccountFormDialogProps {
  open: boolean;
  editing: FinanceAccount | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function AccountFormDialog({ open, editing, onOpenChange, onSaved }: AccountFormDialogProps) {
  const [form, setForm] = useState<AccountFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const patchForm = (patch: Partial<AccountFormState>): void =>
    setForm((prev: AccountFormState) => ({ ...prev, ...patch }));

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        accountName: editing.accountName,
        accountType: editing.accountType,
        bankName: editing.bankName,
        bankAccount: editing.bankAccount,
        initialBalance: String(editing.initialBalance),
        remark: editing.remark,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, editing]);

  const handleSubmit = async (): Promise<void> => {
    if (!form.accountName.trim()) {
      toast.error('请输入账户名称');
      return;
    }
    const initialBalance: number = Number(form.initialBalance);
    if (!Number.isFinite(initialBalance)) {
      toast.error('期初余额必须为数字');
      return;
    }
    setSubmitting(true);
    try {
      const common = {
        accountName: form.accountName.trim(),
        accountType: form.accountType,
        bankName: form.bankName.trim() || undefined,
        bankAccount: form.bankAccount.trim() || undefined,
        remark: form.remark.trim() || undefined,
      };
      if (editing) {
        await updateFinanceAccount(editing.id, common);
        toast.success('账户已更新');
      } else {
        const payload: CreateFinanceAccountRequest = { ...common, initialBalance };
        await createFinanceAccount(payload);
        toast.success('账户已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      logger.error(`保存资金账户失败: ${toFinanceErrorText(error)}`);
      toast.error(toFinanceErrorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">{editing ? '编辑资金账户' : '新建资金账户'}</DialogTitle>
          <DialogDescription>{editing ? '修改账户信息后保存' : '期初余额仅在新建时填写'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <FinanceFormField label="账户名称" required>
              <Input
                className="rounded-none"
                placeholder="请输入账户名称"
                value={form.accountName}
                onChange={(event: ChangeEvent<HTMLInputElement>) => patchForm({ accountName: event.target.value })}
              />
            </FinanceFormField>
            <FinanceFormField label="类型">
              <Select value={form.accountType} onValueChange={(value: string) => patchForm({ accountType: value })}>
                <SelectTrigger className="rounded-none">
                  <SelectValue placeholder="请选择类型" />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPE_OPTIONS.map((option: string) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FinanceFormField>
          </div>
          <div className="flex flex-wrap gap-4">
            <FinanceFormField label="银行">
              <Input
                className="rounded-none"
                placeholder="请输入开户银行"
                value={form.bankName}
                onChange={(event: ChangeEvent<HTMLInputElement>) => patchForm({ bankName: event.target.value })}
              />
            </FinanceFormField>
            <FinanceFormField label="账号">
              <Input
                className="rounded-none font-mono"
                placeholder="请输入银行账号"
                value={form.bankAccount}
                onChange={(event: ChangeEvent<HTMLInputElement>) => patchForm({ bankAccount: event.target.value })}
              />
            </FinanceFormField>
          </div>
          {!editing ? (
            <div className="flex flex-wrap gap-4">
              <FinanceFormField label="期初余额">
                <Input
                  className="rounded-none font-mono"
                  type="number"
                  placeholder="0.00"
                  value={form.initialBalance}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    patchForm({ initialBalance: event.target.value })
                  }
                />
              </FinanceFormField>
            </div>
          ) : null}
          <FinanceFormField label="备注">
            <Textarea
              className="rounded-none resize-none"
              rows={3}
              placeholder="选填，补充说明账户信息"
              value={form.remark}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => patchForm({ remark: event.target.value })}
            />
          </FinanceFormField>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button disabled={submitting} onClick={() => void handleSubmit()}>
              {submitting ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const TXN_COLUMNS: TableColumnsType<FinanceAccountTxn> = [
  {
    title: '单号',
    dataIndex: 'bizNo',
    width: 140,
    render: (value: string) => <span className="font-mono text-xs font-bold text-primary">{value}</span>,
  },
  { title: '类型', dataIndex: 'bizType', width: 90 },
  { title: '对方', dataIndex: 'counterparty', width: 130 },
  {
    title: '金额',
    dataIndex: 'amount',
    width: 140,
    align: 'right',
    render: (value: number, record: FinanceAccountTxn) => (
      <span
        className={
          record.direction === '收入'
            ? 'font-mono font-bold text-[hsl(160_84%_39%)]'
            : 'font-mono font-bold text-[hsl(0_84%_60%)]'
        }
      >
        {record.direction === '收入' ? '+' : '-'}
        {formatFinanceAmount(value)}
      </span>
    ),
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 90,
    render: (value: string) => <FinanceStatusBadge status={value} />,
  },
  {
    title: '时间',
    dataIndex: 'occurredAt',
    width: 140,
    render: (value: string) => (
      <span className="font-mono text-xs">{dayjs(value).format('YYYY-MM-DD HH:mm')}</span>
    ),
  },
];

interface AccountTxnDialogProps {
  account: FinanceAccount | null;
  onOpenChange: (open: boolean) => void;
}

export function AccountTxnDialog({ account, onOpenChange }: AccountTxnDialogProps) {
  const [txns, setTxns] = useState<FinanceAccountTxn[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    setPage(1);
  }, [account?.id]);

  useEffect(() => {
    if (!account) {
      setTxns([]);
      setTotal(0);
      return;
    }
    let cancelled: boolean = false;
    setLoading(true);
    fetchFinanceAccountTxns(account.id, page, PAGE_SIZE)
      .then((result) => {
        if (cancelled) return;
        setTxns(result.items);
        setTotal(result.total);
      })
      .catch((error: unknown) => {
        logger.error(`加载账户流水失败: ${toFinanceErrorText(error)}`);
        toast.error(toFinanceErrorText(error));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [account, page]);

  return (
    <Dialog open={account !== null} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            收支流水
            {account ? <span className="ml-2 text-sm font-normal text-primary">{account.accountName}</span> : null}
          </DialogTitle>
          <DialogDescription>该账户的收款与付款明细</DialogDescription>
        </DialogHeader>
        <Table<FinanceAccountTxn>
          size="small"
          loading={loading}
          dataSource={txns}
          rowKey={(record: FinanceAccountTxn) => `${record.bizNo}_${record.occurredAt}`}
          scroll={{ x: 680, y: 420 }}
          columns={TXN_COLUMNS}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            onChange: (nextPage: number) => setPage(nextPage),
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
