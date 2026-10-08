import type { Metadata } from "next";
import Link from "next/link";
import { isAdmin, requireProjectMember } from "@/lib/permissions";
import { getActivities, getProject, getProjectBoards, getProjectMembers, getProjectStats, getBoardColumns } from "@/lib/queries";
import { Avatar } from "@/components/ui";
import { ActivityList } from "@/components/activity-list";
import { PAGE_SIZE, ROLE_LABEL } from "@/lib/constants";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = { title: "Visão geral" };

export default async function ProjectOverview({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ atv?: string }>;
}) {
  const { projectId } = await params;
  const { atv } = await searchParams;
  const { role } = await requireProjectMember(projectId);
  const limit = Math.min(Math.max(Number(atv) || PAGE_SIZE, PAGE_SIZE), 100);

  const [project, members, stats, activities, boards] = await Promise.all([
    getProject(projectId),
    getProjectMembers(projectId),
    getProjectStats(projectId),
    getActivities(projectId, limit),
    getProjectBoards(projectId),
  ]);
  const board = boards[0];
  const columns = board ? await getBoardColumns(board.id) : [];
  const perColumn = board
    ? await prisma.task.groupBy({ by: ["columnId"], where: { column: { boardId: board.id } }, _count: { _all: true } })
    : [];
  const counts = new Map(perColumn.map((c) => [c.columnId, c._count._all]));

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-pretty text-muted">{project?.description || "Sem descrição."}</p>
        <div className="flex flex-wrap gap-2">
          <Link href={`/projects/${projectId}/board?new=1`} className="btn-primary">Nova tarefa</Link>
          {isAdmin(role) && <Link href={`/projects/${projectId}/members?invite=1`} className="btn-secondary">Adicionar membro</Link>}
          {isAdmin(role) && <Link href={`/projects/${projectId}/settings`} className="btn-secondary">Configurações</Link>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Tarefas", stats.total],
          ["Abertas", stats.open],
          ["Concluídas", stats.done],
          ["Atrasadas", stats.overdue],
        ].map(([label, value]) => (
          <div key={label} className="card px-4 py-3">
            <p className="text-xs font-medium text-muted">{label}</p>
            <p className="mt-0.5 text-2xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">{board?.name ?? "Quadro"}</h2>
              <Link href={`/projects/${projectId}/board`} className="text-sm font-medium text-accent hover:underline">Abrir quadro</Link>
            </div>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {columns.map((c) => (
                <li key={c.id} className="rounded-lg bg-stone-50 px-3 py-2">
                  <p className="truncate text-xs text-muted">{c.name}</p>
                  <p className="text-lg font-semibold tabular-nums">{counts.get(c.id) ?? 0}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-4">
            <h2 className="mb-3 text-sm font-semibold">Atividade recente</h2>
            <ActivityList
              items={activities.items}
              moreHref={activities.hasMore ? `/projects/${projectId}?atv=${limit + PAGE_SIZE}` : undefined}
            />
          </section>
        </div>

        <section className="card h-fit p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Membros <span className="font-normal text-muted">{members.length}</span></h2>
            <Link href={`/projects/${projectId}/members`} className="text-sm font-medium text-accent hover:underline">Gerenciar</Link>
          </div>
          <ul className="space-y-2.5">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-2.5">
                <Avatar name={m.name} size={26} />
                <span className="min-w-0 flex-1 truncate text-sm">{m.name}</span>
                <span className="text-xs text-muted">{ROLE_LABEL[m.role]}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
