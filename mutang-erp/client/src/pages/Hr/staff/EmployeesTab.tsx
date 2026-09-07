import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Download, Plus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@client/src/components/ui/select';
import type { HrEmployee, HrEmployeeListParams } from '@shared/api.interface';
import {
  deleteHrEmployee, fetchHrEmployees, leaveConfirmHrEmployee,
} from '@client/src/api/hr-enhance/staff';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportEmployeesToExcel } from './employee-export';
import {
  HR_EMPLOYEE_STATUS_OPTIONS, HR_FILTER_ALL, HrStatusBadge, toHrErrorText,
} from '../hr-enhance-constants';
import {
  EmployeeFlowDialog, type HrEmployeeFlowPending,
} from './EmployeeFlowDialogs';
import {
  DIRECT_ACTION_TEXT, EmployeeActionsCell, type HrEmployeeDirectAction,
} from './EmployeeActionsCell';
import { EmployeeFormDialog } from './EmployeeFormDialog';
import { EmployeeDetailDialog } from './EmployeeDetailDialog';

const HR_STAFF_PAGE_SIZE: number = 10;
const HR_STAFF_EXPORT_LIMIT: number = 100;

interface PendingDirectAction {
  item: HrEmployee;
  action: HrEmployeeDirectAction;
}

export function EmployeesTab() {
  const [draftDepartment, setDraftDepartment] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [draftKeyword, setDraftKeyword] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [status, setStatus] = useState<string>(HR_FILTER_ALL);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<HrEmployee[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<HrEmployee | null>(null);
  const [detailOpen, setDetailOpen] = useState<boolean>(false);
  const [detailEmployee, setDetailEmployee] = useState<HrEmployee | null>(null);
  const [flowPending, setFlowPending] = useState<HrEmployeeFlowPending | null>(null);
  const [direct, setDirect] = useState<PendingDirectAction | null>(null);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setDepartment(draftDepartment.trim());
      setKeyword(draftKeyword.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftDepartment, draftKeyword]);

  const filterParams = useMemo((): HrEmployeeListParams => ({
    department: department || undefined,
    keyword: keyword || undefined,
    status: status === HR_FILTER_ALL ? undefined : status,
  }), [department, keyword, status]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchHrEmployees({
        ...filterParams, page: String(page), pageSize: String(HR_STAFF_PAGE_SIZE),
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      toast.error(toHrErrorText(error));
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

  const handleViewDetail = useCallback((item: HrEmployee): void => {
    setDetailEmployee(item);
    setDetailOpen(true);
  }, []);

  const handleEdit = useCallback((item: HrEmployee): void => {
    setEditing(item);
    setFormOpen(true);
  }, []);

  const handleDirectClick = useCallback(
    (item: HrEmployee, action: HrEmployeeDirectAction): void => {
      setDirect({ item, action });
    },
    [],
  );

  const handleReset = (): void => {
    setDraftDepartment('');
    setDepartment('');
    setDraftKeyword('');
    setKeyword('');
    setStatus(HR_FILTER_ALL);
    setPage(1);
  };

  const handleDirect = async (): Promise<void> => {
    if (!direct) return;
    const actionText: string = DIRECT_ACTION_TEXT[direct.action];
    try {
      if (direct.action === 'leave-confirm') {
        await leaveConfirmHrEmployee(direct.item.id);
        toast.success('离职已确认，员工状态更新为已离职');
      } else {
        await deleteHrEmployee(direct.item.id);
        toast.success('员工档案已删除');
      }
      setDirect(null);
      refresh();
    } catch (error: unknown) {
      toast.error(toHrErrorText(error));
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const result = await fetchHrEmployees({
        ...filterParams, page: '1', pageSize: String(HR_STAFF_EXPORT_LIMIT),
      });
      const count: number = await exportEmployeesToExcel(result.items);
      toast.success(`已导出 ${count} 条员工记录`);
    } catch (error: unknown) {
      toast.error(toHrErrorText(error));
    }
  };

  const columns = useMemo((): TableColumnsType<HrEmployee> => [
    {
      key: 'hr-employees-employeeNo', title: '员工编号', dataIndex: 'employeeNo',
      width: 130, fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    { key: 'hr-employees-name', title: '姓名', dataIndex: 'name', width: 100 },
    { key: 'hr-employees-department', title: '部门', dataIndex: 'department', width: 120 },
    { key: 'hr-employees-position', title: '岗位', dataIndex: 'position', width: 120 },
    { key: 'hr-employees-level', title: '职级', dataIndex: 'level', width: 80 },
    {
      key: 'hr-employees-entryDate', title: '入职日期', dataIndex: 'entryDate', width: 110,
      render: (value: string) => (value ? dayjs(value).format('YYYY-MM-DD') : '—'),
    },
    {
      key: 'hr-employees-status', title: '状态', dataIndex: 'status', width: 90,
      render: (value: string) => <HrStatusBadge status={value} />,
    },
    {
      key: 'hr-employees-actions', title: '操作', width: 270, fixed: 'right',
      render: (_: unknown, record: HrEmployee) => (
        <EmployeeActionsCell
          record={record}
          onViewDetail={handleViewDetail}
          onEdit={handleEdit}
          onFlow={setFlowPending}
          onDirect={handleDirectClick}
        />
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  const {
    visibleColumns, columnMetas, hiddenIds,
    toggleColumn, resetColumns, setAllColumns,
  } = useColumnSettings(columns);

  const directText: string = direct ? DIRECT_ACTION_TEXT[direct.action] : '确认';

  return (
    <div>
      {/* 筛选区 */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          className="w-36 rounded-none" placeholder="部门"
          value={draftDepartment}
          onChange={(event) => setDraftDepartment(event.target.value)}
        />
        <Select
          value={status}
          onValueChange={(value: string) => {
            setStatus(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-32 rounded-none">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={HR_FILTER_ALL}>全部状态</SelectItem>
            {HR_EMPLOYEE_STATUS_OPTIONS.map((option: string) => (
              <SelectItem key={option} value={option}>{option}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          className="w-44 rounded-none" placeholder="关键词（姓名/编号/手机号）"
          value={draftKeyword}
          onChange={(event) => setDraftKeyword(event.target.value)}
        />
        <Button variant="ghost" size="sm" className="rounded-none" onClick={handleReset}>
          <RotateCcw className="h-3.5 w-3.5" />
          重置
        </Button>
      </div>
      {/* 操作区 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button data-ai-section-type="button" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" />
          新建员工
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
      <Table<HrEmployee>
        columns={visibleColumns}
        dataSource={items}
        loading={loading}
        rowKey="id"
        scroll={{ x: 1500, y: 500 }}
        pagination={{
          current: page,
          pageSize: HR_STAFF_PAGE_SIZE,
          total,
          onChange: (nextPage: number) => setPage(nextPage),
        }}
      />
      <EmployeeFormDialog
        open={formOpen}
        employee={editing}
        onSaved={refresh}
        onOpenChange={(open: boolean) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
      />
      <EmployeeDetailDialog
        open={detailOpen}
        employee={detailEmployee}
        onOpenChange={(open: boolean) => {
          setDetailOpen(open);
          if (!open) setDetailEmployee(null);
        }}
      />
      <EmployeeFlowDialog
        pending={flowPending}
        onDone={refresh}
        onOpenChange={(open: boolean) => {
          if (!open) setFlowPending(null);
        }}
      />
      <AdsConfirmDialog
        open={direct !== null}
        title={`${directText}员工？`}
        description={direct
          ? `即将对员工「${direct.item.name}」执行${directText}操作${direct.action === 'delete' ? '，删除后不可恢复。' : '，确认后员工状态将更新为已离职。'}`
          : ''}
        confirmText={directText}
        destructive
        onOpenChange={(open: boolean) => {
          if (!open) setDirect(null);
        }}
        onConfirm={() => void handleDirect()}
      />
    </div>
  );
}
