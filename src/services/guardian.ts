import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { requireGuardian } from "@/lib/guardian-session";

// Explicit projections are the portal privacy boundary: no notes, phone, code hash or other students.
export const guardianStudent = cache(async () => {
  const { studentId } = await requireGuardian();
  return db.student.findUniqueOrThrow({
    where: { id: studentId },
    select: { name: true, birthDate: true, photo: true },
  });
});
export const guardianSummary = cache(async () => {
  const { studentId } = await requireGuardian();
  const [student, height, weight, evaluation, payment] = await Promise.all([
    guardianStudent(),
    db.physicalMeasurement.findFirst({
      where: { studentId, height: { not: null } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      select: { date: true, height: true },
    }),
    db.physicalMeasurement.findFirst({
      where: { studentId, weight: { not: null } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      select: { date: true, weight: true },
    }),
    db.evaluation.findFirst({
      where: { studentId },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      select: {
        date: true,
        guardianFeedback: true,
        scores: {
          select: { value: true, criterion: { select: { name: true } } },
        },
      },
    }),
    db.payment.findFirst({
      where: { studentId },
      orderBy: [{ referenceYear: "desc" }, { referenceMonth: "desc" }],
      select: portalPaymentSelect,
    }),
  ]);
  return { student, height, weight, evaluation, payment };
});
export async function guardianEvaluations() {
  const { studentId } = await requireGuardian();
  return db.evaluation.findMany({
    where: { studentId },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      date: true,
      guardianFeedback: true,
      scores: {
        select: {
          criterionId: true,
          value: true,
          criterion: { select: { name: true } },
        },
      },
    },
  });
}
export async function guardianMeasurements() {
  const { studentId } = await requireGuardian();
  return db.physicalMeasurement.findMany({
    where: { studentId },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    select: { id: true, date: true, height: true, weight: true },
  });
}
const portalPaymentSelect = {
  id: true,
  referenceMonth: true,
  referenceYear: true,
  dueDate: true,
  amount: true,
  status: true,
  paidAt: true,
} as const;
export async function guardianPayments() {
  const { studentId } = await requireGuardian();
  return db.payment.findMany({
    where: { studentId },
    orderBy: [{ referenceYear: "desc" }, { referenceMonth: "desc" }],
    select: portalPaymentSelect,
  });
}
