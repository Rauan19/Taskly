"use client";

import { useEffect, useState, useTransition } from "react";
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";
import {
  addChecklistItemAction,
  deleteChecklistItemAction,
  reorderChecklistAction,
  toggleChecklistItemAction,
} from "@/actions/task-items";
import { cn } from "@/lib/utils";

type Item = { id: string; title: string; completed: boolean };

export function Checklist({ taskId, initial, canEdit }: { taskId: string; initial: Item[]; canEdit: boolean }) {
  const [items, setItems] = useState(initial);
  useEffect(() => setItems(initial), [initial]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const done = items.filter((i) => i.completed).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;
  const fail = (r: { ok: boolean; error?: string }) => { if (!r.ok) setError(r.error ?? "Erro"); };

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const prev = items;
    const next = arrayMove(items, items.findIndex((i) => i.id === active.id), items.findIndex((i) => i.id === over.id));
    setItems(next);
    reorderChecklistAction(taskId, next.map((i) => i.id)).then((r) => {
      if (!r.ok) { setItems(prev); setError(r.error); }
    });
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Checklist</h3>
        {items.length > 0 && <span className="text-xs text-muted tabular-nums">{done}/{items.length} concluídos</span>}
      </div>
      {items.length > 0 && (
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-stone-200" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}

      <DndContext id={`checklist-${taskId}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-0.5">
            {items.map((item) => (
              <Row
                key={item.id}
                item={item}
                canEdit={canEdit}
                disabled={pending}
                onToggle={(completed) => {
                  setItems((l) => l.map((i) => (i.id === item.id ? { ...i, completed } : i)));
                  start(async () => fail(await toggleChecklistItemAction(item.id, completed)));
                }}
                onDelete={() => {
                  setItems((l) => l.filter((i) => i.id !== item.id));
                  start(async () => fail(await deleteChecklistItemAction(item.id)));
                }}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}

      {canEdit && (
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const t = text.trim();
            if (!t) return;
            start(async () => {
              const r = await addChecklistItemAction(taskId, t);
              if (r.ok) { setText(""); setError(""); } else setError(r.error);
            });
          }}
        >
          <input className="input" placeholder="Adicionar item…" maxLength={200} value={text} onChange={(e) => setText(e.target.value)} aria-label="Novo item da checklist" />
          <button className="btn-secondary" disabled={pending || !text.trim()}>Adicionar</button>
        </form>
      )}
    </section>
  );
}

function Row({ item, canEdit, disabled, onToggle, onDelete }: {
  item: Item;
  canEdit: boolean;
  disabled: boolean;
  onToggle: (completed: boolean) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled: !canEdit });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("group flex items-center gap-2 rounded-lg bg-white px-1 py-1 hover:bg-stone-50", isDragging && "opacity-60 shadow")}
    >
      {canEdit && (
        <button type="button" className="cursor-grab touch-none text-stone-300 group-hover:text-stone-500" aria-label="Reordenar" {...attributes} {...listeners}>
          <GripVertical size={15} />
        </button>
      )}
      <input
        type="checkbox"
        className="size-4 shrink-0 accent-[var(--color-accent)]"
        checked={item.completed}
        disabled={!canEdit || disabled}
        onChange={(e) => onToggle(e.target.checked)}
        aria-label={item.title}
      />
      <span className={cn("min-w-0 flex-1 text-sm break-words", item.completed && "text-muted line-through")}>{item.title}</span>
      {canEdit && (
        <button type="button" className="rounded p-1 text-stone-400 hover:bg-stone-200 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100" onClick={onDelete} aria-label="Excluir item">
          <X size={14} />
        </button>
      )}
    </li>
  );
}
