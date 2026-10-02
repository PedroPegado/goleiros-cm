"use server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z, ZodError } from "zod";
import { db } from "@/lib/db";
import {
  studentSchema,
  evaluationSchema,
  paymentSchema,
  measurementSchema,
  civilSchema,
} from "@/lib/validation";
import { toDate, dueDateFor, today } from "@/lib/rules";
import { requireUser } from "@/lib/require-user";
type Result = { ok: true; id?: string } | { ok: false; error: string };
/** Every exported mutation enters this server-side authorization boundary. */
async function mutate(work: () => Promise<string | void>): Promise<Result> {
  await requireUser();
  try {
    const id = await work();
    revalidatePath("/(private)", "layout");
    return { ok: true, ...(id ? { id } : {}) };
  } catch (error) {
    if (error instanceof ZodError)
      return { ok: false, error: error.issues[0].message };
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002")
        return { ok: false, error: "Já existe um registro com esses dados." };
      if (error.code === "P2025")
        return {
          ok: false,
          error: "Registro não encontrado. Atualize a página.",
        };
    }
    return {
      ok: false,
      error:
        "Não foi possível salvar. Verifique os dados e a conexão com o banco.",
    };
  }
}
export async function saveStudent(input: unknown, id?: string) {
  return mutate(async () => {
    const { height, weight, photo, ...data } = studentSchema.parse(input);
    return db.$transaction(async (tx) => {
      const student = id
        ? await tx.student.update({
            where: { id },
            data: {
              ...data,
              birthDate: toDate(data.birthDate),
              joinedAt: toDate(data.joinedAt),
              photo: photo || null,
            },
          })
        : await tx.student.create({
            data: {
              ...data,
              birthDate: toDate(data.birthDate),
              joinedAt: toDate(data.joinedAt),
              photo: photo || null,
            },
          });
      if (!id && (height !== undefined || weight !== undefined))
        await tx.physicalMeasurement.create({
          data: {
            studentId: student.id,
            date: toDate(today()),
            height,
            weight,
          },
        });
      return student.id;
    });
  });
}
export async function setStudentStatus(id: string, active: boolean) {
  return mutate(async () => {
    await db.student.update({
      where: { id },
      data: { status: active ? "ACTIVE" : "INACTIVE" },
    });
  });
}
export async function deleteStudent(id: string) {
  return mutate(async () => {
    await db.student.delete({ where: { id } });
  });
}
export async function saveEvaluation(input: unknown, id?: string) {
  return mutate(async () => {
    const data = evaluationSchema.parse(input);
    return db.$transaction(async (tx) => {
      const previous = id
        ? await tx.evaluation.findUniqueOrThrow({
            where: { id },
            include: { scores: true },
          })
        : null;
      if (previous && previous.studentId !== data.studentId)
        throw new Error("Aluno incompatível");
      const criteria = await tx.evaluationCriterion.findMany({
        where: { id: { in: data.scores.map((s) => s.criterionId) } },
      });
      if (
        criteria.length !== data.scores.length ||
        criteria.some(
          (c) =>
            !c.active && !previous?.scores.some((s) => s.criterionId === c.id),
        )
      )
        throw new Error("Critério inválido");
      const student = await tx.student.findUniqueOrThrow({
        where: { id: data.studentId },
      });
      if (!id && student.status !== "ACTIVE") throw new Error("Aluno inativo");
      if (id)
        await tx.evaluationScore.deleteMany({ where: { evaluationId: id } });
      const values = {
        studentId: data.studentId,
        date: toDate(data.date),
        notes: data.notes,
        scores: { create: data.scores },
      };
      const result = id
        ? await tx.evaluation.update({ where: { id }, data: values })
        : await tx.evaluation.create({ data: values });
      return result.studentId;
    });
  });
}
export async function deleteEvaluation(id: string) {
  return mutate(async () => {
    await db.evaluation.delete({ where: { id } });
  });
}
export async function savePayment(input: unknown, id?: string) {
  return mutate(async () => {
    const data = paymentSchema.parse(input);
    const student = await db.student.findUniqueOrThrow({
      where: { id: data.studentId },
    });
    const values = {
      ...data,
      paidAt: toDate(data.paidAt),
      paymentMethod: data.paymentMethod || null,
      status: "PAID" as const,
    };
    if (id) {
      const old = await db.payment.findUniqueOrThrow({ where: { id } });
      if (
        old.studentId !== data.studentId ||
        old.referenceMonth !== data.referenceMonth ||
        old.referenceYear !== data.referenceYear
      )
        throw new Error("Referência incompatível");
      await db.payment.update({ where: { id }, data: values });
    } else
      await db.payment.upsert({
        where: {
          studentId_referenceMonth_referenceYear: {
            studentId: data.studentId,
            referenceMonth: data.referenceMonth,
            referenceYear: data.referenceYear,
          },
        },
        create: {
          ...values,
          dueDate: toDate(
            dueDateFor(data.referenceYear, data.referenceMonth, student.dueDay),
          ),
        },
        update: values,
      });
  });
}
export async function deletePayment(id: string) {
  return mutate(async () => {
    await db.payment.delete({ where: { id } });
  });
}
export async function saveMeasurement(input: unknown) {
  return mutate(async () => {
    const data = measurementSchema.parse(input);
    await db.physicalMeasurement.create({
      data: { ...data, date: toDate(data.date) },
    });
  });
}
export async function saveNote(input: unknown) {
  return mutate(async () => {
    const data = z
      .object({
        studentId: z.string().min(1),
        date: civilSchema.refine((v) => v <= today()),
        text: z.string().trim().min(1, "Escreva a observação.").max(5000),
      })
      .parse(input);
    await db.studentNote.create({ data: { ...data, date: toDate(data.date) } });
  });
}
export async function deleteNote(id: string) {
  return mutate(async () => {
    await db.studentNote.delete({ where: { id } });
  });
}
export async function saveSettings(input: unknown) {
  return mutate(async () => {
    const data = z
      .object({
        dueSoonDays: z.coerce.number().int().min(0).max(30),
        defaultFee: z.coerce.number().min(0).max(999999.99),
      })
      .parse(input);
    await db.setting.upsert({
      where: { id: "default" },
      create: { id: "default", ...data },
      update: data,
    });
  });
}
export async function saveCriterion(input: unknown, id?: string) {
  return mutate(async () => {
    const data = z
      .object({
        name: z.string().trim().min(2).max(80),
        description: z.string().max(300),
        order: z.coerce.number().int().min(0).max(999),
        active: z.boolean(),
      })
      .parse(input);
    if (id) await db.evaluationCriterion.update({ where: { id }, data });
    else await db.evaluationCriterion.create({ data });
  });
}
