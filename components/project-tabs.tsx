"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function ProjectTabs({ projectId, showSettings }: { projectId: string; showSettings: boolean }) {
  const path = usePathname();
  const base = `/projects/${projectId}`;
  const tabs = [
    { href: base, label: "Visão geral", exact: true },
    { href: `${base}/board`, label: "Quadro" },
    { href: `${base}/members`, label: "Membros" },
    ...(showSettings ? [{ href: `${base}/settings`, label: "Configurações" }] : []),
  ];
  return (
    <nav className="-mb-px mt-3 flex gap-5 overflow-x-auto" aria-label="Projeto">
      {tabs.map((t) => {
        const on = t.exact ? path === t.href : path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "border-b-2 pb-2.5 text-sm font-medium whitespace-nowrap transition-colors",
              on ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
