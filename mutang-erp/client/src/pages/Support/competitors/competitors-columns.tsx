import type { TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import type { CompetitorMonitoring } from '@shared/api.interface';
import { Button } from '@client/src/components/ui/button';
import {
  SeStatusBadge,
  formatSeAmount,
  formatSeNumber,
} from '../support-enhance-constants';

export interface CompetitorColumnActions {
  onView: (record: CompetitorMonitoring) => void;
  onEdit: (record: CompetitorMonitoring) => void;
  onDelete: (record: CompetitorMonitoring) => void;
}

const monoNumber = (digits: number = 2) => (v: number | null) => (
  <span className="font-mono">{formatSeNumber(v ?? 0, digits)}</span>
);

const renderDash = (v: string | null) => v || '—';

export function buildCompetitorColumns(
  actions: CompetitorColumnActions,
): TableColumnsType<CompetitorMonitoring> {
  return [
    { title: '编号', dataIndex: 'monitorNo', width: 120 },
    {
      title: '竞品名称',
      dataIndex: 'competitorName',
      width: 140,
      render: (name: string) => (
        <span className="font-bold text-primary">{name}</span>
      ),
    },
    { title: '行业', dataIndex: 'competitorIndustry', width: 100, render: renderDash },
    { title: '平台', dataIndex: 'platform', width: 100, render: renderDash },
    {
      title: '监控日期',
      dataIndex: 'monitorDate',
      width: 110,
      render: (v: string) => <span className="font-mono text-xs">{v}</span>,
    },
    {
      title: '预估消耗',
      dataIndex: 'estimatedConsumption',
      width: 120,
      render: (v: number | null) => (
        <span className="font-mono">{formatSeAmount(v ?? 0)}</span>
      ),
    },
    { title: '预估ROI', dataIndex: 'estimatedRoi', width: 90, render: monoNumber() },
    { title: '广告数', dataIndex: 'adCount', width: 80, render: monoNumber(0) },
    { title: '素材数', dataIndex: 'creativeCount', width: 80, render: monoNumber(0) },
    { title: '数据来源', dataIndex: 'dataSource', width: 100 },
    {
      title: '可信度',
      dataIndex: 'confidence',
      width: 80,
      render: (v: string) => <SeStatusBadge status={v} />,
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 200,
      render: (_: unknown, record: CompetitorMonitoring) => (
        <div className="flex gap-1.5">
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
            className="rounded-none text-destructive hover:text-destructive"
            onClick={() => actions.onDelete(record)}
          >
            删除
          </Button>
        </div>
      ),
    },
  ];
}
