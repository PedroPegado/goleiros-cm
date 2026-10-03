import { Shield } from "lucide-react";
import { requireGuardian } from "@/lib/guardian-session";
import { GuardianNavigation } from "@/components/guardian-navigation";
import { GuardianLogout } from "@/components/guardian-auth";
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireGuardian();
  return (
    <div className="guardian-shell">
      <a className="skip-link" href="#portal-conteudo">
        Pular para conteúdo
      </a>
      <header className="header guardian-header">
        <div className="guardian-brand">
          <Shield size={23} />
          <span>
            GOLEIROS<small>PORTAL DO RESPONSÁVEL</small>
          </span>
        </div>
        <GuardianLogout />
      </header>
      <main id="portal-conteudo">{children}</main>
      <GuardianNavigation />
      <footer className="page-footer">GOLEIROS · Cada treino conta.</footer>
    </div>
  );
}
