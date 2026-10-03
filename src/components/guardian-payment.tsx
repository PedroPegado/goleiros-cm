import { Badge } from "./ui";
import {
  formatCurrency,
  formatDate,
  getPaymentStatus,
  monthLabel,
} from "@/lib/rules";
export function GuardianPayment({
  payment,
}: {
  payment: {
    referenceYear: number;
    referenceMonth: number;
    amount: { toString(): string };
    status: string;
    dueDate: Date;
    paidAt: Date | null;
  };
}) {
  const status = getPaymentStatus(payment);
  return (
    <article className="card finance-card">
      <span className="eyebrow">
        Mensalidade de{" "}
        {monthLabel(payment.referenceYear, payment.referenceMonth)}
      </span>
      <div className="section-heading">
        <h2 className="money-value">{formatCurrency(payment.amount)}</h2>
        <Badge status={status === "DUE_SOON" ? "PENDING" : status} />
      </div>
      <p className="muted">Vencimento: {formatDate(payment.dueDate)}</p>
      {payment.paidAt && (
        <p className="text-success">
          Pagamento registrado em: {formatDate(payment.paidAt)}
        </p>
      )}
    </article>
  );
}
