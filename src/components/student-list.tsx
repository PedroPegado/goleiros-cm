"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search, TrendingUp } from "lucide-react";
import { Avatar, Badge, Empty } from "./ui";
import { formatDate } from "@/lib/rules";
export type StudentCard = {
  id: string;
  name: string;
  photo: string | null;
  age: number;
  status: string;
  paymentStatus: string;
  dueDate: string | null;
  evolution: number | null;
};
export function StudentList({ students }: { students: StudentCard[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [payment, setPayment] = useState("");
  const [sort, setSort] = useState("asc");
  const filtered = students
    .filter(
      (s) =>
        s.name
          .toLocaleLowerCase("pt-BR")
          .includes(search.toLocaleLowerCase("pt-BR")) &&
        (!status || s.status === status) &&
        (!payment || s.paymentStatus === payment),
    )
    .sort((a, b) =>
      sort === "asc"
        ? a.name.localeCompare(b.name, "pt-BR")
        : b.name.localeCompare(a.name, "pt-BR"),
    );
  return (
    <>
      <div className="filter-bar">
        <label className="search-field">
          <Search size={18} />
          <input
            aria-label="Pesquisar pelo nome"
            placeholder="Pesquisar pelo nome"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label className="filter-select">
          <span>Status do aluno</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos os alunos</option>
            <option value="ACTIVE">Ativos</option>
            <option value="INACTIVE">Inativos</option>
          </select>
        </label>
        <label className="filter-select">
          <span>Pagamento</span>
          <select value={payment} onChange={(e) => setPayment(e.target.value)}>
            <option value="">Todos os pagamentos</option>
            <option value="PAID">Pago</option>
            <option value="DUE_SOON">Próximo do vencimento</option>
            <option value="PENDING">Pendente</option>
            <option value="OVERDUE">Atrasado</option>
            <option value="UNREGISTERED">Ainda não registrado</option>
          </select>
        </label>
        <label className="filter-select">
          <span>Ordenação</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="asc">Nome A–Z</option>
            <option value="desc">Nome Z–A</option>
          </select>
        </label>
      </div>
      <p className="muted result-count">
        {filtered.length}{" "}
        {filtered.length === 1 ? "aluno encontrado" : "alunos encontrados"}
      </p>
      {filtered.length ? (
        <div className="student-grid">
          {filtered.map((s) => (
            <Link
              key={s.id}
              href={`/alunos/${s.id}`}
              className="card athlete-card"
            >
              <div className="section-heading">
                <Avatar name={s.name} photo={s.photo} large />
                <ArrowUpRight size={20} />
              </div>
              <h2>{s.name}</h2>
              <div className="athlete-meta">
                {s.age} anos <span>·</span> <Badge status={s.status} />
              </div>
              <div className="athlete-payment">
                <span className="muted">Mensalidade</span>
                <Badge status={s.paymentStatus} />
                {s.dueDate && (
                  <small>Vencimento: {formatDate(s.dueDate)}</small>
                )}
              </div>
              <div className="athlete-bottom">
                <span>
                  <TrendingUp size={17} />
                  {s.evolution === null
                    ? "Aguardando avaliações"
                    : `${s.evolution >= 0 ? "+" : ""}${s.evolution.toFixed(1)} na média`}
                </span>
                <span>Ver perfil →</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <Empty
          title="Nenhum aluno encontrado"
          description="Ajuste os filtros ou cadastre o primeiro atleta."
        />
      )}
    </>
  );
}
