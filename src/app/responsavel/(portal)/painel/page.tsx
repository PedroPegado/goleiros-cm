import { Activity, ArrowUpRight, Ruler, Wallet } from "lucide-react";
import { requireGuardian } from "@/lib/guardian-session";
import { guardianSummary } from "@/services/guardian";
import { Avatar, Empty, PageTitle } from "@/components/ui";
import { GuardianPayment } from "@/components/guardian-payment";
import Link from "@/components/pending-link";
import {
  calculateAge,
  calculateEvaluationAverage,
  formatDate,
} from "@/lib/rules";
export default async function GuardianDashboard() {
  await requireGuardian();
  const { student, height, weight, evaluation, payment } =
    await guardianSummary();
  return (
    <div className="stack">
      <PageTitle
        eyebrow="JUNTOS EM CADA CONQUISTA"
        title={`Olá, responsável por ${student.name.split(" ")[0]}!`}
        description="Acompanhe o desenvolvimento do seu goleiro."
      />
      <section className="card profile-header">
        <div className="profile-main">
          <Avatar name={student.name} photo={student.photo} large />
          <div>
            <span className="eyebrow">SEU GOLEIRO</span>
            <h2>{student.name}</h2>
            <p className="muted">{calculateAge(student.birthDate)} anos</p>
          </div>
        </div>
        <dl className="details-grid">
          <div>
            <dt>Altura atual</dt>
            <dd>{height ? `${height.height} cm` : "Ainda não registrada"}</dd>
          </div>
          <div>
            <dt>Peso atual</dt>
            <dd>{weight ? `${weight.weight} kg` : "Ainda não registrado"}</dd>
          </div>
          <div>
            <dt>Última avaliação</dt>
            <dd>
              {evaluation
                ? formatDate(evaluation.date)
                : "Ainda não registrada"}
            </dd>
          </div>
        </dl>
      </section>
      <section className="card">
        <div className="section-heading">
          <Activity size={21} />
          <h2>Desempenho</h2>
        </div>
        {evaluation ? (
          <>
            <div className="guardian-average">
              <strong>
                {calculateEvaluationAverage(
                  evaluation.scores.map((s) => s.value),
                )?.toFixed(1) ?? "—"}
              </strong>
              <span>
                Média da última avaliação
                <br />
                <small>{formatDate(evaluation.date)}</small>
              </span>
            </div>
            {evaluation.guardianFeedback && (
              <p className="preserve-text guardian-feedback">
                {evaluation.guardianFeedback}
              </p>
            )}
          </>
        ) : (
          <Empty
            title="O próximo treino inicia essa história"
            description="As avaliações aparecerão aqui assim que forem registradas pelo professor."
          />
        )}
        <Link
          href="/responsavel/desempenho"
          prefetch={false}
          className="card-link"
        >
          Notas e feedbacks do professor <ArrowUpRight size={17} />
        </Link>
      </section>
      <section className="card">
        <div className="section-heading">
          <Ruler size={21} />
          <h2>Evolução física</h2>
        </div>
        <p className="muted">
          Acompanhe os registros de altura e peso ao longo do tempo.
        </p>
        <Link
          href="/responsavel/evolucao"
          prefetch={false}
          className="card-link"
        >
          Ver evolução física <ArrowUpRight size={17} />
        </Link>
      </section>
      <section className="stack">
        <div className="section-heading">
          <Wallet size={21} />
          <h2>Mensalidade</h2>
        </div>
        {payment ? (
          <GuardianPayment payment={payment} />
        ) : (
          <Empty
            title="Nenhuma mensalidade registrada"
            description="Os registros aparecerão aqui quando disponibilizados pelo professor."
          />
        )}
        <Link
          href="/responsavel/mensalidade"
          prefetch={false}
          className="card-link"
        >
          Consultar mensalidades <ArrowUpRight size={17} />
        </Link>
      </section>
    </div>
  );
}
