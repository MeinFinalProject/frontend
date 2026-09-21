import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Empty,
  ErrorNotice,
  Field,
  Loading,
  Modal,
  PageTitle,
  Panel,
  SelectField,
  Status,
  Submit,
  Table,
} from '@/components/shared'
import { api, useAction, useApi } from '@/lib/api'
import type { Account, StudentRow } from '@/lib/contracts'
import { roles } from '@/lib/format'
import { useCatalog } from '@/features/academic/data'
import { useAuth } from '@/features/auth/auth-context'
export function AccountsPage() {
  const [tab, setTab] = useState<'accounts' | 'students'>('accounts')
  const [page, setPage] = useState(1)
  const [create, setCreate] = useState(false)
  const [edit, setEdit] = useState<Account | StudentRow>()
  const { account } = useAuth()
  const accounts = useApi<Account[]>(`/admin/accounts?page=${page}`, tab === 'accounts')
  const students = useApi<StudentRow[]>(`/academic/students?page=${page}`, tab === 'students')
  const current = tab === 'accounts' ? accounts : students
  return (
    <>
      <PageTitle
        title="Akun & mahasiswa"
        description="Tinjau pendaftaran, kelola akses staf, dan tetapkan dosen pembimbing mahasiswa."
        action={
          <Button onClick={() => setCreate(true)}>
            <Plus size={17} />
            Tambah akun staf
          </Button>
        }
      />
      <div className="tabs">
        <button
          className={`tab ${tab === 'accounts' ? 'active' : ''}`}
          onClick={() => {
            setTab('accounts')
            setPage(1)
          }}
        >
          Akun pengguna
        </button>
        <button
          className={`tab ${tab === 'students' ? 'active' : ''}`}
          onClick={() => {
            setTab('students')
            setPage(1)
          }}
        >
          Mahasiswa & pembimbing
        </button>
      </div>
      <Panel>
        <ErrorNotice error={current.error} />
        {current.isPending ? (
          <Loading />
        ) : current.data?.length ? (
          tab === 'accounts' ? (
            <Table caption="Akun pengguna" headers={['Nama / email', 'Peran', 'Status', '']}>
              {accounts.data?.map((a) => (
                <tr key={a.account_id}>
                  <td>
                    <p className="font-medium">{a.account_name}</p>
                    <p className="muted text-xs mt-1">{a.account_email}</p>
                  </td>
                  <td>{roles[a.account_role]}</td>
                  <td>
                    <Status value={a.account_status} />
                  </td>
                  <td>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={a.account_id === account?.account_id}
                      onClick={() => setEdit(a)}
                    >
                      Kelola akses
                    </Button>
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            <Table caption="Mahasiswa" headers={['Nama', 'NIM', 'Angkatan', 'Status akun', '']}>
              {students.data?.map((s) => (
                <tr key={s.student.student_id}>
                  <td className="font-medium">{s.account_name}</td>
                  <td>{s.student.student_number}</td>
                  <td>{s.student.student_entry_year}</td>
                  <td>
                    <Status value={s.account_status} />
                  </td>
                  <td>
                    <Button variant="ghost" size="sm" onClick={() => setEdit(s)}>
                      Pembimbing
                    </Button>
                  </td>
                </tr>
              ))}
            </Table>
          )
        ) : (
          !current.error && <Empty />
        )}
        <div className="pagination">
          <span>Halaman {page} · maksimal 100 data per halaman</span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Sebelumnya
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!current.data || current.data.length < 100}
            onClick={() => setPage(page + 1)}
          >
            Berikutnya
          </Button>
        </div>
      </Panel>
      {create && <StaffEditor close={() => setCreate(false)} />}{' '}
      {edit &&
        ('student' in edit ? (
          <AdvisorEditor record={edit} close={() => setEdit(undefined)} />
        ) : (
          <StatusEditor record={edit} close={() => setEdit(undefined)} />
        ))}
    </>
  )
}
function StaffEditor({ close }: { close: () => void }) {
  const [role, setRole] = useState('lecturer')
  const action = useAction(
    async (f: FormData) => {
      await api('/admin/accounts', {
        method: 'POST',
        body: {
          name: f.get('name'),
          email: f.get('email'),
          password: f.get('password'),
          role,
          lecturer_number: role === 'lecturer' ? f.get('number') : null,
        },
      })
      close()
    },
    { catalog: true },
  )
  return (
    <Modal
      title="Tambah akun staf"
      description="Akun dosen dan administrator langsung aktif. Sampaikan kata sandi awal melalui saluran aman."
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
        <Field label="Nama lengkap" name="name" required maxLength={200} />
        <Field label="Email" name="email" type="email" required />
        <SelectField label="Peran" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="lecturer">Dosen</option>
          <option value="administrator">Administrator</option>
        </SelectField>
        {role === 'lecturer' && <Field label="Nomor induk dosen" name="number" required />}
        <Field
          label="Kata sandi awal"
          name="password"
          type="password"
          minLength={12}
          maxLength={128}
          autoComplete="new-password"
          required
          hint="12–128 karakter. Pengguna dapat menggantinya setelah masuk."
        />
        <Submit pending={action.isPending}>Buat akun staf</Submit>
      </form>
    </Modal>
  )
}
function StatusEditor({ record, close }: { record: Account; close: () => void }) {
  const action = useAction(async (f: FormData) => {
    await api(`/admin/accounts/${record.account_id}/status`, {
      method: 'PUT',
      body: { status: f.get('status'), reason: f.get('reason') },
    })
    close()
  })
  return (
    <Modal
      title={`Akses ${record.account_name}`}
      description="Menolak atau menonaktifkan akun akan mengakhiri sesi login, keanggotaan kelas, dan biometrik aktif."
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
        <SelectField
          label="Status baru"
          name="status"
          required
          defaultValue={record.account_status === 'pending' ? '' : record.account_status}
        >
          <option value="" disabled>
            Pilih keputusan
          </option>
          <option value="approved">Disetujui</option>
          <option value="rejected">Ditolak</option>
          <option value="disabled">Nonaktif</option>
        </SelectField>
        <Field label="Alasan keputusan" name="reason" required maxLength={500} />
        <Submit pending={action.isPending}>Simpan keputusan</Submit>
      </form>
    </Modal>
  )
}
function AdvisorEditor({ record, close }: { record: StudentRow; close: () => void }) {
  const catalog = useCatalog()
  const action = useAction(async (f: FormData) => {
    await api(`/academic/students/${record.student.student_id}`, {
      method: 'PUT',
      body: { advisor_lecturer_id: f.get('advisor') || null },
    })
    close()
  })
  return (
    <Modal
      title="Tetapkan pembimbing"
      description={`${record.account_name} · ${record.student.student_number}`}
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
        <ErrorNotice error={action.error || catalog.error} />
        <SelectField
          label="Dosen pembimbing"
          name="advisor"
          defaultValue={record.student.advisor_lecturer_id || ''}
        >
          <option value="">Belum ditetapkan</option>
          {catalog.data?.lecturers.map((l) => (
            <option key={l.lecturer_id} value={l.lecturer_id}>
              {l.account_name}
            </option>
          ))}
        </SelectField>
        <Submit pending={action.isPending} disabled={!catalog.data} />
      </form>
    </Modal>
  )
}
