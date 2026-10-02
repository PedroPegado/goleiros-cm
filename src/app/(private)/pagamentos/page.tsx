import { measure } from "@/lib/performance";
import { FilterForm } from "@/components/filter-form";
import { requireUser } from "@/lib/require-user";
import Link from "@/components/pending-link";
import { PageTitle, Stat, Badge, Empty, Avatar } from "@/components/ui";
import { db } from "@/lib/db";
import { ensureMonthlyPayments } from "@/services/payments";
import { settings } from "@/services/queries";
import {
  today,
  formatCurrency,
  formatDate,
  getPaymentStatus,
  monthLabel,
  toDate,
  dueDateFor,
} from "@/lib/rules";
export default async function Payments({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    year?: string;
    status?: string;
    student?: string;
  }>;
}) {
  await requireUser();
  return measure("page.payments", async () => {
    if (!process.env.DATABASE_URL) return null;
    const q = await searchParams;
    const month = Number(q.month) || Number(today().slice(5, 7)),
      year = Number(q.year) || Number(today().slice(0, 4));
    if (
      month < 1 ||
      month > 12 ||
      year < 2000 ||
      year > 2100 ||
      !Number.isInteger(month) ||
      !Number.isInteger(year)
    )
      return <Empty title="Referência inválida" />;
    await ensureMonthlyPayments(year, month);
    const [payments, students, config, receipts] = await Promise.all([
      db.payment.findMany({
        where: {
          referenceMonth: month,
          referenceYear: year,
          ...(q.student ? { studentId: q.student } : {}),
        },
        include: { student: { select: { id: true, name: true, photo: true } } },
        orderBy: { dueDate: "asc" },
      }),
      db.student.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      settings(),
      db.payment.aggregate({
        where: {
          status: "PAID",
          paidAt: {
            gte: toDate(dueDateFor(year, month, 1)),
            lte: toDate(dueDateFor(year, month, 31)),
          },
          ...(q.student ? { studentId: q.student } : {}),
        },
        _sum: { amount: true },
        _count: true,
      }),
    ]);
    const late = payments.filter((p) => getPaymentStatus(p) === "OVERDUE"),
      pending = payments.filter(
        (p) => p.status !== "PAID" && getPaymentStatus(p) !== "OVERDUE",
      );
    const filtered = payments.filter(
      (p) =>
        !q.status ||
        (q.status === "PENDING"
          ? p.status !== "PAID" && getPaymentStatus(p) !== "OVERDUE"
          : getPaymentStatus(p, today(), config.dueSoonDays) === q.status),
    );
    const sum = (values: typeof payments) =>
      formatCurrency(values.reduce((a, p) => a + Number(p.amount), 0));
    return (
      <div className="stack">
        <PageTitle
          title="Financeiro em dia."
          description="Mensalidades organizadas. Mais foco no treinamento."
        />
        <div className="stats-grid three">
          <Stat
            label="Recebido no mês"
            value={formatCurrency(receipts._sum.amount ?? 0)}
            detail={`${receipts._count} pagamentos pela data de recebimento`}
          />
          <Stat
            label="Pendente · dentro do prazo"
            value={sum(pending)}
            detail={`${pending.length} pagamentos pendentes`}
          />
          <Stat
            label="Atrasado · referência selecionada"
            value={sum(late)}
            detail={`${late.length} pagamentos atrasados`}
          />
        </div>
        <FilterForm>
          <label className="filter-select">
            <span>Mês</span>
            <select name="month" defaultValue={month}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i + 1}>
                  {monthLabel(year, i + 1).split(" de ")[0]}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-select">
            <span>Ano</span>
            <input
              type="number"
              name="year"
              defaultValue={year}
              min={2000}
              max={2100}
            />
          </label>
          <label className="filter-select">
            <span>Situação</span>
            <select name="status" defaultValue={q.status || ""}>
              <option value="">Todos</option>
              <option value="PAID">Pagos</option>
              <option value="PENDING">Pendentes</option>
              <option value="OVERDUE">Atrasados</option>
              <option value="DUE_SOON">Próximos do vencimento</option>
            </select>
          </label>
          <label className="filter-select">
            <span>Aluno</span>
            <select name="student" defaultValue={q.student || ""}>
              <option value="">Todos os alunos</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </FilterForm>
        <div className="section-heading">
          <h2 className="capitalize">{monthLabel(year, month)}</h2>
          <span className="muted">{filtered.length} registros</span>
        </div>
        {filtered.length ? (
          <div className="payment-grid">
            {filtered.map((p) => (
              <Link
                className="card finance-card"
                key={p.id}
                href={`/alunos/${p.studentId}?tab=pagamentos`}
              >
                <div className="student-row">
                  <Avatar name={p.student.name} photo={p.student.photo} />
                  <strong>{p.student.name}</strong>
                </div>
                <div className="section-heading">
                  <h2 className="money-value">{formatCurrency(p.amount)}</h2>
                  <Badge
                    status={getPaymentStatus(p, today(), config.dueSoonDays)}
                  />
                </div>
                <p className="muted">Vencimento: {formatDate(p.dueDate)}</p>
                {p.paidAt && (
                  <p className="text-success">Pago em {formatDate(p.paidAt)}</p>
                )}
                <span className="card-link">Ver aluno →</span>
              </Link>
            ))}
          </div>
        ) : (
          <Empty
            title="Nenhuma mensalidade nesta seleção"
            description="Ajuste os filtros. Cobranças futuras não são geradas automaticamente."
          />
        )}
      </div>
    );
  });
}
