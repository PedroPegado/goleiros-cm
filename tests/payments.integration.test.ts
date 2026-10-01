import { afterAll, describe, expect, it } from "vitest";
import { db } from "../src/lib/db";
import { ensureMonthlyPayments } from "../src/services/payments";
import { today, toDate, dueDateFor } from "../src/lib/rules";
const id = `integration-${Date.now()}`;
describe.skipIf(process.env.RUN_DB_TESTS !== "true")(
  "PostgreSQL: invariantes financeiras",
  () => {
    afterAll(async () => {
      await db.student.deleteMany({ where: { id } });
      await db.$disconnect();
    });
    it("gera uma única mensalidade sob concorrência e preserva pagamentos", async () => {
      const now = today(),
        year = Number(now.slice(0, 4)),
        month = Number(now.slice(5, 7));
      await db.student.create({
        data: {
          id,
          name: "Teste de concorrência",
          birthDate: toDate("2014-01-01"),
          guardianName: "Responsável fictício",
          guardianPhone: "5584999999999",
          dueDay: 31,
          monthlyFee: 175,
          joinedAt: toDate(now),
        },
      });
      await Promise.all(
        Array.from({ length: 5 }, () => ensureMonthlyPayments(year, month)),
      );
      const payments = await db.payment.findMany({ where: { studentId: id } });
      expect(payments).toHaveLength(1);
      expect(payments[0].dueDate.toISOString().slice(0, 10)).toBe(
        dueDateFor(year, month, 31),
      );
      await db.payment.update({
        where: { id: payments[0].id },
        data: { status: "PAID", paidAt: toDate(now) },
      });
      await db.student.update({
        where: { id },
        data: { monthlyFee: 220, dueDay: 5 },
      });
      await ensureMonthlyPayments(year, month);
      const saved = await db.payment.findUniqueOrThrow({
        where: { id: payments[0].id },
      });
      expect(saved.status).toBe("PAID");
      expect(Number(saved.amount)).toBe(175);
      expect(saved.dueDate.toISOString().slice(0, 10)).toBe(
        dueDateFor(year, month, 31),
      );
      await db.student.update({ where: { id }, data: { status: "INACTIVE" } });
      await db.payment.delete({ where: { id: payments[0].id } });
      await ensureMonthlyPayments(year, month);
      expect(await db.payment.count({ where: { studentId: id } })).toBe(0);
    });
  },
);
