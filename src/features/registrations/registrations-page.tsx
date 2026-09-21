import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Empty,
  ErrorNotice,
  Field,
  LimitNotice,
  Loading,
  Modal,
  Notice,
  PageTitle,
  Panel,
  SelectField,
  Status,
  Submit,
  Table,
} from '@/components/shared'
import { allPages, api, useAction, useApi } from '@/lib/api'
import type { Registration, RegistrationDetail, Student, StudentRow } from '@/lib/contracts'
import { dateTime, todayWib } from '@/lib/format'
import { className, termName, useCatalog, type Catalog } from '@/features/academic/data'
import { useAuth } from '@/features/auth/auth-context'
export function RegistrationsPage() {
  const { account } = useAuth()
  const student = account!.account_role === 'student'
  const catalog = useCatalog()
  const list = useApi<Registration[]>('/course-registrations')
  const profile = useApi<Student>('/academic/my-profile', student)
  const people = useQuery({
    queryKey: ['registration-people', account!.account_role],
    enabled: !student,
    queryFn: ({ signal }) =>
      account!.account_role === 'lecturer'
        ? api<StudentRow[]>('/academic/advisees', { signal })
        : allPages<StudentRow>('/academic/students', signal),
  })
  const [selected, setSelected] = useState<string>()
  const [draft, setDraft] = useState<RegistrationDetail | null | undefined>(undefined)
  const name = (id: string) =>
    student
      ? account!.account_name
      : people.data?.find((p) => p.student.student_id === id)?.account_name ||
        'Mahasiswa tidak tersedia'
  return (
    <>
      <PageTitle
        title={student ? 'Rencana studi saya' : 'Peninjauan rencana studi'}
        description={
          student
            ? 'Pilih kelas untuk semester Anda, lalu ajukan kepada dosen pembimbing.'
            : 'Periksa pilihan kelas dan berikan keputusan yang jelas untuk mahasiswa.'
        }
        action={
          student && (
            <Button disabled={!profile.data || !catalog.data} onClick={() => setDraft(null)}>
              <Plus size={17} />
              Susun KRS
            </Button>
          )
        }
      />
      <ErrorNotice error={list.error || catalog.error || profile.error || people.error} />
      <Panel
        title={student ? 'Riwayat pengajuan' : 'Pengajuan dalam kewenangan Anda'}
        description={
          student
            ? 'Kelas mulai diikuti setelah KRS disetujui.'
            : 'Dosen hanya melihat mahasiswa bimbingannya.'
        }
      >
        {list.isPending ? (
          <Loading />
        ) : list.data?.length ? (
          <>
            <Table
              caption="Daftar KRS"
              headers={[...(student ? [] : ['Mahasiswa']), 'Semester', 'Diajukan', 'Status', '']}
            >
              {list.data.map((r) => (
                <tr key={r.course_registration_id}>
                  {!student && <td className="font-medium">{name(r.student_id)}</td>}
                  <td>{termName(catalog.data, r.academic_term_id)}</td>
                  <td>{dateTime(r.course_registration_submitted_at)}</td>
                  <td>
                    <Status value={r.course_registration_status} />
                  </td>
                  <td>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelected(r.course_registration_id)}
                    >
                      Lihat KRS
                    </Button>
                  </td>
                </tr>
              ))}
            </Table>
            <LimitNotice count={list.data.length} limit={200} />
          </>
        ) : (
          !list.error && (
            <Empty
              title="Belum ada pengajuan KRS"
              description={
                student
                  ? 'Mulai dengan memilih kelas melalui Susun KRS.'
                  : 'Pengajuan mahasiswa akan muncul setelah mereka menyusun KRS.'
              }
            />
          )
        )}
      </Panel>
      {selected && (
        <RegistrationReview
          id={selected}
          student={student}
          name={name}
          catalog={catalog.data}
          close={() => setSelected(undefined)}
          edit={(d) => {
            setSelected(undefined)
            setDraft(d)
          }}
        />
      )}{' '}
      {draft !== undefined && profile.data && catalog.data && (
        <RegistrationEditor
          record={draft}
          profile={profile.data}
          catalog={catalog.data}
          close={() => setDraft(undefined)}
          saved={(id) => {
            setDraft(undefined)
            setSelected(id)
          }}
        />
      )}
    </>
  )
}
function RegistrationEditor({
  record,
  profile,
  catalog,
  close,
  saved,
}: {
  record: RegistrationDetail | null
  profile: Student
  catalog: Catalog
  close: () => void
  saved: (id: string) => void
}) {
  const [term, setTerm] = useState(record?.registration.academic_term_id || '')
  const [selected, setSelected] = useState(record?.classes.map((c) => c.academic_class_id) || [])
  const classes = catalog.classes.filter(
    (c) =>
      c.academic_term_id === term &&
      c.academic_class_active &&
      catalog.courses.some(
        (course) =>
          course.course_id === c.course_id &&
          course.study_program_id === profile.study_program_id &&
          course.course_active,
      ),
  )
  const credits = selected.reduce(
    (n, id) =>
      n +
      (catalog.courses.find(
        (x) => x.course_id === catalog.classes.find((c) => c.academic_class_id === id)?.course_id,
      )?.course_credits || 0),
    0,
  )
  const action = useAction(async () => {
    const result = await api<{ course_registration_id: string }>('/course-registrations', {
      method: 'POST',
      body: { academic_term_id: term, class_ids: selected },
    })
    saved(result.course_registration_id)
  })
  return (
    <Modal
      title="Susun rencana studi"
      description="Simpan draf terlebih dahulu. Anda dapat memeriksa pilihan sebelum mengajukan."
      open
      onClose={close}
    >
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          action.mutate()
        }}
      >
        <ErrorNotice error={action.error} />
        <SelectField
          label="Semester"
          value={term}
          required
          disabled={!!record}
          onChange={(e) => {
            setTerm(e.target.value)
            setSelected([])
          }}
        >
          <option value="">Pilih semester</option>
          {catalog.terms
            .filter((t) => t.academic_term_active && t.academic_term_end >= todayWib())
            .map((t) => (
              <option key={t.academic_term_id} value={t.academic_term_id}>
                {t.academic_term_name}
              </option>
            ))}
        </SelectField>
        {term && (
          <fieldset>
            <legend className="font-medium text-sm mb-3">
              Kelas tersedia untuk program studi Anda
            </legend>
            <div className="choice-list">
              {classes.map((c) => (
                <label key={c.academic_class_id} className="checkbox-label items-start">
                  <input
                    type="checkbox"
                    checked={selected.includes(c.academic_class_id)}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...selected, c.academic_class_id]
                          : selected.filter((id) => id !== c.academic_class_id),
                      )
                    }
                  />
                  <span>
                    {className(catalog, c.academic_class_id)}
                    <small className="block muted mt-1">
                      {catalog.lecturers.find((l) => l.lecturer_id === c.lecturer_id)?.account_name}{' '}
                      · {catalog.courses.find((x) => x.course_id === c.course_id)?.course_credits}{' '}
                      SKS
                    </small>
                  </span>
                </label>
              ))}
              {!classes.length && (
                <Empty
                  title="Belum ada kelas tersedia"
                  description="Hubungi administrator untuk ketersediaan kelas semester ini."
                />
              )}
            </div>
          </fieldset>
        )}
        <p className="muted text-sm">
          {selected.length} kelas dipilih · {credits} SKS
        </p>
        <Submit pending={action.isPending} disabled={selected.length === 0 || selected.length > 20}>
          Simpan draf KRS
        </Submit>
      </form>
    </Modal>
  )
}
function RegistrationReview({
  id,
  student,
  name,
  catalog,
  close,
  edit,
}: {
  id: string
  student: boolean
  name: (id: string) => string
  catalog: Catalog | undefined
  close: () => void
  edit: (r: RegistrationDetail) => void
}) {
  const detail = useApi<RegistrationDetail>(`/course-registrations/${id}`)
  const [decision, setDecision] = useState('approved')
  const action = useAction(async (input: { type: string; note?: string }) => {
    await api(`/course-registrations/${id}/${input.type}`, {
      method: 'POST',
      body: input.type === 'review' ? { decision, note: input.note } : { note: input.note },
    })
    close()
  })
  const d = detail.data
  const status = d?.registration.course_registration_status
  return (
    <Modal
      title="Detail rencana studi"
      description={
        d
          ? `${name(d.registration.student_id)} · ${termName(catalog, d.registration.academic_term_id)}`
          : 'Memuat pengajuan…'
      }
      open
      onClose={close}
    >
      <ErrorNotice error={detail.error || action.error} />
      {detail.isPending ? (
        <Loading />
      ) : (
        d && (
          <div className="space-y-5">
            <Status value={status!} />
            <ul className="detail-list">
              {d.classes.map((c) => (
                <li key={c.academic_class_id}>{className(catalog, c.academic_class_id)}</li>
              ))}
            </ul>
            {d.registration.course_registration_review_note && (
              <Notice>{d.registration.course_registration_review_note}</Notice>
            )}
            {student && ['draft', 'corrections', 'withdrawn'].includes(status!) && (
              <div className="flex gap-3 flex-wrap">
                <Button variant="outline" onClick={() => edit(d)}>
                  Ubah pilihan kelas
                </Button>
                {status === 'draft' && (
                  <Button
                    disabled={action.isPending}
                    onClick={() => action.mutate({ type: 'submit' })}
                  >
                    Ajukan ke pembimbing
                  </Button>
                )}
              </div>
            )}
            {!student && (status === 'submitted' || status === 'approved') && (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  const f = new FormData(e.currentTarget)
                  action.mutate({
                    type: status === 'approved' ? 'withdraw' : 'review',
                    note: String(f.get('note')),
                  })
                }}
              >
                {status === 'submitted' ? (
                  <SelectField
                    label="Keputusan"
                    value={decision}
                    onChange={(e) => setDecision(e.target.value)}
                  >
                    <option value="approved">Setujui rencana studi</option>
                    <option value="corrections">Minta perbaikan</option>
                  </SelectField>
                ) : (
                  <Notice>
                    Penarikan KRS akan mengakhiri keanggotaan kelas. Riwayat presensi tetap
                    disimpan.
                  </Notice>
                )}
                <Field
                  label={status === 'approved' ? 'Alasan penarikan KRS' : 'Catatan untuk mahasiswa'}
                  name="note"
                  maxLength={500}
                  required
                />
                <Submit pending={action.isPending}>
                  {status === 'approved' ? 'Tarik KRS' : 'Kirim keputusan'}
                </Submit>
              </form>
            )}
          </div>
        )
      )}
    </Modal>
  )
}
