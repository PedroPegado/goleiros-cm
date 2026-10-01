"use client";
import { Button } from "@/components/ui";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="card empty">
      <h2>Não foi possível carregar os dados.</h2>
      <p className="muted">Confira a conexão com o banco e tente novamente.</p>
      <Button onClick={reset}>Tentar novamente</Button>
    </div>
  );
}
