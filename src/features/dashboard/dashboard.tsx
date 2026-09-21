import { paths } from '@/config/paths'
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Fingerprint,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/auth-context'
import { className, roomName, useCatalog } from '@/features/academic/data'
import { allPages, useApi } from '@/lib/api'
import type { Account, Class, Enrollment, Registration, Session } from '@/lib/contracts'
import { dateTime, todayWib } from '@/lib/format'
import { StudentOverview } from './student-overview'
import {
  Empty,
  ErrorNotice,
  LimitNotice,
  Loading,
  PageLink,
  PageTitle,
  Panel,
  Status,
  Table,
} from '@/components/shared'
export function Dashboard() {
  const { account } = useAuth()
  const role = account!.account_role
  const catalog = useCatalog()
  const today = todayWib()
  const sessions = useApi<Session[]>(
    `/teaching/sessions?from=${encodeURIComponent(today + 'T00:00:00+07:00')}&until=${encodeURIComponent(today + 'T23:59:59+07:00')}`,
  )
  const classes = useApi<Class[]>('/academic/my-classes')
  return (
    <>
      <PageTitle
        eyebrow={new Intl.DateTimeFormat('id-ID', {
          dateStyle: 'full',
          timeZone: 'Asia/Jakarta',
        }).format(new Date())}
        title={
          role === 'administrator'
            ? 'Operasional akademik'
            : role === 'lecturer'
              ? `Selamat datang, ${account!.account_name}`
              : `Halo, ${account!.account_name}`
        }
        description={
          role === 'administrator'
            ? 'Pantau antrean persetujuan dan pastikan perkuliahan berjalan lancar.'
            : role === 'lecturer'
              ? 'Kelola pertemuan, periksa presensi, dan dampingi rencana studi mahasiswa.'
              : 'Lihat jadwal, siapkan rencana studi, dan ikuti catatan kehadiran Anda.'
        }
      />
      {role === 'administrator' ? (
        <AdminOverview />
      ) : (
        <div className="quick-links">
          <Link to={paths.sessions}>
            <CalendarDays />
            <div>
              <h2>{role === 'lecturer' ? 'Kelas yang Anda ajar' : 'Kelas yang Anda ikuti'}</h2>
              <p>
                {classes.data
                  ? `${classes.data.length} kelas dalam penugasan aktif`
                  : 'Lihat daftar perkuliahan'}
              </p>
            </div>
            <ArrowUpRight />
          </Link>
          <Link to={role === 'student' ? paths.myAttendance : paths.registrations}>
            <ClipboardCheck />
            <div>
              <h2>{role === 'student' ? 'Catatan kehadiran' : 'Persetujuan KRS'}</h2>
              <p>
                {role === 'student'
                  ? 'Status per sesi dan persentase kehadiran'
                  : 'Tinjau rencana studi mahasiswa bimbingan'}
              </p>
            </div>
            <ArrowUpRight />
          </Link>
        </div>
      )}
      <ErrorNotice error={catalog.error || classes.error} />
      {role === 'student' && <StudentOverview />}
      <Panel
        title="Perkuliahan hari ini"
        description="Sesi aktual yang dijadwalkan untuk hari ini."
        action={<PageLink to={paths.sessions}>Semua perkuliahan</PageLink>}
      >
        <ErrorNotice error={sessions.error} />
        {sessions.isPending ? (
          <Loading />
        ) : sessions.data?.length ? (
          <>
            <Table
              caption="Jadwal hari ini"
              headers={['Mata kuliah / kelas', 'Waktu mulai', 'Ruangan', 'Status', '']}
            >
              {sessions.data.map((s) => (
                <tr key={s.teaching_session_id}>
                  <td className="font-medium">{className(catalog.data, s.academic_class_id)}</td>
                  <td>{dateTime(s.teaching_session_start)}</td>
                  <td>{roomName(catalog.data, s.classroom_id)}</td>
                  <td>
                    <Status value={s.teaching_session_status} />
                  </td>
                  <td>
                    {role !== 'student' && (
                      <PageLink to={paths.session(s.teaching_session_id)}>Buka sesi</PageLink>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
            <LimitNotice count={sessions.data.length} limit={500} />
          </>
        ) : (
          !sessions.error && (
            <Empty
              title="Tidak ada perkuliahan hari ini"
              description="Jadwal berikutnya dapat dilihat di halaman Perkuliahan."
            />
          )
        )}
      </Panel>
    </>
  )
}
function AdminOverview() {
  const accounts = useQuery({
    queryKey: ['all-accounts'],
    queryFn: ({ signal }) => allPages<Account>('/admin/accounts', signal),
  })
  const registrations = useApi<Registration[]>('/course-registrations')
  const enrollments = useApi<Enrollment[]>('/biometric-enrollments')
  const rows = [
    {
      label: 'Akun menunggu',
      count: accounts.data?.filter((a) => a.account_status === 'pending').length,
      to: paths.accounts,
      icon: Users,
      note: 'Dari seluruh akun terdaftar',
    },
    {
      label: 'KRS diajukan',
      count: registrations.data?.filter((r) => r.course_registration_status === 'submitted').length,
      to: paths.registrations,
      icon: BookOpen,
      note: 'Dari 200 KRS terbaru',
    },
    {
      label: 'Wajah perlu verifikasi',
      count: enrollments.data?.filter((e) => e.biometric_enrollment_status === 'submitted').length,
      to: paths.enrollments,
      icon: Fingerprint,
      note: 'Dari 100 pendaftaran terbaru',
    },
  ]
  return (
    <>
      <ErrorNotice error={accounts.error || registrations.error || enrollments.error} />
      <div className="metric-grid">
        {rows.map(({ label, count, to, icon: Icon, note }) => (
          <Link to={to} key={to} className="metric">
            <div className="flex justify-between items-center">
              <span>{label}</span>
              <Icon size={19} />
            </div>
            <strong>{count ?? '—'}</strong>
            <div className="flex justify-between items-center">
              <small>{note}</small>
              <ArrowUpRight size={17} />
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}
