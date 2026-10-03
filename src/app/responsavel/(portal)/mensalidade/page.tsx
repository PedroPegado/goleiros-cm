import { requireGuardian } from "@/lib/guardian-session";
import { guardianPayments } from "@/services/guardian";
import { GuardianPayment } from "@/components/guardian-payment";
import { PageTitle, Empty } from "@/components/ui";
export default async function GuardianFinance() {
  await requireGuardian();
  const payments = await guardianPayments();
  return (
    <div className="stack">
      <PageTitle
        title="Mensalidades"
        description="Consulte os pagamentos registrados pelo professor."
      />
      {payments.length ? (
        <div className="payment-grid">
          {payments.map((payment) => (
            <GuardianPayment key={payment.id} payment={payment} />
          ))}
        </div>
      ) : (
        <Empty
          title="Nenhuma mensalidade registrada"
          description="As mensalidades aparecerão aqui quando registradas pelo professor."
        />
      )}
      <p className="muted">
        Para esclarecer um pagamento, fale diretamente com o professor.
      </p>
    </div>
  );
}
