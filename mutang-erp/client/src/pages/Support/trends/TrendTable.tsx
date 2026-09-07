import {
  Table,
  type TableColumnsType,
} from '@lark-apaas/client-toolkit/antd-table';
import { Button } from '@client/src/components/ui/button';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import type { IndustryTrendRecord } from '@shared/api.interface';
import { formatSeAmount, formatSeNumber } from '../support-enhance-constants';

interface TrendTableProps {
  items: IndustryTrendRecord[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number, pageSize: number) => void;
  onEdit: (record: IndustryTrendRecord) => void;
  onDelete: (record: IndustryTrendRecord) => void;
}

const optionalNum = (v: number | null | undefined): string =>
  v === null || v === undefined ? '—' : formatSeNumber(v);

const optionalPct = (v: number | null | undefined): string =>
  v === null || v === undefined ? '—' : `${formatSeNumber(v)}%`;

const TrendTable = ({
  items,
  loading,
  page,
  pageSize,
  total,
  onPageChange,
  onEdit,
  onDelete,
}: TrendTableProps) => {
  const columns: TableColumnsType<IndustryTrendRecord> = [
    { title: '编号', dataIndex: 'trendNo', width: 130, fixed: 'left' },
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
    {
      title: '平台',
      dataIndex: 'platform',
      width: 90,
      render: (v?: string | null) => v || '—',
    },
    {
      title: '统计日期',
      dataIndex: 'statDate',
      width: 110,
      render: (v: string) => <span className="font-mono text-xs">{v}</span>,
    },
    {
      title: '总消耗',
      dataIndex: 'totalConsumption',
      width: 120,
      render: (v?: number | null) =>
        v === null || v === undefined ? '—' : formatSeAmount(v),
    },
    {
      title: '消耗增长率',
      dataIndex: 'consumptionGrowth',
      width: 100,
      render: optionalPct,
    },
    {
      title: '平均CPC',
      dataIndex: 'avgCpc',
      width: 90,
      render: optionalNum,
    },
    {
      title: 'CPC变化',
      dataIndex: 'cpcChange',
      width: 90,
      render: optionalPct,
    },
    {
      title: '平均CPM',
      dataIndex: 'avgCpm',
      width: 90,
      render: optionalNum,
    },
    {
      title: 'CPM变化',
      dataIndex: 'cpmChange',
      width: 90,
      render: optionalPct,
    },
    {
      title: '转化率',
      dataIndex: 'avgConversionRate',
      width: 90,
      render: optionalPct,
    },
    {
      title: '转化变化',
      dataIndex: 'conversionChange',
      width: 90,
      render: optionalPct,
    },
    {
      title: '活跃广告主',
      dataIndex: 'activeAdvertisers',
      width: 100,
      render: optionalNum,
    },
    {
      title: '流量指数',
      dataIndex: 'trafficIndex',
      width: 90,
      render: optionalNum,
    },
    {
      title: '竞争指数',
      dataIndex: 'competitionIndex',
      width: 90,
      render: optionalNum,
    },
    {
      title: '数据来源',
      dataIndex: 'dataSource',
      width: 100,
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 150,
      render: (_: unknown, record: IndustryTrendRecord) => (
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
        scroll={{ x: 2000, y: 500 }}
        locale={{ emptyText: '暂无大盘数据' }}
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

export { TrendTable };
