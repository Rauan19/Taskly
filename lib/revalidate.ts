import { revalidatePath } from "next/cache";

export function revalidateTask(projectId: string, taskId?: string) {
  revalidatePath(`/projects/${projectId}/board`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
  revalidatePath("/my-tasks");
  if (taskId) revalidatePath(`/tasks/${taskId}`);
}
