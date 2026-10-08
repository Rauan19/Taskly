import Link from "next/link";
import { formatDateTime } from "@/lib/dates";
import { Avatar } from "@/components/ui";

type Item = {
  id: string;
  description: string;
  createdAt: Date;
  taskId: string | null;
  user: { name: string };
};

export function ActivityList({ items, moreHref }: { items: Item[]; moreHref?: string }) {
  if (!items.length) return <p className="text-sm text-muted">Nenhuma atividade ainda.</p>;
  return (
    <>
      <ul className="space-y-3">
        {items.map((a) => (
          <li key={a.id} className="flex gap-2.5">
            <Avatar name={a.user.name} size={22} />
            <div className="min-w-0 text-sm">
              <p className="text-pretty">
                <strong className="font-medium">{a.user.name}</strong> {a.description}
              </p>
              <p className="text-xs text-muted">{formatDateTime(a.createdAt)}</p>
            </div>
          </li>
        ))}
      </ul>
      {moreHref ? (
        <Link href={moreHref} scroll={false} className="mt-3 inline-block text-sm font-medium text-accent hover:underline">
          Ver mais
        </Link>
      ) : null}
    </>
  );
}
