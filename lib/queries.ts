import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db/prisma";
import { todayStart, tomorrowStart } from "@/lib/dates";
import { PAGE_SIZE } from "@/lib/constants";
import type { BoardColumn, MemberLite } from "@/types";

const userLite = { id: true, name: true, avatarUrl: true } as const;

// ---------- projetos ----------

export async function getUserProjects(userId: string) {
  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    orderBy: { project: { updatedAt: "desc" } },
    select: {
      role: true,
      project: { select: { id: true, name: true, description: true, color: true, _count: { select: { members: true } } } },
    },
  });
  const ids = memberships.map((m) => m.project.id);
  const counts = ids.length
    ? await prisma.$queryRaw<{ projectId: string; open: number; total: number }[]>`
        SELECT b."projectId" AS "projectId",
               COUNT(*) FILTER (WHERE t."completedAt" IS NULL)::int AS open,
               COUNT(*)::int AS total
        FROM "Task" t
        JOIN "Column" c ON c.id = t."columnId"
        JOIN "Board" b ON b.id = c."boardId"
        WHERE b."projectId" = ANY(${ids}::text[])
        GROUP BY b."projectId"`
    : [];
  const byProject = new Map(counts.map((c) => [c.projectId, c]));
  return memberships.map((m) => ({
    ...m.project,
    role: m.role,
    members: m.project._count.members,
    open: byProject.get(m.project.id)?.open ?? 0,
    total: byProject.get(m.project.id)?.total ?? 0,
  }));
}

/** Projeto + papel do usuário. Usado no layout do projeto (cache por request). */
export const getProject = cache(async (projectId: string) => {
  return prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, description: true, color: true, ownerId: true, createdAt: true },
  });
});

export async function getProjectMembers(projectId: string): Promise<MemberLite[]> {
  const rows = await prisma.projectMember.findMany({
    where: { projectId },
    orderBy: [{ createdAt: "asc" }],
    select: { role: true, user: { select: userLite } },
  });
  const order = { OWNER: 0, ADMIN: 1, MEMBER: 2 } as const;
  return rows.map((r) => ({ ...r.user, role: r.role })).sort((a, b) => order[a.role] - order[b.role]);
}

export async function getProjectBoards(projectId: string) {
  return prisma.board.findMany({
    where: { projectId },
    orderBy: { position: "asc" },
    select: { id: true, name: true },
  });
}

export async function getProjectStats(projectId: string) {
  const now = todayStart();
  const where = { column: { board: { projectId } } };
  const [total, done, overdue] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.count({ where: { ...where, completedAt: { not: null } } }),
    prisma.task.count({ where: { ...where, completedAt: null, dueDate: { lt: now } } }),
  ]);
  return { total, done, open: total - done, overdue };
}

export async function getActivities(projectId: string, limit = PAGE_SIZE, taskId?: string) {
  const rows = await prisma.activity.findMany({
    where: { projectId, ...(taskId ? { taskId } : {}) },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    select: { id: true, description: true, type: true, createdAt: true, taskId: true, user: { select: userLite } },
  });
  return { items: rows.slice(0, limit), hasMore: rows.length > limit };
}

// ---------- quadro ----------

export async function getBoard(boardId: string): Promise<BoardColumn[]> {
  const [columns, doneCounts] = await Promise.all([
    prisma.column.findMany({
      where: { boardId },
      orderBy: { position: "asc" },
      select: {
        id: true,
        name: true,
        color: true,
        tasks: {
          orderBy: { position: "asc" },
          select: {
            id: true,
            title: true,
            priority: true,
            dueDate: true,
            completedAt: true,
            createdById: true,
            assignedTo: { select: userLite },
            _count: { select: { checklist: true, comments: true, attachments: true } },
          },
        },
      },
    }),
    prisma.checklist.groupBy({
      by: ["taskId"],
      where: { completed: true, task: { column: { boardId } } },
      _count: { _all: true },
    }),
  ]);
  const done = new Map(doneCounts.map((d) => [d.taskId, d._count._all]));
  return columns.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    tasks: c.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      dueDate: t.dueDate?.toISOString() ?? null,
      completedAt: t.completedAt?.toISOString() ?? null,
      createdById: t.createdById,
      assignee: t.assignedTo,
      checklistTotal: t._count.checklist,
      checklistDone: done.get(t.id) ?? 0,
      comments: t._count.comments,
      attachments: t._count.attachments,
    })),
  }));
}

