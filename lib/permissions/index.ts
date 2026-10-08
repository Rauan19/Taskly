import "server-only";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser, type SessionUser } from "@/lib/auth/session";

export class ForbiddenError extends Error {
  constructor(message = "Você não tem permissão para fazer isso.") {
    super(message);
  }
}

const RANK: Record<Role, number> = { OWNER: 3, ADMIN: 2, MEMBER: 1 };
export const atLeast = (role: Role, min: Role) => RANK[role] >= RANK[min];
export const isAdmin = (role: Role) => atLeast(role, "ADMIN");

// ---------- autenticação ----------

/** Garante usuário logado; senão redireciona para /login. */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?expired=1");
  return user;
}

// ---------- projeto ----------

export type ProjectAccess = { user: SessionUser; role: Role; projectId: string };

/** Qualquer membro do projeto. Sem vínculo => ForbiddenError (não revela se o projeto existe). */
export async function requireProjectMember(projectId: string): Promise<ProjectAccess> {
  const user = await requireAuth();
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
    select: { role: true },
  });
  if (!member) throw new ForbiddenError("Projeto não encontrado ou sem acesso.");
  return { user, role: member.role, projectId };
}

export async function requireProjectAdmin(projectId: string) {
  const access = await requireProjectMember(projectId);
  if (!isAdmin(access.role)) throw new ForbiddenError("Apenas administradores podem fazer isso.");
  return access;
}

export async function requireProjectOwner(projectId: string) {
  const access = await requireProjectMember(projectId);
  if (access.role !== "OWNER") throw new ForbiddenError("Apenas o proprietário pode fazer isso.");
  return access;
}

// ---------- recursos aninhados (board/coluna/tarefa) → sempre resolvem o projeto no servidor ----------

export async function requireBoardAccess(boardId: string) {
  const board = await prisma.board.findUnique({ where: { id: boardId }, select: { id: true, projectId: true } });
  if (!board) throw new ForbiddenError("Quadro não encontrado.");
  return { ...(await requireProjectMember(board.projectId)), board };
}

export async function requireColumnAccess(columnId: string) {
  const column = await prisma.column.findUnique({
    where: { id: columnId },
    select: { id: true, boardId: true, board: { select: { projectId: true } } },
  });
  if (!column) throw new ForbiddenError("Coluna não encontrada.");
  return { ...(await requireProjectMember(column.board.projectId)), column };
}

export type TaskCtx = {
  id: string;
  title: string;
  columnId: string;
  createdById: string;
  assignedToId: string | null;
  completedAt: Date | null;
  column: { boardId: string; position: number; board: { projectId: string } };
};

export async function requireTaskAccess(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      columnId: true,
      createdById: true,
      assignedToId: true,
      completedAt: true,
      column: { select: { boardId: true, position: true, board: { select: { projectId: true } } } },
    },
  });
  if (!task) throw new ForbiddenError("Tarefa não encontrada.");
  return { ...(await requireProjectMember(task.column.board.projectId)), task: task as TaskCtx };
}

// ---------- regras finas (MEMBER só mexe no que é seu) ----------

type TaskOwnership = { createdById: string; assignedToId: string | null };

export const canEditTask = (role: Role, userId: string, t: TaskOwnership) =>
  isAdmin(role) || t.createdById === userId || t.assignedToId === userId;

export const canDeleteTask = (role: Role, userId: string, t: TaskOwnership) =>
  isAdmin(role) || t.createdById === userId;

export function assertCanEditTask(role: Role, userId: string, t: TaskOwnership) {
  if (!canEditTask(role, userId, t))
    throw new ForbiddenError("Você só pode editar tarefas criadas por você ou atribuídas a você.");
}
