"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, CheckSquare, MessageSquare, Paperclip } from "lucide-react";
import { toggleCompleteAction } from "@/actions/tasks";
import { formatDue, isOverdue } from "@/lib/dates";
import { PRIORITY_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui";
import type { CardTask } from "@/types";

export function TaskCardView({ task, href, dragging, onToggle, toggling }: {
  task: CardTask;
  href?: string;
  dragging?: boolean;
  onToggle?: () => void;
  toggling?: boolean;
}) {
  const done = !!task.completedAt;
  const overdue = isOverdue(task.dueDate, task.completedAt);
  const p = PRIORITY_META[task.priority];
  const body = (
    <>
      <div className="flex items-start gap-2">
        <button
          type="button"
          aria-label={done ? "Reabrir tarefa" : "Concluir tarefa"}
          aria-pressed={done}
          disabled={toggling}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggle?.();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className={cn(
            "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border transition-colors",
            done ? "border-accent bg-accent text-white" : "border-stone-300 hover:border-accent",
          )}
        >
          {done && <Check size={11} strokeWidth={3} />}
        </button>
        <p className={cn("min-w-0 flex-1 text-sm leading-snug font-medium break-words", done && "text-muted line-through")}>
          {task.title}
        </p>
      </div>
      <div className="mt-2.5 flex items-center gap-2.5 text-xs text-muted">
        <span title={`Prioridade ${p.label}`} className="inline-flex items-center gap-1">
          <span className={cn("size-2 rounded-full", p.dot)} />
          <span className={cn(task.priority === "LOW" && "hidden sm:inline")}>{p.label}</span>
        </span>
        {task.dueDate && (
          <span className={cn(overdue && "font-medium text-red-600")}>{formatDue(task.dueDate)}</span>
        )}
        {task.checklistTotal > 0 && (
          <span className={cn("inline-flex items-center gap-1", task.checklistDone === task.checklistTotal && "text-accent")}>
            <CheckSquare size={12} /> {task.checklistDone}/{task.checklistTotal}
          </span>
        )}
        {task.attachments > 0 && (
          <span className="inline-flex items-center gap-1"><Paperclip size={12} /> {task.attachments}</span>
        )}
        {task.comments > 0 && (
          <span className="inline-flex items-center gap-1"><MessageSquare size={12} /> {task.comments}</span>
        )}
        {task.assignee && <Avatar name={task.assignee.name} size={22} className="ml-auto" />}
      </div>
    </>
  );
  const cls = cn(
    "block rounded-lg border border-line bg-white p-3 shadow-[0_1px_0_rgba(0,0,0,0.03)] transition-colors hover:border-stone-300",
    dragging && "rotate-1 border-accent shadow-lg",
  );
  return href ? (
    <Link href={href} scroll={false} draggable={false} className={cls}>{body}</Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function SortableTaskCard({ task, href, disabled, onChanged }: {
  task: CardTask;
  href: string;
  disabled: boolean;
  onChanged: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled,
  });
  const [pending, start] = useTransition();
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("touch-manipulation list-none", isDragging && "opacity-40")}
      {...attributes}
      {...listeners}
      role="listitem"
      tabIndex={-1}
    >
      <TaskCardView
        task={task}
        href={href}
        toggling={pending}
        onToggle={() =>
          start(async () => {
            await toggleCompleteAction(task.id);
            onChanged();
          })
        }
      />
    </li>
  );
}
