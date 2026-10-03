"use client";
import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, LogOut } from "lucide-react";
import { guardianLogin, guardianLogout } from "@/actions/guardian-auth";
import { Button } from "./ui";
export function GuardianLoginForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget,
      data = new FormData(form);
    setError("");
    start(async () => {
      try {
        const result = await guardianLogin(data);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        form.reset();
        router.replace("/responsavel/painel");
        router.refresh();
      } catch {
        setError("Não foi possível entrar agora. Tente novamente.");
      }
    });
  }
  return (
    <form className="login-form" onSubmit={submit}>
      <label className="field">
        <span>Telefone com DDD</span>
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="(84) 99999-9999"
          maxLength={40}
          required
        />
      </label>
      <label className="field">
        <span>Código de acesso</span>
        <input
          name="code"
          type="password"
          autoComplete="current-password"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={100}
          required
        />
      </label>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending && <LoaderCircle size={18} className="spin" />}
        {pending ? "Entrando..." : "Entrar"}
        <ArrowRight size={18} />
      </Button>
    </form>
  );
}
export function GuardianLogout() {
  const [pending, start] = useTransition();
  const [error, setError] = useState(false);
  return (
    <>
      <button
        className="button button-ghost logout-button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            try {
              await guardianLogout();
            } catch {
              setError(true);
            }
          })
        }
      >
        <LogOut size={16} />
        {pending ? "Saindo..." : "Sair"}
      </button>
      {error && <span role="alert">Tente sair novamente.</span>}
    </>
  );
}
