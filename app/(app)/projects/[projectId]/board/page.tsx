import type { Metadata } from "next";
import { Suspense } from "react";
import { isAdmin, requireProjectMember } from "@/lib/permissions";
import { getBoard, getProjectBoards, getProjectMembers } from "@/lib/queries";
import { BoardView } from "@/components/board/board-view";
import { TaskDetail } from "@/components/task/task-detail";
import { TaskModal } from "@/components/task/task-modal";
import { PAGE_SIZE } from "@/lib/constants";

export const metadata: Metadata = { title: "Quadro" };

export default async function BoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ board?: string; task?: string; new?: string; comments?: string }>;
}) {
  const { projectId } = await params;
  const sp = await searchParams;
  const { user, role } = await requireProjectMember(projectId);

  const boards = await getProjectBoards(projectId);
  const current = boards.find((b) => b.id === sp.board) ?? boards[0];
  if (!current) return <p className="p-6 text-sm text-muted">Este projeto não tem quadros.</p>;

  const [columns, members] = await Promise.all([getBoard(current.id), getProjectMembers(projectId)]);

  const boardUrl = `/projects/${projectId}/board?board=${current.id}`;
  const commentsLimit = Math.min(Math.max(Number(sp.comments) || PAGE_SIZE, PAGE_SIZE), 200);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <BoardView
        key={current.id}
        boardId={current.id}
        boards={boards}
        initialColumns={columns}
        members={members.map((m) => ({ id: m.id, name: m.name, avatarUrl: m.avatarUrl }))}
        me={user.id}
        isAdmin={isAdmin(role)}
        openNew={sp.new === "1"}
      />
      {sp.task && (
        <TaskModal closeHref={boardUrl}>
          <Suspense fallback={<div className="p-6 text-sm text-muted">Carregando…</div>}>
            <TaskDetail
              taskId={sp.task}
              expectedProjectId={projectId}
              basePath={`${boardUrl}&task=${sp.task}`}
              commentsLimit={commentsLimit}
              afterDeleteHref={boardUrl}
              copyHrefBase={`${boardUrl}&task=`}
            />
          </Suspense>
        </TaskModal>
      )}
    </div>
  );
}
