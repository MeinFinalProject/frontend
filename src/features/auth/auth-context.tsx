import { paths } from '@/config/paths'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Navigate, useLocation } from 'react-router-dom'
import { api, queryClient, readSession, setSession } from '@/lib/api'
import type { Account, Login, Role } from '@/lib/contracts'
import { ErrorNotice, Loading, Notice } from '@/components/shared'
import { Button } from '@/components/ui/button'

const AuthContext = createContext<{
  account: Account | undefined
  session: Login | null
  pending: boolean
  signedOut: boolean
  error: unknown
  login: (s: Login) => void
  logout: () => Promise<void>
  retry: () => void
} | null>(null)
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, update] = useState(readSession)
  const [signedOut, markSignedOut] = useState(false)
  useEffect(() => {
    const sync = () => {
      queryClient.clear()
      update(readSession())
    }
    window.addEventListener('ta:session', sync)
    return () => window.removeEventListener('ta:session', sync)
  }, [])
  useEffect(() => {
    if (!session) return
    const timer = setTimeout(
      () => setSession(null),
      Math.max(0, Date.parse(session.expires_at) - Date.now()),
    )
    return () => clearTimeout(timer)
  }, [session])
  const me = useQuery({
    queryKey: ['me', session?.account_id],
    queryFn: ({ signal }) => api<Account>('/auth/me', { signal }),
    enabled: !!session,
    staleTime: 60_000,
  })
  const logout = async () => {
    await api('/auth/logout', { method: 'POST' })
    markSignedOut(true)
    setSession(null)
  }
  return (
    <AuthContext.Provider
      value={{
        account: session ? me.data : undefined,
        session,
        pending: !!session && me.isPending,
        signedOut,
        error: me.error,
        login: (session) => {
          markSignedOut(false)
          setSession(session)
        },
        logout,
        retry: () => {
          void me.refetch()
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
// A context and its hook intentionally share this feature boundary.
// eslint-disable-next-line react/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('AuthProvider is required')
  return context
}
export function RequireAuth({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const auth = useAuth()
  const location = useLocation()
  if (!auth.session)
    return (
      <Navigate
        to={paths.login}
        state={auth.signedOut ? null : { from: location.pathname }}
        replace
      />
    )
  if (auth.pending) return <Loading />
  if (auth.error)
    return (
      <div className="max-w-lg mx-auto p-6 space-y-4">
        <ErrorNotice error={auth.error} />
        <Button onClick={auth.retry}>Coba lagi</Button>
        <Button variant="outline" onClick={() => setSession(null)}>
          Kembali ke halaman masuk
        </Button>
      </div>
    )
  if (!auth.account || (roles && !roles.includes(auth.account.account_role)))
    return <Notice>Halaman ini tidak tersedia untuk peran Anda.</Notice>
  return children
}
