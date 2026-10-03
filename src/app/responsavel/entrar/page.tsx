import { redirect } from "next/navigation";
import { Shield, HeartHandshake } from "lucide-react";
import { currentGuardian } from "@/lib/guardian-session";
import { GuardianLoginForm } from "@/components/guardian-auth";
export default async function GuardianEntry() {
  if (await currentGuardian()) redirect("/responsavel/painel");
  return (
    <main className="guardian-entry">
      <div className="guardian-entry-brand">
        <Shield size={28} />
        <span>
          GOLEIROS<small>CADA TREINO CONTA.</small>
        </span>
      </div>
      <section className="card guardian-entry-card">
        <div className="guardian-welcome-icon">
          <HeartHandshake size={28} />
        </div>
        <span className="eyebrow">FAMÍLIA E TREINAMENTO</span>
        <h1>Portal do Responsável</h1>
        <p className="muted">Acompanhe o desenvolvimento do seu goleiro.</p>
        <GuardianLoginForm />
        <p className="login-note">
          Use o telefone cadastrado e o código enviado pelo professor. Se
          precisar de um novo código, fale com ele.
        </p>
      </section>
    </main>
  );
}
