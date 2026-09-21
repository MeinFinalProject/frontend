import { paths } from '@/config/paths'
import { useState } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Empty,
  ErrorNotice,
  Field,
  LimitNotice,
  Loading,
  PageLink,
  PageTitle,
  Panel,
  SelectField,
  Status,
  Table,
} from '@/components/shared'
import { useApi } from '@/lib/api'
import type { Class, Session } from '@/lib/contracts'
import { dateTime, todayWib } from '@/lib/format'
import { className, roomName, useCatalog } from '@/features/academic/data'
import { useAuth } from '@/features/auth/auth-context'
import { SessionEditor } from './session-editor'
export function SessionsPage() {
  const { account } = useAuth()
  const staff = account!.account_role !== 'student'
  const catalog = useCatalog()
  const classes = useApi<Class[]>('/academic/my-classes')
  const [classId, setClassId] = useState('')
  const [from, setFrom] = useState(todayWib().slice(0, 7) + '-01')
  const [until, setUntil] = useState('')
  const [create, setCreate] = useState(false)
  const params = new URLSearchParams()
  if (classId) params.set('classId', classId)
  if (from) params.set('from', from + 'T00:00:00+07:00')
  if (until) params.set('until', until + 'T23:59:59+07:00')
  const sessions = useApi<Session[]>(`/teaching/sessions?${params}`)
  return (
    <>
      <PageTitle
        title="Perkuliahan"
        description={
          staff
            ? 'Atur sesi aktual, buka daftar mahasiswa, dan kelola kehadiran per pertemuan.'
            : 'Jadwal sesi perkuliahan untuk kelas yang Anda ikuti.'
        }
        action={
          staff && (
            <Button
              disabled={!catalog.data || !classes.data?.length}
              onClick={() => setCreate(true)}
            >
              <Plus size={17} />
              Jadwalkan sesi
            </Button>
          )
        }
      />
      <ErrorNotice error={catalog.error || classes.error} />
      <Panel>
        <div className="filter-bar">
          <SelectField label="Kelas" value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Semua kelas saya</option>
            {classes.data?.map((c) => (
              <option key={c.academic_class_id} value={c.academic_class_id}>
                {className(catalog.data, c.academic_class_id)}
              </option>
            ))}
          </SelectField>
          <Field
            label="Mulai tanggal"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <Field
            label="Sampai tanggal"
            type="date"
            min={from}
            value={until}
            onChange={(e) => setUntil(e.target.value)}
          />
          <Button
            variant="outline"
            onClick={() => void sessions.refetch()}
            disabled={sessions.isFetching}
          >
            <RefreshCw size={16} />
            Muat ulang
          </Button>
        </div>
        <ErrorNotice error={sessions.error} />
        {sessions.isPending ? (
          <Loading />
        ) : sessions.data?.length ? (
          <>
            <Table
              caption="Sesi perkuliahan"
              headers={[
                'Mata kuliah / kelas',
                'Waktu perkuliahan',
                'Ruangan',
                'Status',
                ...(staff ? [''] : []),
              ]}
            >
              {sessions.data.map((s) => (
                <tr key={s.teaching_session_id}>
                  <td className="font-medium">{className(catalog.data, s.academic_class_id)}</td>
                  <td>
                    <p>{dateTime(s.teaching_session_start)}</p>
                    <p className="muted text-xs mt-1">Selesai {dateTime(s.teaching_session_end)}</p>
                  </td>
                  <td>{roomName(catalog.data, s.classroom_id)}</td>
                  <td>
                    <Status value={s.teaching_session_status} />
                  </td>
                  {staff && (
                    <td>
                      <PageLink to={paths.session(s.teaching_session_id)}>Buka sesi</PageLink>
                    </td>
                  )}
                </tr>
              ))}
            </Table>
            <LimitNotice count={sessions.data.length} limit={500} />
          </>
        ) : (
          !sessions.error && (
            <Empty
              title="Tidak ada sesi pada pilihan ini"
              description={
                staff
                  ? 'Jadwalkan sesi baru atau sesuaikan rentang tanggal.'
                  : 'Coba rentang tanggal lain. Jadwal tersedia setelah KRS disetujui dan dosen membuat sesi.'
              }
            />
          )
        )}
      </Panel>
      {staff && classId && (
        <div className="mt-5">
          <PageLink to={paths.classAttendance(classId)}>Lihat rekap kehadiran kelas</PageLink>
        </div>
      )}
      {create && catalog.data && (
        <SessionEditor
          catalog={catalog.data}
          classes={classes.data || []}
          initialClass={classId}
          close={() => setCreate(false)}
        />
      )}
    </>
  )
}
