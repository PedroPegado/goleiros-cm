"use client";
import { useState, useTransition, type FormEvent } from "react";
import { signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LogOut, LoaderCircle, ArrowRight } from "lucide-react";
import { Button } from "./ui";
import { changePassword } from "@/actions/auth";
export function LoginForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const data = new FormData(e.currentTarget);
    start(async () => {
      try {
        const result = await signIn("credentials", {
          email: data.get("email"),
          password: data.get("password"),
          redirect: false,
          callbackUrl: "/dashboard",
        });
        if (!result?.ok || result.error) {
          setError("Usuário/e-mail ou senha inválidos.");
          return;
        }
        router.replace("/dashboard");
        router.refresh();
      } catch {
        setError("Não foi possível entrar agora. Tente novamente.");
      }
    });
  }
  return (
    <form onSubmit={submit} className="login-form">
      <label className="field">
        <span>Usuário ou e-mail</span>
        <input
          name="email"
          type="text"
          autoComplete="username"
          maxLength={254}
          required
          autoCapitalize="none"
          spellCheck={false}
        />
      </label>
      <label className="field">
        <span>Senha</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          maxLength={72}
          required
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? <LoaderCircle className="spin" size={18} /> : null}
        {pending ? "Entrando..." : "Entrar"}
        <ArrowRight size={18} />
      </Button>
    </form>
  );
}
export function LogoutButton() {
  const [pending, start] = useTransition();
  const [error, setError] = useState(false);
  return (
    <>
      <button
        type="button"
        className="button button-ghost logout-button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            try {
              await signOut({ callbackUrl: "/login" });
            } catch {
              setError(true);
            }
          })
        }
      >
        <LogOut size={18} />
        {pending ? "Saindo..." : "Sair"}
      </button>
      {error && (
        <span role="alert">Não foi possível sair. Tente novamente.</span>
      )}
    </>
  );
}
export function ChangePasswordForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    start(async () => {
      try {
        const result = await changePassword(data);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        form.reset();
        await signOut({ callbackUrl: "/login" });
      } catch {
        setError("Não foi possível alterar a senha. Tente novamente.");
      }
    });
  }
  return (
    <form onSubmit={submit} className="simple-form">
      <label className="field">
        <span>Senha atual</span>
        <input
          type="password"
          name="currentPassword"
          autoComplete="current-password"
          required
          maxLength={72}
        />
      </label>
      <div className="form-grid">
        <label className="field">
          <span>Nova senha</span>
          <input
            type="password"
            name="newPassword"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
          />
          <small className="muted">
            Pelo menos 8 caracteres. Máximo de 72 bytes.
          </small>
        </label>
        <label className="field">
          <span>Confirmar nova senha</span>
          <input
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
          />
        </label>
      </div>
      <p className="muted">
        Após a alteração, entre novamente em seus dispositivos.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Alterar senha"}
      </Button>
    </form>
  );
}
