import dayjs from 'dayjs';
import { Pencil, Trash2 } from 'lucide-react';
import type { TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { Button } from '@client/src/components/ui/button';
import { Switch } from '@client/src/components/ui/switch';
import type { CommissionRule } from '@shared/api.interface';
import { AdStatusBadge, formatMoney } from './ads-constants';

interface RuleColumnHandlers {
  onEdit: (item: CommissionRule) => void;
  onToggle: (item: CommissionRule) => void;
  onDelete: (item: CommissionRule) => void;
}

function formatAmountRange(item: CommissionRule): string {
  const minText: string =
    item.minAmount !== null ? `¥${formatMoney(item.minAmount)}` : '';
  const maxText: string =
    item.maxAmount !== null ? `¥${formatMoney(item.maxAmount)}` : '';
  if (minText && maxText) return `${minText} ~ ${maxText}`;
  if (minText) return `${minText} 以上`;
  if (maxText) return `${maxText} 以内`;
  return '不限';
}

function formatCommissionValue(item: CommissionRule): string {
  if (item.ruleType === '固定金额') {
    return item.fixedAmount !== null
      ? `¥${formatMoney(item.fixedAmount)}`
      : '-';
  }
  return item.rate !== null ? `${item.rate}%` : '-';
}

export function buildRuleColumns(
  handlers: RuleColumnHandlers,
): TableColumnsType<CommissionRule> {
  return [
    {
      title: '规则名称',
      dataIndex: 'ruleName',
      fixed: 'left',
      width: 180,
      render: (value: string) => (
        <span className="font-bold text-primary">{value}</span>
      ),
    },
    { title: '类型', dataIndex: 'ruleType', width: 90 },
    {
      title: '平台',
      dataIndex: 'platform',
      width: 100,
      render: (value: string) => value || '不限',
    },
    {
      title: '端口',
      dataIndex: 'portType',
      width: 90,
      render: (value: string) => value || '不限',
    },
    {
      title: '消耗区间',
      key: 'amountRange',
      width: 190,
      render: (_: unknown, record: CommissionRule) => (
        <span className="font-mono text-xs">{formatAmountRange(record)}</span>
      ),
    },
    {
      title: '提成比例 / 固定金额',
      key: 'commissionValue',
      width: 150,
      render: (_: unknown, record: CommissionRule) => (
        <span className="font-mono font-bold">
          {formatCommissionValue(record)}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (value: CommissionRule['status']) => (
        <AdStatusBadge status={value} />
      ),
    },
    {
      title: '生效期',
      dataIndex: 'effectiveDate',
      width: 110,
      render: (value: string | null) => (
        <span className="font-mono text-xs">
          {value ? dayjs(value).format('YYYY-MM-DD') : '-'}
        </span>
      ),
    },
    {
      title: '失效期',
      dataIndex: 'expireDate',
      width: 110,
      render: (value: string | null) => (
        <span className="font-mono text-xs">
          {value ? dayjs(value).format('YYYY-MM-DD') : '-'}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 170,
      render: (_: unknown, record: CommissionRule) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlers.onEdit(record)}
          >
            <Pencil className="h-3.5 w-3.5" />
            编辑
          </Button>
          <Switch
            checked={record.status === '启用'}
            onClick={() => handlers.onToggle(record)}
            aria-label={record.status === '启用' ? '停用规则' : '启用规则'}
          />
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => handlers.onDelete(record)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            删除
          </Button>
        </div>
      ),
    },
  ];
}
