import { redirect } from "next/navigation";
import { Shield, ArrowUpRight } from "lucide-react";
import { currentUser } from "@/lib/require-user";
import { LoginForm } from "@/components/auth-forms";
export const metadata = { title: "Entrar" };
export default async function Login() {
  if (await currentUser()) redirect("/dashboard");
  return (
    <main className="login-page">
      <section className="login-story" aria-label="Goleiros">
        <div className="brand">
          <span className="brand-mark">
            <Shield size={26} />
          </span>
          <span>
            GOLEIROS<small>CENTRO DE PERFORMANCE</small>
          </span>
        </div>
        <div>
          <span className="banner-tag">EVOLUIR A CADA TREINO.</span>
          <h1>
            Seu time.
            <br />
            Seu próximo
            <br />
            grande goleiro.
          </h1>
          <p>Acompanhe cada conquista, dentro e fora do campo.</p>
        </div>
        <span className="login-story-footer">
          CADA TREINO CONTA. <ArrowUpRight size={20} />
        </span>
        <div className="pitch" aria-hidden>
          <div className="pitch-box" />
          <div className="pitch-circle" />
          <div className="pitch-line" />
        </div>
      </section>
      <section className="login-panel">
        <div className="login-form-wrap">
          <span className="eyebrow">ÁREA DO PROFESSOR</span>
          <h2>De volta ao campo.</h2>
          <p className="muted">Entre para acompanhar seus alunos.</p>
          <LoginForm />
          <p className="login-note">Acesso exclusivo do professor.</p>
        </div>
      </section>
    </main>
  );
}
