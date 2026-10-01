import { PrismaClient } from "@prisma/client";
import { seedAdmin } from "./admin";
import { today, toDate, dueDateFor } from "../src/lib/rules";
const db = new PrismaClient();
const names = [
  "Reflexo",
  "Velocidade",
  "Impulsão/Pulo",
  "Agilidade",
  "Posicionamento",
  "Reposição com as mãos",
  "Reposição com os pés",
  "Saída do gol",
  "Defesa aérea",
  "Defesa rasteira",
  "Comunicação",
  "Concentração",
];
async function main() {
  await seedAdmin(db);
  for (const [order, name] of names.entries())
    await db.evaluationCriterion.upsert({
      where: { id: `criterion-${order}` },
      create: { id: `criterion-${order}`, name, order },
      update: {},
    });
  await db.setting.upsert({
    where: { id: "default" },
    create: { id: "default" },
    update: {},
  });
  if (process.env.SEED_DEMO !== "true") {
    console.log(
      "Critérios e configurações prontos. Para dados fictícios, use npm run db:seed:demo.",
    );
    return;
  }
  const now = today(),
    year = Number(now.slice(0, 4)),
    month = Number(now.slice(5, 7)),
    day = Number(now.slice(8));
  const students = [
    {
      name: "Gabriel Henrique",
      guardian: "Carlos Henrique",
      birth: "2014-04-12",
      due: Math.max(1, day - 4),
    },
    { name: "João Pedro", guardian: "Ana Paula", birth: "2013-08-23", due: 10 },
    {
      name: "Matheus Silva",
      guardian: "Renata Silva",
      birth: "2015-02-10",
      due: Math.min(31, day + 2),
    },
    {
      name: "Lucas Oliveira",
      guardian: "Marcos Oliveira",
      birth: "2012-11-07",
      due: 15,
    },
    {
      name: "Rafael Costa",
      guardian: "Fernanda Costa",
      birth: "2014-06-18",
      due: 20,
    },
    {
      name: "Pedro Alves",
      guardian: "Juliana Alves",
      birth: "2016-01-30",
      due: 10,
    },
  ];
  for (const [i, item] of students.entries()) {
    const id = `demo-student-${i}`;
    const joinedAt = new Date(Date.UTC(year, month - 4, 1));
    await db.student.upsert({
      where: { id },
      create: {
        id,
        name: item.name,
        birthDate: toDate(item.birth),
        guardianName: item.guardian,
        guardianPhone: "5584999999999",
        monthlyFee: 150,
        dueDay: item.due,
        joinedAt,
        notes: "Dados fictícios para demonstração.",
        status: i === 5 ? "INACTIVE" : "ACTIVE",
      },
      update: {},
    });
    for (let n = 0; n < 6; n++) {
      const date = new Date(toDate(now).getTime() - (35 - n * 7) * 86400000);
      const eid = `demo-eval-${i}-${n}`;
      await db.evaluation.upsert({
        where: { id: eid },
        create: {
          id: eid,
          studentId: id,
          date,
          notes:
            n === 5
              ? "Boa evolução nos reflexos. Vamos trabalhar posicionamento em bolas cruzadas."
              : "Treino de fundamentos, agilidade e defesa rasteira.",
          scores: {
            create: [0, 1, 2, 4, 9].map((c) => ({
              criterionId: `criterion-${c}`,
              value: Math.min(
                10,
                Number((5.5 + i * 0.2 + n * 0.45 + (c % 3) * 0.3).toFixed(1)),
              ),
            })),
          },
        },
        update: {},
      });
    }
    for (let offset = 2; offset >= 0; offset--) {
      const date = new Date(Date.UTC(year, month - 1 - offset, 1)),
        y = date.getUTCFullYear(),
        m = date.getUTCMonth() + 1;
      const paid = offset > 0 || i === 1 || i === 3;
      let due = dueDateFor(y, m, item.due);
      // Preserve examples of overdue and upcoming even on the first / final day of a month.
      if (offset === 0 && i === 0 && day === 1) due = civilPrevious(now);
      if (offset === 0 && i === 2)
        due = new Date(toDate(now).getTime() + 2 * 86400000)
          .toISOString()
          .slice(0, 10);
      await db.payment.upsert({
        where: {
          studentId_referenceMonth_referenceYear: {
            studentId: id,
            referenceMonth: m,
            referenceYear: y,
          },
        },
        create: {
          studentId: id,
          referenceMonth: m,
          referenceYear: y,
          dueDate: toDate(due),
          amount: 150,
          status: paid ? "PAID" : "PENDING",
          paidAt: paid ? toDate(offset === 0 ? now : due) : null,
          paymentMethod: paid ? "PIX" : null,
        },
        update: {},
      });
    }
    for (let n = 0; n < 3; n++)
      await db.physicalMeasurement.upsert({
        where: { id: `demo-measure-${i}-${n}` },
        create: {
          id: `demo-measure-${i}-${n}`,
          studentId: id,
          date: new Date(toDate(now).getTime() - (60 - n * 30) * 86400000),
          height: 150 + i * 3 + n,
          weight: 43 + i * 2 + n * 0.8,
        },
        update: {},
      });
    await db.studentNote.upsert({
      where: { id: `demo-note-${i}` },
      create: {
        id: `demo-note-${i}`,
        studentId: id,
        date: toDate(now),
        text: "Participou bem do treino. Trabalhar confiança na saída do gol nas próximas aulas.",
      },
      update: {},
    });
  }
  console.log(
    "Seed fictício pronto: 6 alunos, 36 avaliações e histórico financeiro/físico. Nenhum dado existente foi sobrescrito.",
  );
}
function civilPrevious(date: string) {
  return new Date(toDate(date).getTime() - 86400000).toISOString().slice(0, 10);
}
main()
  .catch(() => {
    console.error("Falha no seed. Confira a conexão e as migrations.");
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
