import { useCallback, useEffect, useState } from 'react';
import {
  Table,
  type TableColumnsType,
} from '@lark-apaas/client-toolkit/antd-table';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { Plus, Search, Users } from 'lucide-react';
import { hrApi } from '@client/src/api';
import { ReportCard } from '@client/src/components/blueprint';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import type { DepartmentNode, Employee, PageResult } from '@shared/api.interface';
import { cn } from '@client/src/lib/utils';
import { CreateEmployeeDialog, EmployeeDetailDialog } from './EmployeeDialogs';
import { useDepartments } from './useDepartments';

interface DepartmentTreeNodeProps {
  node: DepartmentNode;
  depth: number;
  selectedId: string;
  onSelect: (id: string) => void;
}

const DepartmentTreeNode = ({
  node,
  depth,
  selectedId,
  onSelect,
}: DepartmentTreeNodeProps) => {
  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(node.id)}
        style={{ paddingLeft: 12 + depth * 16 }}
        className={cn(
          'flex w-full items-center justify-between gap-2 py-2 pr-3 text-left text-sm transition-colors',
          selectedId === node.id
            ? 'bg-accent text-foreground font-bold border-l-2 border-l-primary'
            : 'text-muted-foreground hover:bg-accent border-l-2 border-l-transparent',
        )}
      >
        <span className="truncate">{node.name}</span>
        <span className="shrink-0 text-[10px] font-mono text-muted-foreground">
          {node.headcount}人
        </span>
      </button>
      {node.children.map((child: DepartmentNode) => (
        <DepartmentTreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
};

export const OrgEmployeeSection = () => {
  const { departments, options, nameMap } = useDepartments();
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [result, setResult] = useState<PageResult<Employee> | null>(null);
  const [tableLoading, setTableLoading] = useState<boolean>(false);
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [detailEmployee, setDetailEmployee] = useState<Employee | null>(null);

  const fetchEmployees = useCallback(async (): Promise<void> => {
    setTableLoading(true);
    try {
      const res: PageResult<Employee> = await hrApi.listEmployees({
        departmentId: selectedDepartmentId || undefined,
        keyword: keyword || undefined,
        page,
        pageSize,
      });
      setResult(res);
    } catch (error) {
      logger.error('加载员工列表失败:', error);
      toast.error('加载员工列表失败');
    } finally {
      setTableLoading(false);
    }
  }, [selectedDepartmentId, keyword, page, pageSize]);

  useEffect(() => {
    void fetchEmployees();
  }, [fetchEmployees]);

  const handleSelectDepartment = (id: string): void => {
    setSelectedDepartmentId(id);
    setPage(1);
  };

  const handleSearch = (): void => {
    setKeyword(searchText.trim());
    setPage(1);
  };

  const columns: TableColumnsType<Employee> = [
    {
      title: '姓名',
      dataIndex: 'name',
      width: 120,
      fixed: 'left',
      render: (name: string) => (
        <span className="font-bold text-primary">{name}</span>
      ),
    },
    {
      title: '工号',
      dataIndex: 'employeeNo',
      width: 130,
      render: (value: string) => <span className="font-mono">{value}</span>,
    },
    { title: '部门', dataIndex: 'departmentName', width: 180 },
    { title: '职位', dataIndex: 'position', width: 180 },
    {
      title: '入职日期',
      dataIndex: 'hireDate',
      width: 130,
      render: (value: string) =>
        value ? dayjs(value).format('YYYY-MM-DD') : '—',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
      <ReportCard className="lg:col-span-1">
        <div className="mb-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-primary">
          <Users className="size-3.5" />
          组织架构
        </div>
        <button
          type="button"
          onClick={() => handleSelectDepartment('')}
          className={cn(
            'flex w-full items-center justify-between gap-2 border-l-2 px-3 py-2 text-left text-sm transition-colors',
            selectedDepartmentId === ''
              ? 'bg-accent font-bold text-foreground border-l-primary'
              : 'text-muted-foreground hover:bg-accent border-l-transparent',
          )}
        >
          <span>全部部门</span>
        </button>
        <div className="border-t border-border" />
        {departments.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            暂无部门数据
          </div>
        ) : (
          departments.map((node: DepartmentNode) => (
            <DepartmentTreeNode
              key={node.id}
              node={node}
              depth={0}
              selectedId={selectedDepartmentId}
              onSelect={handleSelectDepartment}
            />
          ))
        )}
      </ReportCard>

      <ReportCard className="lg:col-span-3">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] font-black uppercase tracking-[0.15em] text-primary">
            员工列表
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="按姓名搜索"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleSearch();
                }}
                className="w-48 rounded-none pl-8"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={handleSearch}
            >
              搜索
            </Button>
            <Button
              type="button"
              className="rounded-none"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-4" />
              新建员工
            </Button>
          </div>
        </div>
        <Table<Employee>
          columns={columns}
          dataSource={result?.items ?? []}
          loading={tableLoading}
          rowKey="id"
          scroll={{ x: 800, y: 500 }}
          onRow={(record: Employee) => ({
            onClick: () => setDetailEmployee(record),
            className: 'cursor-pointer hover:bg-accent transition-colors',
          })}
          pagination={{
            current: page,
            pageSize,
            total: result?.total ?? 0,
            showSizeChanger: true,
            onChange: (nextPage: number, nextPageSize: number) => {
              setPage(nextPage);
              setPageSize(nextPageSize);
            },
          }}
        />
      </ReportCard>

      <CreateEmployeeDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        departments={options}
        onCreated={() => {
          setPage(1);
          void fetchEmployees();
        }}
      />
      <EmployeeDetailDialog
        employee={detailEmployee}
        departments={options}
        departmentNameMap={nameMap}
        onClose={() => setDetailEmployee(null)}
        onUpdated={() => void fetchEmployees()}
      />
    </div>
  );
};
