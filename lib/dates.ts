// Prazos são salvos como 12:00 UTC do dia escolhido, para não "andar" de dia por fuso.
const TZ = "America/Sao_Paulo";

export function todayStart(): Date {
  const iso = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date()); // YYYY-MM-DD
  return new Date(`${iso}T00:00:00.000Z`);
}

export function tomorrowStart(): Date {
  return new Date(todayStart().getTime() + 86_400_000);
}

export function parseDueDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  return new Date(`${value}T12:00:00.000Z`);
}

export function toDateInput(d: Date | null | undefined): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

export function formatDue(d: Date | string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" });
}

export function isOverdue(due: Date | string | null, completedAt: Date | string | null) {
  return !!due && !completedAt && new Date(due) < todayStart();
}

export function formatDateTime(d: Date | string) {
  return new Date(d).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
}