// ---------- tarefa ----------

export async function getTaskDetail(taskId: string, commentsLimit = PAGE_SIZE) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      description: true,
      priority: true,
      dueDate: true,
      completedAt: true,
      createdAt: true,
      createdById: true,
      assignedToId: true,
      columnId: true,
      createdBy: { select: userLite },
      column: {
        select: {
          name: true,
          boardId: true,
          board: { select: { id: true, name: true, projectId: true, project: { select: { name: true, color: true } } } },
        },
      },
      checklist: { orderBy: { position: "asc" }, select: { id: true, title: true, completed: true } },
      attachments: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, fileName: true, fileType: true, fileSize: true, uploadedById: true, createdAt: true },
      },
      comments: {
        orderBy: { createdAt: "desc" },
        take: commentsLimit + 1,
        select: { id: true, content: true, createdAt: true, updatedAt: true, user: { select: userLite } },
      },
      _count: { select: { comments: true } },
    },
  });
  if (!task) return null;
  const { comments, ...rest } = task;
  return { ...rest, comments: comments.slice(0, commentsLimit), hasMoreComments: comments.length > commentsLimit };
}

export async function getBoardColumns(boardId: string) {
  return prisma.column.findMany({
    where: { boardId },
    orderBy: { position: "asc" },
    select: { id: true, name: true },
  });
}

// ---------- dashboard / minhas tarefas ----------

const myTaskSelect = {
  id: true,
  title: true,
  priority: true,
  dueDate: true,
  completedAt: true,
  column: { select: { name: true, board: { select: { project: { select: { id: true, name: true, color: true } } } } } },
} as const;

export async function getDashboard(userId: string, email: string) {
  const today = todayStart();
  const tomorrow = tomorrowStart();
  const mine = { assignedToId: userId, column: { board: { project: { members: { some: { userId } } } } } };
  const open = { ...mine, completedAt: null };

  const [projects, pending, doneCount, overdue, dueToday, recentDone, pendingInvites, inProgress] = await Promise.all([
    prisma.projectMember.count({ where: { userId } }),
    prisma.task.count({ where: open }),
    prisma.task.count({ where: { ...mine, completedAt: { not: null } } }),
    prisma.task.findMany({
      where: { ...open, dueDate: { lt: today } },
      orderBy: { dueDate: "asc" },
      take: 8,
      select: myTaskSelect,
    }),
    prisma.task.findMany({
      where: { ...open, dueDate: { gte: today, lt: tomorrow } },
      orderBy: { priority: "desc" },
      take: 8,
      select: myTaskSelect,
    }),
    prisma.task.findMany({
      where: { ...mine, completedAt: { not: null } },
      orderBy: { completedAt: "desc" },
      take: 5,
      select: myTaskSelect,
    }),
    prisma.projectInvitation.findMany({
      where: { email: email.toLowerCase(), expiresAt: { gt: new Date() } },
      select: { token: true, role: true, project: { select: { name: true } }, invitedBy: { select: { name: true } } },
    }),
    // "Em andamento" = abertas em colunas que não são a primeira nem a última do quadro.
    prisma.$queryRaw<{ n: number }[]>`
      SELECT COUNT(*)::int AS n
      FROM "Task" t
      JOIN "Column" c ON c.id = t."columnId"
      WHERE t."assignedToId" = ${userId} AND t."completedAt" IS NULL
        AND c.position > (SELECT MIN(position) FROM "Column" WHERE "boardId" = c."boardId")
        AND c.position < (SELECT MAX(position) FROM "Column" WHERE "boardId" = c."boardId")`,
  ]);

  return { projects, pending, inProgress: inProgress[0]?.n ?? 0, done: doneCount, overdue, dueToday, recentDone, pendingInvites };
}

export async function getMyTasks(userId: string, q: string, filter: string) {
  const today = todayStart();
  return prisma.task.findMany({
    where: {
      assignedToId: userId,
      column: { board: { project: { members: { some: { userId } } } } },
      ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
      ...(filter === "done"
        ? { completedAt: { not: null } }
        : filter === "overdue"
          ? { completedAt: null, dueDate: { lt: today } }
          : { completedAt: null }),
    },
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    take: 100,
    select: myTaskSelect,
  });
}
