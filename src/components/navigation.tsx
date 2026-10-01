"use client";
import { LogoutButton } from "./auth-forms";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  Users,
  CirclePlus,
  Wallet,
  Settings,
  Shield,
  Search,
  Bell,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { cn } from "./ui";
const links = [
  { href: "/dashboard", label: "Início", icon: House },
  { href: "/alunos", label: "Alunos", icon: Users },
  { href: "/avaliacoes/nova", label: "Avaliar", icon: CirclePlus },
  { href: "/pagamentos", label: "Pagamentos", icon: Wallet },
];
export function Navigation() {
  const path = usePathname();
  return (
    <>
      <aside className="sidebar">
        <Link href="/dashboard" className="brand">
          <span className="brand-mark">
            <Shield size={25} />
          </span>
          <span>
            GOLEIROS<small>CENTRO DE PERFORMANCE</small>
          </span>
        </Link>
        <div className="nav-caption">SEU CAMPO DE CONTROLE</div>
        <nav aria-label="Navegação principal">
          {links.map((x) => (
            <Link
              key={x.href}
              href={x.href}
              className={cn("nav-link", path.startsWith(x.href) && "selected")}
            >
              <x.icon size={20} />
              {x.label}
              {path.startsWith(x.href) && <span className="nav-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="eyebrow">EVOLUIR A CADA TREINO.</span>
          <p>
            O próximo grande goleiro
            <br />
            começa aqui.
          </p>
          <Link className="nav-link" href="/configuracoes">
            <Settings size={19} />
            Configurações
          </Link>
        </div>
      </aside>
      <nav className="bottom-nav" aria-label="Navegação no celular">
        {links.map((x) => (
          <Link
            key={x.href}
            href={x.href}
            className={cn(path.startsWith(x.href) && "selected")}
          >
            <x.icon size={22} />
            <span>{x.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
export function Header({
  students,
  alerts,
}: {
  students: { id: string; name: string }[];
  alerts: { id: string; studentId: string; name: string; message: string }[];
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const results = query.trim()
    ? students
        .filter((s) =>
          s.name
            .toLocaleLowerCase("pt-BR")
            .includes(query.toLocaleLowerCase("pt-BR")),
        )
        .slice(0, 7)
    : [];
  return (
    <header className="header">
      <div className="global-search">
        <Search size={18} />
        <input
          aria-label="Busca global de alunos"
          placeholder="Buscar aluno..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setQuery("");
          }}
        />
        {query && (
          <div className="search-results">
            {results.length ? (
              results.map((s) => (
                <Link
                  key={s.id}
                  href={`/alunos/${s.id}`}
                  onClick={() => setQuery("")}
                >
                  {s.name}
                  <ChevronRight size={16} />
                </Link>
              ))
            ) : (
              <p>Nenhum aluno encontrado.</p>
            )}
            <button className="text-button" onClick={() => setQuery("")}>
              Fechar busca
            </button>
          </div>
        )}
      </div>
      <div className="header-actions">
        <LogoutButton />
        <span className="header-date">Área do professor</span>
        <div className="notification-wrap">
          <button
            className="icon-button"
            aria-label={`Notificações: ${alerts.length} pagamentos atrasados`}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <Bell size={20} />
            {alerts.length > 0 && (
              <span className="notification-count">{alerts.length}</span>
            )}
          </button>
          {open && (
            <div className="notification-panel">
              <div className="section-heading">
                <h3>Notificações</h3>
                <button className="text-button" onClick={() => setOpen(false)}>
                  Fechar
                </button>
              </div>
              {alerts.length ? (
                alerts.map((a) => (
                  <Link
                    key={a.id}
                    href={`/alunos/${a.studentId}`}
                    onClick={() => setOpen(false)}
                  >
                    <strong>{a.name}</strong>
                    <span>{a.message}</span>
                  </Link>
                ))
              ) : (
                <p className="muted">Nenhum pagamento atrasado 🎉</p>
              )}
            </div>
          )}
        </div>
        <Link
          className="icon-button"
          href="/configuracoes"
          aria-label="Configurações"
        >
          <Settings size={20} />
        </Link>
      </div>
    </header>
  );
}
