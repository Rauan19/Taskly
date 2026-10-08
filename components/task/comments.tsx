"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { addCommentAction, deleteCommentAction, updateCommentAction } from "@/actions/task-items";
import { Avatar } from "@/components/ui";
import { formatDateTime } from "@/lib/dates";

type CommentData = { id: string; content: string; createdAt: string; edited: boolean; user: { id: string; name: string } };

export function Comments({ taskId, items, me, isAdmin, moreHref }: {
  taskId: string;
  items: CommentData[];
  me: string;
  isAdmin: boolean;
  moreHref?: string;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, start] = useTransition();

  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold">Comentários</h3>
      <form
        className="mb-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          start(async () => {
            const r = await addCommentAction(taskId, text);
            if (r.ok) { setText(""); setError(""); } else setError(r.error);
          });
        }}
      >
        <textarea
          className="input"
          rows={2}
          maxLength={2000}
          placeholder="Escreva um comentário…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit(); }}
          aria-label="Novo comentário"
        />
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-xs text-muted">Ctrl+Enter para enviar</span>
          <button className="btn-primary h-8" disabled={pending || !text.trim()}>Comentar</button>
        </div>
      </form>
      {error && <p role="alert" className="mb-2 text-sm text-red-600">{error}</p>}

      {items.length === 0 ? (
        <p className="text-sm text-muted">Nenhum comentário ainda.</p>
      ) : (
        <ul className="space-y-4">
          {items.map((c) => (
            <li key={c.id} className="flex gap-2.5">
              <Avatar name={c.user.name} size={26} />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <strong className="font-medium">{c.user.name}</strong>{" "}
                  <span className="text-xs text-muted">{formatDateTime(c.createdAt)}{c.edited && " · editado"}</span>
                </p>
                {editing === c.id ? (
                  <div className="mt-1">
                    <textarea className="input" rows={2} value={draft} maxLength={2000} onChange={(e) => setDraft(e.target.value)} autoFocus />
                    <div className="mt-1.5 flex gap-1.5">
                      <button
                        className="btn-primary h-8"
                        disabled={pending || !draft.trim()}
                        onClick={() => start(async () => {
                          const r = await updateCommentAction(c.id, draft);
                          if (r.ok) setEditing(null); else setError(r.error);
                        })}
                      >
                        Salvar
                      </button>
                      <button className="btn-ghost h-8" onClick={() => setEditing(null)}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-0.5 text-sm break-words whitespace-pre-wrap">{c.content}</p>
                )}
                {editing !== c.id && (c.user.id === me || isAdmin) && (
                  <p className="mt-1 flex gap-3 text-xs text-muted">
                    {c.user.id === me && (
                      <button className="hover:text-ink hover:underline" onClick={() => { setEditing(c.id); setDraft(c.content); }}>Editar</button>
                    )}
                    <button
                      className="hover:text-red-600 hover:underline"
                      onClick={() => confirm("Excluir comentário?") && start(async () => {
                        const r = await deleteCommentAction(c.id);
                        if (!r.ok) setError(r.error);
                      })}
                    >
                      Excluir
                    </button>
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {moreHref && (
        <Link href={moreHref} scroll={false} className="mt-3 inline-block text-sm font-medium text-accent hover:underline">
          Ver comentários anteriores
        </Link>
      )}
    </section>
  );
}
