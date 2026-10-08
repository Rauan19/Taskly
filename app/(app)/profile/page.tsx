import type { Metadata } from "next";
import { requireAuth } from "@/lib/permissions";
import { logoutAction } from "@/actions/auth";
import { Avatar, PageHeader } from "@/components/ui";
import { NameForm, PasswordForm } from "@/components/profile-forms";

export const metadata: Metadata = { title: "Perfil" };

export default async function ProfilePage() {
  const user = await requireAuth();
  return (
    <div className="mx-auto max-w-lg space-y-4 p-4 sm:p-6">
      <PageHeader title="Perfil" />
      <div className="card flex items-center gap-4 p-5">
        <Avatar name={user.name} size={52} />
        <div className="min-w-0">
          <p className="truncate font-semibold">{user.name}</p>
          <p className="truncate text-sm text-muted">{user.email}</p>
        </div>
      </div>
      <section className="card p-5">
        <h2 className="mb-3 text-sm font-semibold">Dados pessoais</h2>
        <NameForm name={user.name} />
      </section>
      <section className="card p-5">
        <h2 className="mb-3 text-sm font-semibold">Alterar senha</h2>
        <PasswordForm />
      </section>
      <form action={logoutAction}>
        <button className="btn-secondary w-full">Sair da conta</button>
      </form>
    </div>
  );
}
