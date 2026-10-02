"use client";
import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
export function FilterForm({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <form
      className="filter-bar"
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        const query = new URLSearchParams(
          new FormData(event.currentTarget) as unknown as Record<
            string,
            string
          >,
        );
        start(() => router.push(`/pagamentos?${query}`));
      }}
    >
      {children}
      <button
        className="button button-primary"
        type="submit"
        disabled={pending}
      >
        {pending && <LoaderCircle size={16} className="spin" />}
        {pending ? "Carregando..." : "Aplicar filtros"}
      </button>
    </form>
  );
}
