import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  changePasswordSchema,
  emailSchema,
  passwordSchema,
  loginSchema,
} from "../src/lib/auth-validation";
import { hash, compare } from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), create: vi.fn() }));
vi.mock("../src/lib/require-user", () => ({ requireUser: mocks.requireUser }));
vi.mock("../src/lib/db", () => ({ db: { student: { create: mocks.create } } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import * as actions from "../src/actions/index";
import { changePassword } from "../src/actions/auth";
describe("autenticação", () => {
  beforeEach(() => vi.clearAllMocks());
  it("normaliza e-mail", () =>
    expect(emailSchema.parse(" PEDRO@example.com ")).toBe("pedro@example.com"));
  it("rejeita senhas curtas e truncamento bcrypt", () => {
    expect(passwordSchema.safeParse("curta").success).toBe(false);
    expect(passwordSchema.safeParse("a".repeat(73)).success).toBe(false);
    expect(passwordSchema.safeParse("á".repeat(37)).success).toBe(false);
    expect(
      loginSchema.safeParse({
        email: "test@example.test",
        password: "á".repeat(37),
      }).success,
    ).toBe(false);
  });
  it("valida confirmação e mudança", () => {
    expect(
      changePasswordSchema.safeParse({
        currentPassword: "anterior123456",
        newPassword: "nova1234567890",
        confirmPassword: "diferente",
      }).success,
    ).toBe(false);
    expect(
      changePasswordSchema.safeParse({
        currentPassword: "anterior123456",
        newPassword: "anterior123456",
        confirmPassword: "anterior123456",
      }).success,
    ).toBe(false);
  });
  it("armazena somente hash com salt", async () => {
    const password = "SenhaDeTeste-Apenas-123";
    const a = await hash(password, 12),
      b = await hash(password, 12);
    expect(a).not.toBe(password);
    expect(a).not.toBe(b);
    expect(await compare(password, a)).toBe(true);
    expect(await compare("incorreta", a)).toBe(false);
  });
  it("bloqueia todas as ações antes de validar ou acessar o banco", async () => {
    mocks.requireUser.mockRejectedValue(new Error("UNAUTHENTICATED"));
    for (const action of Object.values({ ...actions, changePassword })) {
      await expect(
        (action as (...args: unknown[]) => Promise<unknown>)({}, false),
      ).rejects.toThrow("UNAUTHENTICATED");
    }
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("cada página privada verifica sessão explicitamente", () => {
    function walk(dir: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(p);
        else if (entry.name === "page.tsx")
          expect(fs.readFileSync(p, "utf8"), p).toMatch(
            /await requireUser\(\)/,
          );
      }
    }
    walk("src/app/(private)");
  });
});
