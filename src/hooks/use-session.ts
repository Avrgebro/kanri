import { useEffect, useState } from "react"
import type { Session } from "@supabase/supabase-js"

import { supabase } from "@/lib/supabase"

export interface SessionState {
  session: Session | null
  loading: boolean
}

/**
 * `loading` matters: on a refresh the session is restored asynchronously, so
 * rendering the login screen before it resolves would flash for every reload.
 */
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ session: null, loading: true })

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (active) setState({ session: data.session, loading: false })
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setState({ session, loading: false })
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return state
}
