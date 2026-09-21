import { paths } from '@/config/paths'
import { useCatalog } from '@/features/academic/data'
import { EnrollmentStatusPanel } from '@/features/biometrics/enrollment-status'
import { CurrentAttendance } from '@/features/attendance/current-attendance'
import { useApi } from '@/lib/api'
import type { Registration, Student } from '@/lib/contracts'
import { todayWib } from '@/lib/format'
import { ErrorNotice, Loading, PageLink, Panel, Status } from '@/components/shared'

export function StudentOverview() {
  const catalog = useCatalog()
  const registrations = useApi<Registration[]>('/course-registrations')
  const profile = useApi<Student>('/academic/my-profile')
  const today = todayWib()
  const terms =
    catalog.data?.terms.filter(
      (t) =>
        t.academic_term_active && t.academic_term_start <= today && t.academic_term_end >= today,
    ) ?? []
  const ready = catalog.data && registrations.data && profile.data
  return (
    <>
      <div className="grid lg:grid-cols-2 gap-5">
        <Panel title="Rencana studi semester berjalan">
          <div className="p-5 space-y-3">
            <ErrorNotice error={catalog.error || registrations.error || profile.error} />
            {!ready && (catalog.isPending || registrations.isPending || profile.isPending) && (
              <Loading />
            )}
            {ready && (
              <>
                {!terms.length && (
                  <p className="text-sm muted">
                    Belum ada semester aktif untuk hari ini. Hubungi administrator jika semester
                    seharusnya sudah dimulai.
                  </p>
                )}
                {!profile.data.advisor_lecturer_id && (
                  <p className="text-sm text-amber-800">
                    Dosen pembimbing belum ditetapkan. Hubungi administrator agar KRS dapat
                    ditinjau.
                  </p>
                )}
                {terms.map((term) => {
                  const registration = registrations.data.find(
                    (r) => r.academic_term_id === term.academic_term_id,
                  )
                  const status = registration?.course_registration_status
                  const advice =
                    status === 'approved'
                      ? 'KRS disetujui. Lihat jadwal sesi kelas yang Anda ikuti.'
                      : status === 'submitted'
                        ? 'Menunggu keputusan pembimbing. Kelas belum aktif sampai KRS disetujui.'
                        : status === 'corrections'
                          ? 'Perbaiki pilihan kelas sesuai catatan pembimbing, lalu ajukan kembali.'
                          : status === 'withdrawn'
                            ? 'KRS ditarik. Periksa rencana studi bersama pembimbing.'
                            : status === 'rejected'
                              ? 'KRS ditolak. Baca alasan keputusan dan hubungi pembimbing.'
                              : 'Susun pilihan kelas dan ajukan KRS untuk persetujuan.'
                  return (
                    <div key={term.academic_term_id} className="space-y-2">
                      <h3 className="font-medium">{term.academic_term_name}</h3>
                      {status && <Status value={status} />}
                      <p className="text-sm muted">{advice}</p>
                      {registration?.course_registration_review_note && (
                        <p className="text-sm">
                          Catatan: {registration.course_registration_review_note}
                        </p>
                      )}
                    </div>
                  )
                })}
                <PageLink to={paths.registrations}>Buka rencana studi</PageLink>
              </>
            )}
          </div>
        </Panel>
        <EnrollmentStatusPanel />
      </div>
      <CurrentAttendance />
    </>
  )
}
