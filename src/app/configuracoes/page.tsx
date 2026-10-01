import { db } from "@/lib/db";
import { settings } from "@/services/queries";
import { PageTitle, Badge } from "@/components/ui";
import { SettingsForm, CriterionForm, Modal } from "@/components/forms";
export default async function Settings() {
  if (!process.env.DATABASE_URL) return null;
  const [config, criteria] = await Promise.all([
    settings(),
    db.evaluationCriterion.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
    }),
  ]);
  return (
    <div className="narrow stack">
      <PageTitle
        title="Do seu jeito."
        description="Ajuste o acompanhamento à rotina dos treinos."
      />
      <section className="card form-card">
        <h2>Mensalidades e lembretes</h2>
        <SettingsForm
          days={config.dueSoonDays}
          fee={Number(config.defaultFee)}
        />
      </section>
      <section className="card">
        <div className="section-heading">
          <div>
            <h2>Critérios de avaliação</h2>
            <p className="muted">
              Desativar preserva notas e gráficos anteriores.
            </p>
          </div>
          <Modal title="Novo critério" trigger="Novo critério">
            <CriterionForm order={criteria.length} />
          </Modal>
        </div>
        <div className="row-list">
          {criteria.map((c) => (
            <div className="criterion-row" key={c.id}>
              <span className="criterion-order">
                {String(c.order + 1).padStart(2, "0")}
              </span>
              <div className="row-main">
                <strong>{c.name}</strong>
                <small>{c.description}</small>
              </div>
              <Badge status={c.active ? "ACTIVE" : "INACTIVE"} />
              <Modal title="Editar critério" trigger="Editar">
                <CriterionForm criterion={c} />
              </Modal>
            </div>
          ))}
        </div>
      </section>
      <section className="card">
        <h2>Sobre o acesso</h2>
        <p className="muted">
          Esta versão não possui login. Quem tiver acesso à URL poderá consultar
          e alterar os dados. A proteção contra indexação não é controle de
          acesso. Use dados fictícios em ambientes acessíveis publicamente.
        </p>
      </section>
    </div>
  );
}
