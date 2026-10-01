import Link from "next/link";
import { Plus } from "lucide-react";
import { PageTitle, Button } from "@/components/ui";
import { StudentList } from "@/components/student-list";
import { studentList, settings } from "@/services/queries";
import {
  calculateAge,
  calculateEvaluationAverage,
  calculateStudentEvolution,
  civil,
  getPaymentStatus,
  today,
} from "@/lib/rules";
export default async function Students() {
  if (!process.env.DATABASE_URL) return null;
  const [students, config] = await Promise.all([studentList(), settings()]);
  return (
    <div className="stack">
      <PageTitle
        title="Seu time de goleiros."
        description="Cada atleta, uma história de evolução."
        action={
          <Button asChild>
            <Link href="/alunos/novo">
              <Plus size={18} />
              Novo aluno
            </Link>
          </Button>
        }
      />
      <StudentList
        students={students.map((s) => {
          const overdue = s.payments.find(
            (p) => getPaymentStatus(p) === "OVERDUE",
          );
          const current = s.payments.find(
            (p) =>
              `${p.referenceYear}-${String(p.referenceMonth).padStart(2, "0")}` ===
              today().slice(0, 7),
          );
          const p = overdue || current;
          return {
            id: s.id,
            name: s.name,
            photo: s.photo,
            age: calculateAge(s.birthDate),
            status: s.status,
            paymentStatus: getPaymentStatus(p, today(), config.dueSoonDays),
            dueDate: p ? civil(p.dueDate) : null,
            evolution:
              calculateStudentEvolution(
                s.evaluations.map((e) =>
                  calculateEvaluationAverage(e.scores.map((x) => x.value)),
                ),
              )?.difference ?? null,
          };
        })}
      />
    </div>
  );
}
