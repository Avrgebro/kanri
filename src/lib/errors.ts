/**
 * A message for the user from anything thrown or returned as an error.
 *
 * Supabase returns errors as plain `{ message, code, … }` objects rather than
 * `Error` instances, so an object with a string `message` counts too. The
 * rules a user can break (dates, names, moves) raise messages written for
 * them; this is how those reach the screen.
 */
export function errorMessage(err: unknown, fallback = "Something went wrong") {
  if (typeof err === "string") return err
  if (err && typeof err === "object" && "message" in err) {
    const { message } = err as { message: unknown }
    if (typeof message === "string" && message) return message
  }
  return fallback
}
