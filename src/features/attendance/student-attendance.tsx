import { useApi } from '@/lib/api'
import type { Student, StudentAttendance } from '@/lib/contracts'
import { className, useCatalog } from '@/features/academic/data'
import { dateTime, percentage } from '@/lib/format'
import {
  Empty,
  ErrorNotice,
  Loading,
  Notice,
  PageTitle,
  Panel,
  Status,
  Table,
} from '@/components/shared'
export function StudentAttendancePage() {
  const profile = useApi<Student>('/academic/my-profile')
  const catalog = useCatalog()
  const data = useApi<StudentAttendance>(
    `/attendance/students/${profile.data?.student_id}`,
    !!profile.data,
  )
  return (
    <>
      <PageTitle
        title="Presensi saya"
        description="Catatan kehadiran per sesi perkuliahan yang telah selesai."
      />
      <ErrorNotice error={profile.error || data.error || catalog.error} />
      <Notice>
        Persentase dihitung dari sesi yang sudah selesai. Hadir dan terlambat dihitung sebagai
        kehadiran; sesi dengan izin tidak masuk pembagi. Jika ada catatan yang tidak sesuai, hubungi
        dosen pengampu.
      </Notice>
      <Panel
        className="student-attendance"
        title="Ringkasan per kelas"
        description="Batas minimum mengikuti kebijakan semester."
      >
        <div className="mobile-attendance" role="region" aria-label="Ringkasan kehadiran mobile">
          {data.data?.summaries.map((s) => (
            <article key={s.class_id} className="mobile-attendance-item">
              <h3>{className(catalog.data, s.class_id)}</h3>
              <div className="flex justify-between items-center mt-4 gap-4">
                <strong
                  className={s.below_minimum ? 'text-amber-800 text-xl' : 'text-teal-800 text-xl'}
                >
                  {percentage(s.percentage)}
                </strong>
                <span className="muted text-xs">
                  {s.held_sessions} sesi selesai
                  <br />
                  Minimum {s.minimum_percentage}%
                </span>
              </div>
              {s.below_minimum && (
                <p className="text-amber-800 text-xs mt-2">Kehadiran perlu perhatian.</p>
              )}
              <dl className="mobile-attendance-counts">
                {[
                  ['Hadir', s.present],
                  ['Terlambat', s.late],
                  ['Izin', s.excused],
                  ['Tidak hadir', s.absent],
                ].map(([name, count]) => (
                  <div key={name}>
                    <dt>{name}</dt>
                    <dd>{count}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
        {data.isPending ? (
          <Loading />
        ) : data.data?.summaries.length ? (
          <Table
            caption="Ringkasan presensi"
            headers={[
              'Kelas',
              'Sesi selesai',
              'Hadir',
              'Terlambat',
              'Izin',
              'Tidak hadir',
              'Kehadiran',
            ]}
          >
            {data.data.summaries.map((s) => (
              <tr key={s.class_id}>
                <td className="font-medium">{className(catalog.data, s.class_id)}</td>
                <td>{s.held_sessions}</td>
                <td>{s.present}</td>
                <td>{s.late}</td>
                <td>{s.excused}</td>
                <td>{s.absent}</td>
                <td>
                  <strong className={s.below_minimum ? 'text-amber-800' : 'text-teal-800'}>
                    {percentage(s.percentage)}
                  </strong>
                  <p className="muted text-xs mt-1">
                    Minimum {s.minimum_percentage}%{s.below_minimum ? ' · Perlu perhatian' : ''}
                  </p>
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          !data.error && (
            <Empty
              title="Belum ada sesi selesai"
              description="Persentase akan tersedia setelah perkuliahan selesai dan data dapat dihitung."
            />
          )
        )}
      </Panel>
      <Panel className="student-attendance" title="Riwayat pertemuan">
        <div className="mobile-attendance">
          {data.data?.sessions.map((r) => (
            <article key={r.session.teaching_session_id} className="mobile-attendance-item">
              <h3>{r.session.teaching_session_course_name}</h3>
              <p className="muted text-xs mt-2">{dateTime(r.session.teaching_session_start)}</p>
              <div className="mt-3">
                <Status value={r.status} />
              </div>
            </article>
          ))}
        </div>
        {data.data?.sessions.length ? (
          <Table
            caption="Riwayat pertemuan"
            headers={['Mata kuliah', 'Waktu', 'Status', 'Tercatat pada']}
          >
            {data.data.sessions.map((r) => (
              <tr key={r.session.teaching_session_id}>
                <td className="font-medium">{r.session.teaching_session_course_name}</td>
                <td>{dateTime(r.session.teaching_session_start)}</td>
                <td>
                  <Status value={r.status} />
                </td>
                <td>{dateTime(r.attendance?.session_attendance_occurred_at)}</td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty description="Riwayat akan muncul setelah ada sesi perkuliahan yang selesai." />
        )}
      </Panel>
    </>
  )
}
