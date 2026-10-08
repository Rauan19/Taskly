"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Trash2 } from "lucide-react";
import {
  deleteTaskAction,
  duplicateTaskAction,
  moveTaskToColumnAction,
  toggleCompleteAction,
  updateTaskAction,
} from "@/actions/tasks";
import { PRIORITIES, PRIORITY_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Priority } from "@prisma/client";
import type { TaskUpdateInput } from "@/schemas";

type Props = {
  taskId: string;
  title: string;
  description: string;
  priority: Priority;
  dueDate: string; // YYYY-MM-DD
  assignedToId: string;
  columnId: string;
  completed: boolean;
  members: { id: string; name: string }[];
  columns: { id: string; name: string }[];
  canEdit: boolean;
  canDelete: boolean;
  /** para onde ir depois de excluir */
  afterDeleteHref: string;
  /** prefixo da URL da cópia (depois de duplicar abre `${copyHrefBase}${id}`) */
  copyHrefBase: string;
};

export function TaskEditor(p: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [title, setTitle] = useState(p.title);
  const [description, setDescription] = useState(p.description);
  const [priority, setPriority] = useState(p.priority);
  const [dueDate, setDueDate] = useState(p.dueDate);
  const [assignee, setAssignee] = useState(p.assignedToId);
  const [column, setColumn] = useState(p.columnId);

  const save = (patch: TaskUpdateInput) =>
    start(async () => {
      setError("");
      const res = await updateTaskAction(p.taskId, patch);
      if (!res.ok) setError(res.error);
    });

  const ro = !p.canEdit;

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <button
          type="button"
          disabled={ro || pending}
          aria-pressed={p.completed}
          aria-label={p.completed ? "Reabrir tarefa" : "Marcar como concluída"}
          title={p.completed ? "Reabrir" : "Concluir"}
          onClick={() => start(async () => { const r = await toggleCompleteAction(p.taskId); if (!r.ok) setError(r.error); })}
          className={cn(
            "mt-1 grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors disabled:cursor-not-allowed",
            p.completed ? "border-accent bg-accent text-white" : "border-stone-300 hover:border-accent",
          )}
        >
          {p.completed && <Check size={14} strokeWidth={3} />}
        </button>
        <textarea
          aria-label="Título"
          rows={1}
          readOnly={ro}
          value={title}
          maxLength={160}
          onChange={(e) => setTitle(e.target.value.replace(/\n/g, " "))}
          onBlur={() => title.trim() && title !== p.title ? save({ title }) : setTitle(p.title)}
          className={cn(
            "min-h-9 w-full resize-none rounded-lg border border-transparent bg-transparent px-2 py-1 text-xl font-semibold tracking-tight [field-sizing:content] hover:border-line focus:border-accent focus:bg-white focus:outline-none",
            p.completed && "text-muted line-through",
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="te-col">Coluna</label>
          <select
            id="te-col"
            className="input"
            value={column}
            onChange={(e) => {
              setColumn(e.target.value);
              start(async () => { const r = await moveTaskToColumnAction(p.taskId, e.target.value); if (!r.ok) { setError(r.error); setColumn(p.columnId); } else router.refresh(); });
            }}
          >
            {p.columns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="te-who">Responsável</label>
          <select
            id="te-who"
            className="input"
            disabled={ro}
            value={assignee}
            onChange={(e) => { setAssignee(e.target.value); save({ assignedToId: e.target.value || null }); }}
          >
            <option value="">Sem responsável</option>
            {p.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="te-prio">Prioridade</label>
          <select
            id="te-prio"
            className="input"
            disabled={ro}
            value={priority}
            onChange={(e) => { setPriority(e.target.value as Priority); save({ priority: e.target.value as Priority }); }}
          >
            {PRIORITIES.map((x) => <option key={x} value={x}>{PRIORITY_META[x].label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="te-due">Prazo</label>
          <input
            id="te-due"
            type="date"
            className="input"
            disabled={ro}
            value={dueDate}
            onChange={(e) => { setDueDate(e.target.value); save({ dueDate: e.target.value || null }); }}
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="te-desc">Descrição</label>
        <textarea
          id="te-desc"
          className="input min-h-28"
          readOnly={ro}
          maxLength={5000}
          placeholder={ro ? "Sem descrição." : "Adicione detalhes, contexto ou links…"}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => description !== p.description && save({ description })}
        />
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {ro && <p className="text-xs text-muted">Você pode comentar e mover esta tarefa, mas só quem criou, o responsável ou administradores a editam.</p>}

      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        <button
          className="btn-secondary"
          disabled={pending}
          onClick={() => start(async () => { const r = await duplicateTaskAction(p.taskId); if (!r.ok) setError(r.error); else router.push(p.copyHrefBase + r.data.id); })}
        >
          <Copy size={15} /> Duplicar
        </button>
        {p.canDelete && (
          <button
            className="btn-danger"
            disabled={pending}
            onClick={() => confirm("Excluir esta tarefa? Comentários e anexos também serão apagados.") && start(async () => {
              const r = await deleteTaskAction(p.taskId);
              if (!r.ok) setError(r.error);
              else router.push(p.afterDeleteHref);
            })}
          >
            <Trash2 size={15} /> Excluir
          </button>
        )}
      </div>
    </div>
  );
}
