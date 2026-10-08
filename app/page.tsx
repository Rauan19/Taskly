import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { Logo } from "@/components/ui";

export default async function Home() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col px-5">
      <header className="flex items-center justify-between py-5">
        <Logo />
        <nav className="flex gap-2">
          <Link href="/login" className="btn-ghost">Entrar</Link>
          <Link href="/register" className="btn-primary">Criar conta</Link>
        </nav>
      </header>
      <section className="my-auto py-16">
        <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Projetos e tarefas, sem o resto.
        </h1>
        <p className="mt-4 max-w-lg text-lg text-muted text-pretty">
          Quadros Kanban, checklists, prazos e comentários para pequenas equipes. Rápido, simples e sem enfeites.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/register" className="btn-primary h-10 px-5">Começar agora</Link>
          <Link href="/login" className="btn-secondary h-10 px-5">Já tenho conta</Link>
        </div>
      </section>
    </main>
  );
}
