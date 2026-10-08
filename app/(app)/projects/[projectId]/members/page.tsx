import type { Metadata } from "next";
import { isAdmin, requireProjectMember } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { getProjectMembers } from "@/lib/queries";
import { MembersManager } from "@/components/members-manager";

export const metadata: Metadata = { title: "Membros" };

export default async function MembersPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ invite?: string }>;
}) {
  const { projectId } = await params;
  const { invite } = await searchParams;
  const { user, role } = await requireProjectMember(projectId);

  const [members, invitations] = await Promise.all([
    getProjectMembers(projectId),
    // token de convite só é carregado para administradores
    isAdmin(role)
      ? prisma.projectInvitation.findMany({
          where: { projectId, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: "desc" },
          select: { id: true, email: true, role: true, token: true, expiresAt: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <MembersManager
        projectId={projectId}
        me={user.id}
        myRole={role}
        members={members}
        invitations={invitations.map((i) => ({ ...i, expiresAt: i.expiresAt.toISOString() }))}
        openInvite={invite === "1" && isAdmin(role)}
      />
    </div>
  );
}
