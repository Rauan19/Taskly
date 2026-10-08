"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { run, UserError } from "@/lib/action";
import { logActivity } from "@/lib/activity";
import { parseDueDate } from "@/lib/dates";
import { revalidateTask } from "@/lib/revalidate";
import { cleanText } from "@/lib/utils";
import {
  assertCanEditTask,
  canDeleteTask,
  ForbiddenError,
  requireColumnAccess,
  requireTaskAccess,
} from "@/lib/permissions";
import {
  moveTaskSchema,
  taskCreateSchema,
  taskUpdateSchema,
  type TaskCreateInput,
  type TaskUpdateInput,
} from "@/schemas";
import { z } from "zod";

async function assertAssignee(projectId: string, userId: string | null | undefined) {
  if (!userId) return;
  const m = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { id: true },
  });
  if (!m) throw new UserError("O responsável precisa ser membro do projeto.");
}

export async function createTaskAction(input: TaskCreateInput) {
  return run(async () => {
    const data = taskCreateSchema.parse(input);
    const { user, projectId } = await requireColumnAccess(data.columnId);
    await assertAssignee(projectId, data.assignedToId);

    const last = await prisma.task.aggregate({ where: { columnId: data.columnId }, _max: { position: true } });
    const task = await prisma.task.create({
      data: {
        columnId: data.columnId,
        title: cleanText(data.title),
        description: data.description ? cleanText(data.description) : null,
        priority: data.priority,
        dueDate: parseDueDate(data.dueDate),
        assignedToId: data.assignedToId || null,
        createdById: user.id,
        position: (last._max.position ?? -1) + 1,
      },
      select: { id: true },
    });
    await logActivity({
      projectId,
      userId: user.id,
      taskId: task.id,
      type: "TASK_CREATED",
      description: `criou a tarefa "${cleanText(data.title)}"`,
    });
    revalidateTask(projectId);
    return { id: task.id };
  });
}

export async function updateTaskAction(taskId: string, input: TaskUpdateInput) {
  return run(async () => {
    const data = taskUpdateSchema.parse(input);
    const { user, role, projectId, task } = await requireTaskAccess(taskId);
    assertCanEditTask(role, user.id, task);

    const patch: Prisma.TaskUncheckedUpdateInput = {};
    if (data.title !== undefined) patch.title = cleanText(data.title);
    if (data.description !== undefined) patch.description = data.description ? cleanText(data.description) : null;
    if (data.priority !== undefined) patch.priority = data.priority;
    if (data.dueDate !== undefined) patch.dueDate = parseDueDate(data.dueDate);
    const assigneeChanged = data.assignedToId !== undefined && (data.assignedToId || null) !== task.assignedToId;
    if (assigneeChanged) {
      await assertAssignee(projectId, data.assignedToId);
      patch.assignedToId = data.assignedToId || null;
    }
    if (Object.keys(patch).length === 0) return;

    await prisma.task.update({ where: { id: taskId }, data: patch });

    if (assigneeChanged) {
      const who = data.assignedToId
        ? (await prisma.user.findUnique({ where: { id: data.assignedToId }, select: { name: true } }))?.name
        : null;
      await logActivity({
        projectId,
        userId: user.id,
        taskId,
        type: "TASK_ASSIGNED",
        description: who ? `atribuiu "${task.title}" a ${who}` : `removeu o responsável de "${task.title}"`,
      });
    }
    if (Object.keys(patch).some((k) => k !== "assignedToId")) {
      await logActivity({
        projectId,
        userId: user.id,
        taskId,
        type: "TASK_UPDATED",
        description: `editou a tarefa "${task.title}"`,
      });
    }
    revalidateTask(projectId, taskId);
  });
}

export async function toggleCompleteAction(taskId: string) {
  return run(async () => {
    const { user, role, projectId, task } = await requireTaskAccess(taskId);
    assertCanEditTask(role, user.id, task);
    const done = !task.completedAt;
    await prisma.task.update({ where: { id: taskId }, data: { completedAt: done ? new Date() : null } });
    await logActivity({
      projectId,
      userId: user.id,
      taskId,
      type: done ? "TASK_COMPLETED" : "TASK_REOPENED",
      description: done ? `concluiu "${task.title}"` : `reabriu "${task.title}"`,
    });
    revalidateTask(projectId, taskId);
  });
}

export async function deleteTaskAction(taskId: string) {
  return run(async () => {
    const { user, role, projectId, task } = await requireTaskAccess(taskId);
    if (!canDeleteTask(role, user.id, task)) throw new ForbiddenError("Só quem criou a tarefa ou um administrador pode excluí-la.");
    const files = await prisma.attachment.findMany({ where: { taskId }, select: { fileUrl: true } });
    await prisma.task.delete({ where: { id: taskId } });
    const { getStorage } = await import("@/lib/storage");
    const storage = await getStorage();
    await Promise.allSettled(files.map((f) => storage.delete(f.fileUrl)));
    await logActivity({
      projectId,
      userId: user.id,
      type: "TASK_DELETED",
      description: `excluiu a tarefa "${task.title}"`,
    });
    revalidateTask(projectId);
  });
}

