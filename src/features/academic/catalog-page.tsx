import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Submit,
  Table,
} from '@/components/shared'
import { api, useAction } from '@/lib/api'
import { useCatalog, type Catalog } from './data'
type Kind = 'programs' | 'terms' | 'courses' | 'rooms' | 'classes'
type RecordData = Record<string, string | number | boolean>
type FieldDefinition = {
  key: string
  label: string
  type?: string
  min?: number
  max?: number
  options?: { id: string; name: string }[]
  immutable?: boolean
}
const definitions: Record<
  Kind,
  { name: string; singular: string; endpoint: string; prefix: string }
> = {
  programs: {
    name: 'Program studi',
    singular: 'program studi',
    endpoint: 'study-programs',
    prefix: 'study_program',
  },
  terms: { name: 'Semester', singular: 'semester', endpoint: 'terms', prefix: 'academic_term' },
  courses: { name: 'Mata kuliah', singular: 'mata kuliah', endpoint: 'courses', prefix: 'course' },
  rooms: { name: 'Ruangan', singular: 'ruangan', endpoint: 'classrooms', prefix: 'classroom' },
  classes: { name: 'Kelas', singular: 'kelas', endpoint: 'classes', prefix: 'academic_class' },
}
function fields(kind: Kind, c: Catalog): FieldDefinition[] {
  const prefix = definitions[kind].prefix
  const name = { key: `${prefix}_name`, label: 'Nama' }
  const code = { key: `${prefix}_code`, label: 'Kode' }
  const program = {
    key: 'study_program_id',
    label: 'Program studi',
    options: c.programs.map((x) => ({ id: x.study_program_id, name: x.study_program_name })),
  }
  if (kind === 'programs' || kind === 'rooms') return [code, name]
  if (kind === 'courses')
    return [
      code,
      name,
      program,
      { key: 'course_credits', label: 'SKS', type: 'number', min: 1, max: 24 },
    ]
  if (kind === 'terms')
    return [
      name,
      { key: 'academic_term_start', label: 'Tanggal mulai', type: 'date' },
      { key: 'academic_term_end', label: 'Tanggal selesai', type: 'date' },
      {
        key: 'academic_term_minimum_attendance',
        label: 'Minimum kehadiran (%)',
        type: 'number',
        min: 0,
        max: 100,
      },
    ]
  return [
    name,
    {
      key: 'academic_term_id',
      label: 'Semester',
      immutable: true,
      options: c.terms.map((x) => ({ id: x.academic_term_id, name: x.academic_term_name })),
    },
    {
      key: 'course_id',
      label: 'Mata kuliah',
      immutable: true,
      options: c.courses.map((x) => ({
        id: x.course_id,
        name: `${x.course_code} · ${x.course_name}`,
      })),
    },
    {
      key: 'lecturer_id',
      label: 'Dosen pengampu',
      options: c.lecturers.map((x) => ({ id: x.lecturer_id, name: x.account_name })),
    },
    {
      key: 'academic_class_capacity',
      label: 'Kapasitas mahasiswa',
      type: 'number',
      min: 1,
      max: 1000,
    },
  ]
}
export function CatalogPage() {
  const catalog = useCatalog()
  const [kind, setKind] = useState<Kind>('programs')
  const [search, setSearch] = useState('')
  const [edit, setEdit] = useState<RecordData | null | undefined>(undefined)
  const definition = definitions[kind]
  const rows = (catalog.data?.[kind] || []) as unknown as RecordData[]
  const filtered = rows.filter((r) =>
    Object.values(r).some((v) =>
      String(v).toLocaleLowerCase().includes(search.toLocaleLowerCase()),
    ),
  )
  return (
    <>
      <PageTitle
        title="Data akademik"
        description="Siapkan program studi, semester, mata kuliah, ruangan, dan kelas sebagai dasar perkuliahan."
        action={
          <Button onClick={() => setEdit(null)} disabled={!catalog.data}>
            <Plus size={17} />
            Tambah {definition.singular}
          </Button>
        }
      />
      <div className="tabs" role="group" aria-label="Jenis data akademik">
        {Object.entries(definitions).map(([key, d]) => (
          <button
            className={kind === key ? 'tab active' : 'tab'}
            key={key}
            onClick={() => {
              setKind(key as Kind)
              setSearch('')
            }}
          >
            {d.name}
          </button>
        ))}
      </div>
      <ErrorNotice error={catalog.error} />
      <Panel
        title={definition.name}
        action={
          <div className="search-box">
            <Search size={16} />
            <Input
              aria-label="Cari data akademik"
              placeholder="Cari data…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        }
      >
        {catalog.isPending ? (
          <Loading />
        ) : !filtered.length ? (
          <Empty description="Tambahkan data baru atau ubah kata pencarian." />
        ) : (
          <Table caption={definition.name} headers={['Nama', 'Keterangan', 'Status', '']}>
            {filtered.map((r) => (
              <tr key={String(r[`${definition.prefix}_id`])}>
                <td className="font-medium">{r[`${definition.prefix}_name`]}</td>
                <td className="muted">
                  {String(
                    r[`${definition.prefix}_code`] ??
                      (kind === 'terms'
                        ? `${r.academic_term_start} — ${r.academic_term_end}`
                        : `${r.academic_class_capacity} mahasiswa`),
                  )}
                </td>
                <td>
                  <span
                    className={`status ${r[`${definition.prefix}_active`] ? 'status-positive' : 'status-neutral'}`}
                  >
                    {r[`${definition.prefix}_active`] ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td>
                  <Button variant="ghost" size="sm" onClick={() => setEdit(r)}>
                    Ubah
                  </Button>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
      {edit !== undefined && catalog.data && (
        <CatalogEditor
          key={`${kind}-${edit?.[`${definition.prefix}_id`] || 'new'}`}
          kind={kind}
          catalog={catalog.data}
          record={edit}
          close={() => setEdit(undefined)}
        />
      )}
    </>
  )
}
function CatalogEditor({
  kind,
  catalog,
  record,
  close,
}: {
  kind: Kind
  catalog: Catalog
  record: RecordData | null
  close: () => void
}) {
  const definition = definitions[kind]
  const schema = fields(kind, catalog)
  const action = useAction(
    async (form: FormData) => {
      const body: RecordData = { ...record }
      for (const field of schema)
        body[field.key] =
          record && field.immutable
            ? record[field.key]
            : field.type === 'number'
              ? Number(form.get(field.key))
              : String(form.get(field.key))
      body[`${definition.prefix}_active`] = form.get('active') === 'on'
      await api(
        `/academic/${definition.endpoint}${record ? `/${record[`${definition.prefix}_id`]}` : ''}`,
        { method: record ? 'PUT' : 'POST', body },
      )
      close()
    },
    { catalog: true },
  )
  return (
    <Modal
      title={`${record ? 'Ubah' : 'Tambah'} ${definition.singular}`}
      description="Perubahan akan disimpan ke data akademik kampus."
      open
      onClose={() => {
        if (!action.isPending) close()
      }}
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          action.mutate(new FormData(e.currentTarget))
        }}
      >
        <ErrorNotice error={action.error} />
        {kind === 'classes' && !catalog.lecturers.length && (
          <Notice>Buat akun dosen terlebih dahulu melalui Akun & mahasiswa.</Notice>
        )}
        {schema.map((f) =>
          f.options ? (
            <SelectField
              key={f.key}
              label={f.label}
              name={f.key}
              defaultValue={String(record?.[f.key] || '')}
              disabled={!!record && f.immutable}
              required
            >
              <option value="">Pilih {f.label.toLowerCase()}</option>
              {f.options.map((o) => (
                <option value={o.id} key={o.id}>
                  {o.name}
                </option>
              ))}
            </SelectField>
          ) : (
            <Field
              key={f.key}
              label={f.label}
              name={f.key}
              type={f.type || 'text'}
              min={f.min}
              max={f.max}
              maxLength={200}
              defaultValue={String(
                record?.[f.key] ??
                  (f.key.endsWith('capacity')
                    ? 40
                    : f.key.endsWith('minimum_attendance')
                      ? 85
                      : ''),
              )}
              required
            />
          ),
        )}
        <label className="checkbox-label">
          <input
            name="active"
            type="checkbox"
            defaultChecked={record ? Boolean(record[`${definition.prefix}_active`]) : true}
          />
          Aktif untuk kegiatan akademik
        </label>
        <div className="form-actions">
          <Button type="button" variant="outline" onClick={close} disabled={action.isPending}>
            Batal
          </Button>
          <Submit pending={action.isPending} />
        </div>
      </form>
    </Modal>
  )
}
