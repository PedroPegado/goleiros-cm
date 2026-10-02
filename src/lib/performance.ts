import "server-only";
// Callers supply fixed labels, never URLs, IDs, form values or query parameters.
export async function measure<T>(
  label: string,
  work: () => Promise<T>,
): Promise<T> {
  const start = performance.now();
  try {
    return await work();
  } finally {
    if (process.env.PERFORMANCE_LOGS === "1")
      console.info(
        JSON.stringify({
          event: "app.timing",
          label,
          durationMs: Math.round(performance.now() - start),
        }),
      );
  }
}
