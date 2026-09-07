export class CreateTaskDto {
  title!: string;
  description?: string;
  assigneeId!: string;
  priority!: 'high' | 'medium' | 'low';
  deadline?: string;
}

export class UpdateTaskStatusDto {
  status!: 'todo' | 'doing' | 'done';
}
