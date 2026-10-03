"use client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatDate } from "@/lib/rules";
export function GuardianPhysicalCharts({
  measurements,
}: {
  measurements: {
    date: string;
    height: number | null;
    weight: number | null;
  }[];
}) {
  return (
    <div className="stack">
      {(["height", "weight"] as const).map((metric) => {
        const title = metric === "height" ? "Altura (cm)" : "Peso (kg)";
        const count = measurements.filter((m) => m[metric] !== null).length;
        return (
          <section className="card" key={metric}>
            <h2>{title}</h2>
            {count < 2 ? (
              <p className="muted">
                {count
                  ? "Ainda não existem dados suficientes para um gráfico de evolução. É necessário ter ao menos dois registros desta medida."
                  : "Nenhum registro disponível para esta medida."}
              </p>
            ) : (
              <div
                className="chart small-chart"
                aria-label={`Gráfico de ${title}`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={measurements.map((m) => ({
                      ...m,
                      date: formatDate(m.date),
                    }))}
                    margin={{ left: -10, right: 15, top: 15 }}
                  >
                    <CartesianGrid strokeDasharray="4 4" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      minTickGap={40}
                    />
                    <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line
                      dataKey={metric}
                      name={title}
                      type="linear"
                      stroke="#137952"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
