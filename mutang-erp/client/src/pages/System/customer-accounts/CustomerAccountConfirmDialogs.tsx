import type { CustomerAccount } from '@shared/api.interface';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { ResetPasswordResultDialog } from './CustomerAccountDialogs';
import type { CustomerAccountActions } from './useCustomerAccountActions';

interface CustomerAccountConfirmDialogsProps {
  actions: CustomerAccountActions;
  selectedIds: number[];
  onBatchDeleted: () => void;
}

/** 客户账户面板的确认弹窗集合：重置密码 / 删除 / 批量删除 / 新密码展示 */
export const CustomerAccountConfirmDialogs = ({
  actions,
  selectedIds,
  onBatchDeleted,
}: CustomerAccountConfirmDialogsProps) => {
  const deleteTarget: CustomerAccount | null = actions.deleteTarget;
  const resetTarget: CustomerAccount | null = actions.resetTarget;
  return (
    <>
      <ResetPasswordResultDialog
        open={actions.passwordResultOpen}
        password={actions.newPassword}
        onOpenChange={actions.setPasswordResultOpen}
      />
      <AdsConfirmDialog
        open={resetTarget !== null}
        title="重置账户密码？"
        description={`即将重置账户「${resetTarget?.username ?? '—'}」的密码，重置后原密码立即失效。`}
        confirmText="重置密码"
        onOpenChange={(open: boolean) => {
          if (!open) actions.closeReset();
        }}
        onConfirm={actions.confirmResetPassword}
      />
      <AdsConfirmDialog
        open={deleteTarget !== null}
        title="删除客户账户？"
        description={`即将删除账户「${deleteTarget?.username ?? '—'}」，删除后不可恢复。`}
        confirmText="删除"
        destructive
        onOpenChange={(open: boolean) => {
          if (!open) actions.closeDelete();
        }}
        onConfirm={actions.confirmDelete}
      />
      <AdsConfirmDialog
        open={actions.batchConfirmOpen}
        title="批量删除客户账户？"
        description={`即将删除已勾选的 ${selectedIds.length} 个客户账户，删除后不可恢复。`}
        confirmText="批量删除"
        destructive
        onOpenChange={(open: boolean) => {
          if (!open) actions.closeBatchConfirm();
        }}
        onConfirm={() => actions.confirmBatchDelete(selectedIds, onBatchDeleted)}
      />
    </>
  );
};
