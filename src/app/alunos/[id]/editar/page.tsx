import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { civil } from "@/lib/rules";
import { PageTitle } from "@/components/ui";
import { StudentForm } from "@/components/forms";
export default async function EditStudent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const s = await db.student.findUnique({ where: { id } });
  if (!s) notFound();
  return (
    <div className="narrow stack">
      <PageTitle title="Editar aluno" description={s.name} />
      <StudentForm
        id={id}
        initial={{
          name: s.name,
          birthDate: civil(s.birthDate),
          guardianName: s.guardianName,
          guardianPhone: s.guardianPhone,
          dueDay: s.dueDay,
          monthlyFee: Number(s.monthlyFee),
          joinedAt: civil(s.joinedAt),
          notes: s.notes,
          photo: s.photo || "",
        }}
      />
    </div>
  );
}
