import Link from "next/link";
import type { Priority } from "@prisma/client";
import { formatDue, isOverdue } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { PriorityBadge, ProjectDot } from "@/components/ui";

export type TaskRowData = {
  id: string;
  title: string;
  priority: Priority;
  dueDate: Date | null;
  completedAt: Date | null;
  column: { name: string; board: { project: { id: string; name: string; color: string } } };
};

export function TaskRow({ task }: { task: TaskRowData }) {
  const project = task.column.board.project;
  const overdue = isOverdue(task.dueDate, task.completedAt);
  return (
    <li>
      <Link href={`/tasks/${task.id}`} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-stone-50">
        <div className="min-w-0 flex-1">
          <p className={cn("truncate text-sm font-medium", task.completedAt && "text-muted line-through")}>{task.title}</p>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted">
            <ProjectDot color={project.color} size={8} /> {project.name} · {task.column.name}
          </p>
        </div>
        {task.dueDate ? (
          <span className={cn("shrink-0 text-xs", overdue ? "font-medium text-red-600" : "text-muted")}>{formatDue(task.dueDate)}</span>
        ) : null}
        <span className="hidden shrink-0 sm:block"><PriorityBadge priority={task.priority} /></span>
      </Link>
    </li>
  );
}

export function TaskList({ title, tasks, empty }: { title: string; tasks: TaskRowData[]; empty: string }) {
  return (
    <section className="card overflow-hidden">
      <h2 className="border-b border-line px-4 py-2.5 text-sm font-semibold">
        {title} <span className="ml-1 font-normal text-muted">{tasks.length}</span>
      </h2>
      {tasks.length ? (
        <ul className="divide-y divide-line">{tasks.map((t) => <TaskRow key={t.id} task={t} />)}</ul>
      ) : (
        <p className="px-4 py-5 text-sm text-muted">{empty}</p>
      )}
    </section>
  );
}
