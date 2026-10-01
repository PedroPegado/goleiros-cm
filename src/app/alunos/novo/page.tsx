import { PageTitle } from "@/components/ui";
import { StudentForm } from "@/components/forms";
import { settings } from "@/services/queries";
export default async function NewStudent() {
  if (!process.env.DATABASE_URL) return null;
  const config = await settings();
  return (
    <div className="narrow stack">
      <PageTitle
        title="Novo aluno"
        description="Vamos conhecer o próximo camisa 1."
      />
      <StudentForm defaultFee={Number(config.defaultFee)} />
    </div>
  );
}
