"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FileText, Paperclip, X } from "lucide-react";
import { deleteAttachmentAction } from "@/actions/task-items";
import { ALLOWED_UPLOAD_TYPES, MAX_FILE_SIZE } from "@/lib/constants";
import { formatBytes } from "@/lib/utils";

type Att = { id: string; fileName: string; fileType: string; fileSize: number; canDelete: boolean };

export function Attachments({ taskId, items }: { taskId: string; items: Att[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        // validação rápida no cliente (o servidor valida de novo, pelos bytes reais)
        if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) { setError(`"${file.name}": use JPG, PNG, WEBP ou PDF.`); continue; }
        if (file.size > MAX_FILE_SIZE) { setError(`"${file.name}" tem mais de 4 MB.`); continue; }
        const body = new FormData();
        body.set("file", file);
        const res = await fetch(`/api/tasks/${taskId}/attachments`, { method: "POST", body });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setError(j.error ?? "Falha no envio.");
        }
      }
      router.refresh();
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Anexos {items.length > 0 && <span className="font-normal text-muted">{items.length}</span>}</h3>
        <button className="btn-secondary h-8" onClick={() => input.current?.click()} disabled={uploading}>
          <Paperclip size={14} /> {uploading ? "Enviando…" : "Anexar"}
        </button>
        <input ref={input} type="file" hidden multiple accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => upload(e.target.files)} />
      </div>
      {error && <p role="alert" className="mb-2 text-sm text-red-600">{error}</p>}
      {items.length === 0 ? (
        <p className="text-sm text-muted">JPG, PNG, WEBP ou PDF até 4 MB. Imagens são otimizadas e convertidas para WebP.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {items.map((a) => {
            const isImage = a.fileType.startsWith("image/");
            const url = `/api/attachments/${a.id}`;
            return (
              <li key={a.id} className="group relative overflow-hidden rounded-lg border border-line">
                <a href={url} target="_blank" rel="noopener noreferrer" className="block">
                  {isImage ? (
                    <Image src={url} alt={a.fileName} width={320} height={200} loading="lazy" unoptimized className="h-24 w-full object-cover" />
                  ) : (
                    <span className="grid h-24 place-items-center bg-stone-50 text-stone-400"><FileText size={28} /></span>
                  )}
                  <span className="block truncate px-2 pt-1.5 text-xs font-medium">{a.fileName}</span>
                  <span className="block px-2 pb-1.5 text-[11px] text-muted">{formatBytes(a.fileSize)}</span>
                </a>
                {a.canDelete && (
                  <button
                    className="absolute top-1 right-1 grid size-6 place-items-center rounded-md bg-white/90 text-stone-600 shadow-sm hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                    aria-label={`Remover ${a.fileName}`}
                    disabled={pending}
                    onClick={() => confirm("Remover anexo?") && start(async () => { await deleteAttachmentAction(a.id); })}
                  >
                    <X size={14} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
