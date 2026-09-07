import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { AssetStatus } from '@shared/api.interface';
import { Button } from '@client/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@client/src/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@client/src/components/ui/form';
import { Input } from '@client/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';

interface AdminAssetRegisterDialogProps {
  onCreate: (data: {
    name: string;
    assetNo: string;
    status: AssetStatus;
  }) => Promise<boolean>;
}

const assetSchema = z.object({
  name: z.string().min(1, '资产名称不能为空'),
  assetNo: z.string().min(1, '资产编号不能为空'),
  status: z.enum(['in_stock', 'in_use', 'repairing']),
});

type AssetFormData = z.infer<typeof assetSchema>;

const ASSET_FORM_DEFAULTS: AssetFormData = {
  name: '',
  assetNo: '',
  status: 'in_stock',
};

const AdminAssetRegisterDialog = ({
  onCreate,
}: AdminAssetRegisterDialogProps) => {
  const [open, setOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const form = useForm<AssetFormData>({
    resolver: zodResolver(assetSchema),
    defaultValues: ASSET_FORM_DEFAULTS,
  });

  useEffect(() => {
    if (open) {
      form.reset(ASSET_FORM_DEFAULTS);
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-ai-section-type="button">登记资产</Button>
      </DialogTrigger>
      <DialogContent className="rounded-none">
        <DialogHeader>
          <DialogTitle>登记资产</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(async (data: AssetFormData) => {
              setSubmitting(true);
              const success: boolean = await onCreate({
                name: data.name,
                assetNo: data.assetNo,
                status: data.status,
              });
              setSubmitting(false);
              if (success) setOpen(false);
            })}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    资产名称 <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="请输入资产名称" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="assetNo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    资产编号 <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="请输入资产编号" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>初始状态</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="请选择状态" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="in_stock">在库</SelectItem>
                      <SelectItem value="in_use">在用</SelectItem>
                      <SelectItem value="repairing">维修中</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? '提交中...' : '确认登记'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export { AdminAssetRegisterDialog };
