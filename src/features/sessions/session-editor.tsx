import { ErrorNotice, Field, Modal, SelectField, Submit } from '@/components/shared'
import { api, useAction } from '@/lib/api'
import type { Class, Session } from '@/lib/contracts'
import { localWib, toWib } from '@/lib/format'
import { className, type Catalog } from '@/features/academic/data'
export function SessionEditor({
  catalog,
  classes,
  initialClass,
  record,
  close,
}: {
  catalog: Catalog
  classes: Class[]
  initialClass?: string
  record?: Session & { replaces_teaching_session_id?: string | null }
  close: () => void
}) {
  const action = useAction(async (f: FormData) => {
    await api(
      record
        ? `/teaching/sessions/${record.teaching_session_id}`
        : `/teaching/classes/${f.get('class')}/sessions`,
      {
        method: record ? 'PUT' : 'POST',
        body: {
          classroom_id: f.get('room'),
          start: toWib(String(f.get('start'))),
          end: toWib(String(f.get('end'))),
          early_minutes: Number(f.get('early')),
          late_minutes: Number(f.get('late')),
          checkin_minutes: Number(f.get('checkin')),
          revision: record?.teaching_session_revision ?? null,
          replaces_session_id: record?.replaces_teaching_session_id ?? null,
        },
      },
    )
    close()
  })
  return (
    <Modal
      title={record ? 'Ubah sesi perkuliahan' : 'Jadwalkan sesi perkuliahan'}
      description="Semua waktu dalam WIB. Jadwalkan sebelum jendela presensi dibuka; dosen, kelas, dan ruangan tidak boleh bertabrakan."
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
        {!record && (
          <SelectField label="Kelas" name="class" defaultValue={initialClass || ''} required>
            <option value="">Pilih kelas</option>
            {classes.map((c) => (
              <option key={c.academic_class_id} value={c.academic_class_id}>
                {className(catalog, c.academic_class_id)}
              </option>
            ))}
          </SelectField>
        )}
        <SelectField label="Ruangan" name="room" defaultValue={record?.classroom_id || ''} required>
          <option value="">Pilih ruangan</option>
          {catalog.rooms
            .filter((r) => r.classroom_active)
            .map((r) => (
              <option key={r.classroom_id} value={r.classroom_id}>
                {r.classroom_name}
              </option>
            ))}
        </SelectField>
        <div className="form-grid">
          <Field
            label="Mulai (WIB)"
            name="start"
            type="datetime-local"
            defaultValue={record ? localWib(record.teaching_session_start) : ''}
            required
          />
          <Field
            label="Selesai (WIB)"
            name="end"
            type="datetime-local"
            defaultValue={record ? localWib(record.teaching_session_end) : ''}
            required
          />
        </div>
        <Field
          label="Presensi dibuka sebelum mulai (menit)"
          name="early"
          type="number"
          defaultValue={record?.teaching_session_early_minutes ?? 15}
          min={0}
          max={180}
          required
        />
        <Field
          label="Toleransi keterlambatan (menit)"
          name="late"
          type="number"
          defaultValue={record?.teaching_session_late_minutes ?? 10}
          min={0}
          max={180}
          required
        />
        <Field
          label="Batas presensi setelah mulai (menit)"
          name="checkin"
          type="number"
          defaultValue={record?.teaching_session_checkin_minutes ?? 60}
          min={0}
          max={1440}
          required
        />
        <Submit pending={action.isPending}>
          {record ? 'Simpan perubahan' : 'Buat sesi perkuliahan'}
        </Submit>
      </form>
    </Modal>
  )
}
