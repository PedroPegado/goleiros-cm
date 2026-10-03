import { requireGuardian } from "@/lib/guardian-session";
import { guardianEvaluations } from "@/services/guardian";
import { PageTitle, Empty } from "@/components/ui";
import { EvolutionChart } from "@/components/evolution-chart";
import { calculateEvaluationAverage, civil, formatDate } from "@/lib/rules";
export default async function GuardianPerformance() {
  await requireGuardian();
  const evaluations = await guardianEvaluations();
  const feedbacks = evaluations
    .filter((e) => e.guardianFeedback?.trim())
    .reverse();
  return (
    <div className="stack">
      <PageTitle
        eyebrow="CADA TREINO CONTA"
        title="Desempenho do goleiro"
        description="Notas e conquistas ao longo do treinamento."
      />
      <EvolutionChart
        audience="guardian"
        evaluations={evaluations.map((e) => ({
          id: e.id,
          date: civil(e.date),
          scores: e.scores.map((s) => ({
            criterionId: s.criterionId,
            name: s.criterion.name,
            value: s.value,
          })),
        }))}
      />
      <section className="stack">
        <h2>Avaliações técnicas</h2>
        {evaluations.length ? (
          [...evaluations].reverse().map((e) => (
            <article className="card" key={e.id}>
              <div className="section-heading">
                <div>
                  <span className="eyebrow">TREINO AVALIADO</span>
                  <h3>{formatDate(e.date)}</h3>
                </div>
                <div className="average-pill">
                  {calculateEvaluationAverage(
                    e.scores.map((s) => s.value),
                  )?.toFixed(1) ?? "—"}
                  <small>MÉDIA GERAL</small>
                </div>
              </div>
              <div className="score-tags">
                {e.scores.map((s) => (
                  <span key={s.criterionId}>
                    {s.criterion.name}
                    <strong>{s.value.toFixed(1)}</strong>
                  </span>
                ))}
              </div>
            </article>
          ))
        ) : (
          <Empty
            title="Ainda não há avaliações"
            description="O professor disponibilizará os resultados dos próximos treinos."
          />
        )}
      </section>
      <section className="stack">
        <h2>Feedbacks do professor</h2>
        {feedbacks.length ? (
          feedbacks.map((e) => (
            <article className="card" key={e.id}>
              <span className="eyebrow">{formatDate(e.date)}</span>
              <p className="preserve-text">{e.guardianFeedback}</p>
            </article>
          ))
        ) : (
          <Empty title="Nenhum feedback compartilhado por enquanto" />
        )}
      </section>
    </div>
  );
}
