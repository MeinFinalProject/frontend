import { useStudentAttendance } from './data'
import { RefreshCw } from 'lucide-react'
import { dateTime } from '@/lib/format'
import { useNow } from '@/lib/use-now'
import { Button } from '@/components/ui/button'
import { Empty, ErrorNotice, Loading, Notice, Panel, Status } from '@/components/shared'

export function CurrentAttendance() {
  const { profile, attendance } = useStudentAttendance()
  const now = useNow()
  return (
    <Panel
      title="Presensi sesi berjalan"
      description="Diperbarui setiap 30 detik selama halaman dibuka. Persentase baru menghitung sesi yang selesai."
      action={
        <Button
          variant="outline"
          size="sm"
          disabled={attendance.isFetching || !profile.data}
          onClick={() => void attendance.refetch()}
        >
          <RefreshCw size={15} /> Periksa presensi
        </Button>
      }
    >
      <div className="p-5 flex flex-col gap-4">
        <ErrorNotice error={profile.error || attendance.error} />
        {!!attendance.dataUpdatedAt && (
          <p className="text-xs muted">
            Data terakhir berhasil dimuat:{' '}
            {dateTime(new Date(attendance.dataUpdatedAt).toISOString())}.
          </p>
        )}
        {profile.isPending || (profile.data && attendance.isPending) ? (
          <Loading />
        ) : attendance.data?.ongoing_sessions.length ? (
          attendance.data.ongoing_sessions.map(({ session, status, attendance: record }) => {
            const cutoff = Math.min(
              Date.parse(session.teaching_session_end),
              Date.parse(session.teaching_session_start) +
                session.teaching_session_checkin_minutes * 60_000,
            )
            return (
              <article
                key={session.teaching_session_id}
                className="flex flex-col items-start gap-2 border-b last:border-0 pb-4 last:pb-0"
              >
                <h3 className="font-medium">{session.teaching_session_course_name}</h3>
                <p className="text-xs muted">
                  {dateTime(session.teaching_session_start)} —{' '}
                  {dateTime(session.teaching_session_end)}
                </p>
                {status === 'pending' ? (
                  <Notice>
                    {now < cutoff
                      ? 'Kehadiran belum tercatat di server. Setelah melewati perangkat, periksa kembali; perangkat yang offline mungkin belum mengirimkan data.'
                      : 'Jendela pencatatan sudah berakhir dan kehadiran belum tercatat. Hubungi dosen jika Anda sudah hadir.'}
                  </Notice>
                ) : (
                  <>
                    <Status value={status} />
                    <p className="text-sm muted">
                      Status sudah tercatat di server.
                      {record?.session_attendance_occurred_at
                        ? ` Waktu presensi: ${dateTime(record.session_attendance_occurred_at)}.`
                        : ''}
                      {record?.session_attendance_source === 'manual'
                        ? ' Dicatat melalui koreksi dosen atau administrator.'
                        : ''}
                    </p>
                  </>
                )}
              </article>
            )
          })
        ) : (
          !profile.error &&
          !attendance.error && (
            <Empty
              title="Tidak ada jendela presensi berjalan"
              description="Sesi akan muncul saat jendela presensi kelas Anda dibuka. Lihat Perkuliahan untuk jadwal berikutnya."
            />
          )
        )}
      </div>
    </Panel>
  )
}
