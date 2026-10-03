import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "node:fs";
import {
  generateGuardianCode,
  hashGuardianCode,
  guardianPhone,
  guardianSecret,
} from "../src/lib/guardian-credentials";
import { evaluationSchema } from "../src/lib/validation";
const mocks = vi.hoisted(() => ({ requireUser: vi.fn() }));
vi.mock("../src/lib/require-user", () => ({ requireUser: mocks.requireUser }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import {
  generateGuardianAccess,
  disableGuardianAccess,
} from "../src/actions/guardian-access";
afterEach(() => vi.unstubAllEnvs());
describe("portal do responsável", () => {
  it.each([
    "(84) 99999-9999",
    "+55 84 99999-9999",
    "84999999999",
    "5584999999999",
  ])("normaliza %s", (phone) =>
    expect(guardianPhone(phone)).toBe("5584999999999"),
  );
  it("rejeita telefone inválido", () =>
    expect(guardianPhone("123")).toBeNull());
  it("gera códigos aleatórios de 192 bits e armazena somente digest com chave separada", () => {
    vi.stubEnv("AUTH_SECRET", "secret-only-for-unit-test".repeat(3));
    const codes = Array.from({ length: 100 }, generateGuardianCode);
    expect(new Set(codes).size).toBe(100);
    for (const code of codes) {
      expect(code).toMatch(/^[A-Za-z0-9_-]{32}$/);
      expect(hashGuardianCode(code)).toMatch(/^[a-f0-9]{64}$/);
      expect(hashGuardianCode(code)).not.toContain(code);
    }
    expect(guardianSecret("session")).not.toBe(guardianSecret("code"));
    expect(guardianSecret("session")).not.toBe(process.env.AUTH_SECRET);
  });
  it("falha fechada sem secret", () => {
    vi.stubEnv("AUTH_SECRET", "");
    expect(() => hashGuardianCode("test")).toThrow();
  });
  it("geração e revogação exigem professor antes de consultar dados", async () => {
    mocks.requireUser.mockRejectedValue(new Error("UNAUTHENTICATED"));
    await expect(generateGuardianAccess("any")).rejects.toThrow(
      "UNAUTHENTICATED",
    );
    await expect(disableGuardianAccess("any")).rejects.toThrow(
      "UNAUTHENTICATED",
    );
  });
  it("feedback vazio mantém avaliações antigas válidas e não copia observações internas", () => {
    const result = evaluationSchema.parse({
      studentId: "a",
      date: "2026-01-01",
      notes: "Privado",
      scores: [{ criterionId: "a", value: 8 }],
    });
    expect(result.notes).toBe("Privado");
    expect(result.guardianFeedback).toBe("");
  });
  it("todas as páginas privadas do portal possuem autorização no servidor", () => {
    for (const route of ["painel", "desempenho", "evolucao", "mensalidade"])
      expect(
        fs.readFileSync(
          `src/app/responsavel/(portal)/${route}/page.tsx`,
          "utf8",
        ),
      ).toContain("await requireGuardian()");
  });
});
