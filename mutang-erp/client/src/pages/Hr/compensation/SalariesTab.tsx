import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Calculator, Download, Plus, RotateCcw, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { useFieldPermissions } from '@client/src/hooks/useFieldPermissions';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import type { HrSalary, HrSalaryListParams } from '@shared/api.interface';
import {
  calculateHrSalary, confirmHrSalary, deleteHrSalary, fetchHrSalaries, payHrSalary,
} from '@client/src/api/hr-enhance/compensation';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { HR_FILTER_ALL, HR_SALARY_STATUS_OPTIONS, HrStatusBadge } from '../hr-enhance-constants';
import {
  COMP_PAGE_SIZE, CompActionLink, CompFilterSelect, exportSalariesExcel,
  renderCompMoney, reportCompError, useSalaryBatchActions,
} from './compensation-shared';
import { SalaryFormDialog } from './SalaryFormDialog';
import { PayslipDialog } from './PayslipDialog';

type SalaryRowAction = 'calculate' | 'pay' | 'confirm';

const SALARY_ACTION_TEXT: Record<SalaryRowAction, string> = {
  calculate: '核算', pay: '发放', confirm: '确认',
};

interface SalaryAmountColumnDef {
  key: string;
  title: string;
  dataIndex: keyof HrSalary;
  permField: string;
  width: number;
  strong?: boolean;
}

const SALARY_AMOUNT_COLUMNS: SalaryAmountColumnDef[] = [
  { key: 'hr-salaries-base', title: '基本工资', dataIndex: 'baseSalary', permField: 'base_salary', width: 110 },
  { key: 'hr-salaries-performance', title: '绩效工资', dataIndex: 'performanceSalary', permField: 'performance_salary', width: 110 },
  { key: 'hr-salaries-allowance', title: '补贴', dataIndex: 'allowance', permField: 'allowance', width: 100 },
  { key: 'hr-salaries-deduction', title: '扣款', dataIndex: 'deduction', permField: 'deduction', width: 100 },
  { key: 'hr-salaries-tax', title: '个税', dataIndex: 'tax', permField: 'tax', width: 100 },
  { key: 'hr-salaries-social', title: '社保', dataIndex: 'socialInsurance', permField: 'social_insurance', width: 100 },
  { key: 'hr-salaries-actual', title: '实发工资', dataIndex: 'actualSalary', permField: 'actual_salary', width: 120, strong: true },
];

