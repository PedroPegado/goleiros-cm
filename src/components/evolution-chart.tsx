"use client";
import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  calculateEvaluationAverage,
  calculateStudentEvolution,
  formatDate,
} from "@/lib/rules";
import { Empty, Stat } from "./ui";
type Evaluation = {
  id: string;
  date: string;
  scores: { criterionId: string; name: string; value: number }[];
};
const colors = ["#137952", "#d28025", "#596cd4"];
export function EvolutionChart({
  evaluations,
  audience = "teacher",
}: {
  evaluations: Evaluation[];
  audience?: "teacher" | "guardian";
}) {
  const [selected, setSelected] = useState<string[]>(["average"]);
  const criteria = Array.from(
    new Map(
      evaluations.flatMap((e) =>
        e.scores.map((s) => [s.criterionId, s.name] as const),
      ),
    ).entries(),
  );
  const data = evaluations.map((e) => ({
    date: formatDate(e.date),
    average: calculateEvaluationAverage(e.scores.map((s) => s.value)),
    ...Object.fromEntries(e.scores.map((s) => [s.criterionId, s.value])),
  }));
  const evolution = calculateStudentEvolution(data.map((x) => x.average));
  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 3
          ? [...prev, id]
          : prev,
    );
  }
  if (evaluations.length < 2)
    return (
      <Empty
        title="A evolução começa com o próximo treino"
        description={
          audience === "guardian"
            ? "A evolução será exibida quando o professor registrar pelo menos duas avaliações. Nenhum dado é estimado."
            : "Registre pelo menos duas avaliações para comparar os resultados. Nenhum dado é estimado."
        }
      />
    );
  return (
    <div className="stack">
      <div className="stats-grid three">
        <Stat
          label="Primeira avaliação"
          value={evolution?.first.toFixed(1) || "—"}
        />
        <Stat
          label="Última avaliação"
          value={evolution?.last.toFixed(1) || "—"}
        />
        <Stat
          label="Evolução geral"
          value={
            evolution
              ? `${evolution.difference >= 0 ? "+" : ""}${evolution.difference.toFixed(1)}`
              : "—"
          }
          detail={
            evolution?.percentage !== null &&
            evolution?.percentage !== undefined
              ? `${evolution.percentage.toFixed(1)}% em relação à primeira`
              : "Variação em pontos"
          }
        />
      </div>
      <div className="card">
        <h2>Evolução no campo</h2>
        <p className="muted">
          Selecione até três linhas. Intervalos indicam critérios não avaliados.
        </p>
        <div className="chart-filters">
          {[["average", "Média geral"], ...criteria].map(([id, name]) => (
            <label
              key={id}
              className={
                selected.includes(id) ? "chart-chip active" : "chart-chip"
              }
            >
              <input
                type="checkbox"
                checked={selected.includes(id)}
                disabled={!selected.includes(id) && selected.length >= 3}
                onChange={() => toggle(id)}
              />
              {name}
            </label>
          ))}
        </div>
        <div className="chart" aria-label="Gráfico de notas por data">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 15, right: 15, bottom: 5, left: -25 }}
            >
              <CartesianGrid
                strokeDasharray="4 4"
                vertical={false}
                stroke="#e6eae7"
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                minTickGap={35}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 10]}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip />
              <Legend />
              {selected.map((id, i) => (
                <Line
                  key={id}
                  type="linear"
                  dataKey={id}
                  name={
                    id === "average"
                      ? "Média geral"
                      : criteria.find((c) => c[0] === id)?.[1]
                  }
                  stroke={colors[i]}
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <details className="chart-data">
          <summary>Consultar valores do gráfico</summary>
          <div className="row-list">
            {data.map((d, i) => (
              <div key={evaluations[i].id} className="data-row">
                <strong>{d.date}</strong>
                <span>Média: {d.average?.toFixed(1)}</span>
                {evaluations[i].scores.map((s) => (
                  <small key={s.criterionId}>
                    {s.name}: {s.value}
                  </small>
                ))}
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}
export function MeasurementChart({
  measurements,
}: {
  measurements: {
    date: string;
    height: number | null;
    weight: number | null;
  }[];
}) {
  const [metric, setMetric] = useState<"height" | "weight">("height");
  if (measurements.length < 2) return null;
  return (
    <div>
      <label className="field">
        <span>Histórico físico</span>
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value as "height" | "weight")}
        >
          <option value="height">Altura (cm)</option>
          <option value="weight">Peso (kg)</option>
        </select>
      </label>
      <div className="chart small-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={measurements.map((m) => ({ ...m, date: formatDate(m.date) }))}
            margin={{ left: -15, right: 15, top: 10 }}
          >
            <CartesianGrid strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={40} />
            <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line
              dataKey={metric}
              name={metric === "height" ? "Altura (cm)" : "Peso (kg)"}
              stroke="#137952"
              strokeWidth={2}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
