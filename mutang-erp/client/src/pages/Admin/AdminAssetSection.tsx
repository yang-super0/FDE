import { useState } from 'react';
import { Table, TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import type { Asset, AssetStatus, AssetSummary } from '@shared/api.interface';
import { Button } from '@client/src/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import {
  ReportCard,
  SectionHeader,
  StatusBadge,
  type StatusTone,
} from '@client/src/components/blueprint';
import { AdminAssetRegisterDialog } from './AdminAssetRegisterDialog';

interface AdminAssetSectionProps {
  summary: AssetSummary | null;
  assets: Asset[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  statusFilter: AssetStatus | 'all';
  onStatusFilterChange: (status: AssetStatus | 'all') => void;
  onPageChange: (page: number, pageSize: number) => void;
  onCreate: (data: {
    name: string;
    assetNo: string;
    status: AssetStatus;
  }) => Promise<boolean>;
  onClaim: (id: string) => Promise<boolean>;
  onReturn: (id: string) => Promise<boolean>;
}

const STATUS_LABEL: Record<AssetStatus, string> = {
  in_stock: '在库',
  in_use: '在用',
  repairing: '维修中',
};

const STATUS_TONE: Record<AssetStatus, StatusTone> = {
  in_stock: 'neutral',
  in_use: 'success',
  repairing: 'warning',
};

const STAT_ITEMS: Array<{
  key: string;
  label: string;
  colorClass: string;
  getValue: (summary: AssetSummary) => number;
}> = [
  {
    key: 'total',
    label: '资产总数',
    colorClass: 'text-[#0033A0]',
    getValue: (summary: AssetSummary) => summary.total,
  },
  {
    key: 'inUse',
    label: '在用',
    colorClass: 'text-[#0066FF]',
    getValue: (summary: AssetSummary) => summary.inUse,
  },
  {
    key: 'inStock',
    label: '在库',
    colorClass: 'text-[#4D94FF]',
    getValue: (summary: AssetSummary) => summary.inStock,
  },
];

const AdminAssetSection = ({
  summary,
  assets,
  total,
  page,
  pageSize,
  loading,
  statusFilter,
  onStatusFilterChange,
  onPageChange,
  onCreate,
  onClaim,
  onReturn,
}: AdminAssetSectionProps) => {
  const [actingId, setActingId] = useState<string>('');

  const handleAction = async (
    id: string,
    action: 'claim' | 'return',
  ): Promise<void> => {
    setActingId(id);
    if (action === 'claim') {
      await onClaim(id);
    } else {
      await onReturn(id);
    }
    setActingId('');
  };

  const columns: TableColumnsType<Asset> = [
    {
      title: '资产名称',
      dataIndex: 'name',
      width: 220,
      render: (name: string) => (
        <span className="font-bold text-primary">{name}</span>
      ),
    },
    {
      title: '资产编号',
      dataIndex: 'assetNo',
      width: 160,
      render: (assetNo: string) => (
        <span className="font-mono text-xs">{assetNo}</span>
      ),
    },
    {
      title: '使用人',
      dataIndex: 'holderName',
      width: 140,
      render: (holderName: string) =>
        holderName ? (
          holderName
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (status: AssetStatus) => (
        <StatusBadge tone={STATUS_TONE[status]}>
          {STATUS_LABEL[status]}
        </StatusBadge>
      ),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 110,
      render: (_: unknown, record: Asset) => {
        if (record.status === 'in_stock') {
          return (
            <Button
              data-ai-section-type="button"
              size="sm"
              disabled={actingId === record.id}
              onClick={() => handleAction(record.id, 'claim')}
            >
              领用
            </Button>
          );
        }
        if (record.status === 'in_use') {
          return (
            <Button
              data-ai-section-type="button"
              variant="outline"
              size="sm"
              disabled={actingId === record.id}
              onClick={() => handleAction(record.id, 'return')}
            >
              归还
            </Button>
          );
        }
        return <span className="text-muted-foreground text-xs">—</span>;
      },
    },
  ];

  return (
    <div className="space-y-8">
      <section>
        <SectionHeader no="01" label="ASSET OVERVIEW" subtitle="资产统计概览" />
        <div
          data-ai-section-type="card-stat"
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {STAT_ITEMS.map((item) => (
            <ReportCard key={item.key}>
              <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-2">
                {item.label}
              </div>
              <div
                className={`font-mono text-4xl font-black ${item.colorClass}`}
              >
                {summary ? item.getValue(summary) : '-'}
              </div>
            </ReportCard>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader no="02" label="ASSET MANAGEMENT" subtitle="资产管理" />
        <ReportCard>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <Select
              value={statusFilter}
              onValueChange={(value: string) =>
                onStatusFilterChange(value as AssetStatus | 'all')
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="in_stock">在库</SelectItem>
                <SelectItem value="in_use">在用</SelectItem>
                <SelectItem value="repairing">维修中</SelectItem>
              </SelectContent>
            </Select>
            <AdminAssetRegisterDialog onCreate={onCreate} />
          </div>
          <Table
            columns={columns}
            dataSource={assets}
            loading={loading}
            rowKey="id"
            scroll={{ x: 800, y: 500 }}
            pagination={{
              current: page,
              pageSize,
              total,
              onChange: onPageChange,
              showSizeChanger: false,
            }}
          />
        </ReportCard>
      </section>
    </div>
  );
};

export { AdminAssetSection };
