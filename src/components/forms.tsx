"use client";
import Image from "next/image";

import {
  useRef,
  useState,
  useTransition,
  type ReactNode,
  type FormEvent,
} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, LoaderCircle, Plus, X } from "lucide-react";
import { Button } from "./ui";
import { today } from "@/lib/rules";
import { studentSchema } from "@/lib/validation";
import {
  saveStudent,
  saveEvaluation,
  savePayment,
  saveMeasurement,
  saveNote,
  saveCriterion,
  saveSettings,
} from "@/actions";

type Result = { ok: boolean; error?: string; id?: string };
export function ActionButton({
  action,
  children,
  confirmation,
  success = "Alteração salva.",
  variant = "secondary",
  redirectTo,
}: {
  action: () => Promise<Result>;
  children: ReactNode;
  confirmation?: string;
  success?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  redirectTo?: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant={variant}
      disabled={pending}
      onClick={() => {
        if (confirmation && !window.confirm(confirmation)) return;
        start(async () => {
          try {
            const result = await action();
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            toast.success(success);
            if (redirectTo) router.push(redirectTo);
          } catch {
            toast.error("Falha de conexão. Tente novamente.");
          }
        });
      }}
    >
      {pending ? <LoaderCircle size={17} className="spin" /> : null}
      {children}
    </Button>
  );
}
export function Modal({
  title,
  trigger,
  children,
}: {
  title: string;
  trigger: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <Button variant="secondary" onClick={() => ref.current?.showModal()}>
        <Plus size={17} />
        {trigger}
      </Button>
      <dialog
        ref={ref}
        aria-label={title}
        onClick={(e) => {
          if (e.target === ref.current) ref.current.close();
        }}
      >
        <div className="dialog-content">
          <div className="section-heading">
            <h2>{title}</h2>
            <button
              type="button"
              className="icon-button"
              aria-label="Fechar"
              onClick={() => ref.current?.close()}
            >
              <X size={20} />
            </button>
          </div>
          {children}
        </div>
      </dialog>
    </>
  );
}
function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small className="muted">{hint}</small>}
    </label>
  );
}
function Submit({
  pending,
  children,
}: {
  pending: boolean;
  children: ReactNode;
}) {
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <LoaderCircle className="spin" size={18} /> : null}
      {pending ? "Salvando..." : children}
    </Button>
  );
}

