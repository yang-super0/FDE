import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import type { SysConfig } from '@shared/api.interface';
import { ReportCard } from '@client/src/components/blueprint';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Label } from '@client/src/components/ui/label';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { systemApi } from '@client/src/api';

export function SystemConfigSection() {
  const [configs, setConfigs] = useState<SysConfig[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    const loadConfigs = async () => {
      try {
        const res = await systemApi.listConfigs();
        setConfigs(res.items);
        const next: Record<string, string> = {};
        res.items.forEach((item: SysConfig) => {
          next[item.id] = item.configValue;
        });
        setValues(next);
      } catch (error) {
        logger.error('加载系统参数失败', error);
        toast.error('加载系统参数失败');
      } finally {
        setLoading(false);
      }
    };
    loadConfigs();
  }, []);

  const handleChange = (id: string, e: ChangeEvent<HTMLInputElement>) => {
    const value: string = e.target.value;
    setValues((prev: Record<string, string>) => ({ ...prev, [id]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: systemApi.UpdateConfigsRequest = {
        configs: configs.map((item: SysConfig) => ({
          id: item.id,
          configValue: values[item.id] ?? item.configValue,
        })),
      };
      await systemApi.updateConfigs(payload);
      toast.success('系统参数保存成功');
    } catch (error) {
      logger.error('保存系统参数失败', error);
      toast.error('保存系统参数失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ReportCard>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.15em] text-foreground">
            系统参数
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">
            维护全局运行参数，保存后即时生效
          </div>
        </div>
        <Button
          data-ai-section-type="button"
          size="sm"
          onClick={handleSave}
          disabled={saving || loading || configs.length === 0}
        >
          {saving ? '保存中...' : '保存参数'}
        </Button>
      </div>
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-16 rounded-none" />
          <Skeleton className="h-16 rounded-none" />
          <Skeleton className="h-16 rounded-none" />
          <Skeleton className="h-16 rounded-none" />
        </div>
      ) : configs.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          暂无系统参数
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {configs.map((item: SysConfig) => (
            <div key={item.id} className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="text-xs font-bold">{item.description}</Label>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {item.configKey}
                </span>
              </div>
              <Input
                value={values[item.id] ?? ''}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  handleChange(item.id, e)
                }
                placeholder="请输入参数值"
              />
            </div>
          ))}
        </div>
      )}
    </ReportCard>
  );
}
