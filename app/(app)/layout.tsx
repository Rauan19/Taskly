import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/permissions";
import { BottomNav, SidebarNav } from "@/components/app-nav";
import { Avatar, Logo } from "@/components/ui";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();
  const projects = await prisma.projectMember.findMany({
    where: { userId: user.id },
    orderBy: { project: { name: "asc" } },
    select: { project: { select: { id: true, name: true, color: true } } },
    take: 50,
  });

  return (
    <div className="min-h-dvh md:flex">
      <aside className="sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-canvas p-3 md:flex md:w-16 lg:w-60">
        <div className="mb-5 flex h-9 items-center md:justify-center lg:justify-start lg:px-2">
          <span className="lg:hidden">
            <Link href="/dashboard" className="grid size-7 place-items-center rounded-lg bg-accent text-sm font-bold text-white">T</Link>
          </span>
          <span className="hidden lg:block"><Logo href="/dashboard" /></span>
        </div>
        <SidebarNav projects={projects.map((m) => m.project)} />
        <Link href="/projects/new" className="btn-secondary mt-3 md:px-0 lg:px-3.5" title="Novo projeto">
          <Plus size={16} /> <span className="hidden lg:inline">Novo projeto</span>
        </Link>
        <Link href="/profile" className="mt-auto flex items-center gap-2.5 rounded-lg p-2 hover:bg-stone-200/60 md:justify-center lg:justify-start">
          <Avatar name={user.name} size={28} />
          <span className="hidden min-w-0 lg:block">
            <span className="block truncate text-sm font-medium">{user.name}</span>
            <span className="block truncate text-xs text-muted">{user.email}</span>
          </span>
        </Link>
      </aside>
      <main className="min-w-0 flex-1 pb-20 md:pb-0">{children}</main>
      <BottomNav />
    </div>
  );
}