export function SalariesTab() {
  const [draftMonth, setDraftMonth] = useState<string>('');
  const [draftDept, setDraftDept] = useState<string>('');
  const [draftEmployee, setDraftEmployee] = useState<string>('');
  const [salaryMonth, setSalaryMonth] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [employeeName, setEmployeeName] = useState<string>('');
  const [status, setStatus] = useState<string>(HR_FILTER_ALL);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<HrSalary[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<HrSalary | null>(null);
  const [payslipOf, setPayslipOf] = useState<HrSalary | null>(null);
  const [deleteOf, setDeleteOf] = useState<HrSalary | null>(null);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setSalaryMonth(draftMonth.trim());
      setDepartment(draftDept.trim());
      setEmployeeName(draftEmployee.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftMonth, draftDept, draftEmployee]);

  const filterParams = useMemo((): HrSalaryListParams => ({
    salaryMonth: salaryMonth || undefined,
    department: department || undefined,
    employeeName: employeeName || undefined,
    status: status === HR_FILTER_ALL ? undefined : status,
  }), [salaryMonth, department, employeeName, status]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchHrSalaries({
        ...filterParams, page: String(page), pageSize: String(COMP_PAGE_SIZE),
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      reportCompError('加载工资列表失败', error);
    } finally {
      setLoading(false);
    }
  }, [filterParams, page]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const refresh = useCallback((): void => {
    void loadList();
  }, [loadList]);

  const { batchNode, openBatch } = useSalaryBatchActions(refresh);
  const { fields: permFields } = useFieldPermissions('人资');

  const handleReset = (): void => {
    setDraftMonth('');
    setDraftDept('');
    setDraftEmployee('');
    setSalaryMonth('');
    setDepartment('');
    setEmployeeName('');
    setStatus(HR_FILTER_ALL);
    setPage(1);
  };

  const runRowAction = useCallback(async (
    item: HrSalary, action: SalaryRowAction,
  ): Promise<void> => {
    try {
      if (action === 'calculate') await calculateHrSalary(item.id);
      else if (action === 'pay') await payHrSalary(item.id);
      else await confirmHrSalary(item.id);
      toast.success(`工资条「${item.salaryNo}」已${SALARY_ACTION_TEXT[action]}`);
      void loadList();
    } catch (error: unknown) {
      reportCompError(`${SALARY_ACTION_TEXT[action]}工资失败`, error);
    }
  }, [loadList]);

  const handleDelete = async (): Promise<void> => {
    if (!deleteOf) return;
    try {
      await deleteHrSalary(deleteOf.id);
      toast.success('工资条已删除');
      setDeleteOf(null);
      refresh();
    } catch (error: unknown) {
      reportCompError('删除工资失败', error);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const count: number = await exportSalariesExcel(filterParams);
      toast.success(`已导出 ${count} 条工资记录`);
    } catch (error: unknown) {
      reportCompError('导出工资记录失败', error);
    }
  };

  const columns = useMemo((): TableColumnsType<HrSalary> => [
    {
      key: 'hr-salaries-no', title: '工资条号', dataIndex: 'salaryNo', width: 140, fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    { key: 'hr-salaries-employee', title: '员工', dataIndex: 'employeeName', width: 90 },
    { key: 'hr-salaries-department', title: '部门', dataIndex: 'department', width: 120 },
    { key: 'hr-salaries-month', title: '月份', dataIndex: 'salaryMonth', width: 90 },
    ...SALARY_AMOUNT_COLUMNS.filter(
      (column: SalaryAmountColumnDef) =>
        permFields.get(column.permField)?.visible !== false,
    ).map((column: SalaryAmountColumnDef) => ({
      key: column.key,
      title: column.title,
      dataIndex: column.dataIndex,
      width: column.width,
      align: 'right' as const,
      render: (value: string | null) => renderCompMoney(value, column.strong),
    })),
    { key: 'hr-salaries-status', title: '状态', dataIndex: 'status', width: 90,
      render: (value: string) => <HrStatusBadge status={value} /> },
    { key: 'hr-salaries-payDate', title: '发薪日', dataIndex: 'payDate', width: 110,
      render: (value: string | null) => (value ? dayjs(value).format('YYYY-MM-DD') : '—') },
    {
      key: 'hr-salaries-actions', title: '操作', width: 240, fixed: 'right',
      render: (_: unknown, record: HrSalary) => (
        <div className="flex flex-wrap items-center gap-1">
          {record.status === '待核算' ? (
            <CompActionLink onClick={() => void runRowAction(record, 'calculate')}>
              核算
            </CompActionLink>
          ) : null}
          {record.status === '已核算' ? (
            <CompActionLink onClick={() => void runRowAction(record, 'pay')}>
              发放
            </CompActionLink>
          ) : null}
          {record.status === '已发放' ? (
            <CompActionLink onClick={() => void runRowAction(record, 'confirm')}>
              确认
            </CompActionLink>
          ) : null}
          <CompActionLink onClick={() => setPayslipOf(record)}>工资条</CompActionLink>
          <CompActionLink onClick={() => { setEditing(record); setFormOpen(true); }}>
            编辑
          </CompActionLink>
          <CompActionLink danger onClick={() => setDeleteOf(record)}>删除</CompActionLink>
        </div>
      ),
    },
  ], [runRowAction, permFields]);

  const {
    visibleColumns, columnMetas, hiddenIds,
    toggleColumn, resetColumns, setAllColumns,
  } = useColumnSettings(columns);

  return (
    <div>
      {/* 筛选区 */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input className="w-32 rounded-none" placeholder="YYYY-MM" value={draftMonth}
          onChange={(event) => setDraftMonth(event.target.value)} />
        <Input className="w-36 rounded-none" placeholder="部门" value={draftDept}
          onChange={(event) => setDraftDept(event.target.value)} />
        <Input className="w-36 rounded-none" placeholder="员工姓名" value={draftEmployee}
          onChange={(event) => setDraftEmployee(event.target.value)} />
        <CompFilterSelect
          value={status}
          placeholder="状态"
          allLabel="全部状态"
          options={HR_SALARY_STATUS_OPTIONS}
          onChange={(value: string) => {
            setStatus(value);
            setPage(1);
          }}
        />
        <Button variant="ghost" size="sm" className="rounded-none" onClick={handleReset}>
          <RotateCcw className="h-3.5 w-3.5" />
          重置
        </Button>
      </div>
      {/* 操作区 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button data-ai-section-type="button" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          新建工资条
        </Button>
        <Button variant="outline" onClick={() => openBatch('calculate')}>
          <Calculator className="h-4 w-4" />
          批量核算
        </Button>
        <Button variant="outline" onClick={() => openBatch('pay')}>
          <Wallet className="h-4 w-4" />
          批量发放
        </Button>
        <Button variant="outline" onClick={() => void handleExport()}>
          <Download className="h-4 w-4" />
          导出Excel
        </Button>
        <ColumnSettingsButton
          columnMetas={columnMetas} hiddenIds={hiddenIds}
          onToggle={toggleColumn} onReset={resetColumns} onSetAll={setAllColumns}
        />
      </div>
      {/* 表格 */}
      <Table<HrSalary>
        columns={visibleColumns}
        dataSource={items}
        loading={loading}
        rowKey="id"
        scroll={{ x: 1700, y: 500 }}
        pagination={{
          current: page,
          pageSize: COMP_PAGE_SIZE,
          total,
          onChange: (nextPage: number) => setPage(nextPage),
        }}
      />
      <SalaryFormDialog
        open={formOpen}
        item={editing}
        onSaved={refresh}
        onOpenChange={(open: boolean) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
      />
      <PayslipDialog
        open={payslipOf !== null}
        salary={payslipOf}
        onOpenChange={(open: boolean) => {
          if (!open) setPayslipOf(null);
        }}
      />
      {batchNode}
      <AdsConfirmDialog
        open={deleteOf !== null}
        title="删除工资条？"
        description={deleteOf ? `即将删除工资条「${deleteOf.salaryNo}」，删除后不可恢复。` : ''}
        confirmText="删除"
        destructive
        onOpenChange={(open: boolean) => {
          if (!open) setDeleteOf(null);
        }}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
