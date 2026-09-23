import { useState, type FormEvent } from "react"

import lockup from "@/assets/brand/kanri-lockup-stacked.svg"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function SignInForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    // On success the session listener swaps this screen out; no navigation here.
    setBusy(false)
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 bg-sidebar p-6">
      <h1>
        <img src={lockup} alt="kanri" className="h-24 w-auto" />
      </h1>
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-sm"
      >
        <p className="mb-6 text-sm text-muted-foreground">Sign in to continue.</p>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </div>
      </form>
    </div>
  )
}
