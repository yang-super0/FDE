import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  SystemSetting,
  SystemSettingUpdateDto,
} from '@shared/api.interface';
import { updateSystemSetting } from '@client/src/api/system-enhance/settings';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  SystemEnhanceFormField,
  isSystemEnhanceBooleanType,
  isSystemEnhanceJsonType,
  isSystemEnhanceNumberType,
  toSystemEnhanceErrorText,
} from '../system-enhance-shared';

interface SettingsEditDialogProps {
  open: boolean;
  setting: SystemSetting | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export const SettingsEditDialog: React.FC<SettingsEditDialogProps> = ({
  open,
  setting,
  onOpenChange,
  onSaved,
}) => {
  const [textValue, setTextValue] = useState<string>('');
  const [boolValue, setBoolValue] = useState<string>('否');
  const [remark, setRemark] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open || !setting) return;
    setRemark(setting.remark ?? '');
    if (isSystemEnhanceBooleanType(setting.valueType)) {
      setBoolValue(setting.settingValue === true ? '是' : '否');
      setTextValue('');
      return;
    }
    if (isSystemEnhanceJsonType(setting.valueType)) {
      try {
        setTextValue(JSON.stringify(setting.settingValue, null, 2));
      } catch {
        setTextValue(String(setting.settingValue ?? ''));
      }
      return;
    }
    setTextValue(
      setting.settingValue === null || setting.settingValue === undefined
        ? ''
        : String(setting.settingValue),
    );
  }, [open, setting]);

  const jsonInvalid: boolean = (() => {
    if (!open || !setting) return false;
    if (!isSystemEnhanceJsonType(setting.valueType)) return false;
    if (textValue.trim() === '') return false;
    try {
      JSON.parse(textValue);
      return false;
    } catch {
      return true;
    }
  })();

  const numberInvalid: boolean = (() => {
    if (!open || !setting) return false;
    if (!isSystemEnhanceNumberType(setting.valueType)) return false;
    if (textValue.trim() === '') return false;
    return Number.isNaN(Number(textValue));
  })();

  const handleSubmit = async (): Promise<void> => {
    if (!setting) return;
    let settingValue: unknown;
    if (isSystemEnhanceBooleanType(setting.valueType)) {
      settingValue = boolValue === '是';
    } else if (isSystemEnhanceJsonType(setting.valueType)) {
      try {
        settingValue = JSON.parse(textValue);
      } catch {
        toast.error('JSON 格式不合法，请检查后重试');
        return;
      }
    } else if (isSystemEnhanceNumberType(setting.valueType)) {
      const parsed: number = Number(textValue);
      if (textValue.trim() === '' || Number.isNaN(parsed)) {
        toast.error('请输入有效的数字');
        return;
      }
      settingValue = parsed;
    } else {
      settingValue = textValue;
    }
    setSubmitting(true);
    try {
      const payload: SystemSettingUpdateDto = {
        settingValue,
        remark: remark.trim() || undefined,
      };
      await updateSystemSetting(setting.id, payload);
      toast.success('配置已保存');
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      logger.error(`保存配置失败: ${toSystemEnhanceErrorText(error)}`);
      toast.error(`保存失败：${toSystemEnhanceErrorText(error)}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!setting) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">编辑配置</DialogTitle>
          <DialogDescription>
            {setting.isSystem
              ? '系统内置配置仅允许修改配置值与备注'
              : '修改配置值与备注'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <SystemEnhanceFormField label="配置名称">
              <Input value={setting.settingName} disabled className="rounded-none" />
            </SystemEnhanceFormField>
            <SystemEnhanceFormField label="配置键">
              <Input value={setting.settingKey} disabled className="rounded-none" />
            </SystemEnhanceFormField>
          </div>
          <div className="flex flex-wrap gap-4">
            <SystemEnhanceFormField label="分类">
              <Input value={setting.settingCategory} disabled className="rounded-none" />
            </SystemEnhanceFormField>
            <SystemEnhanceFormField label="类型">
              <Input value={setting.valueType} disabled className="rounded-none" />
            </SystemEnhanceFormField>
          </div>
          <SystemEnhanceFormField label="配置值" required>
            {isSystemEnhanceBooleanType(setting.valueType) ? (
              <Select value={boolValue} onValueChange={setBoolValue}>
                <SelectTrigger className="rounded-none">
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="是">是（开）</SelectItem>
                  <SelectItem value="否">否（关）</SelectItem>
                </SelectContent>
              </Select>
            ) : isSystemEnhanceJsonType(setting.valueType) ? (
              <Textarea
                className="rounded-none font-mono text-xs"
                rows={6}
                placeholder='请输入合法 JSON，如 {"days": 30}'
                value={textValue}
                onChange={(event) => setTextValue(event.target.value)}
              />
            ) : (
              <Input
                type={isSystemEnhanceNumberType(setting.valueType) ? 'number' : 'text'}
                className="rounded-none"
                value={textValue}
                onChange={(event) => setTextValue(event.target.value)}
              />
            )}
            {jsonInvalid ? (
              <p className="text-xs font-medium text-destructive">
                JSON 格式不合法，修正后才能提交
              </p>
            ) : null}
            {numberInvalid ? (
              <p className="text-xs font-medium text-destructive">
                请输入有效的数字
              </p>
            ) : null}
          </SystemEnhanceFormField>
          <SystemEnhanceFormField label="备注">
            <Textarea
              className="rounded-none resize-none"
              rows={2}
              placeholder="选填，补充说明"
              value={remark}
              onChange={(event) => setRemark(event.target.value)}
            />
          </SystemEnhanceFormField>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            type="button"
            disabled={submitting || jsonInvalid || numberInvalid}
            onClick={() => void handleSubmit()}
          >
            {submitting ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
