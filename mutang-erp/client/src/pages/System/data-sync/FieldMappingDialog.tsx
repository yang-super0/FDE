import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import type { SyncConfigItem, SyncFieldMappingItem } from '@shared/api.interface';
import { Button } from '@client/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { Input } from '@client/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import {
  listSyncConfigs,
  toFeishuSyncErrorText,
  updateSyncConfig,
} from '@client/src/api/feishu-sync';
import { SyncFieldTypeBadge } from './sync-shared';

const FIELD_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'text', label: '文本' },
  { value: 'number', label: '数字' },
  { value: 'checkbox', label: '复选框' },
  { value: 'date', label: '日期' },
];

export interface FieldMappingDialogProps {
  open: boolean;
  config: SyncConfigItem | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const asFieldType = (
  value: string,
): SyncFieldMappingItem['fieldType'] =>
  value === 'number' || value === 'checkbox' || value === 'date'
    ? value
    : 'text';

const FieldMappingDialog: React.FC<FieldMappingDialogProps> = ({
  open,
  config,
  onOpenChange,
  onSaved,
}) => {
  const [rows, setRows] = useState<SyncFieldMappingItem[]>([]);
  const [pristineJson, setPristineJson] = useState<string>('[]');
  const [saving, setSaving] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);

  useEffect(() => {
    if (!config) return;
    const initial: SyncFieldMappingItem[] = (config.fieldMapping ?? []).map(
      (item: SyncFieldMappingItem) => ({ ...item }),
    );
    setRows(initial);
    setPristineJson(JSON.stringify(initial));
  }, [config]);

  const dirty: boolean =
    config !== null && JSON.stringify(rows) !== pristineJson;

  const updateRow = (
    fieldName: string,
    patch: Partial<SyncFieldMappingItem>,
  ): void => {
    setRows((current: SyncFieldMappingItem[]) =>
      current.map((row: SyncFieldMappingItem) =>
        row.fieldName === fieldName ? { ...row, ...patch } : row,
      ),
    );
  };

  const handleSave = async (): Promise<void> => {
    const target: SyncConfigItem | null = config;
    if (!target) return;
    setSaving(true);
    try {
      const payload: SyncFieldMappingItem[] = rows.map(
        (row: SyncFieldMappingItem) => ({
          fieldName: row.fieldName,
          fieldType: row.fieldType,
          bitableFieldName:
            row.bitableFieldName && row.bitableFieldName.trim() !== ''
              ? row.bitableFieldName.trim()
              : undefined,
        }),
      );
      await updateSyncConfig(target.id, { fieldMapping: payload });
      setPristineJson(JSON.stringify(rows));
      toast.success(`「${target.displayName}」字段映射已保存`);
      onSaved();
    } catch (error: unknown) {
      logger.error('保存字段映射失败', String(error));
      toast.error(toFeishuSyncErrorText(error));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (): Promise<void> => {
    const target: SyncConfigItem | null = config;
    if (!target) return;
    setResetting(true);
    try {
      await updateSyncConfig(target.id, { fieldMapping: [] });
      const result = await listSyncConfigs();
      const updated: SyncConfigItem | undefined = result.items.find(
        (item: SyncConfigItem) => item.id === target.id,
      );
      const next: SyncFieldMappingItem[] = (updated?.fieldMapping ?? []).map(
        (item: SyncFieldMappingItem) => ({ ...item }),
      );
      setRows(next);
      setPristineJson(JSON.stringify(next));
      toast.success(`「${target.displayName}」字段映射已重置为默认`);
      onSaved();
    } catch (error: unknown) {
      logger.error('重置字段映射失败', String(error));
      toast.error(toFeishuSyncErrorText(error));
    } finally {
      setResetting(false);
    }
  };

  const columns: TableColumnsType<SyncFieldMappingItem> = [
    {
      title: '应用字段',
      dataIndex: 'fieldName',
      width: 220,
      fixed: 'left',
      render: (_value: unknown, record: SyncFieldMappingItem) => (
        <div className="min-w-0 space-y-1">
          <div className="truncate font-mono text-xs" title={record.fieldName}>
            {record.fieldName}
          </div>
          <SyncFieldTypeBadge fieldType={record.fieldType} />
        </div>
      ),
    },
    {
      title: '飞书字段名',
      dataIndex: 'bitableFieldName',
      width: 260,
      render: (_value: unknown, record: SyncFieldMappingItem) => (
        <Input
          className="h-8 rounded-none"
          value={record.bitableFieldName ?? record.fieldName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            updateRow(record.fieldName, { bitableFieldName: e.target.value })
          }
        />
      ),
    },
    {
      title: '字段类型',
      dataIndex: 'fieldType',
      width: 160,
      render: (_value: unknown, record: SyncFieldMappingItem) => (
        <Select
          value={record.fieldType}
          onValueChange={(value: string) =>
            updateRow(record.fieldName, { fieldType: asFieldType(value) })
          }
        >
          <SelectTrigger className="h-8 w-32 rounded-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-none">
            {FIELD_TYPE_OPTIONS.map(
              (option: { value: string; label: string }) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
      ),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-black">
            字段映射 · {config?.displayName ?? '—'}
          </DialogTitle>
          <DialogDescription>
            应用字段 → 飞书多维表格字段名与类型映射 · 修改后需保存生效
          </DialogDescription>
        </DialogHeader>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            暂无字段映射
          </p>
        ) : (
          <Table<SyncFieldMappingItem>
            columns={columns}
            dataSource={rows}
            rowKey="fieldName"
            scroll={{ x: 640, y: 400 }}
            pagination={false}
            locale={{ emptyText: '暂无字段映射' }}
          />
        )}
        <DialogFooter>
          <Button
            data-ai-section-type="button"
            variant="outline"
            className="rounded-none"
            disabled={resetting || saving || rows.length === 0}
            onClick={() => void handleReset()}
          >
            {resetting ? '重置中…' : '重置为默认'}
          </Button>
          <Button
            data-ai-section-type="button"
            className="rounded-none"
            disabled={!dirty || saving || rows.length === 0}
            onClick={() => void handleSave()}
          >
            {saving ? '保存中…' : '保存映射'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FieldMappingDialog;
