"use client";

import Link from "next/link";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md px-5 py-24 text-center">
      <h1 className="text-xl font-semibold">Não foi possível abrir esta página</h1>
      <p className="mt-2 text-sm text-muted">O conteúdo não existe ou você não tem acesso a ele.</p>
      <div className="mt-6 flex justify-center gap-2">
        <button onClick={reset} className="btn-secondary">Tentar de novo</button>
        <Link href="/dashboard" className="btn-primary">Ir ao dashboard</Link>
      </div>
    </div>
  );
}
