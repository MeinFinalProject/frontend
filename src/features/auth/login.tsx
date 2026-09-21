import { paths } from '@/config/paths'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { ArrowUpRight, GraduationCap, ShieldCheck } from 'lucide-react'
import { api, useAction, useApi } from '@/lib/api'
import type { Login, Program } from '@/lib/contracts'
import { ErrorNotice, Field, Notice, SelectField, Submit } from '@/components/shared'
import { useAuth } from './auth-context'
export function LoginPage({ register = false }: { register?: boolean }) {
  const auth = useAuth()
  const location = useLocation()
  const [success, setSuccess] = useState(false)
  const programs = useApi<Program[]>('/auth/registration-options', register)
  const action = useAction(async (form: FormData) => {
    if (register) {
      await api('/auth/register', {
        method: 'POST',
        anonymous: true,
        body: {
          email: form.get('email'),
          password: form.get('password'),
          name: form.get('name'),
          student_number: form.get('student_number'),
          study_program_id: form.get('program'),
          entry_year: Number(form.get('year')),
        },
      })
      setSuccess(true)
    } else {
      const result = await api<Login>('/auth/login', {
        method: 'POST',
        anonymous: true,
        body: { email: form.get('email'), password: form.get('password') },
      })
      auth.login(result)
    }
  })
  if (auth.session) {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from?.startsWith('/') && !from.startsWith('//') ? from : '/'} replace />
  }
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    action.mutate(new FormData(e.currentTarget))
  }
  return (
    <div className="auth-page">
      <aside className="auth-brand">
        <div className="brand">
          <span className="brand-icon">
            <GraduationCap />
          </span>
          <span>
            Presensi<span className="brand-sub">SISTEM KEHADIRAN AKADEMIK</span>
          </span>
        </div>
        <div className="auth-message">
          <p className="eyebrow">RUANG UNTUK BELAJAR</p>
          <h1>
            Kehadiran tercatat.
            <br />
            Belajar tetap
            <br />
            <span>jadi prioritas.</span>
          </h1>
          <p>Akses perkuliahan, kelola kehadiran, dan ikuti proses akademik dalam satu tempat.</p>
        </div>
        <div className="auth-foot">
          <ShieldCheck size={18} /> Akses sesuai peran. Data sesuai kebutuhan.
        </div>
      </aside>
      <main id="main" className="auth-main">
        <div className="auth-form">
          <div className="mb-8">
            <p className="eyebrow">PORTAL AKADEMIK</p>
            <h1>{register ? 'Daftar sebagai mahasiswa' : 'Selamat datang kembali'}</h1>
            <p className="muted mt-3">
              {register
                ? 'Akun akan ditinjau oleh administrator sebelum dapat digunakan.'
                : 'Masuk menggunakan akun akademik Anda.'}
            </p>
          </div>
          {success ? (
            <>
              <Notice tone="success">
                Pendaftaran diterima. Tunggu persetujuan administrator sebelum masuk.
              </Notice>
              <Link className="text-link mt-6" to={paths.login}>
                Kembali ke halaman masuk <ArrowUpRight size={16} />
              </Link>
            </>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <ErrorNotice error={action.error} />
              {register && (
                <>
                  <Field
                    label="Nama lengkap"
                    name="name"
                    autoComplete="name"
                    required
                    maxLength={200}
                  />
                  <div className="form-grid">
                    <Field label="NIM" name="student_number" required maxLength={100} />
                    <Field
                      label="Tahun masuk"
                      name="year"
                      type="number"
                      min={2000}
                      max={2100}
                      defaultValue={new Date().getFullYear()}
                      required
                    />
                  </div>
                  <SelectField
                    label="Program studi"
                    name="program"
                    required
                    disabled={programs.isPending}
                  >
                    <option value="">Pilih program studi</option>
                    {programs.data?.map((p) => (
                      <option key={p.study_program_id} value={p.study_program_id}>
                        {p.study_program_name}
                      </option>
                    ))}
                  </SelectField>
                  <ErrorNotice error={programs.error} />
                  {programs.data?.length === 0 && (
                    <Notice>Belum ada program studi yang menerima pendaftaran.</Notice>
                  )}
                </>
              )}
              <Field
                label="Email"
                name="email"
                type="email"
                autoComplete="username"
                required
                maxLength={254}
                placeholder="nama@kampus.ac.id"
              />
              <Field
                label="Kata sandi"
                name="password"
                type="password"
                autoComplete={register ? 'new-password' : 'current-password'}
                minLength={register ? 12 : 1}
                maxLength={128}
                required
                hint={register ? 'Gunakan 12–128 karakter.' : undefined}
              />
              <div className="auth-submit">
                <Submit pending={action.isPending}>
                  {register ? 'Kirim pendaftaran' : 'Masuk ke portal'}
                </Submit>
              </div>
              <p className="text-sm muted text-center">
                {register ? 'Sudah memiliki akun? ' : 'Mahasiswa baru? '}
                <Link
                  className="font-semibold text-primary"
                  to={register ? paths.login : paths.register}
                >
                  {register ? 'Masuk' : 'Daftar akun'}
                </Link>
              </p>
            </form>
          )}
          <p className="auth-help">
            Kesulitan mengakses akun? Hubungi administrator akademik kampus.
          </p>
        </div>
      </main>
    </div>
  )
}
