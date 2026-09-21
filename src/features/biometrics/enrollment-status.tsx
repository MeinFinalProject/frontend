import { enrollmentMessage } from './enrollment-guidance'
import { paths } from '@/config/paths'
import { useApi } from '@/lib/api'
import type { EnrollmentStatus } from '@/lib/contracts'
import { ErrorNotice, Loading, PageLink, Panel } from '@/components/shared'

export function EnrollmentStatusPanel() {
  const query = useApi<EnrollmentStatus>('/biometric-enrollments/my-status')
  const message = query.data ? enrollmentMessage(query.data) : null
  return (
    <Panel title="Kesiapan presensi wajah">
      <div className="p-5 space-y-3">
        <ErrorNotice error={query.error} />
        {query.isPending ? (
          <Loading />
        ) : (
          message && (
            <>
              <h3 className="font-semibold">{message.title}</h3>
              <p className="text-sm muted">{message.description}</p>
              {!!query.data?.active_sample_count && (
                <p className="text-sm">
                  {query.data.active_sample_count} sampel aktif di server, termasuk pendaftaran
                  sebelumnya bila masih berlaku.
                </p>
              )}
              <p className="text-xs muted">
                Status ini belum memastikan pembaruan sudah diterima perangkat. Persetujuan wajah
                juga bukan bukti kehadiran pada sesi.
              </p>
              <PageLink to={paths.enrollments}>Kelola pendaftaran wajah</PageLink>
            </>
          )
        )}
      </div>
    </Panel>
  )
}
