import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageTitle } from "@/components/ui";
import { EvaluationForm } from "@/components/forms";
import { civil } from "@/lib/rules";
export default async function EditEvaluation({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const e = await db.evaluation.findUnique({
    where: { id },
    include: { student: true, scores: true },
  });
  if (!e) notFound();
  const criteria = await db.evaluationCriterion.findMany({
    where: {
      OR: [
        { active: true },
        { id: { in: e.scores.map((s) => s.criterionId) } },
      ],
    },
    orderBy: { order: "asc" },
  });
  return (
    <div className="narrow stack">
      <PageTitle title="Editar avaliação" description={e.student.name} />
      <EvaluationForm
        id={id}
        students={[{ id: e.studentId, name: e.student.name }]}
        criteria={criteria}
        initial={{
          studentId: e.studentId,
          date: civil(e.date),
          notes: e.notes,
          scores: e.scores.map((s) => ({
            criterionId: s.criterionId,
            value: s.value,
          })),
        }}
      />
    </div>
  );
}
