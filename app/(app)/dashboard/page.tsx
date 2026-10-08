import type { Metadata } from "next";
import Link from "next/link";
import { requireAuth } from "@/lib/permissions";
import { getDashboard } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { TaskList } from "@/components/task-row";
import { ROLE_LABEL } from "@/lib/constants";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireAuth();
  const d = await getDashboard(user.id, user.email);

  const stats = [
    { label: "Projetos", value: d.projects },
    { label: "Tarefas pendentes", value: d.pending },
    { label: "Em andamento", value: d.inProgress },
    { label: "Concluídas", value: d.done },
  ];

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <PageHeader
        title={`Olá, ${user.name.split(" ")[0]}`}
        subtitle="Resumo das suas tarefas."
        actions={<Link href="/projects/new" className="btn-primary">Novo projeto</Link>}
      />

      {d.pendingInvites.length > 0 && (
        <section className="mb-6 space-y-2">
          {d.pendingInvites.map((inv) => (
            <div key={inv.token} className="card flex flex-wrap items-center justify-between gap-3 border-accent/30 bg-accent-soft/60 px-4 py-3">
              <p className="text-sm">
                <strong>{inv.invitedBy.name}</strong> convidou você para <strong>{inv.project.name}</strong> como {ROLE_LABEL[inv.role].toLowerCase()}.
              </p>
              <Link href={`/invitations/${inv.token}`} className="btn-primary">Ver convite</Link>
            </div>
          ))}
        </section>
      )}

      {d.projects === 0 ? (
        <div className="card px-6 py-14 text-center">
          <h2 className="text-xl font-semibold tracking-tight">Crie seu primeiro projeto</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            Um projeto reúne seu quadro Kanban, tarefas e a equipe. Já criamos as colunas A Fazer, Em andamento e Concluído para você.
          </p>
          <Link href="/projects/new" className="btn-primary mt-6 h-10 px-5">Novo projeto</Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="card px-4 py-3.5">
                <p className="text-xs font-medium text-muted">{s.label}</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <TaskList title="Atrasadas" tasks={d.overdue} empty="Nada atrasado. 🎉" />
            <TaskList title="Para hoje" tasks={d.dueToday} empty="Nenhuma tarefa vence hoje." />
          </div>
          <div className="mt-4">
            <TaskList title="Concluídas recentemente" tasks={d.recentDone} empty="Você ainda não concluiu tarefas." />
          </div>
        </>
      )}
    </div>
  );
}
