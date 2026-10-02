import { measure } from "@/lib/performance";
import { requireUser } from "@/lib/require-user";
import Link from "@/components/pending-link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Pencil,
  MessageCircle,
  TrendingUp,
  Target,
} from "lucide-react";
import { studentDetail, settings } from "@/services/queries";
import { Avatar, Badge, Button, Empty } from "@/components/ui";
import {
  Modal,
  PaymentForm,
  MeasurementForm,
  NoteForm,
  ActionButton,
} from "@/components/forms";
import { EvolutionChart, MeasurementChart } from "@/components/evolution-chart";
import {
  deleteEvaluation,
  deletePayment,
  setStudentStatus,
  deleteStudent,
  deleteNote,
} from "@/actions";
import {
  calculateAge,
  calculateEvaluationAverage,
  civil,
  formatCurrency,
  formatDate,
  getPaymentStatus,
  monthLabel,
  today,
  whatsappUrl,
} from "@/lib/rules";
export default async function Profile({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireUser();
  return measure("page.profile", async () => {
    const { id } = await params;
    const { tab = "geral" } = await searchParams;
    const [s, config] = await Promise.all([studentDetail(id, tab), settings()]);
    if (!s) notFound();
    const latestHeight = s.measurements.find((m) => m.height !== null)?.height,
      latestWeight = s.measurements.find((m) => m.weight !== null)?.weight;
    const latest = new Map<
      string,
      { name: string; value: number; date: Date }
    >();
    s.latestScores.forEach((score) => latest.set(score.criterionId, score));
    const ranked = [...latest.values()].sort((a, b) => b.value - a.value);
    const current =
      s.payments.find((p) => getPaymentStatus(p) === "OVERDUE") ||
      s.payments.find(
        (p) =>
          `${p.referenceYear}-${String(p.referenceMonth).padStart(2, "0")}` ===
          today().slice(0, 7),
      );
    const tabs = [
      ["geral", "Visão geral"],
      ["avaliacoes", "Avaliações"],
      ["evolucao", "Evolução"],
      ["pagamentos", "Pagamentos"],
      ["observacoes", "Observações"],
    ];
    return (
      <div className="stack">
        <Link className="back-link" href="/alunos">
          <ArrowLeft size={17} />
          Todos os alunos
        </Link>
        <section className="card profile-header">
          <div className="profile-main">
            <Avatar name={s.name} photo={s.photo} large />
            <div>
              <div className="eyebrow">PERFIL DO ATLETA</div>
              <h1>{s.name}</h1>
              <div className="athlete-meta">
                {calculateAge(s.birthDate)} anos <span>·</span>
                {latestHeight ? `${latestHeight} cm` : "Altura não informada"}
                <span>·</span>
                {latestWeight ? `${latestWeight} kg` : "Peso não informado"}
                <Badge status={s.status} />
              </div>
            </div>
          </div>
          <div className="profile-actions">
            <Button asChild variant="secondary">
              <Link href={`/alunos/${id}/editar`}>
                <Pencil size={16} />
                Editar
              </Link>
            </Button>
            {s.status === "ACTIVE" && (
              <Button asChild>
                <Link href={`/avaliacoes/nova?aluno=${id}`}>
                  <Plus size={17} />
                  Nova avaliação
                </Link>
              </Button>
            )}
          </div>
          <div className="guardian-bar">
            <div>
              <span className="muted">Responsável</span>
              <strong>{s.guardianName}</strong>
              <small>{s.guardianPhone}</small>
            </div>
            <Badge
              status={getPaymentStatus(current, today(), config.dueSoonDays)}
            />
            <a
              className="button button-whatsapp"
              href={whatsappUrl(s.guardianPhone, s.guardianName, s.name)}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={18} />
              Falar com responsável
            </a>
          </div>
        </section>
        <nav className="profile-tabs" aria-label="Seções do aluno">
          {tabs.map(([key, label]) => (
            <Link
              key={key}
              className={key === tab ? "active" : ""}
              href={`/alunos/${id}?tab=${key}`}
              aria-current={key === tab ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        {tab === "geral" && (
          <>
            <div className="two-columns">
              <section className="card">
                <div className="section-heading">
                  <div>
                    <div className="eyebrow">ÚLTIMA NOTA DE CADA CRITÉRIO</div>
                    <h2>Desempenho atual</h2>
                  </div>
                  <Target size={20} />
                </div>
                {ranked.length ? (
                  <>
                    <div className="performance-list">
                      {[...latest.values()].map((x) => (
                        <div key={x.name}>
                          <div className="section-heading">
                            <span>{x.name}</span>
                            <strong>{x.value.toFixed(1)}</strong>
                          </div>
                          <div className="progress-track">
                            <span style={{ width: `${x.value * 10}%` }} />
                          </div>
                          <small className="muted">{formatDate(x.date)}</small>
                        </div>
                      ))}
                    </div>
                    <div className="insights">
                      <p>
                        <TrendingUp size={17} />
                        <span>
                          Ponto mais desenvolvido
                          <strong>
                            {ranked[0].name} · {ranked[0].value.toFixed(1)}
                          </strong>
                        </span>
                      </p>
                      <p>
                        <Target size={17} />
                        <span>
                          Critério que merece atenção
                          <strong>
                            {ranked[ranked.length - 1].name} ·{" "}
                            {ranked[ranked.length - 1].value.toFixed(1)}
                          </strong>
                        </span>
                      </p>
                    </div>
                  </>
                ) : (
                  <Empty
                    title="Vamos começar a acompanhar?"
                    description={`Registre a primeira avaliação de ${s.name.split(" ")[0]}.`}
                  />
                )}
              </section>
              <div className="stack">
                <section className="card">
                  <h2>Informações do aluno</h2>
                  <dl className="details-grid">
                    <div>
                      <dt>Nascimento</dt>
                      <dd>{formatDate(s.birthDate)}</dd>
                    </div>
                    <div>
                      <dt>No time desde</dt>
                      <dd>{formatDate(s.joinedAt)}</dd>
                    </div>
                    <div>
                      <dt>Mensalidade</dt>
                      <dd>{formatCurrency(s.monthlyFee)}</dd>
                    </div>
                    <div>
                      <dt>Vencimento</dt>
                      <dd>Todo dia {s.dueDay}</dd>
                    </div>
                  </dl>
                  {s.notes && <p className="preserve-text">{s.notes}</p>}
                </section>
                <section className="card">
                  <div className="section-heading">
                    <h2>Histórico físico</h2>
                    <Modal
                      title="Registrar medidas"
                      trigger="Registrar medidas"
                    >
                      <MeasurementForm studentId={id} />
                    </Modal>
                  </div>
                  <MeasurementChart
                    measurements={[...s.measurements].reverse().map((m) => ({
                      date: civil(m.date),
                      height: m.height,
                      weight: m.weight,
                    }))}
                  />
                  {s.measurements.length ? (
                    <div className="row-list">
                      {s.measurements.map((m) => (
                        <div className="measurement-row" key={m.id}>
                          <span>{formatDate(m.date)}</span>
                          <strong>
                            {m.height === null ? "—" : `${m.height} cm`}
                          </strong>
                          <strong>
                            {m.weight === null ? "—" : `${m.weight} kg`}
                          </strong>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="muted">Nenhuma medida registrada.</p>
                  )}
                </section>
              </div>
            </div>
            <section className="card student-management">
              <div>
                <h3>Gerenciar cadastro</h3>
                <p className="muted">
                  Desativar preserva todo o histórico e interrompe novas
                  cobranças automáticas.
                </p>
              </div>
              <div className="inline-actions">
                <ActionButton
                  action={setStudentStatus.bind(
                    null,
                    id,
                    s.status !== "ACTIVE",
                  )}
                  confirmation={
                    s.status === "ACTIVE"
                      ? "Desativar este aluno? O histórico e as cobranças existentes serão preservados."
                      : undefined
                  }
                >
                  {s.status === "ACTIVE" ? "Desativar aluno" : "Reativar aluno"}
                </ActionButton>
                <ActionButton
                  action={deleteStudent.bind(null, id)}
                  confirmation="Excluir definitivamente o aluno, avaliações, medidas e pagamentos? Essa ação não pode ser desfeita."
                  variant="danger"
                  redirectTo="/alunos"
                  success="Aluno excluído."
                >
                  Excluir definitivamente
                </ActionButton>
              </div>
            </section>
          </>
        )}
        {tab === "avaliacoes" && (
          <section className="stack">
            <div className="section-heading">
              <h2>Histórico de avaliações</h2>
              <span className="muted">{s.evaluations.length} registros</span>
            </div>
            {s.evaluations.length ? (
              [...s.evaluations].reverse().map((e) => (
                <article className="card" key={e.id}>
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">TREINO AVALIADO</span>
                      <h2>{formatDate(e.date)}</h2>
                    </div>
                    <div className="average-pill">
                      {calculateEvaluationAverage(
                        e.scores.map((x) => x.value),
                      )?.toFixed(1)}
                      <small>MÉDIA</small>
                    </div>
                  </div>
                  <div className="score-tags">
                    {e.scores.map((x) => (
                      <span key={x.id}>
                        {x.criterion.name}
                        <strong>{x.value.toFixed(1)}</strong>
                      </span>
                    ))}
                  </div>
                  {e.notes && (
                    <p className="evaluation-note preserve-text">{e.notes}</p>
                  )}
                  <div className="inline-actions">
                    <Button asChild variant="secondary">
                      <Link href={`/avaliacoes/${e.id}/editar`}>
                        Editar avaliação
                      </Link>
                    </Button>
                    <ActionButton
                      action={deleteEvaluation.bind(null, e.id)}
                      confirmation="Excluir esta avaliação? Essa ação não pode ser desfeita."
                      variant="ghost"
                      success="Avaliação excluída."
                    >
                      Excluir
                    </ActionButton>
                  </div>
                </article>
              ))
            ) : (
              <Empty
                title="Nenhuma avaliação registrada"
                description={`Registre a primeira avaliação para acompanhar a evolução de ${s.name.split(" ")[0]}.`}
                action={
                  <Button asChild>
                    <Link href={`/avaliacoes/nova?aluno=${id}`}>
                      Nova avaliação
                    </Link>
                  </Button>
                }
              />
            )}
          </section>
        )}
        {tab === "evolucao" && (
          <EvolutionChart
            evaluations={s.evaluations.map((e) => ({
              id: e.id,
              date: civil(e.date),
              scores: e.scores.map((x) => ({
                criterionId: x.criterionId,
                name: x.criterion.name,
                value: x.value,
              })),
            }))}
          />
        )}
        {tab === "pagamentos" && (
          <section className="stack">
            <div className="section-heading">
              <h2>Histórico de mensalidades</h2>
              <Modal title="Registrar pagamento" trigger="Registrar pagamento">
                <PaymentForm studentId={id} amount={Number(s.monthlyFee)} />
              </Modal>
            </div>
            {s.payments.length ? (
              <div className="payment-grid">
                {s.payments.map((p) => (
                  <article className="card" key={p.id}>
                    <div className="section-heading">
                      <span className="eyebrow">
                        {monthLabel(p.referenceYear, p.referenceMonth)}
                      </span>
                      <Badge
                        status={getPaymentStatus(
                          p,
                          today(),
                          config.dueSoonDays,
                        )}
                      />
                    </div>
                    <h2 className="money-value">{formatCurrency(p.amount)}</h2>
                    <p className="muted">Vencimento: {formatDate(p.dueDate)}</p>
                    {p.paidAt && (
                      <p className="text-success">
                        Pago em {formatDate(p.paidAt)}
                        {p.paymentMethod && ` · ${p.paymentMethod}`}
                      </p>
                    )}
                    {p.notes && <p className="preserve-text">{p.notes}</p>}
                    <div className="inline-actions">
                      <Modal
                        title={
                          p.status === "PAID"
                            ? "Editar pagamento"
                            : "Registrar pagamento"
                        }
                        trigger={
                          p.status === "PAID"
                            ? "Editar pagamento"
                            : "Registrar pagamento"
                        }
                      >
                        <PaymentForm
                          studentId={id}
                          amount={Number(s.monthlyFee)}
                          payment={{
                            id: p.id,
                            referenceMonth: p.referenceMonth,
                            referenceYear: p.referenceYear,
                            amount: Number(p.amount),
                            paidAt: p.paidAt ? civil(p.paidAt) : null,
                            paymentMethod: p.paymentMethod,
                            notes: p.notes,
                          }}
                        />
                      </Modal>
                      <ActionButton
                        action={deletePayment.bind(null, p.id)}
                        variant="ghost"
                        confirmation="Excluir este pagamento? Se for a mensalidade atual de um aluno ativo, uma cobrança pendente será recriada automaticamente."
                        success="Pagamento excluído."
                      >
                        Excluir
                      </ActionButton>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <Empty title="Nenhum pagamento registrado" />
            )}
          </section>
        )}
        {tab === "observacoes" && (
          <section className="stack">
            <div className="section-heading">
              <h2>Observações do professor</h2>
              <Modal title="Nova observação" trigger="Nova observação">
                <NoteForm studentId={id} />
              </Modal>
            </div>
            {s.studentNotes.length ? (
              s.studentNotes.map((n) => (
                <article key={n.id} className="card">
                  <span className="eyebrow">{formatDate(n.date)}</span>
                  <p className="preserve-text">{n.text}</p>
                  <ActionButton
                    action={deleteNote.bind(null, n.id)}
                    variant="ghost"
                    confirmation="Excluir esta observação?"
                  >
                    Excluir
                  </ActionButton>
                </article>
              ))
            ) : (
              <Empty
                title="Nenhuma observação por enquanto"
                description="Registre detalhes importantes dos treinos e do desenvolvimento do aluno."
              />
            )}
          </section>
        )}
      </div>
    );
  });
}
