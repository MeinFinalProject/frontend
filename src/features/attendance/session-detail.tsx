import { paths } from '@/config/paths'
import { useState } from 'react'
import { useNow } from '@/lib/use-now'
import { Link, useParams } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Empty,
  ErrorNotice,
  Field,
  Loading,
  Modal,
  Notice,
  PageLink,
  PageTitle,
  Panel,
  SelectField,
  Status,
  Submit,
  Table,
} from '@/components/shared'
import { api, ApiError, useAction, useApi } from '@/lib/api'
import type { Roster, RosterRow, Summary } from '@/lib/contracts'
import { dateTime, labels, percentage } from '@/lib/format'
import { className, roomName, useCatalog } from '@/features/academic/data'
import { SessionEditor } from '@/features/sessions/session-editor'
export function SessionDetailPage() {
  const now = useNow()
  const { id } = useParams()
  const data = useApi<Roster>(`/attendance/sessions/${id}`)
  const catalog = useCatalog()
  const [correct, setCorrect] = useState<RosterRow>()
  const [edit, setEdit] = useState(false)
  const [cancel, setCancel] = useState(false)
  const close = useAction(() => api(`/teaching/sessions/${id}/close`, { method: 'POST', body: {} }))
  const s = data.data?.session
  const future =
    s && Date.parse(s.teaching_session_start) - s.teaching_session_early_minutes * 60000 > now
  const cancelled = s?.teaching_session_status === 'cancelled'
  return (
    <>
      <PageLink to={paths.sessions}>Kembali ke perkuliahan</PageLink>
      <PageTitle
        title={s ? className(catalog.data, s.academic_class_id) : 'Detail sesi'}
        description={
          s
            ? `${dateTime(s.teaching_session_start)} — ${dateTime(s.teaching_session_end)}`
            : 'Memuat informasi sesi…'
        }
        action={
          <Button variant="outline" onClick={() => void data.refetch()} disabled={data.isFetching}>
            <RefreshCw size={16} />
            Muat ulang presensi
          </Button>
        }
      />
      <ErrorNotice error={data.error || catalog.error || close.error} />
      {data.isPending ? (
        <Loading />
      ) : (
        s && (
          <>
            <div className="session-strip">
              <div>
                <p className="eyebrow">RUANGAN</p>
                <p className="font-medium mt-1">{roomName(catalog.data, s.classroom_id)}</p>
              </div>
              <div>
                <p className="eyebrow">STATUS SESI</p>
                <div className="mt-2">
                  <Status value={s.teaching_session_status} />
                </div>
              </div>
              <div className="ml-auto flex flex-wrap gap-2">
                {future && !cancelled && (
                  <>
                    <Button variant="outline" onClick={() => setEdit(true)}>
                      Ubah sesi
                    </Button>
                    <Button variant="outline" onClick={() => setCancel(true)}>
                      Batalkan sesi
                    </Button>
                  </>
                )}
                {!cancelled &&
                  s.teaching_session_status !== 'closed' &&
                  Date.parse(s.teaching_session_end) <= now && (
                    <Button onClick={() => close.mutate()} disabled={close.isPending}>
                      Tutup sesi
                    </Button>
                  )}
                <Button variant="outline" asChild>
                  <Link to={paths.classAttendance(s.academic_class_id)}>Rekap kelas</Link>
                </Button>
              </div>
            </div>
            {cancelled ? (
              <Notice>Sesi dibatalkan dan tidak dihitung dalam persentase kehadiran.</Notice>
            ) : (
              <>
                <Notice>
                  Catatan di bawah berasal dari server. Koreksi membutuhkan alasan dan akan disimpan
                  dalam riwayat audit. Muat ulang untuk melihat hasil sinkronisasi perangkat
                  terbaru.
                </Notice>
                <Panel
                  title="Daftar presensi"
                  description={`${data.data!.students.length} mahasiswa dalam daftar sesi`}
                >
                  {data.data!.students.length ? (
                    <Table
                      caption="Daftar presensi mahasiswa"
                      headers={['Mahasiswa', 'NIM', 'Status', 'Waktu tercatat', '']}
                    >
                      {data.data!.students.map((r) => (
                        <tr key={r.student.student_id}>
                          <td className="font-medium">{r.student.account_name}</td>
                          <td>{r.student.student_number}</td>
                          <td>
                            <Status value={r.status} />
                          </td>
                          <td>{dateTime(r.attendance?.session_attendance_occurred_at)}</td>
                          <td>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={Date.parse(s.teaching_session_start) > now}
                              onClick={() => setCorrect(r)}
                            >
                              Koreksi
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </Table>
                  ) : (
                    <Empty
                      title="Belum ada mahasiswa di sesi ini"
                      description="Periksa persetujuan KRS dan waktu berlakunya keanggotaan kelas."
                    />
                  )}
                </Panel>
              </>
            )}
            {edit && catalog.data && (
              <SessionEditor
                catalog={catalog.data}
                classes={[]}
                record={s}
                close={() => setEdit(false)}
              />
            )}
          </>
        )
      )}
      {correct && (
        <Correction
          id={id!}
          row={correct}
          close={() => setCorrect(undefined)}
          refresh={() => {
            setCorrect(undefined)
            void data.refetch()
          }}
        />
      )}{' '}
      {cancel && <CancelSession id={id!} close={() => setCancel(false)} />}
    </>
  )
}
function Correction({
  id,
  row,
  close,
  refresh,
}: {
  id: string
  row: RosterRow
  close: () => void
  refresh: () => void
}) {
  const action = useAction((f: FormData) =>
    api(`/attendance/sessions/${id}/students/${row.student.student_id}`, {
      method: 'PUT',
      body: {
        status: f.get('status'),
        reason: f.get('reason'),
        revision: row.attendance?.session_attendance_revision ?? 0,
        occurred_at: null,
      },
    }),
  )
  const conflict = action.error instanceof ApiError && action.error.status === 409
  return (
    <Modal
      title="Koreksi kehadiran"
      description={`${row.student.account_name} · ${row.student.student_number}. Waktu deteksi tidak dibuat oleh koreksi manual ini.`}
      open
      onClose={close}
    >
      {action.isSuccess ? (
        <>
          <Notice tone="success">Koreksi tersimpan di server.</Notice>
          <Button onClick={close}>Selesai</Button>
        </>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            action.mutate(new FormData(e.currentTarget))
          }}
        >
          <ErrorNotice error={action.error} />
          <SelectField
            label="Status kehadiran"
            name="status"
            defaultValue={row.status === 'pending' ? 'present' : row.status}
          >
            {['present', 'late', 'excused', 'absent'].map((v) => (
              <option key={v} value={v}>
                {labels[v]}
              </option>
            ))}
          </SelectField>
          <Field
            label="Alasan koreksi"
            name="reason"
            required
            maxLength={500}
            hint="Jelaskan bukti atau alasan perubahan agar dapat ditelusuri."
          />
          {conflict ? (
            <Button type="button" onClick={refresh}>
              Tutup dan muat ulang data
            </Button>
          ) : (
            <Submit pending={action.isPending}>Simpan koreksi</Submit>
          )}
        </form>
      )}
    </Modal>
  )
}
function CancelSession({ id, close }: { id: string; close: () => void }) {
  const action = useAction(async (f: FormData) => {
    await api(`/teaching/sessions/${id}/cancel`, { method: 'POST', body: { note: f.get('note') } })
    close()
  })
  return (
    <Modal
      title="Batalkan sesi"
      description="Sesi ini tidak akan dihitung dalam kehadiran. Pembatalan hanya tersedia sebelum jendela presensi dimulai."
      open
      onClose={close}
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          action.mutate(new FormData(e.currentTarget))
        }}
      >
        <ErrorNotice error={action.error} />
        <Field label="Alasan pembatalan" name="note" required maxLength={500} />
        <Submit pending={action.isPending}>Konfirmasi pembatalan</Submit>
      </form>
    </Modal>
  )
}
export function ClassSummaryPage() {
  const { id } = useParams()
  const catalog = useCatalog()
  const data = useApi<{ student: RosterRow['student']; summary: Summary }[]>(
    `/attendance/classes/${id}/summary`,
  )
  return (
    <>
      <PageLink to={paths.sessions}>Kembali ke perkuliahan</PageLink>
      <PageTitle title="Rekap kehadiran kelas" description={className(catalog.data, id!)} />
      <ErrorNotice error={data.error || catalog.error} />
      <Panel
        title="Kehadiran per mahasiswa"
        description="Hanya sesi selesai yang dihitung. Sesi berizin dikecualikan dari pembagi."
      >
        {data.isPending ? (
          <Loading />
        ) : data.data?.length ? (
          <Table
            caption="Rekap kelas"
            headers={[
              'Mahasiswa',
              'NIM',
              'Sesi selesai',
              'Hadir / terlambat',
              'Izin',
              'Tidak hadir',
              'Kehadiran',
            ]}
          >
            {data.data.map(({ student, summary: s }) => (
              <tr key={student.student_id}>
                <td className="font-medium">{student.account_name}</td>
                <td>{student.student_number}</td>
                <td>{s.held_sessions}</td>
                <td>
                  {s.present} / {s.late}
                </td>
                <td>{s.excused}</td>
                <td>{s.absent}</td>
                <td>
                  <strong className={s.below_minimum ? 'text-amber-800' : 'text-teal-800'}>
                    {percentage(s.percentage)}
                  </strong>
                  <p className="text-xs muted mt-1">Minimum {s.minimum_percentage}%</p>
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          !data.error && <Empty />
        )}
      </Panel>
    </>
  )
}
