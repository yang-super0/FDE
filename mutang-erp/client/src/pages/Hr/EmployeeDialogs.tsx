import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { hrApi } from '@client/src/api';
import type {
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
} from '@client/src/api/hr';
import { Button } from '@client/src/components/ui/button';
import { Calendar } from '@client/src/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@client/src/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import type { Employee } from '@shared/api.interface';
import dayjs from 'dayjs';
import { CalendarIcon } from 'lucide-react';
import type { DepartmentOption } from './useDepartments';

/* ============ 新建员工 ============ */

const createEmployeeSchema = z.object({
  name: z.string().min(1, '姓名不能为空'),
  employeeNo: z.string().min(1, '工号不能为空'),
  departmentId: z.string().min(1, '请选择部门'),
  position: z.string().min(1, '职位不能为空'),
  hireDate: z.date({ required_error: '请选择入职日期' }),
  phone: z.string().min(1, '联系电话不能为空'),
});

type CreateEmployeeFormData = z.infer<typeof createEmployeeSchema>;

interface CreateEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: DepartmentOption[];
  onCreated: () => void;
}

export const CreateEmployeeDialog = ({
  open,
  onOpenChange,
  departments,
  onCreated,
}: CreateEmployeeDialogProps) => {
  const [submitting, setSubmitting] = useState<boolean>(false);
  const form = useForm<CreateEmployeeFormData>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      name: '',
      employeeNo: '',
      departmentId: '',
      position: '',
      phone: '',
      hireDate: new Date(),
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: '',
        employeeNo: '',
        departmentId: '',
        position: '',
        phone: '',
      });
    }
  }, [open, form]);

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      setSubmitting(true);
      const request: CreateEmployeeRequest = {
        name: data.name,
        employeeNo: data.employeeNo,
        departmentId: data.departmentId,
        position: data.position,
        hireDate: data.hireDate.toISOString(),
        phone: data.phone,
      };
      await hrApi.createEmployee(request);
      toast.success('员工创建成功');
      onOpenChange(false);
      onCreated();
    } catch (error) {
      logger.error('创建员工失败:', error);
      toast.error('创建员工失败');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">新建员工</DialogTitle>
          <DialogDescription>录入员工基础档案信息</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[200px]">
                    <FormLabel>
                      姓名 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="请输入姓名" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="employeeNo"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[200px]">
                    <FormLabel>
                      工号 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="请输入工号" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="departmentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    部门 <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-none">
                        <SelectValue placeholder="请选择部门" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {departments.map((dept: DepartmentOption) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[200px]">
                    <FormLabel>
                      职位 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="请输入职位" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[200px]">
                    <FormLabel>
                      联系电话 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="请输入联系电话" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="hireDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    入职日期 <span className="text-destructive">*</span>
                  </FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-start rounded-none font-normal"
                        >
                          <CalendarIcon className="size-4" />
                          {field.value
                            ? dayjs(field.value).format('YYYY-MM-DD')
                            : '请选择入职日期'}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          if (date) field.onChange(date);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="rounded-none"
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button type="submit" className="rounded-none" disabled={submitting}>
                {submitting ? '提交中...' : '创建'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

/* ============ 员工档案详情 / 编辑 ============ */

const editEmployeeSchema = z.object({
  name: z.string().min(1, '姓名不能为空'),
  departmentId: z.string().min(1, '请选择部门'),
  position: z.string().min(1, '职位不能为空'),
  phone: z.string().min(1, '联系电话不能为空'),
});

type EditEmployeeFormData = z.infer<typeof editEmployeeSchema>;

interface EmployeeDetailDialogProps {
  employee: Employee | null;
  departments: DepartmentOption[];
  departmentNameMap: Map<string, string>;
  onClose: () => void;
  onUpdated: () => void;
}

export const EmployeeDetailDialog = ({
  employee,
  departments,
  departmentNameMap,
  onClose,
  onUpdated,
}: EmployeeDetailDialogProps) => {
  const [editing, setEditing] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const form = useForm<EditEmployeeFormData>({
    resolver: zodResolver(editEmployeeSchema),
    defaultValues: { name: '', departmentId: '', position: '', phone: '' },
  });

  useEffect(() => {
    if (employee) {
      setEditing(false);
      form.reset({
        name: employee.name,
        departmentId: employee.departmentId,
        position: employee.position,
        phone: employee.phone,
      });
    }
  }, [employee, form]);

  const handleSubmit = form.handleSubmit(async (data) => {
    if (!employee) return;
    try {
      setSubmitting(true);
      const request: UpdateEmployeeRequest = {
        name: data.name,
        departmentId: data.departmentId,
        position: data.position,
        phone: data.phone,
      };
      await hrApi.updateEmployee(employee.id, request);
      toast.success('员工信息已更新');
      setEditing(false);
      onUpdated();
    } catch (error) {
      logger.error('更新员工信息失败:', error);
      toast.error('更新员工信息失败');
    } finally {
      setSubmitting(false);
    }
  });

  const detailRows: Array<{ label: string; value: string }> = employee
    ? [
        { label: '姓名', value: employee.name },
        { label: '工号', value: employee.employeeNo },
        {
          label: '部门',
          value: employee.departmentId
            ? departmentNameMap.get(employee.departmentId) ??
              employee.departmentName
            : '',
        },
        { label: '职位', value: employee.position },
        {
          label: '入职日期',
          value: employee.hireDate
            ? dayjs(employee.hireDate).format('YYYY-MM-DD')
            : '',
        },
        { label: '联系电话', value: employee.phone },
      ]
    : [];

  return (
    <Dialog open={Boolean(employee)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-none sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">员工档案</DialogTitle>
          <DialogDescription>查看并维护员工基础信息</DialogDescription>
        </DialogHeader>
        {employee && !editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {detailRows.map((row) => (
                <div key={row.label} className="space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                    {row.label}
                  </div>
                  <div className="text-sm font-medium break-words">
                    {row.value || '—'}
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="rounded-none"
                onClick={onClose}
              >
                关闭
              </Button>
              <Button
                type="button"
                className="rounded-none"
                onClick={() => setEditing(true)}
              >
                编辑
              </Button>
            </DialogFooter>
          </div>
        ) : null}
        {employee && editing ? (
          <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="flex-1 min-w-[200px]">
                      <FormLabel>
                        姓名 <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="请输入姓名" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem className="flex-1 min-w-[200px]">
                      <FormLabel>
                        职位 <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="请输入职位" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      部门 <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-none">
                          <SelectValue placeholder="请选择部门" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments.map((dept: DepartmentOption) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      联系电话 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="请输入联系电话" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-none"
                  onClick={() => {
                    setEditing(false);
                    form.reset({
                      name: employee.name,
                      departmentId: employee.departmentId,
                      position: employee.position,
                      phone: employee.phone,
                    });
                  }}
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  className="rounded-none"
                  disabled={submitting}
                >
                  {submitting ? '保存中...' : '保存'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
