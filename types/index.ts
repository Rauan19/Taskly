import type { Priority, Role } from "@prisma/client";

export type UserLite = { id: string; name: string; avatarUrl: string | null };

export type CardTask = {
  id: string;
  title: string;
  priority: Priority;
  dueDate: string | null;
  completedAt: string | null;
  createdById: string;
  assignee: UserLite | null;
  checklistTotal: number;
  checklistDone: number;
  comments: number;
  attachments: number;
};

export type BoardColumn = {
  id: string;
  name: string;
  color: string | null;
  tasks: CardTask[];
};

export type MemberLite = UserLite & { role: Role };
