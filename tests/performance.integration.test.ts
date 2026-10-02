import { afterAll, describe, expect, it, vi } from "vitest";
vi.mock("../src/lib/require-user", () => ({
  requireUser: vi.fn().mockResolvedValue({ id: "test" }),
}));
import { db } from "../src/lib/db";
import { studentDetail, studentList } from "../src/services/queries";
import {
  calculateEvaluationAverage,
  calculateStudentEvolution,
  toDate,
} from "../src/lib/rules";
const id = `performance-${Date.now()}`;
describe.skipIf(process.env.RUN_DB_TESTS !== "true")(
  "Consultas com histórico extenso",
  () => {
    afterAll(async () => {
      await db.student.deleteMany({ where: { id } });
      await db.evaluationCriterion.deleteMany({
        where: { id: { in: [`${id}-a`, `${id}-b`] } },
      });
      await db.$disconnect();
    });
    it("preserva evolução, última nota por critério e medidas sem carregar abas inativas", async () => {
      for (const key of ["a", "b"])
        await db.evaluationCriterion.create({
          data: { id: `${id}-${key}`, name: `${id}-${key}` },
        });
      await db.student.create({
        data: {
          id,
          name: "Aluno fictício de desempenho",
          birthDate: toDate("2014-01-01"),
          guardianName: "Fictício",
          guardianPhone: "5584999999999",
          dueDay: 15,
          monthlyFee: 150,
          joinedAt: toDate("2020-01-01"),
          status: "INACTIVE",
          evaluations: {
            create: Array.from({ length: 60 }, (_, i) => ({
              date: new Date(Date.UTC(2024, 0, i + 1)),
              scores: {
                create: [
                  { criterionId: `${id}-a`, value: i / 10 },
                  ...(i < 30 ? [{ criterionId: `${id}-b`, value: 7 }] : []),
                ],
              },
            })),
          },
          measurements: {
            create: [
              { date: toDate("2024-01-01"), height: 150, weight: 40 },
              { date: toDate("2024-02-01"), height: 152 },
              { date: toDate("2024-03-01"), weight: 42 },
            ],
          },
          payments: {
            create: Array.from({ length: 24 }, (_, i) => ({
              referenceYear: 2022 + Math.floor(i / 12),
              referenceMonth: (i % 12) + 1,
              dueDate: new Date(
                Date.UTC(2022 + Math.floor(i / 12), i % 12, 15),
              ),
              amount: 150,
              status: "PAID",
              paidAt: toDate("2024-01-01"),
            })),
          },
          studentNotes: {
            create: { date: toDate("2024-01-01"), text: "Observação fictícia" },
          },
        },
      });
      const baseline = await db.student.findUniqueOrThrow({
        where: { id },
        include: {
          evaluations: {
            orderBy: [{ date: "asc" }, { createdAt: "asc" }],
            include: { scores: { include: { criterion: true } } },
          },
          measurements: true,
          studentNotes: true,
          payments: true,
        },
      });
      const expected = calculateStudentEvolution(
        baseline.evaluations.map((e) =>
          calculateEvaluationAverage(e.scores.map((s) => s.value)),
        ),
      );
      const list = (await studentList()).find((s) => s.id === id)!;
      expect(list.evaluations).toHaveLength(2);
      expect(
        calculateStudentEvolution(
          list.evaluations.map((e) =>
            calculateEvaluationAverage(e.scores.map((s) => s.value)),
          ),
        ),
      ).toEqual(expected);
      const overview = (await studentDetail(id))!;
      expect(
        overview.latestScores.find((s) => s.criterionId === `${id}-a`)?.value,
      ).toBe(5.9);
      expect(
        overview.latestScores.find((s) => s.criterionId === `${id}-b`)?.value,
      ).toBe(7);
      expect(overview.evaluations).toHaveLength(0);
      expect(overview.studentNotes).toHaveLength(0);
      expect(overview.payments).toHaveLength(0);
      const payments = (await studentDetail(id, "pagamentos"))!;
      expect(payments.payments).toHaveLength(24);
      expect(payments.evaluations).toHaveLength(0);
      expect(payments.measurements.find((m) => m.height !== null)?.height).toBe(
        152,
      );
      expect(payments.measurements.find((m) => m.weight !== null)?.weight).toBe(
        42,
      );
      expect((await studentDetail(id, "avaliacoes"))?.evaluations).toHaveLength(
        60,
      );
      expect(
        (await studentDetail(id, "observacoes"))?.studentNotes,
      ).toHaveLength(1);
      console.info(
        JSON.stringify({
          fixture: "60 evaluations, 24 payments",
          baselineBytes: Buffer.byteLength(JSON.stringify(baseline)),
          overviewBytes: Buffer.byteLength(JSON.stringify(overview)),
          listEvaluationCount: list.evaluations.length,
        }),
      );
    });
  },
);
