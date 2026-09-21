import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useApi } from '@/lib/api'
import { dateTime, labels } from '@/lib/format'
import { Button } from '@/components/ui/button'
import {
  Empty,
  ErrorNotice,
  Field,
  Loading,
  Modal,
  Notice,
  PageTitle,
  Panel,
  SelectField,
  Table,
} from '@/components/shared'

interface AuditRecord {
  audit_record_id: string
  audit_actor: string
  actor_name: string | null
  audit_action: string
  audit_resource: string
  audit_details: string
  audit_occurred_at: string
}
const actions: Record<string, string> = {
  'attendance.correct': 'Koreksi presensi',
  account_status: 'Perubahan status akun',
  krs_review: 'Peninjauan KRS',
  krs_withdrawal: 'Penarikan KRS',
  cancel_session: 'Pembatalan sesi',
  'device.assign_room': 'Penempatan perangkat',
  'biometrics.review': 'Verifikasi biometrik',
  'biometrics.revoke': 'Pencabutan biometrik',
  'biometrics.deactivate_sample': 'Penonaktifan sampel',
  'biometrics.add_sample': 'Penambahan sampel',
  'gallery.publish_document': 'Penerbitan galeri',
}
const fields: Record<string, string> = {
  reason: 'Alasan',
  note: 'Catatan',
  status: 'Status',
  previous: 'Status sebelumnya',
  decision: 'Keputusan',
  identity_verified: 'Identitas diverifikasi',
  pose: 'Arah wajah',
  enrollment_id: 'ID pendaftaran',
  classroom_id: 'ID ruangan',
  previous_classroom_id: 'ID ruangan sebelumnya',
  templates: 'Jumlah sampel',
  revision: 'Revisi',
  occurred_at: 'Waktu tercatat',
  session_attendance_status: 'Status presensi',
  session_attendance_source: 'Sumber presensi',
  session_attendance_occurred_at: 'Waktu presensi',
  attendance_event_id: 'ID observasi',
}
function Details({ value }: { value: unknown }) {
  if (!value || typeof value !== 'object')
    return <p className="muted">Tidak ada rincian tambahan.</p>
  return (
    <dl className="space-y-3">
      {Object.entries(value)
        .sort(
          ([a], [b]) =>
            (a === 'before' ? 0 : a === 'after' ? 1 : 2) -
            (b === 'before' ? 0 : b === 'after' ? 1 : 2),
        )
        .flatMap(([key, raw]) => {
          if (key === 'before' || key === 'after')
            return [
              <div key={key} className="border rounded-md p-3">
                <dt className="font-semibold mb-2">
                  {key === 'before' ? 'Sebelum perubahan' : 'Setelah perubahan'}
                </dt>
                <dd>
                  <Details value={raw} />
                </dd>
              </div>,
            ]
          // Render only known non-biometric audit fields; never echo arbitrary payloads.
          if (!fields[key] || (raw !== null && typeof raw === 'object')) return []
          const text =
            raw === null ? '—' : typeof raw === 'boolean' ? (raw ? 'Ya' : 'Tidak') : String(raw)
          return [
            <div key={key}>
              <dt className="text-xs muted">{fields[key]}</dt>
              <dd className="text-sm break-words whitespace-pre-wrap">{labels[text] ?? text}</dd>
            </div>,
          ]
        })}
    </dl>
  )
}
export function AuditPage() {
  const [filters, setFilters] = useState('')
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<AuditRecord>()
  const records = useApi<AuditRecord[]>(`/admin/audit-records?offset=${offset}&${filters}`)
  let details: unknown = null
  if (selected) {
    try {
      details = JSON.parse(selected.audit_details)
    } catch {
      /* Legacy malformed details do not prevent reading the event. */
    }
  }
  return (
    <>
      <PageTitle
        title="Riwayat audit"
        description="Telusuri keputusan dan perubahan yang dicatat server, beserta pelaku, waktu, dan alasannya."
        action={
          <Button
            variant="outline"
            disabled={records.isFetching}
            onClick={() => void records.refetch()}
          >
            <RefreshCw size={16} /> Muat ulang
          </Button>
        }
      />
      <Notice>
        Riwayat ini mencakup tindakan yang diaudit backend, bukan seluruh aktivitas pengguna. Nama
        pelaku mengikuti profil akun saat ini; ID pelaku tetap tersimpan pada catatan.
      </Notice>
      <form
        className="panel p-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          const form = new FormData(e.currentTarget)
          const params = new URLSearchParams()
          for (const name of ['action', 'actor', 'resource']) {
            const value = String(form.get(name) || '').trim()
            if (value) params.set(name, value)
          }
          for (const name of ['from', 'until']) {
            const value = String(form.get(name) || '')
            if (value) params.set(name, value + ':00+07:00')
          }
          setOffset(0)
          setFilters(params.toString())
        }}
        onReset={() => {
          setOffset(0)
          setFilters('')
        }}
      >
        <SelectField label="Jenis tindakan" name="action">
          <option value="">Semua tindakan</option>
          {Object.entries(actions).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </SelectField>
        <Field
          label="ID pelaku"
          name="actor"
          maxLength={200}
          hint="Cocok persis dengan ID pada rincian audit."
        />
        <Field label="ID objek" name="resource" maxLength={500} />
        <Field label="Sejak (WIB)" type="datetime-local" name="from" />
        <Field label="Sebelum (WIB)" type="datetime-local" name="until" />
        <div className="flex gap-2 items-end">
          <Button type="submit">Terapkan filter</Button>
          <Button type="reset" variant="outline">
            Reset
          </Button>
        </div>
      </form>
      <ErrorNotice error={records.error} />
      <Panel
        title="Catatan perubahan"
        description={
          records.data?.length
            ? `Catatan ${offset + 1}–${offset + records.data.length} · terbaru lebih dahulu`
            : 'Terbaru lebih dahulu · maksimal 100 catatan per halaman'
        }
      >
        {records.isPending ? (
          <Loading />
        ) : records.data?.length ? (
          <Table
            caption="Riwayat audit"
            headers={['Waktu (WIB)', 'Pelaku', 'Tindakan', 'Objek', '']}
          >
            {records.data.map((record) => (
              <tr key={record.audit_record_id}>
                <td>{dateTime(record.audit_occurred_at)}</td>
                <td>
                  {record.actor_name ||
                    (record.audit_actor === 'administrator'
                      ? 'Administrator sistem'
                      : record.audit_actor)}
                </td>
                <td>{actions[record.audit_action] ?? record.audit_action}</td>
                <td className="max-w-48 truncate" title={record.audit_resource}>
                  {record.audit_resource}
                </td>
                <td>
                  <Button variant="ghost" size="sm" onClick={() => setSelected(record)}>
                    Lihat rincian
                  </Button>
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          !records.error && (
            <Empty
              title="Tidak ada catatan yang sesuai"
              description="Ubah filter atau rentang waktu untuk mencari tindakan lain."
            />
          )
        )}
        <div className="p-4 flex justify-between">
          <Button
            variant="outline"
            disabled={offset === 0 || records.isFetching}
            onClick={() => setOffset(Math.max(0, offset - 100))}
          >
            Sebelumnya
          </Button>
          <Button
            variant="outline"
            disabled={records.data?.length !== 100 || records.isFetching}
            onClick={() => setOffset(offset + 100)}
          >
            Berikutnya
          </Button>
        </div>
      </Panel>
      {selected && (
        <Modal
          title={actions[selected.audit_action] ?? selected.audit_action}
          description={dateTime(selected.audit_occurred_at)}
          open
          onClose={() => setSelected(undefined)}
        >
          <dl className="space-y-3 text-sm break-words">
            <div>
              <dt className="muted">Pelaku</dt>
              <dd>
                {selected.actor_name ?? 'Akun sistem'}
                <br />
                {selected.audit_actor}
              </dd>
            </div>
            <div>
              <dt className="muted">ID objek</dt>
              <dd>{selected.audit_resource}</dd>
            </div>
            <div>
              <dt className="muted">ID catatan audit</dt>
              <dd>{selected.audit_record_id}</dd>
            </div>
          </dl>
          <div className="border-t pt-4">
            <Details value={details} />
          </div>
        </Modal>
      )}
    </>
  )
}
