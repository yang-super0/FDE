import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { CustomerAccount } from '@shared/api.interface';
import {
  deleteCustomerAccount,
  resetCustomerAccountPassword,
} from '@client/src/api/system-enhance/customer-accounts';
import { toSystemEnhanceErrorText } from '../system-enhance-shared';

export interface CustomerAccountActions {
  resetTarget: CustomerAccount | null;
  newPassword: string;
  passwordResultOpen: boolean;
  deleteTarget: CustomerAccount | null;
  batchConfirmOpen: boolean;
  requestReset: (record: CustomerAccount) => void;
  requestDelete: (record: CustomerAccount) => void;
  requestBatchDelete: () => void;
  closeReset: () => void;
  closeDelete: () => void;
  closeBatchConfirm: () => void;
  setPasswordResultOpen: (open: boolean) => void;
  confirmResetPassword: () => void;
  confirmDelete: () => void;
  confirmBatchDelete: (ids: number[], refresh: () => void) => void;
}

/** 客户账户：重置密码 / 删除 / 批量删除 的状态与确认流 */
export const useCustomerAccountActions = (
  refresh: () => void,
): CustomerAccountActions => {
  const [resetTarget, setResetTarget] = useState<CustomerAccount | null>(null);
  const [newPassword, setNewPassword] = useState<string>('');
  const [passwordResultOpen, setPasswordResultOpen] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomerAccount | null>(
    null,
  );
  const [batchConfirmOpen, setBatchConfirmOpen] = useState<boolean>(false);

  const requestReset = useCallback((record: CustomerAccount): void => {
    setResetTarget(record);
  }, []);

  const requestDelete = useCallback((record: CustomerAccount): void => {
    setDeleteTarget(record);
  }, []);

  const requestBatchDelete = useCallback((): void => {
    setBatchConfirmOpen(true);
  }, []);

  const closeReset = useCallback((): void => {
    setResetTarget(null);
  }, []);

  const closeDelete = useCallback((): void => {
    setDeleteTarget(null);
  }, []);

  const closeBatchConfirm = useCallback((): void => {
    setBatchConfirmOpen(false);
  }, []);

  const confirmResetPassword = useCallback((): void => {
    const target: CustomerAccount | null = resetTarget;
    setResetTarget(null);
    if (!target) return;
    void resetCustomerAccountPassword(target.id)
      .then((result: { password: string }) => {
        setNewPassword(result.password);
        setPasswordResultOpen(true);
        refresh();
      })
      .catch((error: unknown) => {
        logger.error('重置客户账户密码失败', String(error));
        toast.error(toSystemEnhanceErrorText(error));
      });
  }, [resetTarget, refresh]);

  const confirmDelete = useCallback((): void => {
    const target: CustomerAccount | null = deleteTarget;
    setDeleteTarget(null);
    if (!target) return;
    void deleteCustomerAccount(target.id)
      .then(() => {
        toast.success(`账户「${target.username}」已删除`);
        refresh();
      })
      .catch((error: unknown) => {
        logger.error('删除客户账户失败', String(error));
        toast.error(toSystemEnhanceErrorText(error));
        refresh();
      });
  }, [deleteTarget, refresh]);

  const confirmBatchDelete = useCallback(
    (ids: number[], refreshList: () => void): void => {
      setBatchConfirmOpen(false);
      if (ids.length === 0) return;
      void (async () => {
        let deletedCount: number = 0;
        let errorText: string | null = null;
        for (const id of ids) {
          try {
            await deleteCustomerAccount(id);
            deletedCount += 1;
          } catch (error: unknown) {
            if (!errorText) errorText = toSystemEnhanceErrorText(error);
          }
        }
        if (deletedCount > 0) {
          toast.success(`已删除 ${deletedCount} 个客户账户`);
        }
        if (errorText) toast.error(`部分账户删除失败：${errorText}`);
        refreshList();
      })();
    },
    [],
  );

  return {
    resetTarget,
    newPassword,
    passwordResultOpen,
    deleteTarget,
    batchConfirmOpen,
    requestReset,
    requestDelete,
    requestBatchDelete,
    closeReset,
    closeDelete,
    closeBatchConfirm,
    setPasswordResultOpen,
    confirmResetPassword,
    confirmDelete,
    confirmBatchDelete,
  };
};
