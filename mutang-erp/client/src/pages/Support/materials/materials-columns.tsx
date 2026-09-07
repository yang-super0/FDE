import type { TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import type { CreativeMaterial } from '@shared/api.interface';
import { Button } from '@client/src/components/ui/button';
import { Badge } from '@client/src/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@client/src/components/ui/dropdown-menu';
import {
  SeStatusBadge,
  formatSeAmount,
  formatSeNumber,
} from '../support-enhance-constants';

export interface MaterialColumnActions {
  onView: (record: CreativeMaterial) => void;
  onEdit: (record: CreativeMaterial) => void;
  onRate: (record: CreativeMaterial) => void;
  onRecords: (record: CreativeMaterial) => void;
  onStatusChange: (record: CreativeMaterial, status: string) => void;
  onDelete: (record: CreativeMaterial) => void;
}

export function buildMaterialColumns(
  actions: MaterialColumnActions,
): TableColumnsType<CreativeMaterial> {
  return [
    { title: '编号', dataIndex: 'materialNo', width: 110 },
    {
      title: '素材名称',
      dataIndex: 'materialName',
      width: 160,
      render: (name: string) => (
        <span className="font-bold text-primary">{name}</span>
      ),
    },
    { title: '类型', dataIndex: 'materialType', width: 70 },
    { title: '行业', dataIndex: 'industry', width: 90, render: (v: string | null) => v || '—' },
    { title: '平台', dataIndex: 'platform', width: 90, render: (v: string | null) => v || '—' },
    {
      title: '标签',
      dataIndex: 'tags',
      width: 160,
      render: (tags: string[] | null) =>
        tags && tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag: string) => (
              <Badge
                key={tag}
                variant="outline"
                className="rounded-[2px] border-primary/40 text-primary"
              >
                {tag}
              </Badge>
            ))}
          </div>
        ) : (
          '—'
        ),
    },
    {
      title: '使用次数',
      dataIndex: 'usageCount',
      width: 90,
      render: (v: number) => <span className="font-mono">{formatSeNumber(v, 0)}</span>,
    },
    {
      title: '累计消耗',
      dataIndex: 'totalConsumption',
      width: 110,
      render: (v: number) => <span className="font-mono">{formatSeAmount(v)}</span>,
    },
    {
      title: '累计转化',
      dataIndex: 'totalConversions',
      width: 90,
      render: (v: number) => <span className="font-mono">{formatSeNumber(v, 0)}</span>,
    },
    {
      title: '平均ROI',
      dataIndex: 'avgRoi',
      width: 85,
      render: (v: number) => <span className="font-mono">{formatSeNumber(v)}</span>,
    },
    {
      title: '平均CTR',
      dataIndex: 'avgCtr',
      width: 85,
      render: (v: number) => <span className="font-mono">{formatSeNumber(v)}</span>,
    },
    {
      title: '平均转化率',
      dataIndex: 'avgConversionRate',
      width: 95,
      render: (v: number) => <span className="font-mono">{formatSeNumber(v)}</span>,
    },
    {
      title: '评分',
      dataIndex: 'rating',
      width: 70,
      render: (v: number) => (
        <span className="text-[#0033A0]">{'★'.repeat(Math.max(0, Math.min(5, v)))}</span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 70,
      render: (v: string) => <SeStatusBadge status={v} />,
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 240,
      render: (_: unknown, record: CreativeMaterial) => (
        <div className="flex items-center gap-1.5">
          <Button
            data-ai-section-type="button"
            size="sm"
            variant="outline"
            className="rounded-none"
            onClick={() => actions.onView(record)}
          >
            详情
          </Button>
          <Button
            data-ai-section-type="button"
            size="sm"
            variant="outline"
            className="rounded-none"
            onClick={() => actions.onEdit(record)}
          >
            编辑
          </Button>
          <Button
            data-ai-section-type="button"
            size="sm"
            variant="outline"
            className="rounded-none"
            onClick={() => actions.onRecords(record)}
          >
            效果记录
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                data-ai-section-type="button"
                size="sm"
                variant="outline"
                className="rounded-none"
              >
                更多
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-none">
              <DropdownMenuItem onClick={() => actions.onRate(record)}>
                评分
              </DropdownMenuItem>
              {record.status !== '归档' ? (
                <DropdownMenuItem
                  onClick={() => actions.onStatusChange(record, '归档')}
                >
                  归档
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => actions.onStatusChange(record, '启用')}
                >
                  启用
                </DropdownMenuItem>
              )}
              {record.status !== '停用' ? (
                <DropdownMenuItem
                  onClick={() => actions.onStatusChange(record, '停用')}
                >
                  停用
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => actions.onStatusChange(record, '启用')}
                >
                  启用
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => actions.onDelete(record)}
              >
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];
}
