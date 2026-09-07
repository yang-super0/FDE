import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  CommissionRule,
  CommissionRuleType,
  CreateCommissionRuleRequest,
} from '@shared/api.interface';
import { createCommissionRule, updateCommissionRule } from '@client/src/api/ad-business';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@client/src/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@client/src/components/ui/form';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import { Button } from '@client/src/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@client/src/components/ui/select';
import { AdsDatePickerButton } from './AdsDatePickerButton';
import { PLATFORM_OPTIONS, PORT_TYPE_OPTIONS, RULE_TYPE_OPTIONS, toErrorText } from './ads-constants';

const NONE_VALUE: string = 'none';

const ruleSchema = z
  .object({
    ruleName: z.string().min(1, '请输入规则名称'),
    ruleType: z.string().min(1, '请选择规则类型'),
    platform: z.string(),
    portType: z.string(),
    minAmount: z.string(),
    maxAmount: z.string(),
    rate: z.string(),
    fixedAmount: z.string(),
    effectiveDate: z.string(),
    expireDate: z.string(),
    remark: z.string(),
  })
  .superRefine((data, ctx: z.RefinementCtx) => {
    const needRate: boolean = data.ruleType === '按比例' || data.ruleType === '阶梯';
    if (needRate && !data.rate.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['rate'], message: '请输入提成比例' });
    }
    if (!needRate && !data.fixedAmount.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fixedAmount'], message: '请输入固定金额' });
    }
  });

type RuleFormData = z.infer<typeof ruleSchema>;

const DEFAULT_VALUES: RuleFormData = {
  ruleName: '',
  ruleType: '按比例',
  platform: NONE_VALUE,
  portType: NONE_VALUE,
  minAmount: '',
  maxAmount: '',
  rate: '',
  fixedAmount: '',
  effectiveDate: dayjs().format('YYYY-MM-DD'),
  expireDate: dayjs().add(1, 'year').format('YYYY-MM-DD'),
  remark: '',
};

const DATE_FIELDS: { name: 'effectiveDate' | 'expireDate'; label: string }[] = [
  { name: 'effectiveDate', label: '生效日期' },
  { name: 'expireDate', label: '失效日期' },
];

const AMOUNT_FIELDS: { name: 'minAmount' | 'maxAmount'; label: string }[] = [
  { name: 'minAmount', label: '最小消耗（元）' },
  { name: 'maxAmount', label: '最大消耗（元）' },
];

