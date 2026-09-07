import type { TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import type { BatchImport } from '@shared/api.interface';
import { Button } from '@client/src/components/ui/button';
import { Progress } from '@client/src/components/ui/progress';
import { UserDisplay } from '@client/src/components/business-ui/user-display';
import { WarehouseActionLink } from '@client/src/pages/Admin/warehouse/warehouse-shared';
import {
  formatTaskEnhanceDateTime,
  TaskEnhanceStatusBadge,
} from '../task-enhance-shared';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

export const BATCH_IMPORT_STATUS_OPTIONS: string[] = [
  '待处理',
  '处理中',
  '已完成',
  '部分失败',
  '失败',
];

/** 列 key -> 后端排序字段映射（sortBy 值为 schema 字段名） */
export const BATCH_IMPORT_SORT_FIELDS: Record<string, string> = {
  'bi-import-no': 'importNo',
  'bi-total-count': 'totalCount',
  'bi-success-count': 'successCount',
  'bi-fail-count': 'failCount',
  'bi-created-at': 'createdAt',
};

interface BatchImportColumnHandlers {
  onStart: (record: BatchImport) => void;
  onFinish: (record: BatchImport) => void;
  onView: (record: BatchImport) => void;
  onDelete: (record: BatchImport) => void;
}

export function buildBatchImportColumns(
  handlers: BatchImportColumnHandlers,
): TableColumnsType<BatchImport> {
  return [
    {
      key: 'bi-import-no',
      title: '编号',
      dataIndex: 'importNo',
      width: 150,
      fixed: 'left',
      sorter: true,
      render: (value: string) => (
        <span className="font-bold text-primary">{value}</span>
      ),
    },
    {
      key: 'bi-import-type',
      title: '导入类型',
      dataIndex: 'importType',
      width: 100,
    },
    {
      key: 'bi-file-name',
      title: '文件名',
      dataIndex: 'fileName',
      width: 180,
      render: (value: string) => (
        <span className="break-words">{value}</span>
      ),
    },
    {
      key: 'bi-total-count',
      title: '总条数',
      dataIndex: 'totalCount',
      width: 90,
      align: 'right',
      sorter: true,
      render: (value: number) => <span className="font-mono">{value}</span>,
    },
    {
      key: 'bi-success-count',
      title: '成功数',
      dataIndex: 'successCount',
      width: 90,
      align: 'right',
      sorter: true,
      render: (value: number) => (
        <span className="font-mono text-[#10B981]">{value}</span>
      ),
    },
    {
      key: 'bi-fail-count',
      title: '失败数',
      dataIndex: 'failCount',
      width: 90,
      align: 'right',
      sorter: true,
      render: (value: number) => (
        <span className={`font-mono ${value > 0 ? 'text-[#EF4444]' : ''}`}>
          {value}
        </span>
      ),
    },
    {
      key: 'bi-progress',
      title: '进度',
      width: 130,
      render: (_: unknown, record: BatchImport) => {
        const total: number = record.totalCount;
        const done: number = record.successCount + record.failCount;
        const percent: number =
          total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
        return (
          <div className="flex items-center gap-2">
            <Progress value={percent} className="h-2 w-16" />
            <span
              className={`font-mono text-xs ${
                record.status === '处理中'
                  ? 'animate-pulse font-bold text-primary'
                  : 'text-muted-foreground'
              }`}
            >
              {percent}%
            </span>
          </div>
        );
      },
    },
    {
      key: 'bi-status',
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (value: string) => <TaskEnhanceStatusBadge status={value} />,
    },
    {
      key: 'bi-created-by',
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
      key: 'bi-created-at',
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
      key: 'bi-completed-at',
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
      key: 'bi-actions',
      title: '操作',
      width: 270,
      fixed: 'right',
      render: (_: unknown, record: BatchImport) => (
        <div className="flex flex-wrap items-center gap-1">
          {record.status === '待处理' ? (
            <WarehouseActionLink onClick={() => handlers.onStart(record)}>
              开始处理
            </WarehouseActionLink>
          ) : null}
          {record.status === '处理中' ? (
            <WarehouseActionLink onClick={() => handlers.onFinish(record)}>
              完成导入
            </WarehouseActionLink>
          ) : null}
          <WarehouseActionLink onClick={() => handlers.onView(record)}>
            查看结果
          </WarehouseActionLink>
          {record.fileUrl ? (
            <UniversalLink to={record.fileUrl} target="_blank" rel="noreferrer">
              <Button
                variant="ghost"
                size="sm"
                className="h-auto rounded-none px-1 text-xs text-primary"
              >
                下载原文档
              </Button>
            </UniversalLink>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              disabled
              className="h-auto rounded-none px-1 text-xs"
            >
              下载原文档
            </Button>
          )}
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

export const BATCH_IMPORT_EXPORT_HEADERS: string[] = [
  '编号',
  '导入类型',
  '文件名',
  '总条数',
  '成功数',
  '失败数',
  '状态',
  '创建时间',
  '完成时间',
  '备注',
];

export function buildBatchImportExportRows(
  items: BatchImport[],
): Record<string, string>[] {
  return items.map((item: BatchImport) => ({
    编号: item.importNo,
    导入类型: item.importType,
    文件名: item.fileName,
    总条数: String(item.totalCount),
    成功数: String(item.successCount),
    失败数: String(item.failCount),
    状态: item.status,
    创建时间: formatTaskEnhanceDateTime(item.createdAt),
    完成时间: formatTaskEnhanceDateTime(item.completedAt),
    备注: item.remark ?? '',
  }));
}
