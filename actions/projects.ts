"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { run } from "@/lib/action";
import { logActivity } from "@/lib/activity";
import { DEFAULT_COLUMNS } from "@/lib/constants";
import { requireAuth, requireProjectAdmin, requireProjectOwner } from "@/lib/permissions";
import { projectSchema, type ProjectInput } from "@/schemas";

export async function createProjectAction(input: ProjectInput) {
  return run(async () => {
    const user = await requireAuth();
    const data = projectSchema.parse(input);

    const project = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description || null,
        color: data.color,
        ownerId: user.id,
        members: { create: { userId: user.id, role: "OWNER" } },
        boards: {
          create: {
            name: "Quadro principal",
            position: 0,
            columns: { create: DEFAULT_COLUMNS.map((name, position) => ({ name, position })) },
          },
        },
      },
      select: { id: true },
    });
    await logActivity({
      projectId: project.id,
      userId: user.id,
      type: "PROJECT_CREATED",
      description: `criou o projeto "${data.name}"`,
    });
    revalidatePath("/dashboard");
    revalidatePath("/projects");
    return { id: project.id };
  });
}

export async function updateProjectAction(projectId: string, input: ProjectInput) {
  return run(async () => {
    const { user } = await requireProjectAdmin(projectId);
    const data = projectSchema.parse(input);
    await prisma.project.update({
      where: { id: projectId },
      data: { name: data.name, description: data.description || null, color: data.color },
    });
    await logActivity({ projectId, userId: user.id, type: "PROJECT_UPDATED", description: "atualizou as configurações do projeto" });
    revalidatePath(`/projects/${projectId}`, "layout");
    revalidatePath("/projects");
  });
}

export async function deleteProjectAction(projectId: string) {
  return run(async () => {
    await requireProjectOwner(projectId);
    // Anexos ficam órfãos no storage se não forem removidos antes.
    const files = await prisma.attachment.findMany({
      where: { task: { column: { board: { projectId } } } },
      select: { fileUrl: true },
    });
    await prisma.project.delete({ where: { id: projectId } });
    const { getStorage } = await import("@/lib/storage");
    const storage = await getStorage();
    await Promise.allSettled(files.map((f) => storage.delete(f.fileUrl)));
    revalidatePath("/dashboard");
    revalidatePath("/projects");
  });
}
