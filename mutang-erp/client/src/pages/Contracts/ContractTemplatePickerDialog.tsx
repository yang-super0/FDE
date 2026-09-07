import { useCallback, useEffect, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import type {
  ApplyContractTemplateResult,
  ContractTemplate,
} from '@shared/api.interface';
import { Button } from '@client/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  Table,
  type TableProps,
} from '@lark-apaas/client-toolkit/antd-table';
import {
  applyContractTemplate,
  listContractTemplates,
} from '@client/src/api/contract-enhance';

function toErrorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

interface ContractTemplatePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplied: (result: ApplyContractTemplateResult) => void;
}

const ContractTemplatePickerDialog = ({
  open,
  onOpenChange,
  onApplied,
}: ContractTemplatePickerDialogProps) => {
  const [items, setItems] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);
  const [applyingId, setApplyingId] = useState<number | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await listContractTemplates({
        page: 1,
        pageSize: 100,
        status: '启用',
      });
      setItems(data.items);
    } catch (fetchError: unknown) {
      logger.error(`加载合同模板失败: ${toErrorText(fetchError)}`);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void fetchTemplates();
  }, [open, fetchTemplates]);

  const handleApply = async (template: ContractTemplate) => {
    setApplyingId(template.id);
    try {
      const result = await applyContractTemplate(template.id);
      toast.success(`已套用模板「${template.templateName}」`);
      onApplied(result);
    } catch (applyError: unknown) {
      logger.error(`套用模板失败: ${toErrorText(applyError)}`);
      toast.error(`套用模板失败：${toErrorText(applyError)}`);
    } finally {
      setApplyingId(null);
    }
  };

  const columns: TableProps<ContractTemplate>['columns'] = [
    {
      title: '模板编号',
      dataIndex: 'templateNo',
      key: 'templateNo',
      width: 140,
      render: (templateNo: string) => (
        <span className="font-mono text-primary font-bold">{templateNo}</span>
      ),
    },
    {
      title: '模板名称',
      dataIndex: 'templateName',
      key: 'templateName',
      width: 200,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      width: 90,
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_: unknown, record: ContractTemplate) => (
        <Button
          size="sm"
          disabled={applyingId !== null}
          onClick={() => void handleApply(record)}
        >
          {applyingId === record.id ? '套用中...' : '套用'}
        </Button>
      ),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>套用模板</DialogTitle>
          <DialogDescription>
            选择一个启用状态的模板，套用后自动预填合同类型与内容
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <p className="text-sm text-muted-foreground">模板加载失败</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchTemplates()}
            >
              重试
            </Button>
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={items}
            loading={loading}
            rowKey="id"
            scroll={{ x: 660, y: 420 }}
            pagination={false}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export { ContractTemplatePickerDialog };
