import Image from "next/image";
import { Slot } from "@radix-ui/react-slot";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ButtonHTMLAttributes, ReactNode } from "react";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
// shadcn/ui composition pattern: own the primitive, style locally, compose with asChild.
export function Button({
  asChild = false,
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn("button", `button-${variant}`, className)} {...props} />
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <div className="eyebrow">{eyebrow || "CENTRO DE TREINAMENTO"}</div>
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-symbol">◎</span>
      <h3>{title}</h3>
      {description && <p className="muted">{description}</p>}
      {action}
    </div>
  );
}
export function Avatar({
  name,
  photo,
  large = false,
}: {
  name: string;
  photo?: string | null;
  large?: boolean;
}) {
  return (
    <div className={cn("avatar", large && "avatar-large")}>
      {photo ? (
        <Image
          unoptimized
          src={photo}
          alt={`Foto de ${name}`}
          width={large ? 80 : 44}
          height={large ? 80 : 44}
        />
      ) : (
        name
          .split(" ")
          .filter(Boolean)
          .slice(0, 2)
          .map((n) => n[0])
          .join("")
      )}
    </div>
  );
}
const labels: Record<string, string> = {
  PAID: "Pago",
  OVERDUE: "Atrasado",
  DUE_SOON: "Próximo do vencimento",
  PENDING: "Pendente",
  UNREGISTERED: "Ainda não registrado",
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
};
export function Badge({ status }: { status: string }) {
  return (
    <span className={`badge badge-${status.toLowerCase()}`}>
      <span aria-hidden>●</span> {labels[status] || status}
    </span>
  );
}
export function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
}) {
  return (
    <div className="stat">
      <span className="muted">{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}
