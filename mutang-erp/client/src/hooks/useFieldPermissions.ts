import { useEffect, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { getMyFieldPermissions } from '@client/src/api/field-permission';
import type { MyFieldPermissionItem } from '@shared/api.interface';

export interface FieldPermissionState {
  visible: boolean;
  editable: boolean;
  masked: boolean;
}

/**
 * 字段级数据权限 Hook：拉取当前用户（或预览角色）的字段权限。
 * admin / 无配置 / 接口失败时字段 Map 为空，消费方按默认全可见处理。
 */
export function useFieldPermissions(module: string): {
  loading: boolean;
  fields: Map<string, FieldPermissionState>;
} {
  const [loading, setLoading] = useState<boolean>(false);
  const [fields, setFields] = useState<Map<string, FieldPermissionState>>(
    new Map(),
  );

  useEffect(() => {
    let cancelled: boolean = false;
    const load = async (): Promise<void> => {
      setLoading(true);
      try {
        const result = await getMyFieldPermissions();
        if (cancelled) return;
        const map = new Map<string, FieldPermissionState>();
        result.fields
          .filter((item: MyFieldPermissionItem) => item.module === module)
          .forEach((item: MyFieldPermissionItem) => {
            map.set(item.fieldName, {
              visible: item.visible,
              editable: item.editable,
              masked: item.masked,
            });
          });
        setFields(map);
      } catch (error: unknown) {
        if (!cancelled) {
          logger.error(
            `加载字段权限失败(module=${module}): ${String(error)}`,
          );
          setFields(new Map());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [module]);

  return { loading, fields };
}
