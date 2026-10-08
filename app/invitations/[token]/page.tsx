import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/permissions";
import { InvitationActions } from "@/components/invitation-actions";
import { Logo } from "@/components/ui";
import { ROLE_LABEL } from "@/lib/constants";

export const metadata: Metadata = { title: "Convite" };

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await requireAuth(); // o proxy já manda visitantes para /login?next=/invitations/<token>

  const inv = await prisma.projectInvitation.findUnique({
    where: { token },
    select: {
      email: true,
      role: true,
      expiresAt: true,
      project: { select: { id: true, name: true } },
      invitedBy: { select: { name: true } },
    },
  });

  let problem = "";
  if (!inv) problem = "Este convite não existe ou já foi usado.";
  else if (inv.expiresAt < new Date()) problem = "Este convite expirou. Peça um novo ao administrador do projeto.";
  else if (inv.email.toLowerCase() !== user.email.toLowerCase())
    problem = `Este convite foi enviado para ${inv.email}, mas você está conectado como ${user.email}. Entre com a conta correta.`;

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo href="/dashboard" /></div>
        <div className="card p-6 text-center">
          {problem || !inv ? (
            <>
              <h1 className="text-lg font-semibold">Convite indisponível</h1>
              <p className="mt-2 text-sm text-muted">{problem}</p>
              <Link href="/dashboard" className="btn-secondary mt-5">Ir ao dashboard</Link>
            </>
          ) : (
            <>
              <h1 className="text-lg font-semibold text-balance">Entrar em {inv.project.name}</h1>
              <p className="mt-2 text-sm text-muted">
                {inv.invitedBy.name} convidou você como <strong className="text-ink">{ROLE_LABEL[inv.role].toLowerCase()}</strong>.
              </p>
              <InvitationActions token={token} />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
