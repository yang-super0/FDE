import type { OrgDepartmentTreeNode } from '@shared/api.interface';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { cn } from '@client/src/lib/utils';
import { SystemEnhanceStatusBadge } from '../system-enhance-shared';

/* ============ 树工具 ============ */

export function collectNodeIds(nodes: OrgDepartmentTreeNode[]): number[] {
  return nodes.flatMap(
    (node: OrgDepartmentTreeNode): number[] => [
      node.id,
      ...collectNodeIds(node.children),
    ],
  );
}

export function nodeExists(nodes: OrgDepartmentTreeNode[], id: number): boolean {
  return nodes.some(
    (node: OrgDepartmentTreeNode) =>
      node.id === id || nodeExists(node.children, id),
  );
}

export function findSiblings(
  nodes: OrgDepartmentTreeNode[],
  id: number,
): OrgDepartmentTreeNode[] {
  for (const node of nodes) {
    if (node.id === id) return nodes;
    const found: OrgDepartmentTreeNode[] = findSiblings(node.children, id);
    if (found.length > 0) return found;
  }
  return [];
}

/* ============ 部门树节点（递归渲染） ============ */

interface DeptTreeItemProps {
  node: OrgDepartmentTreeNode;
  depth: number;
  selectedId: number | null;
  expandedIds: Set<number>;
  onSelect: (id: number) => void;
  onToggle: (id: number) => void;
  onEdit: (node: OrgDepartmentTreeNode) => void;
  onDelete: (node: OrgDepartmentTreeNode) => void;
  onMove: (node: OrgDepartmentTreeNode, direction: -1 | 1) => void;
}

const DeptTreeItem: React.FC<DeptTreeItemProps> = ({
  node,
  depth,
  selectedId,
  expandedIds,
  onSelect,
  onToggle,
  onEdit,
  onDelete,
  onMove,
}) => {
  const hasChildren: boolean = node.children.length > 0;
  const expanded: boolean = expandedIds.has(node.id);
  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1 border-l-2 border-transparent py-1 pr-2 transition-colors hover:bg-accent',
          selectedId === node.id && 'border-[#0033A0] bg-accent',
        )}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        <button
          type="button"
          className="flex size-4 shrink-0 items-center justify-center text-muted-foreground"
          onClick={() => onToggle(node.id)}
          aria-label="展开或折叠"
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )
          ) : (
            <span className="size-1 rounded-full bg-muted-foreground/50" />
          )}
        </button>
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 py-0.5 text-left"
          onClick={() => onSelect(node.id)}
        >
          <span className="truncate text-sm font-medium">{node.deptName}</span>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {node.positionCount}岗 / {node.employeeCount}人
          </span>
          <SystemEnhanceStatusBadge status={node.status} />
        </button>
        <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6"
            aria-label="上移"
            onClick={() => onMove(node, -1)}
          >
            <ArrowUp className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6"
            aria-label="下移"
            onClick={() => onMove(node, 1)}
          >
            <ArrowDown className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6"
            aria-label="编辑部门"
            onClick={() => onEdit(node)}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 text-destructive hover:text-destructive"
            aria-label="删除部门"
            onClick={() => onDelete(node)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
      {hasChildren && expanded
        ? node.children.map((child: OrgDepartmentTreeNode) => (
            <DeptTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onSelect={onSelect}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              onMove={onMove}
            />
          ))
        : null}
    </div>
  );
};

/* ============ 部门树 ============ */

interface DeptTreeProps {
  nodes: OrgDepartmentTreeNode[];
  expandedIds: Set<number>;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onToggle: (id: number) => void;
  onEdit: (node: OrgDepartmentTreeNode) => void;
  onDelete: (node: OrgDepartmentTreeNode) => void;
  onMove: (node: OrgDepartmentTreeNode, direction: -1 | 1) => void;
}

export const DeptTree: React.FC<DeptTreeProps> = ({
  nodes,
  expandedIds,
  selectedId,
  onSelect,
  onToggle,
  onEdit,
  onDelete,
  onMove,
}) => (
  <div>
    {nodes.map((node: OrgDepartmentTreeNode) => (
      <DeptTreeItem
        key={node.id}
        node={node}
        depth={0}
        selectedId={selectedId}
        expandedIds={expandedIds}
        onSelect={onSelect}
        onToggle={onToggle}
        onEdit={onEdit}
        onDelete={onDelete}
        onMove={onMove}
      />
    ))}
  </div>
);
