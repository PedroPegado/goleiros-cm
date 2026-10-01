import "server-only";
import { requireUser } from "@/lib/require-user";
import { db } from "@/lib/db";
import { dueDateFor, toDate, today } from "@/lib/rules";

/** Idempotent even across concurrent serverless requests; overdue is derived on read. */
export async function ensureMonthlyPayments(
  year = Number(today().slice(0, 4)),
  month = Number(today().slice(5, 7)),
) {
  await requireUser();
  const end = dueDateFor(year, month, 31);
  if (`${year}-${String(month).padStart(2, "0")}` > today().slice(0, 7)) return;
  const students = await db.student.findMany({
    where: { status: "ACTIVE", joinedAt: { lte: toDate(end) } },
    select: { id: true, dueDay: true, monthlyFee: true },
  });
  if (students.length)
    await db.payment.createMany({
      data: students.map((s) => ({
        studentId: s.id,
        referenceMonth: month,
        referenceYear: year,
        dueDate: toDate(dueDateFor(year, month, s.dueDay)),
        amount: s.monthlyFee,
      })),
      skipDuplicates: true,
    });
}
