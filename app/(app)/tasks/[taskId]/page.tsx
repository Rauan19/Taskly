import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireTaskAccess } from "@/lib/permissions";
import { TaskDetail } from "@/components/task/task-detail";
import { PAGE_SIZE } from "@/lib/constants";

export const metadata: Metadata = { title: "Tarefa" };

export default async function TaskPage({
  params,
  searchParams,
}: {
  params: Promise<{ taskId: string }>;
  searchParams: Promise<{ comments?: string }>;
}) {
  const { taskId } = await params;
  const { comments } = await searchParams;
  const { projectId, task } = await requireTaskAccess(taskId);
  const boardUrl = `/projects/${projectId}/board?board=${task.column.boardId}`;
  const limit = Math.min(Math.max(Number(comments) || PAGE_SIZE, PAGE_SIZE), 200);

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <Link href={boardUrl} className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft size={15} /> Voltar ao quadro
      </Link>
      <div className="card">
        <TaskDetail
          taskId={taskId}
          basePath={`/tasks/${taskId}`}
          commentsLimit={limit}
          afterDeleteHref={boardUrl}
          copyHrefBase="/tasks/"
        />
      </div>
    </div>
  );
}
