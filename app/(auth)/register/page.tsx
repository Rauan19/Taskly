import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Criar conta" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold tracking-tight">Criar conta</h1>
      <p className="mb-5 text-sm text-muted">Leva menos de um minuto.</p>
      <RegisterForm next={next} />
    </>
  );
}
