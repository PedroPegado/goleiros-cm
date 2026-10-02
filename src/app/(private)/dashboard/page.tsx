import { measure } from "@/lib/performance";
import { requireUser } from "@/lib/require-user";
import Link from "@/components/pending-link";
import {
  ArrowUpRight,
  Plus,
  ArrowRight,
  ShieldCheck,
  Clock3,
  Activity,
} from "lucide-react";
import { db } from "@/lib/db";
import { syncPayments, settings } from "@/services/queries";
import {
  today,
  toDate,
  formatCurrency,
  formatDate,
  getDaysOverdue,
  getDaysUntilDue,
  monthLabel,
} from "@/lib/rules";
import { PageTitle, Stat, Avatar, Empty, Button } from "@/components/ui";
export default async function Dashboard() {
  await requireUser();
  return measure("page.dashboard", async () => {
    if (!process.env.DATABASE_URL) return null;
    const [, config] = await Promise.all([syncPayments(), settings()]);
    const now = today();
    const year = Number(now.slice(0, 4)),
      month = Number(now.slice(5, 7));
    const overdueWhere = {
      status: { not: "PAID" as const },
      dueDate: { lt: toDate(now) },
    };
    const until = toDate(now);
    until.setUTCDate(until.getUTCDate() + config.dueSoonDays);
    const [
      total,
      active,
      paid,
      pending,
      overdueCount,
      overdue,
      upcoming,
      evaluations,
      recent,
    ] = await Promise.all([
      db.student.count(),
      db.student.count({ where: { status: "ACTIVE" } }),
      db.payment.aggregate({
        where: { referenceYear: year, referenceMonth: month, status: "PAID" },
        _count: true,
        _sum: { amount: true },
      }),
      db.payment.count({
        where: {
          referenceYear: year,
          referenceMonth: month,
          status: { not: "PAID" },
          dueDate: { gte: toDate(now) },
        },
      }),
      db.payment.count({ where: overdueWhere }),
      db.payment.findMany({
        where: overdueWhere,
        take: 6,
        orderBy: { dueDate: "asc" },
        select: {
          id: true,
          studentId: true,
          dueDate: true,
          amount: true,
          student: { select: { name: true, photo: true } },
        },
      }),
      db.payment.findMany({
        where: {
          status: { not: "PAID" },
          dueDate: { gte: toDate(now), lte: until },
        },
        take: 6,
        orderBy: { dueDate: "asc" },
        select: {
          id: true,
          studentId: true,
          dueDate: true,
          amount: true,
          student: { select: { name: true, photo: true } },
        },
      }),
      db.evaluation.count({
        where: {
          date: { gte: toDate(`${now.slice(0, 7)}-01`), lte: toDate(now) },
        },
      }),
      db.evaluation.findMany({
        take: 4,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          studentId: true,
          date: true,
          student: { select: { name: true, photo: true } },
          scores: { select: { value: true } },
        },
      }),
    ]);
    return (
      <div className="stack">
        <PageTitle
          eyebrow={`${monthLabel(year, month).toLocaleUpperCase("pt-BR")} / VISÃO GERAL`}
          title="Bom treino, professor."
          description="Tudo pronto para acompanhar a próxima evolução."
          action={
            <Button asChild>
              <Link href="/avaliacoes/nova">
                <Plus size={18} />
                Nova avaliação
              </Link>
            </Button>
          }
        />
        <section className="field-banner">
          <div className="banner-content">
            <span className="banner-tag">
              <span /> DENTRO E FORA DO CAMPO
            </span>
            <h2>
              Grandes defesas.
              <br />
              Evolução em cada detalhe.
            </h2>
            <p>Conheça seus atletas. Acompanhe cada conquista.</p>
            <Link href="/alunos">
              Acompanhar alunos <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="pitch" aria-hidden>
            <div className="pitch-box" />
            <div className="pitch-circle" />
            <div className="pitch-line" />
            <div className="pitch-dot" />
          </div>
          <span className="banner-number" aria-hidden>
            01
          </span>
        </section>
        <section className="stats-grid" aria-label="Resumo do mês">
          <Stat
            label="Total de alunos"
            value={String(total).padStart(2, "0")}
            detail={`${active} ativos no treinamento`}
          />
          <Stat
            label="Pagamentos em dia"
            value={String(paid._count).padStart(2, "0")}
            detail={
              formatCurrency(paid._sum.amount ?? 0) + " · referência atual"
            }
          />
          <Stat
            label="Pagamentos pendentes"
            value={String(pending).padStart(2, "0")}
            detail="Ainda dentro do prazo"
          />
          <Stat
            label="Pagamentos atrasados"
            value={String(overdueCount).padStart(2, "0")}
            detail="Todas as referências"
          />
          <Stat
            label="Avaliações no mês"
            value={String(evaluations).padStart(2, "0")}
            detail="Cada treino conta"
          />
          <Stat
            label="Alunos ativos"
            value={String(active).padStart(2, "0")}
            detail="Prontos para evoluir"
          />
        </section>
        <div className="two-columns">
          <section className="card">
            <div className="section-heading">
              <div className="heading-icon warning">
                <Clock3 size={19} />
              </div>
              <div>
                <h2>Pagamentos atrasados</h2>
                <p className="muted">Atenção fora das quatro linhas.</p>
              </div>
              <span className="count-pill">{overdueCount}</span>
            </div>
            {overdueCount ? (
              <div className="row-list">
                {overdue.slice(0, 6).map((p) => (
                  <Link
                    className="student-row"
                    key={p.id}
                    href={`/alunos/${p.studentId}?tab=pagamentos`}
                  >
                    <Avatar name={p.student.name} photo={p.student.photo} />
                    <div className="row-main">
                      <strong>{p.student.name}</strong>
                      <small>Vencimento: {formatDate(p.dueDate)}</small>
                    </div>
                    <div className="row-end">
                      <strong className="text-danger">
                        {getDaysOverdue(p.dueDate)} dias de atraso
                      </strong>
                      <small>{formatCurrency(p.amount)}</small>
                    </div>
                    <ArrowRight size={16} />
                  </Link>
                ))}
              </div>
            ) : (
              <Empty
                title="Nenhum pagamento atrasado 🎉"
                description="Tudo em dia por aqui."
              />
            )}
            <Link className="card-link" href="/pagamentos?status=OVERDUE">
              Ver financeiro <ArrowUpRight size={17} />
            </Link>
          </section>
          <section className="card">
            <div className="section-heading">
              <div className="heading-icon">
                <ShieldCheck size={19} />
              </div>
              <div>
                <h2>Próximos vencimentos</h2>
                <p className="muted">Antecipe o contato com os responsáveis.</p>
              </div>
            </div>
            {upcoming.length ? (
              <div className="row-list">
                {upcoming.slice(0, 6).map((p) => (
                  <Link
                    className="student-row"
                    key={p.id}
                    href={`/alunos/${p.studentId}?tab=pagamentos`}
                  >
                    <Avatar name={p.student.name} photo={p.student.photo} />
                    <div className="row-main">
                      <strong>{p.student.name}</strong>
                      <small>
                        {formatDate(p.dueDate)} · {formatCurrency(p.amount)}
                      </small>
                    </div>
                    <span className="badge badge-due_soon">
                      {getDaysUntilDue(p.dueDate) === 0
                        ? "Vence hoje"
                        : `Em ${getDaysUntilDue(p.dueDate)} dias`}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <Empty
                title="Sem vencimentos próximos"
                description={`Nenhuma cobrança nos próximos ${config.dueSoonDays} dias.`}
              />
            )}
          </section>
        </div>
        <section className="card">
          <div className="section-heading">
            <div className="heading-icon">
              <Activity size={19} />
            </div>
            <div>
              <h2>Últimos treinos avaliados</h2>
              <p className="muted">Pequenos avanços, grandes resultados.</p>
            </div>
          </div>
          {recent.length ? (
            <div className="recent-grid">
              {recent.map((e) => (
                <Link
                  className="recent-card"
                  key={e.id}
                  href={`/alunos/${e.studentId}?tab=avaliacoes`}
                >
                  <span className="eyebrow">{formatDate(e.date)}</span>
                  <div className="student-row">
                    <Avatar name={e.student.name} photo={e.student.photo} />
                    <strong>{e.student.name}</strong>
                  </div>
                  <div className="recent-score">
                    <strong>
                      {(
                        e.scores.reduce((s, x) => s + x.value, 0) /
                        e.scores.length
                      ).toFixed(1)}
                    </strong>
                    <span>
                      média geral
                      <br />
                      {e.scores.length} critérios
                    </span>
                    <ArrowUpRight size={20} />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <Empty
              title="O primeiro treino começa aqui"
              description="Cadastre um aluno e registre uma avaliação."
              action={
                <Button asChild>
                  <Link href="/alunos/novo">Cadastrar aluno</Link>
                </Button>
              }
            />
          )}
        </section>
      </div>
    );
  });
}
