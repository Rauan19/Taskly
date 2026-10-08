"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckSquare, FolderKanban, LayoutDashboard, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", label: "Dashboard", short: "Início", icon: LayoutDashboard },
  { href: "/projects", label: "Projetos", short: "Projetos", icon: FolderKanban },
  { href: "/my-tasks", label: "Minhas tarefas", short: "Tarefas", icon: CheckSquare },
  { href: "/profile", label: "Perfil", short: "Perfil", icon: UserRound },
];

const active = (path: string, href: string) => path === href || path.startsWith(href + "/");

export function SidebarNav({ projects }: { projects: { id: string; name: string; color: string }[] }) {
  const path = usePathname();
  return (
    <>
      <nav className="flex flex-col gap-0.5" aria-label="Principal">
        {ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            title={label}
            aria-current={active(path, href) ? "page" : undefined}
            className={cn(
              "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors md:justify-center lg:justify-start",
              active(path, href) ? "bg-accent-soft text-accent" : "text-muted hover:bg-stone-200/60 hover:text-ink",
            )}
          >
            <Icon size={17} strokeWidth={2} />
            <span className="hidden lg:inline">{label}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-6 hidden min-h-0 flex-1 overflow-y-auto lg:block">
        <p className="mb-1.5 px-2.5 text-[11px] font-semibold tracking-wider text-stone-400 uppercase">Projetos</p>
        <ul className="space-y-0.5">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/projects/${p.id}/board`}
                className={cn(
                  "flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors",
                  path.startsWith(`/projects/${p.id}`) ? "bg-stone-200/70 font-medium text-ink" : "text-muted hover:bg-stone-200/60 hover:text-ink",
                )}
              >
                <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: p.color }} />
                <span className="truncate">{p.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

export function BottomNav() {
  const path = usePathname();
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {ITEMS.map(({ href, short, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={active(path, href) ? "page" : undefined}
          className={cn(
            "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
            active(path, href) ? "text-accent" : "text-muted",
          )}
        >
          <Icon size={20} />
          {short}
        </Link>
      ))}
    </nav>
  );
}
