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
    include: { student: { select: { id: true, name: true } } },
    orderBy: { dueDate: "asc" },
  });
});
export async function studentList() {
  await syncPayments();
  return db.student.findMany({
    orderBy: { name: "asc" },
    include: {
      payments: { orderBy: { dueDate: "desc" } },
      evaluations: {
        orderBy: [{ date: "asc" }, { createdAt: "asc" }],
        include: { scores: true },
      },
      measurements: {
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 1,
      },
    },
  });
}
export async function studentDetail(id: string) {
  await syncPayments();
  return db.student.findUnique({
    where: { id },
    include: {
      payments: { orderBy: { dueDate: "desc" } },
      evaluations: {
        orderBy: [{ date: "asc" }, { createdAt: "asc" }],
        include: { scores: { include: { criterion: true } } },
      },
      measurements: { orderBy: [{ date: "desc" }, { createdAt: "desc" }] },
      studentNotes: { orderBy: [{ date: "desc" }, { createdAt: "desc" }] },
    },
  });
}
