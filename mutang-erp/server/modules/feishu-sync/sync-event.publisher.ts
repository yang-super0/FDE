import type { SyncOperation } from '@shared/api.interface';

export type SyncPublisherFn = (
  tableName: string,
  recordId: string,
  operation: SyncOperation,
) => void;

export type FullSyncTriggerFn = (tableName: string) => void;

let publisher: SyncPublisherFn | null = null;
let fullSyncTrigger: FullSyncTriggerFn | null = null;

/** 由 FeishuSyncModule 内的 SyncEventService 在初始化时注册 */
export function bindSyncPublisher(fn: SyncPublisherFn): void {
  publisher = fn;
}

/** 由 FeishuSyncModule 内的 SyncService 在初始化时注册 */
export function bindFullSyncTrigger(fn: FullSyncTriggerFn): void {
  fullSyncTrigger = fn;
}

/** 供其他模块免注入调用：发布单条记录变更事件 */
export function publishSyncEvent(
  tableName: string,
  recordId: string | number,
  operation: SyncOperation,
): void {
  try {
    publisher?.(tableName, String(recordId), operation);
  } catch {
    // 降级：同步事件发布失败不影响主业务
  }
}

/** 供其他模块免注入调用：触发单表全量同步（后台执行） */
export function triggerFullSync(tableName: string): void {
  try {
    fullSyncTrigger?.(tableName);
  } catch {
    // 降级：全量同步触发失败不影响主业务
  }
}
