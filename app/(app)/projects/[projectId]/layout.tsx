import { requireProjectMember } from "@/lib/permissions";
import { getProject } from "@/lib/queries";
import { ProjectTabs } from "@/components/project-tabs";
import { ProjectDot } from "@/components/ui";
import { notFound } from "next/navigation";
import { isAdmin } from "@/lib/permissions";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { role } = await requireProjectMember(projectId); // 403 no servidor para quem não participa
  const project = await getProject(projectId);
  if (!project) notFound();

  return (
    <>
      <div className="border-b border-line bg-white px-4 pt-4 sm:px-6">
        <div className="flex items-center gap-2">
          <ProjectDot color={project.color} size={12} />
          <h1 className="truncate text-lg font-semibold tracking-tight">{project.name}</h1>
        </div>
        <ProjectTabs projectId={projectId} showSettings={isAdmin(role)} />
      </div>
      {children}
    </>
  );
}
