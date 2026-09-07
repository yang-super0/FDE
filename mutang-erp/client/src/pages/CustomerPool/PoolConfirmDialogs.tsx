import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@client/src/components/ui/alert-dialog';

interface PoolConfirmDialogsProps {
  autoAssignOpen: boolean;
  onAutoAssignOpenChange: (open: boolean) => void;
  onAutoAssign: () => void;
  deleteCount: number;
  onDeleteOpenChange: (open: boolean) => void;
  onDeleteConfirm: () => void;
  invalidateName: string;
  onInvalidateOpenChange: (open: boolean) => void;
  onInvalidateConfirm: () => void;
}

export function PoolConfirmDialogs({
  autoAssignOpen,
  onAutoAssignOpenChange,
  onAutoAssign,
  deleteCount,
  onDeleteOpenChange,
  onDeleteConfirm,
  invalidateName,
  onInvalidateOpenChange,
  onInvalidateConfirm,
}: PoolConfirmDialogsProps) {
  return (
    <>
      <AlertDialog open={autoAssignOpen} onOpenChange={onAutoAssignOpenChange}>
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle>确认自动分配？</AlertDialogTitle>
            <AlertDialogDescription>
              系统将按规则把公海中未分配的客资自动分配给团队成员，此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={onAutoAssign}>
              确认分配
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={deleteCount > 0} onOpenChange={onDeleteOpenChange}>
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除？</AlertDialogTitle>
            <AlertDialogDescription>
              即将删除 {deleteCount} 条客资，删除后不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={onDeleteConfirm}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={invalidateName.length > 0}
        onOpenChange={onInvalidateOpenChange}
      >
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle>确认标记为无效客资？</AlertDialogTitle>
            <AlertDialogDescription>
              即将把「{invalidateName}」标记为无效客资，标记后可在无效客资页面恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={onInvalidateConfirm}>
              确认标记
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
