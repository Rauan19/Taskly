"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBoardAction, deleteBoardAction, renameBoardAction } from "@/actions/boards";

export function BoardsManager({ projectId, boards }: { projectId: string; boards: { id: string; name: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      setError("");
      const res = await fn();
      if (!res.ok) return setError(res.error ?? "Erro");
      after?.();
      router.refresh();
    });

  return (
    <div className="space-y-3">
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <ul className="divide-y divide-line rounded-lg border border-line">
        {boards.map((b) => (
          <li key={b.id} className="flex items-center gap-2 px-3 py-2">
            <input
              className="input h-8 flex-1 border-transparent bg-transparent px-1.5 focus:bg-white"
              defaultValue={b.name}
              aria-label="Nome do quadro"
              maxLength={60}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== b.name) run(() => renameBoardAction(b.id, v));
                else e.target.value = b.name;
              }}
            />
            <button
              className="btn-ghost h-8 px-2 text-xs"
              disabled={pending || boards.length <= 1}
              onClick={() => confirm(`Excluir o quadro "${b.name}" e todas as suas tarefas?`) && run(() => deleteBoardAction(b.id))}
            >
              Excluir
            </button>
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) run(() => createBoardAction(projectId, name), () => setName(""));
        }}
      >
        <input className="input" placeholder="Nome do novo quadro" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        <button className="btn-secondary" disabled={pending || !name.trim()}>Criar quadro</button>
      </form>
    </div>
  );
}
