"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { run, UserError } from "@/lib/action";
import { logActivity } from "@/lib/activity";
import { ForbiddenError, requireAuth, requireProjectAdmin, requireProjectMember } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { inviteSchema, type InviteInput } from "@/schemas";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function inviteMemberAction(projectId: string, input: InviteInput) {
  return run(async () => {
    const { user } = await requireProjectAdmin(projectId);
    if (!rateLimit(`invite:${user.id}`, 30, 60 * 60_000)) throw new UserError("Muitos convites. Tente mais tarde.");
    const data = inviteSchema.parse(input);

    const existing = await prisma.projectMember.findFirst({
      where: { projectId, user: { email: data.email } },
      select: { id: true },
    });
    if (existing) throw new UserError("Essa pessoa já participa do projeto.");

    const token = randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
    await prisma.projectInvitation.upsert({
      where: { projectId_email: { projectId, email: data.email } },
      create: { projectId, email: data.email, role: data.role, token, expiresAt, invitedById: user.id },
      update: { role: data.role, token, expiresAt, invitedById: user.id },
    });
    await logActivity({
      projectId,
      userId: user.id,
      type: "INVITATION_SENT",
      description: `convidou ${data.email}`,
    });
    revalidatePath(`/projects/${projectId}/members`);
    return { token };
  });
}

export async function cancelInvitationAction(invitationId: string) {
  return run(async () => {
    const inv = await prisma.projectInvitation.findUnique({ where: { id: invitationId }, select: { projectId: true } });
    if (!inv) return;
    await requireProjectAdmin(inv.projectId);
    await prisma.projectInvitation.delete({ where: { id: invitationId } });
    revalidatePath(`/projects/${inv.projectId}/members`);
  });
}

export async function acceptInvitationAction(token: string) {
  return run(async () => {
    const user = await requireAuth();
    const inv = await prisma.projectInvitation.findUnique({ where: { token } });
    if (!inv) throw new UserError("Convite não encontrado.");
    if (inv.expiresAt < new Date()) throw new UserError("Este convite expirou. Peça um novo.");
    if (inv.email.toLowerCase() !== user.email.toLowerCase())
      throw new UserError(`Este convite foi enviado para ${inv.email}. Entre com essa conta.`);

    await prisma.$transaction([
      prisma.projectMember.upsert({
        where: { projectId_userId: { projectId: inv.projectId, userId: user.id } },
        create: { projectId: inv.projectId, userId: user.id, role: inv.role },
        update: {},
      }),
      prisma.projectInvitation.delete({ where: { id: inv.id } }),
    ]);
    await logActivity({
      projectId: inv.projectId,
      userId: user.id,
      type: "MEMBER_ADDED",
      description: "entrou no projeto",
    });
    revalidatePath("/dashboard");
    revalidatePath("/projects");
    return { projectId: inv.projectId };
  });
}

export async function declineInvitationAction(token: string) {
  return run(async () => {
    const user = await requireAuth();
    await prisma.projectInvitation.deleteMany({ where: { token, email: user.email.toLowerCase() } });
    revalidatePath("/dashboard");
  });
}

export async function removeMemberAction(projectId: string, userId: string) {
  return run(async () => {
    const actor = await requireProjectMember(projectId);
    const target = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { role: true, user: { select: { name: true } } },
    });
    if (!target) return;
    if (target.role === "OWNER") throw new ForbiddenError("O proprietário não pode ser removido.");

    const self = userId === actor.user.id;
    if (!self) {
      if (actor.role === "MEMBER") throw new ForbiddenError();
      if (actor.role === "ADMIN" && target.role === "ADMIN")
        throw new ForbiddenError("Só o proprietário remove administradores.");
    }

    await prisma.$transaction([
      prisma.task.updateMany({
        where: { assignedToId: userId, column: { board: { projectId } } },
        data: { assignedToId: null },
      }),
      prisma.projectMember.delete({ where: { projectId_userId: { projectId, userId } } }),
    ]);
    await logActivity({
      projectId,
      userId: actor.user.id,
      type: "MEMBER_REMOVED",
      description: self ? "saiu do projeto" : `removeu ${target.user.name} do projeto`,
    });
    revalidatePath(`/projects/${projectId}`, "layout");
    revalidatePath("/dashboard");
  });
}

export async function changeMemberRoleAction(projectId: string, userId: string, role: "ADMIN" | "MEMBER") {
  return run(async () => {
    const { user, role: actorRole } = await requireProjectMember(projectId);
    if (actorRole !== "OWNER") throw new ForbiddenError("Apenas o proprietário altera funções.");
    if (role !== "ADMIN" && role !== "MEMBER") throw new UserError("Função inválida.");
    const target = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { role: true, user: { select: { name: true } } },
    });
    if (!target || target.role === "OWNER") throw new ForbiddenError("Não é possível alterar o proprietário.");
    await prisma.projectMember.update({ where: { projectId_userId: { projectId, userId } }, data: { role } });
    await logActivity({
      projectId,
      userId: user.id,
      type: "MEMBER_ROLE_CHANGED",
      description: `alterou a função de ${target.user.name} para ${role === "ADMIN" ? "Administrador" : "Membro"}`,
    });
    revalidatePath(`/projects/${projectId}/members`);
  });
}
