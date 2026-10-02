import "server-only";
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare, hash } from "bcryptjs";
import { randomBytes } from "node:crypto";
import { db } from "./db";
import { loginSchema } from "./auth-validation";
import { allowPasswordAttempt, clearPasswordAttempts } from "./login-throttle";

if (process.env.AUTH_URL) process.env.NEXTAUTH_URL = process.env.AUTH_URL;
const lifetime = 7 * 24 * 60 * 60;
let dummyHash: Promise<string> | undefined;
export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt", maxAge: lifetime },
  jwt: { maxAge: lifetime },
  useSecureCookies: process.env.NODE_ENV === "production",
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    Credentials({
      name: "E-mail e senha",
      credentials: {
        email: { label: "Usuário ou e-mail", type: "text" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (
          !parsed.success ||
          !process.env.AUTH_SECRET ||
          process.env.AUTH_SECRET.length < 32
        )
          return null;
        const { email, password } = parsed.data;
        if (!(await allowPasswordAttempt(`login:${email}`))) return null;
        const user = await db.user.findUnique({
          where: email.includes("@") ? { email } : { username: email },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            sessionVersion: true,
          },
        });
        const valid = await compare(
          password,
          user?.passwordHash ??
            (await (dummyHash ??= hash(randomBytes(32).toString("hex"), 12))),
        );
        if (!user || !valid) return null;
        await clearPasswordAttempts(`login:${email}`);
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        return {
          sub: user.id,
          name: user.name,
          email: user.email,
          sessionVersion: user.sessionVersion,
          sessionExpiresAt: Date.now() + lifetime * 1000,
        };
      }
      if (
        !token.sub ||
        typeof token.sessionExpiresAt !== "number" ||
        Date.now() >= token.sessionExpiresAt
      )
        return {};
      const current = await db.user.findUnique({
        where: { id: token.sub },
        select: { sessionVersion: true, name: true, email: true },
      });
      if (!current || current.sessionVersion !== token.sessionVersion)
        return {};
      return { ...token, name: current.name, email: current.email };
    },
    async session({ session, token }) {
      if (!token.sub) {
        session.user = undefined;
        return session;
      }
      session.user = { id: token.sub, email: token.email, name: token.name };
      return session;
    },
    async redirect({ url, baseUrl }) {
      return url === "/login" || url === `${baseUrl}/login`
        ? `${baseUrl}/login`
        : `${baseUrl}/dashboard`;
    },
  },
  events: {
    async signOut(message) {
      if (
        "token" in message &&
        message.token?.sub &&
        typeof message.token.sessionVersion === "number"
      )
        await db.user.updateMany({
          where: {
            id: message.token.sub,
            sessionVersion: message.token.sessionVersion,
          },
          data: { sessionVersion: { increment: 1 } },
        });
    },
  },
  logger: {
    error(code) {
      console.error(`[auth] ${code}`);
    },
    warn(code) {
      console.warn(`[auth] ${code}`);
    },
    debug() {},
  },
};
