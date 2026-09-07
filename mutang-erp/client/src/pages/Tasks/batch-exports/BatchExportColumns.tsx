import { type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { toast } from 'sonner';
import type { BatchExport } from '@shared/api.interface';
import { Button } from '@client/src/components/ui/button';
import { UserDisplay } from '@client/src/components/business-ui/user-display';
import { WarehouseActionLink } from '@client/src/pages/Admin/warehouse/warehouse-shared';
import {
  formatTaskEnhanceDateTime,
  TaskEnhanceStatusBadge,
} from '../task-enhance-shared';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

export const BATCH_EXPORT_STATUS_OPTIONS: string[] = [
  '待处理',
  '处理中',
  '已完成',
  '失败',
];

/** 列 key -> 后端排序字段映射（sortBy 值为 schema 字段名） */
export const BATCH_EXPORT_SORT_FIELDS: Record<string, string> = {
  'be-export-no': 'exportNo',
  'be-total-count': 'totalCount',
  'be-created-at': 'createdAt',
  'be-expire-at': 'expireAt',
};

interface BatchExportColumnHandlers {
  onStart: (record: BatchExport) => void;
  onFinish: (record: BatchExport) => void;
  onDelete: (record: BatchExport) => void;
}

export function buildBatchExportColumns(
  handlers: BatchExportColumnHandlers,
): TableColumnsType<BatchExport> {
  return [
    {
      key: 'be-export-no',
      title: '编号',
      dataIndex: 'exportNo',
      width: 150,
      fixed: 'left',
      sorter: true,
      render: (value: string) => (
        <span className="font-bold text-primary">{value}</span>
      ),
    },
    {
      key: 'be-export-type',
      title: '导出类型',
      dataIndex: 'exportType',
      width: 100,
    },
    {
      key: 'be-export-name',
      title: '导出名称',
      dataIndex: 'exportName',
      width: 180,
      render: (value: string) => (
        <span className="break-words">{value}</span>
      ),
    },
    {
      key: 'be-field-count',
      title: '导出字段数',
      dataIndex: 'fields',
      width: 100,
      align: 'right',
      render: (value: string[] | null) => (
        <span className="font-mono">{value ? value.length : '—'}</span>
      ),
    },
    {
      key: 'be-total-count',
      title: '总条数',
      dataIndex: 'totalCount',
      width: 90,
      align: 'right',
      sorter: true,
      render: (value: number) => <span className="font-mono">{value}</span>,
    },
    {
      key: 'be-status',
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (value: string) => <TaskEnhanceStatusBadge status={value} />,
    },
    {
      key: 'be-expired',
      title: '过期标记',
      dataIndex: 'expired',
      width: 90,
      render: (value: boolean) =>
        value ? (
          <span className="inline-flex items-center rounded-[2px] bg-[#FEF2F2] px-2 py-0.5 text-[10px] font-bold text-[#EF4444]">
            已过期
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'be-file-url',
      title: '文件链接',
      dataIndex: 'fileUrl',
      width: 110,
      render: (value: string | null, record: BatchExport) =>
        record.status === '已完成' && value ? (
          <UniversalLink
            to={value}
            target="_blank"
            rel="noreferrer"
            onClick={() => {
              if (record.expired) toast.warning('文件已过期，请尽快下载');
            }}
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-auto rounded-none px-1 text-xs text-primary"
            >
              下载文件
            </Button>
          </UniversalLink>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'be-created-by',
      title: '创建人',
      dataIndex: 'createdBy',
      width: 140,
      render: (value: string | null) =>
        value ? (
          <UserDisplay value={[value]} size="small" />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'be-created-at',
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 170,
      sorter: true,
      render: (value: string) => (
        <span className="font-mono text-xs">
          {formatTaskEnhanceDateTime(value)}
        </span>
      ),
    },
    {
      key: 'be-completed-at',
      title: '完成时间',
      dataIndex: 'completedAt',
      width: 170,
      render: (value: string | null) => (
        <span className="font-mono text-xs">
          {formatTaskEnhanceDateTime(value)}
        </span>
      ),
    },
    {
      key: 'be-expire-at',
      title: '到期时间',
      dataIndex: 'expireAt',
      width: 170,
      sorter: true,
      render: (value: string | null) => (
        <span className="font-mono text-xs">
          {formatTaskEnhanceDateTime(value)}
        </span>
      ),
    },
    {
      key: 'be-actions',
      title: '操作',
      width: 220,
      fixed: 'right',
      render: (_: unknown, record: BatchExport) => (
        <div className="flex flex-wrap items-center gap-1">
          {record.status === '待处理' ? (
            <WarehouseActionLink onClick={() => handlers.onStart(record)}>
              开始处理
            </WarehouseActionLink>
          ) : null}
          {record.status === '处理中' ? (
            <WarehouseActionLink onClick={() => handlers.onFinish(record)}>
              完成导出
            </WarehouseActionLink>
          ) : null}
          {record.status === '已完成' && record.fileUrl ? (
            <UniversalLink
              to={record.fileUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                if (record.expired) toast.warning('文件已过期，请尽快下载');
              }}
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-auto rounded-none px-1 text-xs text-primary"
              >
                下载
              </Button>
            </UniversalLink>
          ) : null}
          <WarehouseActionLink
            danger
            onClick={() => handlers.onDelete(record)}
          >
            删除
          </WarehouseActionLink>
        </div>
      ),
    },
  ];
}

/* ============ Excel 导出 ============ */

export const BATCH_EXPORT_EXPORT_HEADERS: string[] = [
  '编号',
  '导出类型',
  '导出名称',
  '导出字段',
  '总条数',
  '状态',
  '是否过期',
  '文件链接',
  '创建时间',
  '完成时间',
  '到期时间',
  '备注',
];

export function buildBatchExportExportRows(
  items: BatchExport[],
): Record<string, string>[] {
  return items.map((item: BatchExport) => ({
    编号: item.exportNo,
    导出类型: item.exportType,
    导出名称: item.exportName,
    导出字段: item.fields ? item.fields.join('、') : '',
    总条数: String(item.totalCount),
    状态: item.status,
    是否过期: item.expired ? '已过期' : '未过期',
    文件链接: item.fileUrl ?? '',
    创建时间: formatTaskEnhanceDateTime(item.createdAt),
    完成时间: formatTaskEnhanceDateTime(item.completedAt),
    到期时间: formatTaskEnhanceDateTime(item.expireAt),
    备注: item.remark ?? '',
  }));
}
