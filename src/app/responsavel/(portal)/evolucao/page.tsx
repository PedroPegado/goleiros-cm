import { requireGuardian } from "@/lib/guardian-session";
import { guardianMeasurements } from "@/services/guardian";
import { PageTitle, Stat, Empty } from "@/components/ui";
import { GuardianPhysicalCharts } from "@/components/guardian-physical-charts";
import { civil, formatDate } from "@/lib/rules";
export default async function GuardianPhysical() {
  await requireGuardian();
  const measurements = await guardianMeasurements();
  const recent = [...measurements].reverse();
  const height = recent.find((m) => m.height !== null),
    weight = recent.find((m) => m.weight !== null);
  return (
    <div className="stack">
      <PageTitle
        title="Evolução física"
        description="Registros de altura e peso feitos pelo professor."
      />
      <div className="stats-grid three guardian-physical-stats">
        <Stat
          label="Altura atual"
          value={height ? `${height.height} cm` : "—"}
          detail={height ? formatDate(height.date) : "Ainda não registrada"}
        />
        <Stat
          label="Peso atual"
          value={weight ? `${weight.weight} kg` : "—"}
          detail={weight ? formatDate(weight.date) : "Ainda não registrado"}
        />
        <Stat
          label="Última atualização"
          value={recent[0] ? formatDate(recent[0].date) : "—"}
        />
      </div>
      <GuardianPhysicalCharts
        measurements={measurements.map((m) => ({
          date: civil(m.date),
          height: m.height,
          weight: m.weight,
        }))}
      />
      <section className="card">
        <h2>Histórico de medidas</h2>
        {recent.length ? (
          <div className="row-list">
            {recent.map((m) => (
              <div className="measurement-row" key={m.id}>
                <span>{formatDate(m.date)}</span>
                <strong>{m.height === null ? "—" : `${m.height} cm`}</strong>
                <strong>{m.weight === null ? "—" : `${m.weight} kg`}</strong>
              </div>
            ))}
          </div>
        ) : (
          <Empty title="Nenhuma medida registrada" />
        )}
      </section>
    </div>
  );
}
