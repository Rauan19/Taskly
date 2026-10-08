import type { Metadata } from "next";
import Link from "next/link";
import { requireAuth } from "@/lib/permissions";
import { getMyTasks } from "@/lib/queries";
import { EmptyState, PageHeader } from "@/components/ui";
import { TaskRow } from "@/components/task-row";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Minhas tarefas" };

const FILTERS = [
  { key: "open", label: "Abertas" },
  { key: "overdue", label: "Atrasadas" },
  { key: "done", label: "Concluídas" },
];

export default async function MyTasksPage({ searchParams }: { searchParams: Promise<{ q?: string; f?: string }> }) {
  const user = await requireAuth();
  const { q = "", f = "open" } = await searchParams;
  const query = q.trim().slice(0, 80);
  const tasks = await getMyTasks(user.id, query, f);

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <PageHeader title="Minhas tarefas" subtitle="Tarefas atribuídas a você em todos os projetos." />
      <form className="mb-4 flex gap-2" role="search">
        <input type="hidden" name="f" value={f} />
        <input name="q" defaultValue={query} placeholder="Pesquisar tarefas…" className="input" aria-label="Pesquisar" />
        <button className="btn-secondary">Buscar</button>
      </form>
      <div className="mb-4 flex gap-1.5">
        {FILTERS.map((x) => (
          <Link
            key={x.key}
            href={`/my-tasks?f=${x.key}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
            className={cn("rounded-full px-3 py-1 text-sm", f === x.key ? "bg-ink text-white" : "bg-white text-muted ring-1 ring-line hover:text-ink")}
          >
            {x.label}
          </Link>
        ))}
      </div>
      {tasks.length ? (
        <ul className="card divide-y divide-line overflow-hidden">{tasks.map((t) => <TaskRow key={t.id} task={t} />)}</ul>
      ) : (
        <EmptyState title="Nenhuma tarefa encontrada" />
      )}
    </div>
  );
}
