import { useAuth } from './auth-context'
import { api, setSession, useAction, useApi } from '@/lib/api'
import type { Student } from '@/lib/contracts'
import { ErrorNotice, Field, Notice, PageTitle, Panel, Submit } from '@/components/shared'
export function SettingsPage() {
  const { account } = useAuth()
  const student = account!.account_role === 'student'
  const profile = useApi<Student>('/academic/my-profile', student)
  const edit = useAction(
    (body: { name: string; phone: string }) => api('/academic/my-profile', { method: 'PUT', body }),
    { profile: true },
  )
  const password = useAction(async (body: { current_password: string; new_password: string }) => {
    await api('/auth/password', { method: 'PUT', body })
    setSession(null)
  })
  return (
    <>
      <PageTitle
        title="Pengaturan akun"
        description="Kelola informasi pribadi dan keamanan akun Anda."
      />
      <div className="max-w-2xl space-y-6">
        <Panel title="Informasi akun">
          <div className="panel-padding space-y-5">
            <div>
              <p className="muted text-xs uppercase tracking-wide">Email</p>
              <p className="mt-1">{account!.account_email}</p>
            </div>
            {student ? (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  const f = new FormData(e.currentTarget)
                  edit.mutate({ name: String(f.get('name')), phone: String(f.get('phone')) })
                }}
              >
                <ErrorNotice error={edit.error || profile.error} />
                {edit.isSuccess && <Notice tone="success">Profil berhasil diperbarui.</Notice>}
                <Field
                  label="Nama lengkap"
                  name="name"
                  defaultValue={account!.account_name}
                  required
                  maxLength={200}
                />
                <Field
                  key={profile.data?.student_phone}
                  label="Nomor telepon"
                  name="phone"
                  type="tel"
                  defaultValue={profile.data?.student_phone}
                  maxLength={32}
                />
                <Submit pending={edit.isPending} />
              </form>
            ) : (
              <p className="muted">Perubahan identitas dilakukan oleh administrator akademik.</p>
            )}
          </div>
        </Panel>
        <Panel
          title="Ubah kata sandi"
          description="Setelah disimpan, semua sesi akun akan berakhir. Masuk kembali dengan kata sandi baru."
        >
          <form
            className="panel-padding space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              const f = new FormData(e.currentTarget)
              password.mutate({
                current_password: String(f.get('current')),
                new_password: String(f.get('new')),
              })
            }}
          >
            <ErrorNotice error={password.error} />
            <Field
              label="Kata sandi saat ini"
              name="current"
              type="password"
              autoComplete="current-password"
              required
            />
            <Field
              label="Kata sandi baru"
              name="new"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
              hint="12–128 karakter."
            />
            <Submit pending={password.isPending}>Simpan kata sandi</Submit>
          </form>
        </Panel>
      </div>
    </>
  )
}
