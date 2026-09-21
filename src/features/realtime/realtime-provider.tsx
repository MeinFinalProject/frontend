import { useEffect, type ReactNode } from 'react'
import { HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr'
import { useAuth } from '@/features/auth/auth-context'
import { api, queryClient, readSession } from '@/lib/api'

// Messages invalidate authorized HTTP reads; the hub never supplies product records.
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { account, session } = useAuth()
  const accountId = account?.account_id
  const token = session?.access_token
  useEffect(() => {
    if (!accountId || !token) return
    let disposed = false
    let retry: ReturnType<typeof setTimeout> | undefined
    let debounce: ReturnType<typeof setTimeout> | undefined
    let academic = false
    let devices = false
    const refresh = (topic: string) => {
      if (disposed) return
      academic ||= topic === 'academic'
      devices ||= topic === 'devices'
      if (debounce) return
      debounce = setTimeout(() => {
        debounce = undefined
        if (disposed) return
        const all = academic
        const device = devices
        academic = devices = false
        void queryClient.invalidateQueries({
          predicate: (q) =>
            all ||
            (device &&
              typeof q.queryKey[0] === 'string' &&
              q.queryKey[0].startsWith('/admin/devices')),
        })
      }, 500)
    }
    const connection = new HubConnectionBuilder()
      .withUrl('/api/v1/live', {
        accessTokenFactory: () => readSession()?.access_token ?? '',
        withCredentials: false,
      })
      .configureLogging(LogLevel.None)
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: ({ previousRetryCount }) =>
          Math.min(30_000, 1_000 * 2 ** Math.min(previousRetryCount, 5)) + Math.random() * 1_000,
      })
      .build()
    connection.on('invalidate', (message: unknown) => {
      if (
        message &&
        typeof message === 'object' &&
        'topic' in message &&
        (message.topic === 'academic' || message.topic === 'devices')
      )
        refresh(message.topic)
    })
    const checkSession = () => {
      if (!disposed)
        void api('/auth/me').catch(() => {
          /* HTTP handles revoked sessions. */
        })
    }
    connection.onreconnecting(checkSession)
    connection.onreconnected(() => refresh('academic'))
    const start = async () => {
      if (disposed || connection.state !== HubConnectionState.Disconnected) return
      clearTimeout(retry)
      try {
        await connection.start()
        if (disposed) {
          await connection.stop()
          return
        }
        refresh('academic') // Reconcile everything missed during disconnection.
      } catch {
        if (!disposed) {
          checkSession()
          retry = setTimeout(
            () => {
              void start()
            },
            5_000 + Math.random() * 1_000,
          )
        }
      }
    }
    connection.onclose(() => {
      if (!disposed) {
        checkSession()
        retry = setTimeout(() => {
          void start()
        }, 5_000)
      }
    })
    void start()
    const fallback = setInterval(() => {
      if (
        connection.state !== HubConnectionState.Connected &&
        document.visibilityState === 'visible'
      )
        refresh('academic')
    }, 30_000)
    return () => {
      disposed = true
      clearTimeout(retry)
      clearTimeout(debounce)
      clearInterval(fallback)
      void connection.stop()
    }
  }, [accountId, token])
  return children
}
