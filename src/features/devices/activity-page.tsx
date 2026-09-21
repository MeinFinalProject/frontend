import { paths } from '@/config/paths'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Empty,
  ErrorNotice,
  Loading,
  Notice,
  PageLink,
  PageTitle,
  Panel,
  Table,
} from '@/components/shared'
import { useApi } from '@/lib/api'
import { dateTime } from '@/lib/format'
interface Observation {
  observation: {
    attendance_event_id: string
    device_id: string
    attendance_occurred_at: string
    attendance_received_at: string
  }
  decision: { attendance_decision_outcome: string; teaching_session_id: string | null } | null
}
const outcomes: Record<string, { label: string; help: string }> = {
  present: { label: 'Hadir', help: 'Kehadiran diterapkan pada sesi.' },
  late: { label: 'Terlambat', help: 'Kehadiran diterapkan pada sesi.' },
  unknown_identity: {
    label: 'Identitas belum dikenali',
    help: 'Periksa persetujuan pendaftaran wajah dan pembaruan galeri Edge.',
  },
  device_room_unassigned: {
    label: 'Ruangan belum ditetapkan',
    help: 'Tetapkan ruangan perangkat sebelum sesi berikutnya.',
  },
  outside_attendance_window: {
    label: 'Di luar waktu presensi',
    help: 'Periksa waktu sesi dan jendela presensi.',
  },
  not_enrolled: {
    label: 'Tidak terdaftar pada sesi',
    help: 'Periksa persetujuan KRS dan waktu berlakunya keanggotaan kelas.',
  },
  future_timestamp: {
    label: 'Waktu perangkat tidak sesuai',
    help: 'Periksa sinkronisasi jam perangkat Edge.',
  },
  ambiguous_session: {
    label: 'Sesi belum dapat ditentukan',
    help: 'Periksa sesi yang menggunakan ruangan dan waktu yang sama.',
  },
  repeated_detection: {
    label: 'Deteksi berulang',
    help: 'Observasi tidak menambah catatan kehadiran yang sudah ada.',
  },
  manual_override_preserved: {
    label: 'Koreksi dosen dipertahankan',
    help: 'Observasi tidak menimpa keputusan manual dosen.',
  },
}
export function ActivityPage() {
  const [offset, setOffset] = useState(0)
  const data = useApi<Observation[]>(`/attendance/events?offset=${offset}`)
  return (
    <>
      <PageTitle
        title="Aktivitas presensi"
        description="Telusuri observasi dari Edge dan hasil penilaian akademiknya."
        action={
          <Button variant="outline" disabled={data.isFetching} onClick={() => void data.refetch()}>
            Muat ulang
          </Button>
        }
      />
      <Notice>
        Observasi yang diterima belum tentu menjadi kehadiran. Hasil penilaian menentukan apakah
        observasi cocok dengan mahasiswa, ruangan, keanggotaan, dan waktu sesi.
      </Notice>
      <Panel title="Observasi terbaru">
        <ErrorNotice error={data.error} />
        {data.isPending ? (
          <Loading />
        ) : data.data?.length ? (
          <Table
            caption="Aktivitas presensi"
            headers={['Perangkat', 'Waktu deteksi / diterima', 'Hasil penilaian', '']}
          >
            {data.data.map((r) => {
              const outcome = r.decision
                ? outcomes[r.decision.attendance_decision_outcome]
                : undefined
              return (
                <tr key={r.observation.attendance_event_id}>
                  <td className="font-medium">{r.observation.device_id}</td>
                  <td>
                    {dateTime(r.observation.attendance_occurred_at)}
                    <p className="muted text-xs mt-1">
                      Diterima {dateTime(r.observation.attendance_received_at)}
                    </p>
                  </td>
                  <td>
                    <p className="font-medium">{outcome?.label || 'Belum dapat ditampilkan'}</p>
                    <p className="muted text-xs mt-1 whitespace-normal max-w-sm">
                      {outcome?.help || 'Tinjau hasil penilaian melalui administrator teknis.'}
                    </p>
                  </td>
                  <td>
                    {r.decision?.teaching_session_id && (
                      <PageLink to={paths.session(r.decision.teaching_session_id)}>
                        Buka sesi
                      </PageLink>
                    )}
                  </td>
                </tr>
              )
            })}
          </Table>
        ) : (
          !data.error && (
            <Empty
              title="Belum ada observasi"
              description="Observasi muncul setelah perangkat Edge menyinkronkan hasil deteksi."
            />
          )
        )}
        <div className="pagination">
          <span>Halaman {offset / 100 + 1} · 100 observasi per halaman</span>
          <Button
            variant="outline"
            size="sm"
            disabled={offset === 0}
            onClick={() => setOffset(offset - 100)}
          >
            Sebelumnya
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!data.data || data.data.length < 100}
            onClick={() => setOffset(offset + 100)}
          >
            Berikutnya
          </Button>
        </div>
      </Panel>
    </>
  )
}
