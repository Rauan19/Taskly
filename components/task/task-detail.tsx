import { notFound } from "next/navigation";
import { requireTaskAccess, canDeleteTask, canEditTask, isAdmin } from "@/lib/permissions";
import { getActivities, getBoardColumns, getProjectMembers, getTaskDetail } from "@/lib/queries";
import { PAGE_SIZE } from "@/lib/constants";
import { toDateInput } from "@/lib/dates";
import { ActivityList } from "@/components/activity-list";
import { TaskEditor } from "./task-editor";
import { Checklist } from "./checklist";
import { Comments } from "./comments";
import { Attachments } from "./attachments";

/**
 * Conteúdo da tarefa — usado tanto na página /tasks/[taskId] quanto no modal do quadro.
 * `basePath` é a URL atual (sem o parâmetro de comentários), usada nos links "ver mais".
 */
export async function TaskDetail({ taskId, expectedProjectId, basePath, commentsLimit, afterDeleteHref, copyHrefBase }: {
  taskId: string;
  expectedProjectId?: string;
  basePath: string;
  commentsLimit: number;
  afterDeleteHref: string;
  copyHrefBase: string;
}) {
  const { user, role, projectId } = await requireTaskAccess(taskId);
  if (expectedProjectId && expectedProjectId !== projectId) notFound();

  const [task, members, activity] = await Promise.all([
    getTaskDetail(taskId, commentsLimit),
    getProjectMembers(projectId),
    getActivities(projectId, PAGE_SIZE, taskId),
  ]);
  if (!task) notFound();
  const columns = await getBoardColumns(task.column.boardId);

  const own = { createdById: task.createdById, assignedToId: task.assignedToId };
  const canEdit = canEditTask(role, user.id, own);
  const sep = basePath.includes("?") ? "&" : "?";

  return (
    <div className="grid gap-6 p-4 sm:p-5 lg:grid-cols-[1fr_260px]">
      <div className="min-w-0 space-y-7">
        <TaskEditor
          taskId={task.id}
          title={task.title}
          description={task.description ?? ""}
          priority={task.priority}
          dueDate={toDateInput(task.dueDate)}
          assignedToId={task.assignedToId ?? ""}
          columnId={task.columnId}
          completed={!!task.completedAt}
          members={members.map((m) => ({ id: m.id, name: m.name }))}
          columns={columns}
          canEdit={canEdit}
          canDelete={canDeleteTask(role, user.id, own)}
          afterDeleteHref={afterDeleteHref}
          copyHrefBase={copyHrefBase}
        />
        <Checklist taskId={task.id} initial={task.checklist} canEdit={canEdit} />
        <Attachments
          taskId={task.id}
          items={task.attachments.map((a) => ({
            id: a.id,
            fileName: a.fileName,
            fileType: a.fileType,
            fileSize: a.fileSize,
            canDelete: a.uploadedById === user.id || isAdmin(role),
          }))}
        />
        <Comments
          taskId={task.id}
          me={user.id}
          isAdmin={isAdmin(role)}
          items={task.comments.map((c) => ({
            id: c.id,
            content: c.content,
            createdAt: c.createdAt.toISOString(),
            edited: c.updatedAt.getTime() - c.createdAt.getTime() > 1000,
            user: { id: c.user.id, name: c.user.name },
          }))}
          moreHref={task.hasMoreComments ? `${basePath}${sep}comments=${commentsLimit + PAGE_SIZE}` : undefined}
        />
      </div>

      <aside className="space-y-4 text-sm lg:border-l lg:border-line lg:pl-5">
        <div>
          <p className="label">Projeto</p>
          <p className="font-medium">{task.column.board.project.name}</p>
          <p className="text-xs text-muted">{task.column.board.name} · {task.column.name}</p>
        </div>
        <div>
          <p className="label">Criada por</p>
          <p>{task.createdBy.name}</p>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">Atividade</h3>
          <ActivityList items={activity.items} />
        </div>
      </aside>
    </div>
  );
}
