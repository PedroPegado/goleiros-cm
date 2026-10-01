import { requireUser } from "@/lib/require-user";
import { db } from "@/lib/db";
import { PageTitle } from "@/components/ui";
import { EvaluationForm } from "@/components/forms";
import { today } from "@/lib/rules";
export default async function NewEvaluation({
  searchParams,
}: {
  searchParams: Promise<{ aluno?: string }>;
}) {
  await requireUser();

  if (!process.env.DATABASE_URL) return null;
  const { aluno } = await searchParams;
  const [students, criteria] = await Promise.all([
    db.student.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.evaluationCriterion.findMany({
      where: { active: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    }),
  ]);
  return (
    <div className="narrow stack">
      <PageTitle
        title="Nova avaliação"
        description="Do campo para o histórico, em poucos toques."
      />
      <EvaluationForm
        students={students}
        criteria={criteria}
        initial={
          aluno
            ? { studentId: aluno, date: today(), notes: "", scores: [] }
            : undefined
        }
      />
    </div>
  );
}
