import type { Metadata } from "next";
import { LoginForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold tracking-tight">Entrar</h1>
      <p className="mb-5 text-sm text-muted">Acesse seus projetos e tarefas.</p>
      <LoginForm next={next} />
    </>
  );
}
