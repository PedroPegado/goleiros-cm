import "server-only";
import { requireUser } from "@/lib/require-user";
import { cache } from "react";
import { db } from "@/lib/db";
import { ensureMonthlyPayments } from "./payments";
import { toDate, today } from "@/lib/rules";
export const settings = cache(async () => {
  await requireUser();
  return (
    (await db.setting.findUnique({ where: { id: "default" } })) ?? {
      id: "default",
      dueSoonDays: 3,
      defaultFee: 150,
    }
  );
});
export const syncPayments = cache(async () => {
  await ensureMonthlyPayments();
});
export const alerts = cache(async () => {
  await syncPayments();
  return db.payment.findMany({
    where: { status: { not: "PAID" }, dueDate: { lt: toDate(today()) } },
    select: {
      id: true,
      studentId: true,
      dueDate: true,
      student: { select: { name: true } },
    },
    orderBy: { dueDate: "asc" },
  });
});
function relevantPayments() {
  const now = today();
  return {
    OR: [
      {
        referenceYear: Number(now.slice(0, 4)),
        referenceMonth: Number(now.slice(5, 7)),
      },
      { status: { not: "PAID" as const }, dueDate: { lt: toDate(now) } },
    ],
  };
}
export async function studentList() {
  await syncPayments();
  const [students, last] = await Promise.all([
    db.student.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        photo: true,
        birthDate: true,
        status: true,
        payments: {
          where: relevantPayments(),
          orderBy: { dueDate: "desc" },
          select: {
            status: true,
            dueDate: true,
            referenceYear: true,
            referenceMonth: true,
          },
        },
        evaluations: {
          where: { scores: { some: {} } },
          orderBy: [{ date: "asc" }, { createdAt: "asc" }, { id: "asc" }],
          take: 1,
          select: { id: true, scores: { select: { value: true } } },
        },
      },
    }),
    db.student.findMany({
      select: {
        id: true,
        evaluations: {
          where: { scores: { some: {} } },
          orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
          take: 1,
          select: { id: true, scores: { select: { value: true } } },
        },
      },
    }),
  ]);
  const latest = new Map(last.map((s) => [s.id, s.evaluations[0]]));
  return students.map((s) => {
    const end = latest.get(s.id);
    return {
      ...s,
      evaluations:
        end && end.id !== s.evaluations[0]?.id
          ? [...s.evaluations, end]
          : s.evaluations,
    };
  });
}
export async function studentDetail(id: string, tab = "geral") {
  await syncPayments();
  const [
    student,
    payments,
    evaluations,
    measurements,
    studentNotes,
    latestScores,
  ] = await Promise.all([
    db.student.findUnique({ where: { id } }),
    db.payment.findMany({
      where: {
        studentId: id,
        ...(tab === "pagamentos" ? {} : relevantPayments()),
      },
      orderBy: { dueDate: "desc" },
    }),
    ["avaliacoes", "evolucao"].includes(tab)
      ? db.evaluation.findMany({
          where: { studentId: id },
          orderBy: [{ date: "asc" }, { createdAt: "asc" }],
          include: {
            scores: { include: { criterion: { select: { name: true } } } },
          },
        })
      : Promise.resolve([]),
    tab === "geral"
      ? db.physicalMeasurement.findMany({
          where: { studentId: id },
          orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        })
      : Promise.all([
          db.physicalMeasurement.findFirst({
            where: { studentId: id, height: { not: null } },
            orderBy: [{ date: "desc" }, { createdAt: "desc" }],
          }),
          db.physicalMeasurement.findFirst({
            where: { studentId: id, weight: { not: null } },
            orderBy: [{ date: "desc" }, { createdAt: "desc" }],
          }),
        ]).then((rows) =>
          rows
            .filter((row) => row !== null)
            .sort(
              (a, b) =>
                b.date.getTime() - a.date.getTime() ||
                b.createdAt.getTime() - a.createdAt.getTime(),
            ),
        ),
    tab === "observacoes"
      ? db.studentNote.findMany({
          where: { studentId: id },
          orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        })
      : Promise.resolve([]),
    tab === "geral"
      ? db.$queryRaw<
          { criterionId: string; name: string; value: number; date: Date }[]
        >`
      SELECT DISTINCT ON (s."criterionId") s."criterionId", c.name, s.value, e.date
      FROM "EvaluationScore" s
      JOIN "Evaluation" e ON e.id = s."evaluationId"
      JOIN "EvaluationCriterion" c ON c.id = s."criterionId"
      WHERE e."studentId" = ${id}
      ORDER BY s."criterionId", e.date DESC, e."createdAt" DESC, e.id DESC
    `
      : Promise.resolve([]),
  ]);
  return student
    ? {
        ...student,
        payments,
        evaluations,
        measurements,
        studentNotes,
        latestScores,
      }
    : null;
}