interface RuleFormDialogProps {
  open: boolean;
  editing: CommissionRule | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function RuleFormDialog({ open, editing, onOpenChange, onSaved }: RuleFormDialogProps) {
  const [submitting, setSubmitting] = useState<boolean>(false);
  const form = useForm<RuleFormData>({
    resolver: zodResolver(ruleSchema),
    defaultValues: DEFAULT_VALUES,
  });
  const ruleType: string = form.watch('ruleType');
  const isRateType: boolean = ruleType === '按比例' || ruleType === '阶梯';

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.reset({
        ruleName: editing.ruleName,
        ruleType: editing.ruleType,
        platform: editing.platform || NONE_VALUE,
        portType: editing.portType || NONE_VALUE,
        minAmount: editing.minAmount !== null ? String(editing.minAmount) : '',
        maxAmount: editing.maxAmount !== null ? String(editing.maxAmount) : '',
        rate: editing.rate !== null ? String(editing.rate) : '',
        fixedAmount: editing.fixedAmount !== null ? String(editing.fixedAmount) : '',
        effectiveDate: editing.effectiveDate ? dayjs(editing.effectiveDate).format('YYYY-MM-DD') : '',
        expireDate: editing.expireDate ? dayjs(editing.expireDate).format('YYYY-MM-DD') : '',
        remark: editing.remark,
      });
    } else {
      form.reset(DEFAULT_VALUES);
    }
  }, [open, editing, form]);

  const onSubmit = form.handleSubmit(async (data: RuleFormData) => {
    setSubmitting(true);
    try {
      const payload: CreateCommissionRuleRequest = {
        ruleName: data.ruleName.trim(),
        ruleType: data.ruleType as CommissionRuleType,
        platform: data.platform === NONE_VALUE ? undefined : data.platform,
        portType: data.portType === NONE_VALUE ? undefined : data.portType,
        minAmount: data.minAmount.trim() ? Number(data.minAmount) : undefined,
        maxAmount: data.maxAmount.trim() ? Number(data.maxAmount) : undefined,
        rate: isRateType && data.rate.trim() ? Number(data.rate) : undefined,
        fixedAmount: !isRateType && data.fixedAmount.trim() ? Number(data.fixedAmount) : undefined,
        effectiveDate: data.effectiveDate || undefined,
        expireDate: data.expireDate || undefined,
        remark: data.remark.trim() || undefined,
      };
      if (editing) {
        await updateCommissionRule(editing.id, payload);
        toast.success('提成规则已更新');
      } else {
        await createCommissionRule(payload);
        toast.success('提成规则已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      logger.error(`保存提成规则失败: ${toErrorText(error)}`);
      toast.error(`保存失败：${toErrorText(error)}`);
    } finally {
      setSubmitting(false);
    }
  });

  const renderSelectField = (name: 'ruleType' | 'platform' | 'portType', label: string, options: string[], allowNone: boolean, required: boolean) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="min-w-[180px] flex-1">
          <FormLabel>
            {label} {required ? <span className="text-destructive">*</span> : null}
          </FormLabel>
          <Select onValueChange={field.onChange} value={field.value}>
            <FormControl>
              <SelectTrigger className="rounded-none">
                <SelectValue placeholder={`请选择${label}`} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {allowNone ? <SelectItem value={NONE_VALUE}>不限</SelectItem> : null}
              {options.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">{editing ? '编辑提成规则' : '新建提成规则'}</DialogTitle>
          <DialogDescription>配置提成计算规则，按比例/阶梯按消耗金额计提，固定金额按命中规则一次性计提</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="ruleName"
                render={({ field }) => (
                  <FormItem className="min-w-[240px] flex-1">
                    <FormLabel>规则名称 <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="请输入规则名称" className="rounded-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {renderSelectField('ruleType', '规则类型', RULE_TYPE_OPTIONS, false, true)}
            </div>
            <FormField
              control={form.control}
              name={isRateType ? 'rate' : 'fixedAmount'}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {isRateType ? '提成比例（%）' : '固定金额（元）'} <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step={isRateType ? '0.1' : '0.01'}
                      placeholder={isRateType ? '如：5' : '如：500'}
                      className="rounded-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-wrap gap-4">
              {renderSelectField('platform', '平台', PLATFORM_OPTIONS, true, false)}
              {renderSelectField('portType', '端口', PORT_TYPE_OPTIONS, true, false)}
            </div>
            <div className="flex flex-wrap gap-4">
              {AMOUNT_FIELDS.map((def) => (
                <FormField
                  key={def.name}
                  control={form.control}
                  name={def.name}
                  render={({ field }) => (
                    <FormItem className="min-w-[180px] flex-1">
                      <FormLabel>{def.label}</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" placeholder="选填" className="rounded-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-4">
              {DATE_FIELDS.map((def) => (
                <FormField
                  key={def.name}
                  control={form.control}
                  name={def.name}
                  render={({ field }) => (
                    <FormItem className="min-w-[180px] flex-1">
                      <FormLabel>{def.label}</FormLabel>
                      <FormControl>
                        <AdsDatePickerButton
                          value={field.value ? new Date(field.value) : undefined}
                          onChange={(date: Date | undefined) =>
                            field.onChange(date ? dayjs(date).format('YYYY-MM-DD') : '')
                          }
                          placeholder={`请选择${def.label}`}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
            <FormField
              control={form.control}
              name="remark"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>备注</FormLabel>
                  <FormControl>
                    <Textarea placeholder="选填，补充说明规则适用范围" className="rounded-none resize-none" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? '保存中...' : '保存'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
