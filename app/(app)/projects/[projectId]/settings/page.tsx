import type { Metadata } from "next";
import { requireProjectAdmin } from "@/lib/permissions";
import { getProject, getProjectBoards } from "@/lib/queries";
import { notFound } from "next/navigation";
import { ProjectForm, DeleteProject } from "@/components/project-form";
import { BoardsManager } from "@/components/boards-manager";

export const metadata: Metadata = { title: "Configurações" };

export default async function SettingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { role } = await requireProjectAdmin(projectId);
  const [project, boards] = await Promise.all([getProject(projectId), getProjectBoards(projectId)]);
  if (!project) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <section className="card p-5">
        <h2 className="mb-4 text-sm font-semibold">Geral</h2>
        <ProjectForm
          projectId={projectId}
          defaults={{ name: project.name, description: project.description ?? "", color: project.color }}
        />
      </section>
      <section className="card p-5">
        <h2 className="mb-1 text-sm font-semibold">Quadros</h2>
        <p className="mb-4 text-sm text-muted">Colunas são criadas, renomeadas e reordenadas direto no quadro.</p>
        <BoardsManager projectId={projectId} boards={boards} />
      </section>
      {role === "OWNER" && (
        <section className="card border-red-200 p-5">
          <h2 className="mb-3 text-sm font-semibold text-red-700">Zona de perigo</h2>
          <DeleteProject projectId={projectId} name={project.name} />
        </section>
      )}
    </div>
  );
}
