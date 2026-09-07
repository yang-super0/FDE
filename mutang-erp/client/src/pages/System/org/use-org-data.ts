import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  OrgDepartment,
  OrgDepartmentTreeNode,
  OrgPosition,
  OrgStats,
} from '@shared/api.interface';
import {
  getOrgStats,
  listOrgDepartmentTree,
  listOrgDepartmentsFlat,
  listOrgPositions,
} from '@client/src/api/system-enhance/org';
import { toSystemEnhanceErrorText } from '../system-enhance-shared';
import { collectNodeIds, nodeExists } from './dept-tree';

export interface OrgDataResult {
  tree: OrgDepartmentTreeNode[];
  flat: OrgDepartment[];
  stats: OrgStats | null;
  loadingTree: boolean;
  treeError: string | null;
  selectedDeptId: number | null;
  setSelectedDeptId: (id: number | null) => void;
  expandedIds: Set<number>;
  toggleExpanded: (id: number) => void;
  positions: OrgPosition[];
  loadingPositions: boolean;
  loadOrg: () => Promise<void>;
  refreshAll: () => void;
}

export function useOrgData(): OrgDataResult {
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

  const toggleExpanded = useCallback((id: number): void => {
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

  return {
    tree,
    flat,
    stats,
    loadingTree,
    treeError,
    selectedDeptId,
    setSelectedDeptId,
    expandedIds,
    toggleExpanded,
    positions,
    loadingPositions,
    loadOrg,
    refreshAll,
  };
}
