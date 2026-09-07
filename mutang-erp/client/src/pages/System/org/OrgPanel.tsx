import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  OrgDepartment,
  OrgDepartmentTreeNode,
  OrgPosition,
  OrgStats,
} from '@shared/api.interface';
import {
  deleteOrgDepartment,
  deleteOrgPosition,
  getOrgStats,
  listOrgDepartmentTree,
  listOrgDepartmentsFlat,
  listOrgPositions,
  sortOrgDepartments,
} from '@client/src/api/system-enhance/org';
import { ReportCard } from '@client/src/components/blueprint';
import { Button } from '@client/src/components/ui/button';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { toSystemEnhanceErrorText } from '../system-enhance-shared';
import { DeptDialog, type DeptDialogState } from './dept-dialog';
import { PositionDialog, type PositionDialogState } from './position-dialog';
import {
  DeptTree,
  collectNodeIds,
  findSiblings,
  nodeExists,
} from './dept-tree';
import { OrgStatsCards } from './org-stats-cards';
import { PositionTableCard } from './position-table';

const OrgPanel: React.FC = () => {
  const [tree, setTree] = useState<OrgDepartmentTreeNode[]>([]);
  const [flat, setFlat] = useState<OrgDepartment[]>([]);
  const [stats, setStats] = useState<OrgStats | null>(null);
  const [loadingTree, setLoadingTree] = useState<boolean>(true);
  const [treeError, setTreeError] = useState<string | null>(null);

  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);

  const [positions, setPositions] = useState<OrgPosition[]>([]);
  const [loadingPositions, setLoadingPositions] = useState<boolean>(false);
  const [positionsReloadKey, setPositionsReloadKey] = useState<number>(0);

  const [deptDialogOpen, setDeptDialogOpen] = useState<boolean>(false);
  const [deptDialogState, setDeptDialogState] = useState<DeptDialogState>({
    mode: 'create',
    dept: null,
  });

  const [positionDialogOpen, setPositionDialogOpen] = useState<boolean>(false);
  const [positionDialogState, setPositionDialogState] =
    useState<PositionDialogState>({ mode: 'create', position: null });

  const [deletingDept, setDeletingDept] =
    useState<OrgDepartmentTreeNode | null>(null);
  const [deletingPosition, setDeletingPosition] =
    useState<OrgPosition | null>(null);

  const loadOrg = useCallback(async (): Promise<void> => {
    setLoadingTree(true);
    setTreeError(null);
    try {
      const [treeResult, flatResult, statsResult] = await Promise.all([
        listOrgDepartmentTree(),
        listOrgDepartmentsFlat(),
        getOrgStats(),
      ]);
      setTree(treeResult);
      setFlat(flatResult);
      setStats(statsResult);
      setExpandedIds(new Set(collectNodeIds(treeResult)));
      setSelectedDeptId((prev: number | null) => {
        if (prev !== null && nodeExists(treeResult, prev)) return prev;
        return treeResult.length > 0 ? treeResult[0].id : null;
      });
    } catch (error: unknown) {
      const message: string = toSystemEnhanceErrorText(error);
      setTreeError(message);
      logger.error(`加载组织架构失败: ${message}`);
    } finally {
      setLoadingTree(false);
    }
  }, []);

  useEffect(() => {
    void loadOrg();
  }, [loadOrg]);

  useEffect(() => {
    if (selectedDeptId === null) {
      setPositions([]);
      return;
    }
    let cancelled: boolean = false;
    const load = async (): Promise<void> => {
      setLoadingPositions(true);
      try {
        const result: OrgPosition[] = await listOrgPositions({
          deptId: selectedDeptId,
        });
        if (!cancelled) setPositions(result);
      } catch (error: unknown) {
        const message: string = toSystemEnhanceErrorText(error);
        logger.error(`加载岗位列表失败: ${message}`);
        if (!cancelled) {
          setPositions([]);
          toast.error(`加载岗位列表失败：${message}`);
        }
      } finally {
        if (!cancelled) setLoadingPositions(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [selectedDeptId, positionsReloadKey]);

  const refreshAll = useCallback((): void => {
    void loadOrg();
    setPositionsReloadKey((key: number) => key + 1);
  }, [loadOrg]);

  const handleToggle = useCallback((id: number): void => {
    setExpandedIds((prev: Set<number>) => {
      const next: Set<number> = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleEditDept = useCallback(
    (node: OrgDepartmentTreeNode): void => {
      const dept: OrgDepartment | null =
        flat.find((item: OrgDepartment) => item.id === node.id) ?? null;
      if (dept === null) {
        toast.error('未找到部门信息，请刷新后重试');
        return;
      }
      setDeptDialogState({ mode: 'edit', dept });
      setDeptDialogOpen(true);
    },
    [flat],
  );

  const handleMoveDept = async (
    node: OrgDepartmentTreeNode,
    direction: -1 | 1,
  ): Promise<void> => {
    const siblings: OrgDepartmentTreeNode[] = findSiblings(tree, node.id);
    const index: number = siblings.findIndex(
      (item: OrgDepartmentTreeNode) => item.id === node.id,
    );
    const target: number = index + direction;
    if (index < 0 || target < 0 || target >= siblings.length) return;
    const next: OrgDepartmentTreeNode[] = [...siblings];
    const tmp: OrgDepartmentTreeNode = next[index];
    next[index] = next[target];
    next[target] = tmp;
    const items: { id: number; sortOrder: number }[] = next.map(
      (item: OrgDepartmentTreeNode, i: number) => ({
        id: item.id,
        sortOrder: i,
      }),
    );
    try {
      await sortOrgDepartments({ items });
      toast.success('部门排序已更新');
      await loadOrg();
    } catch (error: unknown) {
      const message: string = toSystemEnhanceErrorText(error);
      logger.error(`部门排序失败: ${message}`);
      toast.error(`排序失败：${message}`);
    }
  };

  const handleDeleteDept = async (): Promise<void> => {
    if (!deletingDept) return;
    try {
      await deleteOrgDepartment(deletingDept.id);
      toast.success('已删除该部门');
      setDeletingDept(null);
      refreshAll();
    } catch (error: unknown) {
      const message: string = toSystemEnhanceErrorText(error);
      logger.error(`删除部门失败: ${message}`);
      toast.error(`删除失败：${message}`);
    }
  };

  const handleDeletePosition = async (): Promise<void> => {
    if (!deletingPosition) return;
    try {
      await deleteOrgPosition(deletingPosition.id);
      toast.success('已删除该岗位');
      setDeletingPosition(null);
      refreshAll();
    } catch (error: unknown) {
      const message: string = toSystemEnhanceErrorText(error);
      logger.error(`删除岗位失败: ${message}`);
      toast.error(`删除失败：${message}`);
    }
  };

  const enabledDeptCount: number = useMemo(
    () => flat.filter((item: OrgDepartment) => item.status === '启用').length,
    [flat],
  );

  const selectedDept: OrgDepartment | null =
    flat.find((item: OrgDepartment) => item.id === selectedDeptId) ?? null;

  return (
    <div className="space-y-6">
      <OrgStatsCards
        stats={stats}
        flatCount={flat.length}
        enabledCount={enabledDeptCount}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <ReportCard className="p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="flex items-center gap-1.5 text-sm font-bold">
              <Building2 className="size-4 text-[#0033A0]" />
              部门树
            </span>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setDeptDialogState({ mode: 'create', dept: null });
                setDeptDialogOpen(true);
              }}
            >
              <Plus className="size-4" />
              新增部门
            </Button>
          </div>
          <div className="max-h-[560px] overflow-auto p-2">
            {loadingTree ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5, 6].map((row: number) => (
                  <Skeleton key={row} className="h-8 w-full rounded-none" />
                ))}
              </div>
            ) : treeError !== null ? (
              <div className="space-y-3 py-8 text-center">
                <p className="text-sm text-destructive">加载失败：{treeError}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void loadOrg()}
                >
                  重试
                </Button>
              </div>
            ) : tree.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                暂无部门数据
              </p>
            ) : (
              <DeptTree
                nodes={tree}
                expandedIds={expandedIds}
                selectedId={selectedDeptId}
                onSelect={setSelectedDeptId}
                onToggle={handleToggle}
                onEdit={handleEditDept}
                onDelete={setDeletingDept}
                onMove={(node: OrgDepartmentTreeNode, direction: -1 | 1) =>
                  void handleMoveDept(node, direction)
                }
              />
            )}
          </div>
        </ReportCard>

        <PositionTableCard
          selectedDept={selectedDept}
          loading={loadingPositions}
          positions={positions}
          onAdd={() => {
            setPositionDialogState({ mode: 'create', position: null });
            setPositionDialogOpen(true);
          }}
          onEdit={(position: OrgPosition) => {
            setPositionDialogState({ mode: 'edit', position });
            setPositionDialogOpen(true);
          }}
          onDelete={setDeletingPosition}
        />
      </div>

      <DeptDialog
        open={deptDialogOpen}
        state={deptDialogState}
        flatDepartments={flat}
        defaultParentId={selectedDeptId}
        onOpenChange={setDeptDialogOpen}
        onSaved={refreshAll}
      />

      <PositionDialog
        open={positionDialogOpen}
        state={positionDialogState}
        deptId={selectedDeptId}
        deptName={selectedDept?.deptName ?? ''}
        siblingPositions={positions}
        onOpenChange={setPositionDialogOpen}
        onSaved={refreshAll}
      />

      <AdsConfirmDialog
        open={deletingDept !== null}
        title="删除部门"
        description={`确认删除「${deletingDept?.deptName ?? ''}」吗？其下存在岗位或子部门时将无法删除。`}
        confirmText="删除"
        destructive
        onOpenChange={(open: boolean) => {
          if (!open) setDeletingDept(null);
        }}
        onConfirm={() => void handleDeleteDept()}
      />

      <AdsConfirmDialog
        open={deletingPosition !== null}
        title="删除岗位"
        description={`确认删除岗位「${deletingPosition?.positionName ?? ''}」吗？该操作不可恢复。`}
        confirmText="删除"
        destructive
        onOpenChange={(open: boolean) => {
          if (!open) setDeletingPosition(null);
        }}
        onConfirm={() => void handleDeletePosition()}
      />
    </div>
  );
};

export default OrgPanel;
