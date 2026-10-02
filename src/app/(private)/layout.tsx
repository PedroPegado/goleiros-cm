import { Suspense } from "react";
import { requireUser } from "@/lib/require-user";
import { Navigation, Header } from "@/components/navigation";
import { db } from "@/lib/db";
import { alerts } from "@/services/queries";
import { formatDate } from "@/lib/rules";
export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return (
    <>
      <a className="skip-link" href="#conteudo">
        Pular para conteúdo
      </a>
      <Navigation />
      <div className="workspace">
        <Suspense fallback={<Header students={[]} alerts={[]} loading />}>
          <HeaderData />
        </Suspense>
        <main id="conteudo">{children}</main>
        <footer className="page-footer">
          GOLEIROS <span>·</span> Cada treino conta.
        </footer>
      </div>
    </>
  );
}

async function HeaderData() {
  const [students, overdue] = await Promise.all([
    db.student.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    alerts(),
  ]);
  const notifications = overdue.map((p) => ({
    id: p.id,
    studentId: p.studentId,
    name: p.student.name,
    message: `Mensalidade atrasada. Vencimento: ${formatDate(p.dueDate)}.`,
  }));
  return <Header students={students} alerts={notifications} />;
}
