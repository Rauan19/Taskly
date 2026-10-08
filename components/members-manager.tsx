"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, Plus, X } from "lucide-react";
import {
  cancelInvitationAction,
  changeMemberRoleAction,
  inviteMemberAction,
  removeMemberAction,
} from "@/actions/members";
import { Avatar } from "@/components/ui";
import { ROLE_LABEL } from "@/lib/constants";
import { inviteSchema, type InviteInput } from "@/schemas";
import type { Role } from "@prisma/client";

type Member = { id: string; name: string; avatarUrl: string | null; role: Role };
type Invitation = { id: string; email: string; role: Role; token: string; expiresAt: string };

export function MembersManager({
  projectId,
  me,
  myRole,
  members,
  invitations,
  openInvite,
}: {
  projectId: string;
  me: string;
  myRole: Role;
  members: Member[];
  invitations: Invitation[];
  openInvite?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(!!openInvite);
  const [error, setError] = useState("");
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState("");
  const [pending, start] = useTransition();
  const admin = myRole === "OWNER" || myRole === "ADMIN";

  const { register, handleSubmit, reset, formState: { errors } } = useForm<InviteInput>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "MEMBER" },
  });

  const inviteUrl = (token: string) => `${location.origin}/invitations/${token}`;
  const copy = async (token: string) => {
    await navigator.clipboard.writeText(inviteUrl(token)).catch(() => undefined);
    setCopied(token);
    setTimeout(() => setCopied(""), 1500);
  };

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError("");
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Erro");
      else router.refresh();
    });

  const onInvite = handleSubmit((data) =>
    start(async () => {
      setError("");
      setLink("");
      const res = await inviteMemberAction(projectId, data);
      if (!res.ok) return setError(res.error);
      setLink(inviteUrl(res.data.token));
      reset({ email: "", role: data.role });
      router.refresh();
    }),
  );

  return (
    <div className="space-y-6">
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {admin && (
        <section>
          {!open ? (
            <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> Adicionar membro</button>
          ) : (
            <form onSubmit={onInvite} className="card space-y-3 p-4" noValidate>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Convidar por e-mail</h2>
                <button type="button" className="btn-ghost size-8 p-0" onClick={() => setOpen(false)} aria-label="Fechar"><X size={16} /></button>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
                <div>
                  <label className="label" htmlFor="inv-email">E-mail</label>
                  <input id="inv-email" type="email" className="input" {...register("email")} />
                  {errors.email && <p className="field-error">{errors.email.message}</p>}
                </div>
                <div>
                  <label className="label" htmlFor="inv-role">Função</label>
                  <select id="inv-role" className="input" {...register("role")}>
                    <option value="MEMBER">Membro</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
                <button className="btn-primary" disabled={pending}>Criar convite</button>
              </div>
              {link && (
                <div className="rounded-lg bg-accent-soft px-3 py-2 text-sm">
                  <p className="mb-1 font-medium text-accent">Convite criado. Envie este link para a pessoa:</p>
                  <div className="flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate text-xs">{link}</code>
                    <button type="button" className="btn-secondary h-7 px-2 text-xs" onClick={() => navigator.clipboard.writeText(link)}>
                      <Copy size={13} /> Copiar
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}
        </section>
      )}

      <section className="card divide-y divide-line">
        {members.map((m) => {
          const canRemove = m.role !== "OWNER" && (m.id === me || myRole === "OWNER" || (myRole === "ADMIN" && m.role === "MEMBER"));
          return (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar name={m.name} size={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{m.name}{m.id === me && <span className="ml-1.5 text-xs font-normal text-muted">(você)</span>}</p>
              </div>
              {myRole === "OWNER" && m.role !== "OWNER" ? (
                <select
                  className="input h-8 w-auto py-0 text-xs"
                  value={m.role}
                  disabled={pending}
                  aria-label={`Função de ${m.name}`}
                  onChange={(e) => run(() => changeMemberRoleAction(projectId, m.id, e.target.value as "ADMIN" | "MEMBER"))}
                >
                  <option value="MEMBER">Membro</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              ) : (
                <span className="text-xs text-muted">{ROLE_LABEL[m.role]}</span>
              )}
              {canRemove && (
                <button
                  className="btn-ghost h-8 px-2 text-xs"
                  disabled={pending}
                  onClick={() => confirm(m.id === me ? "Sair deste projeto?" : `Remover ${m.name}?`) && run(async () => {
                    const res = await removeMemberAction(projectId, m.id);
                    if (res.ok && m.id === me) router.push("/projects");
                    return res;
                  })}
                >
                  {m.id === me ? "Sair" : "Remover"}
                </button>
              )}
            </div>
          );
        })}
      </section>

      {admin && invitations.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">Convites pendentes</h2>
          <div className="card divide-y divide-line">
            {invitations.map((i) => (
              <div key={i.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{i.email}</p>
                  <p className="text-xs text-muted">{ROLE_LABEL[i.role]} · expira em {new Date(i.expiresAt).toLocaleDateString("pt-BR")}</p>
                </div>
                <button className="btn-secondary h-8 px-2.5 text-xs" onClick={() => copy(i.token)}>
                  <Copy size={13} /> {copied === i.token ? "Copiado" : "Copiar link"}
                </button>
                <button className="btn-ghost h-8 px-2 text-xs" disabled={pending} onClick={() => run(() => cancelInvitationAction(i.id))}>Cancelar</button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
