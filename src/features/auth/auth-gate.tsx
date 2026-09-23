import type { ReactNode } from "react"

import { useSession } from "@/hooks/use-session"
import { SignInForm } from "@/features/auth/sign-in-form"

/**
 * Single-user app: no roles, no route-level guards. Either there is a session
 * or there is a sign-in screen. RLS enforces the real boundary server-side.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading } = useSession()

  if (loading) return <div className="min-h-svh bg-sidebar" />
  if (!session) return <SignInForm />
  return <>{children}</>
}
