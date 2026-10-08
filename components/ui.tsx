import Link from "next/link";
import type { Priority } from "@prisma/client";
import { PRIORITY_META } from "@/lib/constants";
import { cn, initials } from "@/lib/utils";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="grid size-7 place-items-center rounded-lg bg-accent text-sm font-bold text-white">T</span>
      <span className="text-[15px]">Taskly</span>
    </Link>
  );
}

const AVATAR_TONES = ["bg-emerald-100 text-emerald-800", "bg-sky-100 text-sky-800", "bg-violet-100 text-violet-800", "bg-amber-100 text-amber-800", "bg-rose-100 text-rose-800"];

export function Avatar({ name, size = 24, className }: { name: string; size?: number; className?: string }) {
  const tone = AVATAR_TONES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TONES.length];
  return (
    <span
      title={name}
      style={{ width: size, height: size, fontSize: Math.max(9, size * 0.4) }}
      className={cn("inline-grid shrink-0 place-items-center rounded-full font-semibold ring-2 ring-white", tone, className)}
    >
      {initials(name)}
    </span>
  );
}

export function PriorityBadge({ priority, compact }: { priority: Priority; compact?: boolean }) {
  const m = PRIORITY_META[priority];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium", m.chip)}>
      <span className={cn("size-1.5 rounded-full", m.dot)} />
      {compact ? null : m.label}
      {compact ? m.label : null}
    </span>
  );
}

export function ProjectDot({ color, size = 10 }: { color: string; size?: number }) {
  return <span className="inline-block shrink-0 rounded-[3px]" style={{ background: color, width: size, height: size }} />;
}

export function PageHeader({ title, subtitle, actions }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-stone-300 px-6 py-10 text-center">
      <p className="font-medium">{title}</p>
      {children ? <div className="mt-1 text-sm text-muted">{children}</div> : null}
    </div>
  );
}
