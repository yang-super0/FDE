import { useCallback, useEffect, useMemo, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { hrApi } from '@client/src/api';
import type { DepartmentNode } from '@shared/api.interface';

export interface DepartmentOption {
  id: string;
  label: string;
}

export interface UseDepartmentsResult {
  departments: DepartmentNode[];
  options: DepartmentOption[];
  nameMap: Map<string, string>;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useDepartments(): UseDepartmentsResult {
  const [departments, setDepartments] = useState<DepartmentNode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const res = await hrApi.listDepartments();
      setDepartments(res.items);
    } catch (error) {
      logger.error('加载部门树失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const options: DepartmentOption[] = useMemo(() => {
    const result: DepartmentOption[] = [];
    const walk = (nodes: DepartmentNode[], depth: number): void => {
      nodes.forEach((node: DepartmentNode) => {
        result.push({
          id: node.id,
          label: `${'\u3000'.repeat(depth)}${node.name}`,
        });
        walk(node.children, depth + 1);
      });
    };
    walk(departments, 0);
    return result;
  }, [departments]);

  const nameMap: Map<string, string> = useMemo(() => {
    const map: Map<string, string> = new Map();
    const walk = (nodes: DepartmentNode[]): void => {
      nodes.forEach((node: DepartmentNode) => {
        map.set(node.id, node.name);
        walk(node.children);
      });
    };
    walk(departments);
    return map;
  }, [departments]);

  return { departments, options, nameMap, loading, refresh };
}
