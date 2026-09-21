/** Inclusive calendar day count from ISO date strings (YYYY-MM-DD). */
export function computeDayCount(
  startDate: string | null | undefined,
  endDate: string | null | undefined
): { dayCount: number; error?: string } {
  if (!startDate) {
    return { dayCount: 1 };
  }
  if (!endDate) {
    return { dayCount: 1 };
  }
  const start = parseYmd(startDate);
  const end = parseYmd(endDate);
  if (!start || !end) {
    return { dayCount: 1, error: "Geçersiz tarih." };
  }
  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) {
    return { dayCount: 1, error: "Bitiş tarihi başlangıçtan önce olamaz." };
  }
  const days = Math.floor(diffMs / 86400000) + 1;
  return { dayCount: Math.max(1, days) };
}

function parseYmd(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
    return null;
  }
  return dt;
}