export async function duplicateTaskAction(taskId: string) {
  return run(async () => {
    const { user, projectId } = await requireTaskAccess(taskId);
    const src = await prisma.task.findUniqueOrThrow({
      where: { id: taskId },
      include: { checklist: { orderBy: { position: "asc" } } },
    });
    const last = await prisma.task.aggregate({ where: { columnId: src.columnId }, _max: { position: true } });
    const copy = await prisma.task.create({
      data: {
        columnId: src.columnId,
        title: `${src.title} (cópia)`.slice(0, 160),
        description: src.description,
        priority: src.priority,
        dueDate: src.dueDate,
        assignedToId: src.assignedToId,
        createdById: user.id,
        position: (last._max.position ?? -1) + 1,
        checklist: { create: src.checklist.map((c, i) => ({ title: c.title, position: i })) },
      },
      select: { id: true },
    });
    await logActivity({
      projectId,
      userId: user.id,
      taskId: copy.id,
      type: "TASK_CREATED",
      description: `duplicou a tarefa "${src.title}"`,
    });
    revalidateTask(projectId);
    return { id: copy.id };
  });
}

/**
 * Persiste o resultado de um drag-and-drop: recebe a ordem final da coluna de destino
 * (e da de origem, se mudou) e grava só as linhas que realmente mudaram, numa transação.
 */
export async function moveTaskAction(input: z.input<typeof moveTaskSchema>) {
  return run(async () => {
    const data = moveTaskSchema.parse(input);
    const { user, projectId, task } = await requireTaskAccess(data.taskId);
    const boardId = task.column.boardId;

    if (!data.orderedIds.includes(data.taskId)) throw new UserError("Ordem inválida.");
    const ids = [...new Set([...data.orderedIds, ...(data.fromOrderedIds ?? [])])];

    const [columns, tasks] = await Promise.all([
      prisma.column.findMany({ where: { boardId }, select: { id: true, name: true, position: true } }),
      prisma.task.findMany({
        where: { id: { in: ids } },
        select: { id: true, columnId: true, position: true, completedAt: true, column: { select: { boardId: true } } },
      }),
    ]);
    const toColumn = columns.find((c) => c.id === data.toColumnId);
    if (!toColumn) throw new UserError("Coluna inválida.");
    if (tasks.length !== ids.length || tasks.some((t) => t.column.boardId !== boardId))
      throw new UserError("Tarefas inválidas.");

    const byId = new Map(tasks.map((t) => [t.id, t]));
    const fromColumnId = task.columnId;
    const updates: Prisma.PrismaPromise<unknown>[] = [];

    const place = (list: string[], columnId: string) =>
      list.forEach((id, index) => {
        const t = byId.get(id)!;
        if (t.columnId !== columnId && id !== data.taskId) {
          // só a tarefa movida pode trocar de coluna
          throw new UserError("Ordem inválida.");
        }
        if (t.columnId !== columnId || t.position !== index) {
          const extra: Prisma.TaskUncheckedUpdateInput = {};
          if (id === data.taskId) {
            const lastCol = Math.max(...columns.map((c) => c.position));
            const toLast = toColumn.position === lastCol;
            if (toLast && !t.completedAt) extra.completedAt = new Date();
            if (!toLast && t.completedAt && columnId !== fromColumnId) extra.completedAt = null;
          }
          updates.push(prisma.task.update({ where: { id }, data: { columnId, position: index, ...extra } }));
        }
      });

    place(data.orderedIds, data.toColumnId);
    if (data.fromOrderedIds && fromColumnId !== data.toColumnId) place(data.fromOrderedIds, fromColumnId);
    if (updates.length) await prisma.$transaction(updates);

    if (fromColumnId !== data.toColumnId) {
      await logActivity({
        projectId,
        userId: user.id,
        taskId: task.id,
        type: "TASK_MOVED",
        description: `moveu "${task.title}" para ${toColumn.name}`,
      });
    }
    // Sem revalidatePath: o quadro já está atualizado no cliente.
    revalidatePath("/dashboard");
  });
}

/** Mover pela caixa de seleção do modal (mobile): põe a tarefa no fim da coluna escolhida. */
export async function moveTaskToColumnAction(taskId: string, toColumnId: string) {
  return run(async () => {
    const { projectId, task } = await requireTaskAccess(taskId);
    if (task.columnId === toColumnId) return;
    const target = await prisma.task.findMany({
      where: { columnId: toColumnId, column: { boardId: task.column.boardId } },
      orderBy: { position: "asc" },
      select: { id: true },
    });
    const res = await moveTaskAction({
      taskId,
      toColumnId,
      orderedIds: [...target.map((t) => t.id), taskId],
    });
    if (!res.ok) throw new UserError(res.error);
    revalidateTask(projectId, taskId);
  });
}
