import type { Metadata } from "next";
import { Toaster } from "sonner";
import { Navigation, Header } from "@/components/navigation";
import { db } from "@/lib/db";
import { alerts } from "@/services/queries";
import { formatDate } from "@/lib/rules";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Goleiros • Centro de performance",
    template: "%s | Goleiros",
  },
  description: "Gestão de alunos e evolução no campo.",
  robots: { index: false, follow: false, noarchive: true },
};
export const dynamic = "force-dynamic";
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let students: { id: string; name: string }[] = [];
  let notifications: {
    id: string;
    studentId: string;
    name: string;
    message: string;
  }[] = [];
  if (process.env.DATABASE_URL) {
    const [list, overdue] = await Promise.all([
      db.student.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      alerts(),
    ]);
    students = list;
    notifications = overdue.map((p) => ({
      id: p.id,
      studentId: p.studentId,
      name: p.student.name,
      message: `Mensalidade atrasada. Vencimento: ${formatDate(p.dueDate)}.`,
    }));
  }
  return (
    <html lang="pt-BR">
      <body>
        <a className="skip-link" href="#conteudo">
          Pular para conteúdo
        </a>
        <Navigation />
        <div className="workspace">
          <Header students={students} alerts={notifications} />
          <main id="conteudo">
            {process.env.DATABASE_URL ? (
              children
            ) : (
              <div className="card setup">
                <h1>Vamos preparar o campo.</h1>
                <p>
                  Configure DATABASE_URL e DIRECT_URL no arquivo .env, execute
                  as migrations e inicie novamente.
                </p>
                <code>
                  npm run db:deploy
                  <br />
                  npm run db:seed
                </code>
                <p>
                  O README contém as instruções para Neon e Vercel. Nenhum dado
                  fictício é exibido como real.
                </p>
              </div>
            )}
          </main>
          <footer className="page-footer">
            GOLEIROS <span>·</span> Cada treino conta.
          </footer>
        </div>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
