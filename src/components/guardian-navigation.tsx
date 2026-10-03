"use client";
import { usePathname } from "next/navigation";
import Link from "./pending-link";
import { House, Activity, Ruler, Wallet } from "lucide-react";
const links = [
  ["painel", "Início", House],
  ["desempenho", "Desempenho", Activity],
  ["evolucao", "Evolução", Ruler],
  ["mensalidade", "Mensalidade", Wallet],
] as const;
export function GuardianNavigation() {
  const path = usePathname();
  return (
    <nav
      className="bottom-nav guardian-nav"
      aria-label="Navegação do responsável"
    >
      {links.map(([route, label, Icon]) => (
        <Link
          key={route}
          href={`/responsavel/${route}`}
          prefetch={false}
          className={path === `/responsavel/${route}` ? "selected" : ""}
          aria-current={path === `/responsavel/${route}` ? "page" : undefined}
        >
          <Icon size={21} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
