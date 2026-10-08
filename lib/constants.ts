import type { Priority, Role } from "@prisma/client";

export const PRIORITY_META: Record<Priority, { label: string; dot: string; chip: string }> = {
  LOW: { label: "Baixa", dot: "bg-slate-400", chip: "bg-slate-100 text-slate-600" },
  MEDIUM: { label: "Média", dot: "bg-sky-500", chip: "bg-sky-50 text-sky-700" },
  HIGH: { label: "Alta", dot: "bg-amber-500", chip: "bg-amber-50 text-amber-700" },
  URGENT: { label: "Urgente", dot: "bg-red-500", chip: "bg-red-50 text-red-700" },
};

export const PRIORITIES = Object.keys(PRIORITY_META) as Priority[];

export const ROLE_LABEL: Record<Role, string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  MEMBER: "Membro",
};

export const PROJECT_COLORS = [
  "#0d7c66",
  "#2563eb",
  "#7c3aed",
  "#c2410c",
  "#be185d",
  "#475569",
];

export const DEFAULT_COLUMNS = ["A Fazer", "Em andamento", "Concluído"];

export const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB (limite de body da Vercel é 4,5 MB)
export const MAX_ATTACHMENTS_PER_TASK = 20;
export const ALLOWED_UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export const PAGE_SIZE = 10;
