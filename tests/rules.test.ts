import { describe, expect, it } from "vitest";
import {
  calculateAge,
  calculateEvaluationAverage,
  calculateStudentEvolution,
  civil,
  dueDateFor,
  formatCurrency,
  formatDate,
  getDaysOverdue,
  getDaysUntilDue,
  getPaymentStatus,
  normalizeWhatsAppNumber,
  toDate,
  whatsappUrl,
} from "../src/lib/rules";
import {
  civilSchema,
  evaluationSchema,
  measurementSchema,
  studentSchema,
} from "../src/lib/validation";
describe("idade e datas civis", () => {
  it.each([
    ["2014-04-12", "2026-04-11", 11],
    ["2014-04-12", "2026-04-12", 12],
    ["2014-12-31", "2027-01-01", 12],
    ["2024-02-29", "2025-02-28", 0],
    ["2024-02-29", "2025-03-01", 1],
  ])("idade de %s em %s", (birth, now, expected) =>
    expect(calculateAge(birth, now)).toBe(expected),
  );
  it("preserva o dia UTC em exibição brasileira", () => {
    expect(formatDate(toDate("2026-09-10"))).toBe("10/09/2026");
    expect(civil(toDate("2026-09-10"))).toBe("2026-09-10");
  });
  it.each(["2026-02-30", "2026-13-01", "texto", "2026-2-1"])(
    "rejeita data inválida %s",
    (v) => expect(civilSchema.safeParse(v).success).toBe(false),
  );
  it("aceita data bissexta real", () =>
    expect(civilSchema.safeParse("2024-02-29").success).toBe(true));
});
describe("mensalidades", () => {
  it("normaliza dia 31 em fevereiro e ano bissexto", () => {
    expect(dueDateFor(2026, 2, 31)).toBe("2026-02-28");
    expect(dueDateFor(2028, 2, 31)).toBe("2028-02-29");
    expect(dueDateFor(2027, 1, 31)).toBe("2027-01-31");
  });
  it("calcula virada de ano", () => {
    expect(getDaysUntilDue("2027-01-01", "2026-12-31")).toBe(1);
    expect(getDaysOverdue("2026-12-31", "2027-01-01")).toBe(1);
  });
  it("calcula virada de mês", () => {
    expect(getDaysUntilDue("2026-03-01", "2026-02-28")).toBe(1);
    expect(getDaysOverdue("2026-02-28", "2026-03-02")).toBe(2);
  });
  it("não tem atraso negativo", () =>
    expect(getDaysOverdue("2027-01-10", "2027-01-01")).toBe(0));
  it.each([
    ["PAID", "2026-12-30", "PAID"],
    ["PENDING", "2026-12-31", "OVERDUE"],
    ["PENDING", "2027-01-01", "DUE_SOON"],
    ["PENDING", "2027-01-04", "DUE_SOON"],
    ["PENDING", "2027-01-05", "PENDING"],
    ["OVERDUE", "2027-01-05", "PENDING"],
  ])("status %s vencendo %s", (status, dueDate, expected) =>
    expect(getPaymentStatus({ status, dueDate }, "2027-01-01")).toBe(expected),
  );
  it("respeita janela configurada", () =>
    expect(
      getPaymentStatus(
        { status: "PENDING", dueDate: "2027-01-05" },
        "2027-01-01",
        5,
      ),
    ).toBe("DUE_SOON"));
  it("não inventa um pagamento", () =>
    expect(getPaymentStatus(null)).toBe("UNREGISTERED"));
  it("formata BRL", () => expect(formatCurrency(150)).toMatch(/R\$\s150,00/));
});
describe("notas e evolução", () => {
  it("ignora não avaliados e inclui zero", () =>
    expect(calculateEvaluationAverage([0, null, 8, undefined, 7])).toBe(5));
  it("mantém precisão", () =>
    expect(calculateEvaluationAverage([8.5, 7, 8, 6.5])).toBe(7.5));
  it("não inventa média sem notas", () =>
    expect(calculateEvaluationAverage([])).toBeNull());
  it("não inventa evolução com uma avaliação", () =>
    expect(calculateStudentEvolution([8])).toBeNull());
  it("calcula evolução", () => {
    const e = calculateStudentEvolution([6.4, 7, 8.1]);
    expect(e?.difference).toBeCloseTo(1.7);
    expect(e?.percentage).toBeCloseTo(26.5625);
  });
  it("trata zero e regressão", () => {
    expect(calculateStudentEvolution([0, 2])?.percentage).toBeNull();
    expect(calculateStudentEvolution([9, 7])?.difference).toBe(-2);
  });
  it("rejeita notas inválidas ou duplicadas", () => {
    const base = { studentId: "x", date: "2026-01-01", notes: "" };
    for (const scores of [
      [],
      [{ criterionId: "a", value: 11 }],
      [{ criterionId: "a", value: -1 }],
      [
        { criterionId: "a", value: 5 },
        { criterionId: "a", value: 6 },
      ],
    ])
      expect(evaluationSchema.safeParse({ ...base, scores }).success).toBe(
        false,
      );
  });
  it("aceita apenas um critério com zero", () =>
    expect(
      evaluationSchema.safeParse({
        studentId: "x",
        date: "2026-01-01",
        notes: "",
        scores: [{ criterionId: "a", value: 0 }],
      }).success,
    ).toBe(true));
});
describe("telefones e validação", () => {
  it.each(["(84) 99999-9999", "+55 84 99999-9999", "5584999999999"])(
    "normaliza %s",
    (phone) => expect(normalizeWhatsAppNumber(phone)).toBe("5584999999999"),
  );
  it("aceita DDD 55 sem duplicar o país indevidamente", () =>
    expect(normalizeWhatsAppNumber("(55) 99999-9999")).toBe("5555999999999"));
  it.each(["123", "00000000000", "+1 212 555 1212", "(84) 89999-9999"])(
    "rejeita %s",
    (v) => expect(() => normalizeWhatsAppNumber(v)).toThrow(),
  );
  it("codifica mensagem sem enviar", () => {
    const url = new URL(whatsappUrl("84999999999", "João & Ana", "Gabriel"));
    expect(url.pathname).toBe("/5584999999999");
    expect(url.searchParams.get("text")).toContain("João & Ana");
  });
  it("exige ao menos uma medida", () =>
    expect(
      measurementSchema.safeParse({
        studentId: "x",
        date: "2026-01-01",
        height: "",
        weight: "",
      }).success,
    ).toBe(false));
  it("não aceita foto com script", () =>
    expect(
      studentSchema.shape.photo.safeParse("data:image/svg+xml,<svg/>").success,
    ).toBe(false));
});
