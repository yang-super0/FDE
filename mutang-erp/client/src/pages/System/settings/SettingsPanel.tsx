import { useCallback, useEffect, useState } from 'react';
import { RotateCcw, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  SystemSetting,
  SystemSettingListParams,
} from '@shared/api.interface';
import {
  deleteSystemSetting,
  listSystemSettings,
  resetSystemSetting,
} from '@client/src/api/system-enhance/settings';
import { ReportCard } from '@client/src/components/blueprint';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Skeleton } from '@client/src/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import {
  SYSTEM_ENHANCE_FILTER_ALL,
  SYSTEM_SETTING_CATEGORIES,
  SystemEnhanceSystemFlagBadge,
  formatSystemEnhanceDateTime,
  isSystemEnhanceJsonType,
  isSystemEnhanceNumberType,
  renderSystemSettingValue,
  toSystemEnhanceErrorText,
} from '../system-enhance-shared';
import { SettingsEditDialog } from './settings-edit-dialog';

const SettingsPanel: React.FC = () => {
  const [category, setCategory] = useState<string>(SYSTEM_ENHANCE_FILTER_ALL);
  const [keywordInput, setKeywordInput] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [items, setItems] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [editing, setEditing] = useState<SystemSetting | null>(null);
  const [resetting, setResetting] = useState<SystemSetting | null>(null);
  const [deleting, setDeleting] = useState<SystemSetting | null>(null);

  const loadList = useCallback(async (): Promise<void> => {
    setLoading(true);
    setLoadError(null);
    try {
      const params: SystemSettingListParams = {
        category: category === SYSTEM_ENHANCE_FILTER_ALL ? undefined : category,
        keyword: keyword || undefined,
      };
      const result: SystemSetting[] = await listSystemSettings(params);
      setItems(result);
    } catch (error: unknown) {
      const message: string = toSystemEnhanceErrorText(error);
      setLoadError(message);
      logger.error(`加载系统设置失败: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [category, keyword]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const handleReset = async (): Promise<void> => {
    if (!resetting) return;
    try {
      await resetSystemSetting(resetting.id);
      toast.success('已恢复默认值');
      setResetting(null);
      void loadList();
    } catch (error: unknown) {
      const message: string = toSystemEnhanceErrorText(error);
      logger.error(`重置配置失败: ${message}`);
      toast.error(`重置失败：${message}`);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleting) return;
    try {
      await deleteSystemSetting(deleting.id);
      toast.success('已删除该配置');
      setDeleting(null);
      void loadList();
    } catch (error: unknown) {
      const message: string = toSystemEnhanceErrorText(error);
      logger.error(`删除配置失败: ${message}`);
      toast.error(`删除失败：${message}`);
    }
  };

  return (
    <div className="space-y-6">
      <ReportCard className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={category}
            onValueChange={(next: string) => setCategory(next)}
          >
            <SelectTrigger className="w-[180px] rounded-none">
              <SelectValue placeholder="全部分类" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SYSTEM_ENHANCE_FILTER_ALL}>全部分类</SelectItem>
              {SYSTEM_SETTING_CATEGORIES.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="按配置名称 / 配置键搜索"
            className="w-[260px] rounded-none"
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') setKeyword(keywordInput.trim());
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setKeyword(keywordInput.trim())}
          >
            <Search className="size-4" />
            搜索
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((row: number) => (
              <Skeleton key={row} className="h-10 w-full rounded-none" />
            ))}
          </div>
        ) : loadError !== null ? (
          <div className="space-y-3 py-8 text-center">
            <p className="text-sm text-destructive">加载失败：{loadError}</p>
            <Button type="button" variant="outline" onClick={() => void loadList()}>
              重试
            </Button>
          </div>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            暂无数据
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>配置名称</TableHead>
                  <TableHead>配置键</TableHead>
                  <TableHead>分类</TableHead>
                  <TableHead>配置值</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>内置</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead>更新时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item: SystemSetting) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.settingName}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {item.settingKey}
                    </TableCell>
                    <TableCell>{item.settingCategory}</TableCell>
                    <TableCell className="max-w-[220px]">
                      {isSystemEnhanceNumberType(item.valueType) ? (
                        <span className="font-mono tabular-nums">
                          {renderSystemSettingValue(item.settingValue, item.valueType)}
                        </span>
                      ) : isSystemEnhanceJsonType(item.valueType) ? (
                        <span
                          className="block max-w-[220px] truncate font-mono text-xs"
                          title={renderSystemSettingValue(item.settingValue, item.valueType)}
                        >
                          {renderSystemSettingValue(item.settingValue, item.valueType)}
                        </span>
                      ) : (
                        <span>
                          {renderSystemSettingValue(item.settingValue, item.valueType)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.valueType}
                    </TableCell>
                    <TableCell>
                      <SystemEnhanceSystemFlagBadge isSystem={item.isSystem} />
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                      {item.description ?? '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatSystemEnhanceDateTime(item.updatedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditing(item)}
                        >
                          编辑
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setResetting(item)}
                        >
                          <RotateCcw className="size-4" />
                          重置
                        </Button>
                        {item.isSystem ? null : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleting(item)}
                          >
                            <Trash2 className="size-4" />
                            删除
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </ReportCard>

      <SettingsEditDialog
        open={editing !== null}
        setting={editing}
        onOpenChange={(open: boolean) => {
          if (!open) setEditing(null);
        }}
        onSaved={() => void loadList()}
      />

      <AdsConfirmDialog
        open={resetting !== null}
        title="恢复默认值"
        description={`确认将「${resetting?.settingName ?? ''}」恢复为默认值吗？`}
        confirmText="恢复默认"
        onOpenChange={(open: boolean) => {
          if (!open) setResetting(null);
        }}
        onConfirm={() => void handleReset()}
      />

      <AdsConfirmDialog
        open={deleting !== null}
        title="删除配置"
        description={`确认删除「${deleting?.settingName ?? ''}」吗？该操作不可恢复。`}
        confirmText="删除"
        destructive
        onOpenChange={(open: boolean) => {
          if (!open) setDeleting(null);
        }}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
};

export default SettingsPanel;
