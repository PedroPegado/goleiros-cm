import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty">
      <h1>Registro não encontrado</h1>
      <p>Ele pode ter sido removido.</p>
      <Link className="button button-primary" href="/alunos">
        Voltar aos alunos
      </Link>
    </div>
  );
}
