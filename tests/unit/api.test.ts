import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, readSession, setSession } from '../../src/lib/api'
import { percentage, toWib } from '../../src/lib/format'
const session = {
  access_token: 'disposable-test-token',
  token_type: 'Bearer',
  expires_at: '2099-01-01T00:00:00Z',
  role: 'student' as const,
  account_id: 'test',
}
beforeEach(() => sessionStorage.clear())
afterEach(() => vi.unstubAllGlobals())
describe('session and API boundaries', () => {
  it('rejects expired and malformed sessions', () => {
    sessionStorage.setItem('ta.session.v1', 'not-json')
    expect(readSession()).toBeNull()
    setSession({ ...session, expires_at: '2000-01-01T00:00:00Z' })
    expect(readSession()).toBeNull()
  })
  it('clears authentication on authenticated 401', async () => {
    setSession(session)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 401 })))
    await expect(api('/auth/me')).rejects.toThrow()
    expect(readSession()).toBeNull()
  })
  it('keeps current session on permission denial', async () => {
    setSession(session)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 403 })))
    await expect(api('/admin/accounts')).rejects.toThrow('tidak memiliki akses')
    expect(readSession()).not.toBeNull()
  })
  it('lets the browser supply multipart boundary and never sends ambient cookies', async () => {
    setSession(session)
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'))
    vi.stubGlobal('fetch', fetchMock)
    const form = new FormData()
    form.append('pose', 'frontal')
    form.append('image', new Blob(['test'], { type: 'image/png' }), 'test.png')
    await api('/biometric-enrollments/test/samples/upload', { method: 'POST', body: form })
    const options = fetchMock.mock.calls[0][1] as RequestInit
    expect((options.headers as Headers).has('Content-Type')).toBe(false)
    expect(options.body).toBe(form)
    expect(options.credentials).toBe('omit')
  })
  it('does not retry uncertain mutations or return success on conflict', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: 'attendance_revision_conflict' }), { status: 409 }),
      )
    vi.stubGlobal('fetch', fetchMock)
    await expect(
      api('/attendance/sessions/test/students/test', { method: 'PUT', body: { revision: 0 } }),
    ).rejects.toThrow('Presensi telah berubah')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
  it('does not turn unavailable attendance into zero percent', () => {
    expect(percentage(null)).toBe('Belum tersedia')
    expect(percentage(0)).toBe('0%')
  })
  it('sends an explicit WIB offset independent of browser time zone', () => {
    expect(toWib('2026-09-21T09:30')).toBe('2026-09-21T09:30:00+07:00')
  })
})
