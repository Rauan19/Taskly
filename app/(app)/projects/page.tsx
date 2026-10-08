import type { Metadata } from "next";
import Link from "next/link";
import { requireAuth } from "@/lib/permissions";
import { getUserProjects } from "@/lib/queries";
import { EmptyState, PageHeader, ProjectDot } from "@/components/ui";
import { ROLE_LABEL } from "@/lib/constants";

export const metadata: Metadata = { title: "Projetos" };

export default async function ProjectsPage() {
  const user = await requireAuth();
  const projects = await getUserProjects(user.id);
  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <PageHeader title="Projetos" actions={<Link href="/projects/new" className="btn-primary">Novo projeto</Link>} />
      {projects.length === 0 ? (
        <EmptyState title="Você ainda não participa de nenhum projeto">
          <Link href="/projects/new" className="font-medium text-accent hover:underline">Crie o primeiro</Link>
        </EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <li key={p.id}>
              <Link href={`/projects/${p.id}`} className="card block h-full p-4 transition-colors hover:border-stone-300">
                <div className="flex items-center gap-2">
                  <ProjectDot color={p.color} />
                  <h2 className="truncate font-semibold">{p.name}</h2>
                </div>
                <p className="mt-1.5 line-clamp-2 min-h-10 text-sm text-muted">{p.description || "Sem descrição."}</p>
                <p className="mt-3 flex gap-3 text-xs text-muted">
                  <span>{p.open} abertas</span>
                  <span>{p.members} {p.members === 1 ? "membro" : "membros"}</span>
                  <span className="ml-auto">{ROLE_LABEL[p.role]}</span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
