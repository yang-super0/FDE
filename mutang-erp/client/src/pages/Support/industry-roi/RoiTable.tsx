import {
  Table,
  type TableColumnsType,
} from '@lark-apaas/client-toolkit/antd-table';
import { Button } from '@client/src/components/ui/button';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import type { IndustryRoiBenchmark } from '@shared/api.interface';
import { SeStatusBadge, formatSeNumber } from '../support-enhance-constants';

interface RoiTableProps {
  items: IndustryRoiBenchmark[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number, pageSize: number) => void;
  onEdit: (record: IndustryRoiBenchmark) => void;
  onCorrect: (record: IndustryRoiBenchmark) => void;
  onVersion: (record: IndustryRoiBenchmark) => void;
  onDelete: (record: IndustryRoiBenchmark) => void;
}

const RoiTable = ({
  items,
  loading,
  page,
  pageSize,
  total,
  onPageChange,
  onEdit,
  onCorrect,
  onVersion,
  onDelete,
}: RoiTableProps) => {
  const columns: TableColumnsType<IndustryRoiBenchmark> = [
    { title: '编号', dataIndex: 'roiNo', width: 130, fixed: 'left' },
    {
      title: '行业',
      dataIndex: 'industry',
      width: 100,
      render: (v: string) => (
        <span className="font-bold text-primary">{v}</span>
      ),
    },
    {
      title: '二级行业',
      dataIndex: 'subIndustry',
      width: 100,
      render: (v?: string | null) => v || '—',
    },
    { title: '平台', dataIndex: 'platform', width: 90 },
    {
      title: 'ROI基准',
      dataIndex: 'roiBenchmark',
      width: 90,
      render: (v: number) => (
        <span className="font-mono font-bold">{formatSeNumber(v)}</span>
      ),
    },
    {
      title: '最低',
      dataIndex: 'roiMin',
      width: 70,
      render: (v?: number | null) => (v === null || v === undefined ? '—' : formatSeNumber(v)),
    },
    {
      title: '最高',
      dataIndex: 'roiMax',
      width: 70,
      render: (v?: number | null) => (v === null || v === undefined ? '—' : formatSeNumber(v)),
    },
    {
      title: 'CPC',
      dataIndex: 'cpcBenchmark',
      width: 70,
      render: (v?: number | null) => (v === null || v === undefined ? '—' : formatSeNumber(v)),
    },
    {
      title: 'CPM',
      dataIndex: 'cpmBenchmark',
      width: 70,
      render: (v?: number | null) => (v === null || v === undefined ? '—' : formatSeNumber(v)),
    },
    {
      title: '转化率',
      dataIndex: 'conversionRate',
      width: 80,
      render: (v?: number | null) => (v === null || v === undefined ? '—' : `${formatSeNumber(v)}%`),
    },
    {
      title: '生效日期',
      dataIndex: 'effectiveDate',
      width: 110,
      render: (v: string) => <span className="font-mono text-xs">{v}</span>,
    },
    {
      title: '失效日期',
      dataIndex: 'expireDate',
      width: 110,
      render: (v?: string | null) => (
        <span className="font-mono text-xs">{v || '—'}</span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (v: string) => <SeStatusBadge status={v} />,
    },
    {
      title: '版本',
      dataIndex: 'version',
      width: 70,
      render: (v: number) => <span className="font-mono">v{v}</span>,
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 260,
      render: (_: unknown, record: IndustryRoiBenchmark) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="rounded-none"
            onClick={() => onEdit(record)}
          >
            编辑
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="rounded-none"
            onClick={() => onCorrect(record)}
          >
            修正
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="rounded-none"
            onClick={() => onVersion(record)}
          >
            版本历史
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="rounded-none text-destructive hover:text-destructive"
            onClick={() => onDelete(record)}
          >
            删除
          </Button>
        </div>
      ),
    },
  ];

  const {
    visibleColumns,
    columnMetas,
    hiddenIds,
    toggleColumn,
    resetColumns,
    setAllColumns,
  } = useColumnSettings(columns);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ColumnSettingsButton
          columnMetas={columnMetas}
          hiddenIds={hiddenIds}
          onToggle={toggleColumn}
          onReset={resetColumns}
          onSetAll={setAllColumns}
        />
      </div>
      <Table
        columns={visibleColumns}
        dataSource={items}
        loading={loading}
        rowKey="id"
        scroll={{ x: 1600, y: 500 }}
        locale={{ emptyText: '暂无ROI基准数据' }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: false,
          onChange: onPageChange,
        }}
      />
    </div>
  );
};

export { RoiTable };
