import { useCallback, useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  Table,
  type TableColumnsType,
} from '@lark-apaas/client-toolkit/antd-table';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { Plus, Search } from 'lucide-react';
import type {
  OrgDepartment,
  Role,
  SystemUser,
  SystemUserStatus,
} from '@shared/api.interface';
import { ReportCard, StatusBadge } from '@client/src/components/blueprint';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { systemApi, systemEnhanceApi } from '@client/src/api';
import {
  getSystemUserErrorMessage,
  DeleteUserConfirmDialog,
  SystemUserFormDialog,
} from './system-user/SystemUserDialogs';

const PAGE_SIZE = 20;

export function SystemUserSection() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<OrgDepartment[]>([]);
  const [keyword, setKeyword] = useState<string>('');
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<SystemUser | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadUsers = useCallback(async (pageToLoad: number) => {
    setLoading(true);
    try {
      const res = await systemApi.listSystemUsers(pageToLoad, PAGE_SIZE);
      setUsers(res.items);
      setTotal(res.total);
    } catch (error) {
      logger.error('加载系统用户列表失败', error);
      toast.error('加载系统用户列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers(page);
  }, [page, loadUsers]);

  useEffect(() => {
    const loadRoles = async () => {
      try {
        const res = await systemApi.listRoles();
        setRoles(res.items);
      } catch (error) {
        logger.error('加载角色列表失败', error);
      }
    };
    loadRoles();
  }, []);

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const res = await systemEnhanceApi.orgApi.listOrgDepartmentsFlat();
        setDepartments(
          res.filter((item: OrgDepartment) => item.status === '启用'),
        );
      } catch (error) {
        logger.error('加载组织架构部门失败', error);
      }
    };
    loadDepartments();
  }, []);

  const handleToggleStatus = async (user: SystemUser) => {
    const next: SystemUserStatus =
      user.status === 'enabled' ? 'disabled' : 'enabled';
    setTogglingId(user.id);
    try {
      await systemApi.updateSystemUserStatus(user.id, next);
      toast.success(next === 'enabled' ? '已启用该用户' : '已禁用该用户');
      await loadUsers(page);
    } catch (error) {
      logger.error('更新用户状态失败', error);
      toast.error(getSystemUserErrorMessage(error, '操作失败'));
    } finally {
      setTogglingId(null);
    }
  };

  const handleEditClick = (user: SystemUser) => {
    setEditingUser(user);
    setFormOpen(true);
  };

  const handleCreateClick = () => {
    setEditingUser(null);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditingUser(null);
  };

  const handleDeleteClose = (open: boolean) => {
    if (!open) setDeletingUser(null);
  };

  const kw: string = keyword.trim();
  const filteredUsers: SystemUser[] = kw
    ? users.filter(
        (item: SystemUser) =>
          item.memberName.includes(kw) ||
          item.department.includes(kw) ||
          item.roleName.includes(kw),
      )
    : users;

  const columns: TableColumnsType<SystemUser> = [
    {
      title: '姓名',
      dataIndex: 'memberName',
      width: 150,
      render: (name: string) => (
        <span className="font-bold text-primary">{name || '-'}</span>
      ),
    },
    { title: '部门', dataIndex: 'department', width: 180 },
    {
      title: '角色',
      dataIndex: 'roleName',
      width: 120,
      render: (name: string) => name || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 110,
      render: (value: string) => value?.slice(0, 10) || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (status: SystemUserStatus) => (
        <StatusBadge tone={status === 'enabled' ? 'success' : 'neutral'}>
          {status === 'enabled' ? '启用' : '禁用'}
        </StatusBadge>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: unknown, record: SystemUser) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditClick(record)}
          >
            编辑
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={togglingId === record.id}
            onClick={() => handleToggleStatus(record)}
          >
            {record.status === 'enabled' ? '禁用' : '启用'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeletingUser(record)}
          >
            删除
          </Button>
        </div>
      ),
    },
  ];

  return (
    <ReportCard>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.15em] text-foreground">
            用户管理
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">
            维护系统用户、所属部门与角色分配，修改角色后权限即时生效
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setKeyword(e.target.value)
              }
              placeholder="搜索姓名 / 部门 / 角色"
              className="w-56 pl-8"
            />
          </div>
          <Button
            data-ai-section-type="button"
            size="sm"
            onClick={handleCreateClick}
          >
            <Plus className="h-4 w-4" />
            新增用户
          </Button>
        </div>
      </div>
      <Table
        columns={columns}
        dataSource={filteredUsers}
        rowKey="id"
        loading={loading}
        scroll={{ x: 900 }}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          showSizeChanger: false,
          onChange: (nextPage: number) => setPage(nextPage),
        }}
      />
      <SystemUserFormDialog
        open={formOpen}
        user={editingUser}
        roles={roles}
        departments={departments}
        onOpenChange={handleFormClose}
        onSaved={() => loadUsers(page)}
      />
      <DeleteUserConfirmDialog
        user={deletingUser}
        onOpenChange={handleDeleteClose}
        onDeleted={() => loadUsers(page)}
      />
    </ReportCard>
  );
}
