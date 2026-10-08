"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createTaskAction } from "@/actions/tasks";
import { Modal } from "@/components/modal";
import { PRIORITIES, PRIORITY_META } from "@/lib/constants";
import { taskCreateSchema, type TaskCreateInput } from "@/schemas";
import type { UserLite } from "@/types";

export function NewTaskDialog({ columns, members, defaultColumnId, onClose }: {
  columns: { id: string; name: string }[];
  members: UserLite[];
  defaultColumnId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<TaskCreateInput>({
    resolver: zodResolver(taskCreateSchema),
    defaultValues: { columnId: defaultColumnId, title: "", description: "", priority: "MEDIUM", dueDate: "", assignedToId: null },
  });

  const onSubmit = handleSubmit((data) =>
    start(async () => {
      setError("");
      const res = await createTaskAction({ ...data, assignedToId: data.assignedToId || null });
      if (!res.ok) return setError(res.error);
      router.refresh();
      onClose();
    }),
  );

  return (
    <Modal title="Nova tarefa" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4 p-4" noValidate>
        <div>
          <label className="label" htmlFor="nt-title">Título</label>
          <input id="nt-title" className="input" autoFocus {...register("title")} />
          {errors.title && <p className="field-error">{errors.title.message}</p>}
        </div>
        <div>
          <label className="label" htmlFor="nt-desc">Descrição</label>
          <textarea id="nt-desc" rows={3} className="input" {...register("description")} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="nt-col">Coluna</label>
            <select id="nt-col" className="input" {...register("columnId")}>
              {columns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="nt-prio">Prioridade</label>
            <select id="nt-prio" className="input" {...register("priority")}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="nt-who">Responsável</label>
            <select id="nt-who" className="input" {...register("assignedToId")}>
              <option value="">Sem responsável</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="nt-due">Prazo</label>
            <input id="nt-due" type="date" className="input" {...register("dueDate")} />
          </div>
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={pending}>{pending ? "Criando…" : "Criar tarefa"}</button>
        </div>
      </form>
    </Modal>
  );
}
