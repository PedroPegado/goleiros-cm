import "server-only";
import { cache } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./auth";
export const currentUser = cache(async () => {
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32)
    return null;
  const session = await getServerSession(authOptions);
  return session?.user?.id ? session.user : null;
});
export const requireUser = cache(async () => {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
});
