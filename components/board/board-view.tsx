"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ChevronLeft, ChevronRight, MoreHorizontal, Plus, Search } from "lucide-react";
import { createTaskAction, moveTaskAction } from "@/actions/tasks";
import {
  createColumnAction,
  deleteColumnAction,
  reorderColumnsAction,
  updateColumnAction,
} from "@/actions/boards";
import { isOverdue } from "@/lib/dates";
import { PRIORITIES, PRIORITY_META, PROJECT_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { SortableTaskCard, TaskCardView } from "./task-card";
import { NewTaskDialog } from "./new-task-dialog";
import type { BoardColumn, UserLite } from "@/types";
import type { Priority } from "@prisma/client";

type Props = {
  boardId: string;
  boards: { id: string; name: string }[];
  initialColumns: BoardColumn[];
  members: UserLite[];
  me: string;
  isAdmin: boolean;
  openNew: boolean;
};

export function BoardView({ boardId, boards, initialColumns, members, me, isAdmin, openNew }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [columns, setColumns] = useState(initialColumns);
  useEffect(() => setColumns(initialColumns), [initialColumns]);

  const [q, setQ] = useState("");
  const [assignee, setAssignee] = useState("all");
  const [priority, setPriority] = useState<"all" | Priority>("all");
  const [status, setStatus] = useState("all");
  const [showNew, setShowNew] = useState(openNew);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const snapshot = useRef<BoardColumn[] | null>(null);
  const [, startRefresh] = useTransition();

  const filtering = !!q.trim() || assignee !== "all" || priority !== "all" || status !== "all";
  const refresh = () => startRefresh(() => router.refresh());
  const hrefFor = (taskId: string) => `${pathname}?board=${boardId}&task=${taskId}`;

  const match = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (t: BoardColumn["tasks"][number]) =>
      (!needle || t.title.toLowerCase().includes(needle)) &&
      (assignee === "all" || (assignee === "none" ? !t.assignee : t.assignee?.id === (assignee === "me" ? me : assignee))) &&
      (priority === "all" || t.priority === priority) &&
      (status === "all" ||
        (status === "open" ? !t.completedAt : status === "done" ? !!t.completedAt : isOverdue(t.dueDate, t.completedAt)));
  }, [q, assignee, priority, status, me]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const findColumnId = (id: string, cols = columns) =>
    cols.find((c) => c.id === id)?.id ?? cols.find((c) => c.tasks.some((t) => t.id === id))?.id;
  const activeTask = activeId ? columns.flatMap((c) => c.tasks).find((t) => t.id === activeId) : undefined;

  function onDragStart(e: DragStartEvent) {
    setError("");
    setActiveId(String(e.active.id));
    snapshot.current = columns;
  }

  // Durante o arrasto só o estado local muda (nenhuma chamada ao servidor).
  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const from = findColumnId(String(active.id));
    const to = findColumnId(String(over.id));
    if (!from || !to || from === to) return;
    setColumns((prev) => {
      const fromCol = prev.find((c) => c.id === from)!;
      const toCol = prev.find((c) => c.id === to)!;
      const task = fromCol.tasks.find((t) => t.id === active.id);
      if (!task) return prev;
      const overIndex = toCol.tasks.findIndex((t) => t.id === over.id);
      let index = toCol.tasks.length;
      if (overIndex !== -1) {
        const translated = active.rect.current.translated;
        const below = translated && translated.top > over.rect.top + over.rect.height / 2;
        index = overIndex + (below ? 1 : 0);
      }
      return prev.map((c) =>
        c.id === from
          ? { ...c, tasks: c.tasks.filter((t) => t.id !== active.id) }
          : c.id === to
            ? { ...c, tasks: [...c.tasks.slice(0, index), task, ...c.tasks.slice(index)] }
            : c,
      );
    });
  }

  // Ao soltar: uma única chamada ao servidor com a ordem final.
  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    const start = snapshot.current;
    snapshot.current = null;
    if (!start) return;
    if (!over) return setColumns(start);

    let next = columns;
    const colId = findColumnId(String(active.id), next);
    if (!colId) return setColumns(start);
    if (findColumnId(String(over.id), next) === colId) {
      const col = next.find((c) => c.id === colId)!;
      const oldIndex = col.tasks.findIndex((t) => t.id === active.id);
      const newIndex = col.tasks.findIndex((t) => t.id === over.id);
      if (newIndex !== -1 && oldIndex !== newIndex) {
        next = next.map((c) => (c.id === colId ? { ...c, tasks: arrayMove(c.tasks, oldIndex, newIndex) } : c));
        setColumns(next);
      }
    }

    const origColId = start.find((c) => c.tasks.some((t) => t.id === active.id))!.id;
    const orderedIds = next.find((c) => c.id === colId)!.tasks.map((t) => t.id);
    const origIds = start.find((c) => c.id === origColId)!.tasks.map((t) => t.id);
    const moved = origColId !== colId;
    if (!moved && origIds.join() === orderedIds.join()) return;

    moveTaskAction({
      taskId: String(active.id),
      toColumnId: colId,
      orderedIds,
      fromOrderedIds: moved ? next.find((c) => c.id === origColId)!.tasks.map((t) => t.id) : undefined,
    }).then((res) => {
      if (!res.ok) {
        setColumns(start);
        setError(res.error);
      } else if (moved) refresh(); // traz o estado "concluída" calculado no servidor
    });
  }

  // ----- colunas (admin) -----
  function moveColumn(id: string, dir: -1 | 1) {
    const i = columns.findIndex((c) => c.id === id);
    const j = i + dir;
    if (j < 0 || j >= columns.length) return;
    const next = arrayMove(columns, i, j);
    setColumns(next);
    reorderColumnsAction(boardId, next.map((c) => c.id)).then((r) => {
      if (!r.ok) {
        setColumns(columns);
        setError(r.error);
      }
    });
  }

  const colOptions = columns.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* barra de ferramentas */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
        {boards.length > 1 && (
          <select
            className="input w-auto"
            value={boardId}
            aria-label="Quadro"
            onChange={(e) => router.push(`${pathname}?board=${e.target.value}`)}
          >
            {boards.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
        <div className="relative min-w-40 flex-1 sm:max-w-xs">
          <Search size={15} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-stone-400" />
          <input className="input pl-8" placeholder="Pesquisar tarefas…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Pesquisar tarefas" />
        </div>
        <select className="input w-auto" value={assignee} onChange={(e) => setAssignee(e.target.value)} aria-label="Responsável">
          <option value="all">Todos</option>
          <option value="me">Atribuídas a mim</option>
          <option value="none">Sem responsável</option>
          {members.filter((m) => m.id !== me).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select className="input w-auto" value={priority} onChange={(e) => setPriority(e.target.value as "all" | Priority)} aria-label="Prioridade">
          <option value="all">Prioridade</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
        </select>
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Situação">
          <option value="all">Situação</option>
          <option value="open">Abertas</option>
          <option value="done">Concluídas</option>
          <option value="overdue">Atrasadas</option>
        </select>
        {filtering && (
          <button className="btn-ghost" onClick={() => { setQ(""); setAssignee("all"); setPriority("all"); setStatus("all"); }}>
            Limpar
          </button>
        )}
        <button className="btn-primary ml-auto" onClick={() => setShowNew(true)}><Plus size={16} /> Nova tarefa</button>
      </div>

      {filtering && <p className="px-4 pb-2 text-xs text-muted sm:px-6">Arrastar fica desativado enquanto há filtros ativos.</p>}
      {error && (
        <p role="alert" className="mx-4 mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:mx-6">{error}</p>
      )}

      {/* colunas */}
      <DndContext
        id="board-dnd"
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setActiveId(null);
          if (snapshot.current) setColumns(snapshot.current);
          snapshot.current = null;
        }}
      >
        <div className="board-scroll flex flex-1 items-start gap-3 overflow-x-auto px-4 pb-6 sm:px-6">
          {columns.map((col, i) => (
            <ColumnView
              key={col.id}
              column={col}
              visible={col.tasks.filter(match)}
              total={col.tasks.length}
              dragDisabled={filtering}
              isAdmin={isAdmin}
              isFirst={i === 0}
              isLast={i === columns.length - 1}
              hrefFor={hrefFor}
              onChanged={refresh}
              onMove={(dir) => moveColumn(col.id, dir)}
              onError={setError}
            />
          ))}
          {isAdmin && <AddColumn boardId={boardId} onDone={refresh} onError={setError} />}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeTask ? <TaskCardView task={activeTask} dragging /> : null}
        </DragOverlay>
      </DndContext>

      {showNew && columns.length > 0 && (
        <NewTaskDialog
          columns={colOptions}
          members={members}
          defaultColumnId={columns[0].id}
          onClose={() => {
            setShowNew(false);
            if (openNew) router.replace(`${pathname}?board=${boardId}`);
          }}
        />
      )}
    </div>
  );
}

