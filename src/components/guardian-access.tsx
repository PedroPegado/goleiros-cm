"use client";
import { useState, useTransition, useRef } from "react";
import { Copy, KeyRound, LoaderCircle, MessageCircle, X } from "lucide-react";
import {
  generateGuardianAccess,
  disableGuardianAccess,
} from "@/actions/guardian-access";
import { normalizeWhatsAppNumber } from "@/lib/rules";
import { Button } from "./ui";

export function GuardianAccess({
  studentId,
  studentName,
  phone,
  enabled,
}: {
  studentId: string;
  studentName: string;
  phone: string;
  enabled: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  function clear() {
    setCode("");
    setMessage("");
    setError("");
    setCopied(false);
  }
  let normalized = "";
  try {
    normalized = normalizeWhatsAppNumber(phone);
  } catch {
    /* Server gives actionable validation. */
  }
  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          clear();
          dialog.current?.showModal();
        }}
      >
        <KeyRound size={17} />
        Gerenciar acesso do responsável
      </Button>
      <dialog
        ref={dialog}
        className="guardian-access-dialog"
        aria-label="Acesso do responsável"
        onClose={clear}
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        <div className="section-heading">
          <h2>Acesso do responsável</h2>
          <button
            className="icon-button"
            aria-label="Fechar acesso do responsável"
            disabled={pending}
            onClick={() => dialog.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        <div className="stack">
          <p>
            <strong>{studentName}</strong>
            <br />
            <span className="muted">
              {enabled ? "Acesso ativo" : "Acesso desativado"} · {phone}
            </span>
          </p>
          <p className="muted">
            O acesso permite apenas consultar este aluno. Um novo código
            invalida o anterior e encerra as sessões anteriores.
          </p>
          <Button
            disabled={pending}
            onClick={() =>
              start(async () => {
                clear();
                try {
                  const result = await generateGuardianAccess(studentId);
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setCode(result.code);
                  setMessage(
                    `Olá! Agora você pode acompanhar o desenvolvimento de ${studentName} através do nosso portal.\n\nAcesse: ${window.location.origin}/responsavel/entrar\n\nTelefone: ${normalized.slice(2)}\n\nCódigo de acesso: ${result.code}`,
                  );
                } catch {
                  setError("Não foi possível gerar o acesso. Tente novamente.");
                }
              })
            }
          >
            {pending && <LoaderCircle size={16} className="spin" />}
            {enabled ? "Gerar novo código" : "Ativar e gerar código"}
          </Button>
          {code && (
            <div className="guardian-feedback stack">
              <label className="field">
                <span>Código gerado</span>
                <input readOnly value={code} autoComplete="off" />
              </label>
              <p className="muted">
                Copie agora. Ao fechar, o código não poderá ser consultado
                novamente.
              </p>
              <Button
                variant="secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(code);
                    setCopied(true);
                  } catch {
                    setError("Selecione o código e copie manualmente.");
                  }
                }}
              >
                <Copy size={16} />
                {copied ? "Copiado" : "Copiar código"}
              </Button>
              <a
                className="button button-whatsapp"
                href={`https://wa.me/${normalized}?text=${encodeURIComponent(message)}`}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle size={16} />
                Compartilhar pelo WhatsApp
              </a>
            </div>
          )}
          {enabled && (
            <Button
              variant="danger"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  clear();
                  try {
                    const result = await disableGuardianAccess(studentId);
                    if (!result.ok) setError(result.error);
                  } catch {
                    setError("Não foi possível desativar o acesso.");
                  }
                })
              }
            >
              Desativar acesso
            </Button>
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
        </div>
      </dialog>
    </>
  );
}