export function StudentForm({
  initial,
  id,
  defaultFee = 150,
}: {
  initial?: Partial<z.input<typeof studentSchema>>;
  id?: string;
  defaultFee?: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [photo, setPhoto] = useState(initial?.photo || "");
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<
    z.input<typeof studentSchema>,
    unknown,
    z.output<typeof studentSchema>
  >({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      name: "",
      birthDate: "",
      guardianName: "",
      guardianPhone: "",
      dueDay: 10,
      monthlyFee: defaultFee,
      joinedAt: today(),
      notes: "",
      photo: "",
      ...initial,
    },
  });
  async function upload(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Escolha uma foto JPG, PNG ou WebP.");
      return;
    }
    if (file.size > 10_000_000) {
      toast.error("Escolha uma foto de até 10 MB.");
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      const ratio = Math.min(1, 360 / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.round(bitmap.width * ratio);
      canvas.height = Math.round(bitmap.height * ratio);
      canvas
        .getContext("2d")!
        .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const data = canvas.toDataURL("image/jpeg", 0.8);
      setValue("photo", data);
      setPhoto(data);
    } catch {
      toast.error("Não foi possível abrir essa imagem.");
    }
  }
  return (
    <form
      className="card form-card"
      onSubmit={handleSubmit((data) =>
        start(async () => {
          try {
            const result = await saveStudent(data, id);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            toast.success(
              id ? "Aluno atualizado." : "Aluno cadastrado com sucesso.",
            );
            router.push(`/alunos/${result.id}`);
          } catch {
            toast.error("Falha de conexão.");
          }
        }),
      )}
    >
      <h2>Informações do atleta</h2>
      <p className="muted">
        Um bom acompanhamento começa por conhecer seu aluno.
      </p>
      <div className="photo-upload">
        {photo && (
          <Image
            unoptimized
            src={photo}
            alt="Prévia da foto"
            width={72}
            height={72}
          />
        )}
        <Field label="Foto do aluno (opcional)">
          <div className="upload-control">
            <Camera size={18} />
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => upload(e.target.files?.[0])}
            />
          </div>
        </Field>
        {photo && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setPhoto("");
              setValue("photo", "");
            }}
          >
            Remover foto
          </Button>
        )}
      </div>
      <div className="form-grid">
        <Field label="Nome completo">
          <input {...register("name")} autoComplete="name" required />
        </Field>
        <Field label="Data de nascimento">
          <input
            type="date"
            {...register("birthDate")}
            max={today()}
            required
          />
        </Field>
        {!id && (
          <>
            <Field label="Altura (cm) · opcional">
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                {...register("height")}
              />
            </Field>
            <Field label="Peso (kg) · opcional">
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                {...register("weight")}
              />
            </Field>
          </>
        )}
      </div>
      <h2>Responsável</h2>
      <div className="form-grid">
        <Field label="Nome do responsável">
          <input {...register("guardianName")} required />
        </Field>
        <Field label="WhatsApp com DDD" hint="Ex.: (84) 99999-9999">
          <input type="tel" {...register("guardianPhone")} required />
        </Field>
      </div>
      <h2>Matrícula e mensalidade</h2>
      <div className="form-grid">
        <Field label="Entrada no treinamento">
          <input type="date" {...register("joinedAt")} max={today()} required />
        </Field>
        <Field
          label="Dia de vencimento"
          hint="Nos meses curtos, usamos o último dia do mês."
        >
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={31}
            {...register("dueDay")}
            required
          />
        </Field>
        <Field label="Mensalidade (R$)">
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min={0}
            {...register("monthlyFee")}
            required
          />
        </Field>
      </div>
      <Field label="Observações gerais">
        <textarea {...register("notes")} rows={3} />
      </Field>
      {id && (
        <p className="hint">
          Mudanças na mensalidade valem para cobranças futuras. Registre novas
          medidas na visão geral do aluno.
        </p>
      )}
      {Object.entries(errors).length > 0 && (
        <div role="alert" className="form-error">
          {Object.entries(errors).map(([key, error]) => (
            <p key={key}>{error.message as string}</p>
          ))}
        </div>
      )}
      <div className="form-footer">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Submit pending={pending}>
          {id ? "Salvar alterações" : "Cadastrar aluno"}
        </Submit>
      </div>
    </form>
  );
}
type Criterion = { id: string; name: string; active: boolean };
export function EvaluationForm({
  students,
  criteria,
  initial,
  id,
}: {
  students: { id: string; name: string }[];
  criteria: Criterion[];
  initial?: {
    studentId: string;
    date: string;
    notes: string;
    scores: { criterionId: string; value: number }[];
  };
  id?: string;
}) {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      studentId: initial?.studentId || students[0]?.id || "",
      date: initial?.date || today(),
      notes: initial?.notes || "",
    },
  });
  const [scores, setScores] = useState<Record<string, string>>(
    Object.fromEntries(
      initial?.scores.map((s) => [s.criterionId, String(s.value)]) || [],
    ),
  );
  const [pending, start] = useTransition();
  const router = useRouter();
  const values = Object.values(scores)
    .filter((v) => v !== "")
    .map(Number);
  const avg = values.length
    ? values.reduce((a, b) => a + b, 0) / values.length
    : null;
  return (
    <form
      className="stack"
      onSubmit={handleSubmit((data) =>
        start(async () => {
          try {
            const result = await saveEvaluation(
              {
                ...data,
                scores: Object.entries(scores)
                  .filter(([, v]) => v !== "")
                  .map(([criterionId, value]) => ({
                    criterionId,
                    value: Number(value),
                  })),
              },
              id,
            );
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            toast.success("Avaliação registrada.");
            router.push(`/alunos/${result.id}?tab=avaliacoes`);
          } catch {
            toast.error("Falha de conexão.");
          }
        }),
      )}
    >
      <div className="card form-card">
        <div className="form-grid">
          <Field label="Aluno">
            <select {...register("studentId")} disabled={!!id} required>
              <option value="">Selecione o aluno</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Data da aula">
            <input type="date" max={today()} {...register("date")} required />
          </Field>
        </div>
      </div>
      <div className="card form-card">
        <div className="section-heading">
          <div>
            <h2>Como foi o treino?</h2>
            <p className="muted">
              Avalie só o que foi trabalhado. Deixe os demais em branco.
            </p>
          </div>
          <div className="average-pill">
            {avg === null ? "—" : avg.toFixed(1)}
            <small>MÉDIA</small>
          </div>
        </div>
        <div className="criteria-grid">
          {criteria.map((c) => (
            <div className="criterion-input" key={c.id}>
              <label htmlFor={`score-${c.id}`}>
                {c.name}
                {!c.active && " (inativo)"}
              </label>
              <div className="score-controls">
                <input
                  aria-label={`Ajustar ${c.name}`}
                  type="range"
                  min={0}
                  max={10}
                  step={0.5}
                  value={scores[c.id] || 0}
                  onChange={(e) =>
                    setScores({ ...scores, [c.id]: e.target.value })
                  }
                />
                <input
                  id={`score-${c.id}`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={10}
                  step="0.1"
                  placeholder="—"
                  value={scores[c.id] ?? ""}
                  onChange={(e) =>
                    setScores({ ...scores, [c.id]: e.target.value })
                  }
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Limpar ${c.name}`}
                  onClick={() => setScores({ ...scores, [c.id]: "" })}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
        {!criteria.length && (
          <p>Crie critérios nas configurações antes de avaliar.</p>
        )}
      </div>
      <div className="card form-card">
        <Field label="Observação da aula (opcional)">
          <textarea
            {...register("notes")}
            rows={3}
            placeholder="O que evoluiu? O que vamos trabalhar no próximo treino?"
          />
        </Field>
        <div className="form-footer">
          <span className="muted">{values.length} critérios avaliados</span>
          <Submit pending={pending}>Salvar avaliação</Submit>
        </div>
      </div>
      {values.length > 0 && (
        <div className="quick-save">
          <span>
            {values.length} critérios · média {avg?.toFixed(1)}
          </span>
          <Submit pending={pending}>Salvar treino</Submit>
        </div>
      )}
    </form>
  );
}
function SimpleForm({
  action,
  success,
  children,
  submitLabel = "Salvar",
  className = "",
}: {
  action: (data: Record<string, FormDataEntryValue>) => Promise<Result>;
  success: string;
  children: ReactNode;
  submitLabel?: string;
  className?: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setError("");
    start(async () => {
      try {
        const result = await action(data);
        if (!result.ok) {
          setError(result.error || "Não foi possível salvar.");
          toast.error(result.error);
          return;
        }
        toast.success(success);
        form.closest("dialog")?.close();
      } catch {
        setError("Falha de conexão. Tente novamente.");
      }
    });
  }
  return (
    <form onSubmit={submit} className={`simple-form ${className}`}>
      {children}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <Submit pending={pending}>{submitLabel}</Submit>
    </form>
  );
}
export function PaymentForm({
  studentId,
  amount,
  payment,
}: {
  studentId: string;
  amount: number;
  payment?: {
    id: string;
    referenceMonth: number;
    referenceYear: number;
    amount: number;
    paidAt: string | null;
    paymentMethod: string | null;
    notes: string;
  };
}) {
  return (
    <SimpleForm
      action={(d) =>
        savePayment(
          {
            ...d,
            studentId,
            ...(payment
              ? {
                  referenceMonth: payment.referenceMonth,
                  referenceYear: payment.referenceYear,
                }
              : {}),
          },
          payment?.id,
        )
      }
      success="Pagamento registrado."
      submitLabel="Confirmar pagamento"
    >
      <div className="form-grid">
        <Field label="Mês de referência">
          <select
            name="referenceMonth"
            disabled={!!payment}
            defaultValue={
              payment?.referenceMonth || Number(today().slice(5, 7))
            }
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i + 1}>
                {new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(
                  new Date(2026, i, 15),
                )}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Ano de referência">
          <input
            name="referenceYear"
            readOnly={!!payment}
            type="number"
            min={2000}
            max={2100}
            defaultValue={payment?.referenceYear || Number(today().slice(0, 4))}
            required
          />
        </Field>
        <Field label="Valor (R$)">
          <input
            name="amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min={0}
            defaultValue={payment?.amount ?? amount}
            required
          />
        </Field>
        <Field label="Data do pagamento">
          <input
            name="paidAt"
            type="date"
            defaultValue={payment?.paidAt || today()}
            max={today()}
            required
          />
        </Field>
      </div>
      <Field label="Forma de pagamento">
        <select
          name="paymentMethod"
          defaultValue={payment?.paymentMethod || ""}
        >
          <option value="">Não informado</option>
          {["PIX", "DINHEIRO", "TRANSFERENCIA", "CARTAO", "OUTRO"].map((m) => (
            <option key={m} value={m}>
              {
                {
                  PIX: "Pix",
                  DINHEIRO: "Dinheiro",
                  TRANSFERENCIA: "Transferência",
                  CARTAO: "Cartão",
                  OUTRO: "Outro",
                }[m]
              }
            </option>
          ))}
        </select>
      </Field>
      <Field label="Observação">
        <textarea name="notes" defaultValue={payment?.notes || ""} rows={2} />
      </Field>
    </SimpleForm>
  );
}
export function MeasurementForm({ studentId }: { studentId: string }) {
  return (
    <SimpleForm
      action={(d) => saveMeasurement({ ...d, studentId })}
      success="Medidas registradas."
    >
      <Field label="Data da medição">
        <input
          type="date"
          name="date"
          defaultValue={today()}
          max={today()}
          required
        />
      </Field>
      <div className="form-grid">
        <Field label="Altura (cm)">
          <input
            name="height"
            type="number"
            min={30}
            max={250}
            step="0.1"
            inputMode="decimal"
          />
        </Field>
        <Field label="Peso (kg)">
          <input
            name="weight"
            type="number"
            min={1}
            max={300}
            step="0.1"
            inputMode="decimal"
          />
        </Field>
      </div>
    </SimpleForm>
  );
}
export function NoteForm({ studentId }: { studentId: string }) {
  return (
    <SimpleForm
      action={(d) => saveNote({ ...d, studentId })}
      success="Observação adicionada."
    >
      <Field label="Data">
        <input
          type="date"
          name="date"
          defaultValue={today()}
          max={today()}
          required
        />
      </Field>
      <Field label="Observação">
        <textarea name="text" rows={4} required maxLength={5000} />
      </Field>
    </SimpleForm>
  );
}
export function SettingsForm({ days, fee }: { days: number; fee: number }) {
  return (
    <SimpleForm action={saveSettings} success="Configurações salvas.">
      <div className="form-grid">
        <Field label="Avisar quantos dias antes do vencimento?">
          <input
            type="number"
            name="dueSoonDays"
            defaultValue={days}
            min={0}
            max={30}
            required
          />
        </Field>
        <Field
          label="Mensalidade padrão (R$)"
          hint="Sugestão para novos cadastros; preserva alunos existentes."
        >
          <input
            type="number"
            name="defaultFee"
            defaultValue={fee}
            min={0}
            step="0.01"
            required
          />
        </Field>
      </div>
    </SimpleForm>
  );
}
export function CriterionForm({
  criterion,
  order = 0,
}: {
  criterion?: {
    id: string;
    name: string;
    description: string;
    active: boolean;
    order: number;
  };
  order?: number;
}) {
  return (
    <SimpleForm
      action={(d) =>
        saveCriterion({ ...d, active: d.active === "on" }, criterion?.id)
      }
      success="Critério salvo."
    >
      <Field label="Nome do critério">
        <input
          name="name"
          defaultValue={criterion?.name}
          required
          maxLength={80}
        />
      </Field>
      <Field label="Descrição">
        <textarea
          name="description"
          defaultValue={criterion?.description || ""}
          maxLength={300}
          rows={2}
        />
      </Field>
      <Field label="Ordem de exibição">
        <input
          name="order"
          type="number"
          min={0}
          max={999}
          defaultValue={criterion?.order ?? order}
          required
        />
      </Field>
      <label className="checkbox-label">
        <input
          name="active"
          type="checkbox"
          defaultChecked={criterion?.active ?? true}
        />
        Critério ativo
      </label>
    </SimpleForm>
  );
}