function ColumnView({ column, visible, total, dragDisabled, isAdmin, isFirst, isLast, hrefFor, onChanged, onMove, onError }: {
  column: BoardColumn;
  visible: BoardColumn["tasks"];
  total: number;
  dragDisabled: boolean;
  isAdmin: boolean;
  isFirst: boolean;
  isLast: boolean;
  hrefFor: (taskId: string) => string;
  onChanged: () => void;
  onMove: (dir: -1 | 1) => void;
  onError: (msg: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [pending, start] = useTransition();

  const quickAdd = () => {
    const t = title.trim();
    if (!t) return setAdding(false);
    start(async () => {
      const res = await createTaskAction({ columnId: column.id, title: t, priority: "MEDIUM" });
      if (!res.ok) return onError(res.error);
      setTitle("");
      onChanged();
    });
  };

  const patchColumn = (patch: { name?: string; color?: string | null }) =>
    start(async () => {
      const res = await updateColumnAction(column.id, { name: patch.name ?? column.name, color: patch.color === undefined ? column.color : patch.color });
      if (!res.ok) onError(res.error);
      else onChanged();
    });

  return (
    <section className="board-col flex max-h-[calc(100dvh-15rem)] w-[82vw] max-w-80 shrink-0 flex-col rounded-xl bg-stone-200/50 sm:w-72 md:max-h-[calc(100dvh-11.5rem)]">
      <header className="flex items-center gap-2 px-3 pt-3 pb-2">
        <span className="size-2.5 shrink-0 rounded-full" style={{ background: column.color ?? "#a8a29e" }} />
        {renaming ? (
          <input
            className="input h-7 flex-1"
            defaultValue={column.name}
            autoFocus
            maxLength={40}
            onBlur={(e) => {
              setRenaming(false);
              const v = e.target.value.trim();
              if (v && v !== column.name) patchColumn({ name: v });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") setRenaming(false);
            }}
          />
        ) : (
          <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">{column.name}</h3>
        )}
        <span className="text-xs text-muted tabular-nums">{visible.length === total ? total : `${visible.length}/${total}`}</span>
        {isAdmin && (
          <details className="relative">
            <summary className="btn-ghost size-7 list-none p-0 [&::-webkit-details-marker]:hidden" aria-label={`Opções da coluna ${column.name}`}>
              <MoreHorizontal size={16} />
            </summary>
            <div className="absolute right-0 z-20 mt-1 w-52 rounded-lg border border-line bg-white p-1 text-sm shadow-md">
              <button className="flex w-full rounded-md px-2.5 py-1.5 text-left hover:bg-stone-100" onClick={(e) => { setRenaming(true); e.currentTarget.closest("details")?.removeAttribute("open"); }}>
                Renomear
              </button>
              <div className="flex">
                <button disabled={isFirst} className="flex flex-1 items-center gap-1 rounded-md px-2.5 py-1.5 hover:bg-stone-100 disabled:opacity-40" onClick={() => onMove(-1)}>
                  <ChevronLeft size={14} /> Esquerda
                </button>
                <button disabled={isLast} className="flex flex-1 items-center justify-end gap-1 rounded-md px-2.5 py-1.5 hover:bg-stone-100 disabled:opacity-40" onClick={() => onMove(1)}>
                  Direita <ChevronRight size={14} />
                </button>
              </div>
              <div className="flex gap-1.5 px-2.5 py-2">
                {PROJECT_COLORS.map((c) => (
                  <button key={c} aria-label={`Cor ${c}`} onClick={() => patchColumn({ color: c })} className={cn("size-5 rounded-full", column.color === c && "ring-2 ring-ink ring-offset-1")} style={{ background: c }} />
                ))}
              </div>
              <button
                className="flex w-full rounded-md px-2.5 py-1.5 text-left text-red-700 hover:bg-red-50"
                onClick={() => {
                  if (!confirm(`Excluir a coluna "${column.name}" e suas ${total} tarefas?`)) return;
                  start(async () => {
                    const res = await deleteColumnAction(column.id);
                    if (!res.ok) onError(res.error);
                    else onChanged();
                  });
                }}
              >
                Excluir coluna
              </button>
            </div>
          </details>
        )}
      </header>

      <SortableContext items={visible.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <ul
          ref={setNodeRef}
          className={cn("flex min-h-10 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-1", isOver && "rounded-lg bg-accent-soft/60")}
        >
          {visible.map((t) => (
            <SortableTaskCard key={t.id} task={t} href={hrefFor(t.id)} disabled={dragDisabled} onChanged={onChanged} />
          ))}
        </ul>
      </SortableContext>

      <div className="p-2">
        {adding ? (
          <form
            onSubmit={(e) => { e.preventDefault(); quickAdd(); }}
          >
            <input
              className="input"
              autoFocus
              value={title}
              maxLength={160}
              placeholder="Título da tarefa"
              disabled={pending}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => !title.trim() && setAdding(false)}
              onKeyDown={(e) => e.key === "Escape" && setAdding(false)}
            />
            <div className="mt-1.5 flex gap-1.5">
              <button className="btn-primary h-8" disabled={pending}>Adicionar</button>
              <button type="button" className="btn-ghost h-8" onMouseDown={(e) => e.preventDefault()} onClick={() => { setAdding(false); setTitle(""); }}>Cancelar</button>
            </div>
          </form>
        ) : (
          <button className="btn-ghost h-8 w-full justify-start" onClick={() => setAdding(true)}>
            <Plus size={15} /> Adicionar tarefa
          </button>
        )}
      </div>
    </section>
  );
}

function AddColumn({ boardId, onDone, onError }: { boardId: string; onDone: () => void; onError: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="board-col w-[82vw] max-w-80 shrink-0 sm:w-72">
      {open ? (
        <form
          className="rounded-xl bg-stone-200/50 p-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            start(async () => {
              const res = await createColumnAction(boardId, { name });
              if (!res.ok) return onError(res.error);
              setName("");
              setOpen(false);
              onDone();
            });
          }}
        >
          <input className="input" autoFocus placeholder="Nome da coluna" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
          <div className="mt-1.5 flex gap-1.5">
            <button className="btn-primary h-8" disabled={pending}>Criar</button>
            <button type="button" className="btn-ghost h-8" onClick={() => setOpen(false)}>Cancelar</button>
          </div>
        </form>
      ) : (
        <button className="btn-secondary w-full border-dashed" onClick={() => setOpen(true)}><Plus size={15} /> Nova coluna</button>
      )}
    </div>
  );
}
