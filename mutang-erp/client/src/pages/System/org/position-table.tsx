import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { OrgDepartment, OrgPosition } from '@shared/api.interface';
import { ReportCard } from '@client/src/components/blueprint';
import { UserDisplay } from '@client/src/components/business-ui/user-display';
import { Button } from '@client/src/components/ui/button';
import { Skeleton } from '@client/src/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import { SystemEnhanceStatusBadge } from '../system-enhance-shared';

interface PositionTableCardProps {
  selectedDept: OrgDepartment | null;
  loading: boolean;
  positions: OrgPosition[];
  onAdd: () => void;
  onEdit: (position: OrgPosition) => void;
  onDelete: (position: OrgPosition) => void;
}

export const PositionTableCard: React.FC<PositionTableCardProps> = ({
  selectedDept,
  loading,
  positions,
  onAdd,
  onEdit,
  onDelete,
}) => (
  <ReportCard className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-bold">
          {selectedDept ? selectedDept.deptName : '未选择部门'}
        </span>
        {selectedDept ? (
          <span className="font-mono text-xs text-muted-foreground">
            {selectedDept.deptNo}
          </span>
        ) : null}
        {selectedDept ? (
          <SystemEnhanceStatusBadge status={selectedDept.status} />
        ) : null}
        <span className="text-xs text-muted-foreground">负责人：</span>
        {selectedDept?.deptManager ? (
          <UserDisplay value={[selectedDept.deptManager]} size="small" />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
        <span className="text-xs text-muted-foreground">
          排序 {selectedDept?.sortOrder ?? '—'}
        </span>
      </div>
      <Button
        type="button"
        size="sm"
        disabled={selectedDept === null}
        onClick={onAdd}
      >
        <Plus className="size-4" />
        新增岗位
      </Button>
    </div>

    {loading ? (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((row: number) => (
          <Skeleton key={row} className="h-10 w-full rounded-none" />
        ))}
      </div>
    ) : selectedDept === null ? (
      <p className="py-8 text-center text-sm text-muted-foreground">
        请在左侧选择部门后查看岗位
      </p>
    ) : positions.length === 0 ? (
      <p className="py-8 text-center text-sm text-muted-foreground">
        暂无岗位数据
      </p>
    ) : (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>岗位编号</TableHead>
              <TableHead>岗位名称</TableHead>
              <TableHead>等级</TableHead>
              <TableHead>上级岗位</TableHead>
              <TableHead>排序</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {positions.map((item: OrgPosition) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono text-xs">
                  {item.positionNo}
                </TableCell>
                <TableCell className="font-medium">{item.positionName}</TableCell>
                <TableCell>{item.positionLevel || '—'}</TableCell>
                <TableCell>{item.parentPositionName ?? '—'}</TableCell>
                <TableCell className="font-mono tabular-nums">
                  {item.sortOrder}
                </TableCell>
                <TableCell>
                  <SystemEnhanceStatusBadge status={item.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(item)}
                    >
                      <Pencil className="size-4" />
                      编辑
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onDelete(item)}
                    >
                      <Trash2 className="size-4" />
                      删除
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )}
  </ReportCard>
);
