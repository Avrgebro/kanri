/** Supabase and fetch both throw shapes that are not always `Error`. */
export function errorMessage(err: unknown, fallback = "Something went wrong") {
  if (err instanceof Error) return err.message
  if (typeof err === "string") return err
  return fallback
}
