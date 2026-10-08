"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createProjectAction, updateProjectAction, deleteProjectAction } from "@/actions/projects";
import { PROJECT_COLORS } from "@/lib/constants";
import { projectSchema, type ProjectInput } from "@/schemas";
import { cn } from "@/lib/utils";

export function ProjectForm({ projectId, defaults }: { projectId?: string; defaults?: ProjectInput }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ProjectInput>({
    resolver: zodResolver(projectSchema),
    defaultValues: defaults ?? { name: "", description: "", color: PROJECT_COLORS[0] },
  });
  const color = watch("color");

  const onSubmit = handleSubmit((data) =>
    start(async () => {
      setError("");
      setSaved(false);
      if (projectId) {
        const res = await updateProjectAction(projectId, data);
        if (!res.ok) return setError(res.error);
        setSaved(true);
        router.refresh();
      } else {
        const res = await createProjectAction(data);
        if (!res.ok) return setError(res.error);
        router.push(`/projects/${res.data.id}/board`);
      }
    }),
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <label className="label" htmlFor="pname">Nome</label>
        <input id="pname" className="input" autoFocus={!projectId} {...register("name")} />
        {errors.name && <p className="field-error">{errors.name.message}</p>}
      </div>
      <div>
        <label className="label" htmlFor="pdesc">Descrição (opcional)</label>
        <textarea id="pdesc" rows={3} className="input" {...register("description")} />
        {errors.description && <p className="field-error">{errors.description.message}</p>}
      </div>
      <div>
        <span className="label">Cor</span>
        <div className="flex gap-2" role="radiogroup" aria-label="Cor do projeto">
          {PROJECT_COLORS.map((c) => (
            <button
              type="button"
              key={c}
              role="radio"
              aria-checked={color === c}
              aria-label={c}
              onClick={() => setValue("color", c, { shouldDirty: true })}
              className={cn("size-7 rounded-lg ring-offset-2 transition", color === c ? "ring-2 ring-ink" : "hover:scale-110")}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={pending}>
          {pending ? "Salvando…" : projectId ? "Salvar alterações" : "Criar projeto"}
        </button>
        {saved && <span className="text-sm text-accent">Salvo.</span>}
      </div>
    </form>
  );
}

export function DeleteProject({ projectId, name }: { projectId: string; name: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Exclui o projeto, quadros, tarefas, comentários e anexos. Esta ação não pode ser desfeita. Digite <strong className="text-ink">{name}</strong> para confirmar.
      </p>
      <input className="input max-w-xs" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-label="Confirmar nome do projeto" />
      {error && <p className="field-error">{error}</p>}
      <div>
        <button
          className="btn-danger"
          disabled={pending || confirm !== name}
          onClick={() =>
            start(async () => {
              const res = await deleteProjectAction(projectId);
              if (!res.ok) return setError(res.error);
              router.push("/projects");
            })
          }
        >
          {pending ? "Excluindo…" : "Excluir projeto"}
        </button>
      </div>
    </div>
  );
}
