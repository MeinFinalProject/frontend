import { dateTime } from '@/lib/format'
import type { OperationalStatus } from './data'
const reasons: Record<string, string> = {
  disabled: 'Akses dinonaktifkan',
  disconnected: 'Tidak terhubung',
  telemetry_stale: 'Laporan perangkat belum tersedia atau kedaluwarsa',
  starting: 'Perangkat sedang memulai',
  stopping: 'Perangkat sedang berhenti',
  not_reported: 'Belum mengirim laporan',
  persistence_blocked: 'Penyimpanan lokal bermasalah',
  gallery_error: 'Pemasangan galeri bermasalah',
  camera_stale: 'Frame kamera belum tersedia atau terhenti',
  delivery_rejected: 'Ada observasi yang ditolak server',
  room_unassigned: 'Belum ditempatkan di ruangan aktif',
  gallery_pending: 'Galeri terbaru belum terpasang',
  gallery_empty: 'Galeri perangkat belum berisi wajah',
}
export function OperationalBadge({ status }: { status?: OperationalStatus }) {
  return (
    <span className={`status ${status?.attendance_ready ? 'status-positive' : 'status-neutral'}`}>
      {!status
        ? 'Belum diketahui'
        : status.attendance_ready
          ? 'Siap presensi'
          : status.connected
            ? 'Perlu perhatian'
            : 'Tidak terhubung'}
    </span>
  )
}
export function OperationalDetails({ status }: { status?: OperationalStatus }) {
  if (!status) return <p className="text-sm muted">Status operasional belum tersedia.</p>
  return (
    <section className="space-y-3" aria-label="Status operasional">
      <OperationalBadge status={status} />
      <p className="text-sm">
        Koneksi: {status.connected ? 'Terhubung' : 'Tidak terhubung'} · Kesehatan:{' '}
        {status.healthy ? 'Baik' : 'Belum memenuhi syarat'}
      </p>
      {!!status.reasons.length && (
        <ul className="list-disc pl-5 text-sm space-y-1">
          {status.reasons.map((reason) => (
            <li key={reason}>{reasons[reason] || 'Status perlu diperiksa'}</li>
          ))}
        </ul>
      )}
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="muted">Laporan terakhir</dt>
          <dd>{dateTime(status.latest?.device_last_seen_at)}</dd>
        </div>
        <div>
          <dt className="muted">Antrean pengiriman</dt>
          <dd>
            {status.latest
              ? `${status.latest.device_outbox_pending_count} menunggu · ${status.latest.device_outbox_dead_count} ditolak`
              : 'Belum diketahui'}
          </dd>
        </div>
        <div>
          <dt className="muted">Galeri terpasang di perangkat</dt>
          <dd className="break-all">
            {status.latest?.device_installed_gallery_version || 'Belum dilaporkan'}
          </dd>
        </div>
        <div>
          <dt className="muted">Galeri terbaru di server</dt>
          <dd className="break-all">{status.expected_gallery_version || 'Belum diterbitkan'}</dd>
        </div>
      </dl>
      <p className="text-xs muted">
        Siap presensi menunjukkan kesiapan operasional. Keberhasilan pengenalan wajah dan kecocokan
        jadwal tetap ditentukan saat presensi diproses.
      </p>
    </section>
  )
}
