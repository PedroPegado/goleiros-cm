import "server-only";
import { PrismaClient } from "@prisma/client";
function createClient() {
  const client = new PrismaClient({ log: [{ emit: "event", level: "query" }] });
  client.$on("query", ({ duration }) => {
    if (process.env.PERFORMANCE_LOGS === "1")
      console.info(JSON.stringify({ event: "db.query", durationMs: duration }));
  });
  return client.$extends({
    query: {
      $allOperations: async ({ model, operation, args, query }) => {
        const start = performance.now();
        try {
          return await query(args);
        } finally {
          if (process.env.PERFORMANCE_LOGS === "1")
            console.info(
              JSON.stringify({
                event: "db.operation",
                model,
                operation,
                durationMs: Math.round(performance.now() - start),
              }),
            );
        }
      },
    },
  });
}
const globalDb = globalThis as unknown as {
  prisma?: ReturnType<typeof createClient>;
};
// One pool per warm process, including production. Never disconnect per request.
export const db = (globalDb.prisma ??= createClient());
