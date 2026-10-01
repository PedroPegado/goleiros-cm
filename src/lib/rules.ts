import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/** Civil dates cross the server/client boundary as YYYY-MM-DD, never local timestamps. */
export function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Fortaleza",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function civil(value: Date | string) {
  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : value.slice(0, 10);
}
export function toDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}
export function formatDate(value: Date | string) {
  const [y, m, d] = civil(value).split("-");
  return `${d}/${m}/${y}`;
}
export function monthLabel(year: number, month: number) {
  return format(new Date(year, month - 1, 15), "MMMM 'de' yyyy", {
    locale: ptBR,
  });
}
export function formatCurrency(
  value: number | string | { toString(): string },
) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}
export function calculateAge(birth: Date | string, now = today()) {
  const b = civil(birth);
  let age = Number(now.slice(0, 4)) - Number(b.slice(0, 4));
  if (now.slice(5) < b.slice(5)) age--;
  return age;
}
export function getDaysUntilDue(due: Date | string, now = today()) {
  return Math.round(
    (toDate(civil(due)).getTime() - toDate(now).getTime()) / 86400000,
  );
}
export function getDaysOverdue(due: Date | string, now = today()) {
  return Math.max(0, -getDaysUntilDue(due, now));
}
export function getPaymentStatus(
  payment: { status: string; dueDate: Date | string } | null | undefined,
  now = today(),
  days = 3,
) {
  if (!payment) return "UNREGISTERED";
  if (payment.status === "PAID") return "PAID";
  const remaining = getDaysUntilDue(payment.dueDate, now);
  return remaining < 0 ? "OVERDUE" : remaining <= days ? "DUE_SOON" : "PENDING";
}
export function dueDateFor(year: number, month: number, day: number) {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(Math.min(day, last)).padStart(2, "0")}`;
}
export function calculateEvaluationAverage(
  scores: Array<number | null | undefined>,
) {
  const values = scores.filter(
    (n): n is number => n !== null && n !== undefined && Number.isFinite(n),
  );
  return values.length
    ? values.reduce((a, b) => a + b, 0) / values.length
    : null;
}
export function calculateStudentEvolution(averages: Array<number | null>) {
  const values = averages.filter((n): n is number => n !== null);
  if (values.length < 2) return null;
  const first = values[0],
    last = values[values.length - 1],
    difference = last - first;
  return {
    first,
    last,
    difference,
    percentage: first === 0 ? null : (difference / first) * 100,
  };
}
export function normalizeWhatsAppNumber(raw: string) {
  let value = raw.replace(/\D/g, "");
  if (value.length === 10 || value.length === 11) value = `55${value}`;
  if (!/^55[1-9][0-9](?:[2-5][0-9]{7}|9[0-9]{8})$/.test(value))
    throw new Error("Informe um telefone brasileiro com DDD.");
  return value;
}
export function whatsappUrl(phone: string, guardian: string, student: string) {
  return `https://wa.me/${normalizeWhatsAppNumber(phone)}?text=${encodeURIComponent(`Olá, ${guardian}! Tudo bem? Estou entrando em contato referente à mensalidade de ${student}.`)}`;
}
