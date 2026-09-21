import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Fingerprint, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Empty,
  ErrorNotice,
  LimitNotice,
  Loading,
  Modal,
  PageTitle,
  Panel,
  Status,
  Submit,
  Table,
} from '@/components/shared'
import { allPages, api, useAction, useApi } from '@/lib/api'
import type { Enrollment, StudentRow } from '@/lib/contracts'
import { dateTime } from '@/lib/format'
import { useAuth } from '@/features/auth/auth-context'
import { EnrollmentEditor } from './enrollment-editor'
export function EnrollmentPage() {
  const { account } = useAuth()
  const student = account!.account_role === 'student'
  const list = useApi<Enrollment[]>('/biometric-enrollments')
  const [selected, setSelected] = useState<string>()
  const [consent, setConsent] = useState(false)
  const people = useQuery({
    queryKey: ['students'],
    queryFn: ({ signal }) => allPages<StudentRow>('/academic/students', signal),
    enabled: !student,
  })
  const create = useAction(async () => {
    const e = await api<Enrollment>('/biometric-enrollments', {
      method: 'POST',
      body: { accepted: true, version: 'research-v1' },
    })
    setConsent(false)
    setSelected(e.biometric_enrollment_id)
  })
  return (
    <>
      <PageTitle
        title={student ? 'Pendaftaran wajah' : 'Verifikasi pendaftaran wajah'}
        description={
          student
            ? 'Siapkan foto wajah untuk presensi otomatis saat memasuki ruang perkuliahan.'
            : 'Verifikasi identitas mahasiswa sebelum mengaktifkan sampel dalam galeri perangkat.'
        }
        action={
          student && (
            <Button
              disabled={
                !list.data ||
                list.data.some((e) =>
                  ['draft', 'submitted'].includes(e.biometric_enrollment_status),
                )
              }
              onClick={() => setConsent(true)}
            >
              <Plus size={17} />
              Mulai pendaftaran
            </Button>
          )
        }
      />
      {student && (
        <div className="enrollment-guide">
          <Fingerprint size={32} />
          <div>
            <h2>12 foto, 5 arah wajah</h2>
            <p>
              Depan, kiri, kanan, atas, dan bawah — sedikitnya dua foto berbeda untuk setiap arah.
              Gunakan pencahayaan yang cukup dan pastikan hanya wajah Anda yang terlihat.
            </p>
          </div>
        </div>
      )}
      <ErrorNotice error={list.error || people.error} />
      <Panel
        title={student ? 'Pendaftaran Anda' : 'Daftar pendaftaran'}
        description={
          student
            ? 'Pendaftaran aktif setelah disetujui administrator.'
            : 'Foto asli tidak disimpan. Pemeriksaan identitas dilakukan secara langsung atau melalui prosedur kampus.'
        }
      >
        {list.isPending ? (
          <Loading />
        ) : list.data?.length ? (
          <>
            <Table
              caption="Pendaftaran wajah"
              headers={[...(student ? [] : ['Mahasiswa']), 'Dibuat pada', 'Status', '']}
            >
              {list.data.map((e) => (
                <tr key={e.biometric_enrollment_id}>
                  {!student && (
                    <td className="font-medium">
                      {people.data?.find((p) => p.student.student_id === e.student_id)
                        ?.account_name || 'Mahasiswa tidak tersedia'}
                    </td>
                  )}
                  <td>{dateTime(e.biometric_enrollment_created_at)}</td>
                  <td>
                    <Status value={e.biometric_enrollment_status} />
                  </td>
                  <td>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelected(e.biometric_enrollment_id)}
                    >
                      Buka pendaftaran
                    </Button>
                  </td>
                </tr>
              ))}
            </Table>
            <LimitNotice count={list.data.length} limit={100} />
          </>
        ) : (
          !list.error && (
            <Empty
              title="Belum ada pendaftaran wajah"
              description={
                student
                  ? 'Mulai pendaftaran setelah membaca persetujuan penggunaan biometrik.'
                  : 'Pengajuan mahasiswa akan muncul di sini.'
              }
            />
          )
        )}
      </Panel>
      {consent && (
        <Modal
          title="Persetujuan penggunaan biometrik"
          description="Pendaftaran wajah untuk prototipe penelitian presensi akademik."
          open
          onClose={() => setConsent(false)}
        >
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault()
              create.mutate()
            }}
          >
            <p className="text-sm leading-relaxed">
              Foto diproses untuk membuat representasi biometrik wajah. Foto asli dan nama berkas
              tidak disimpan oleh backend. Representasi biometrik disimpan untuk verifikasi dan
              dibagikan kepada perangkat presensi setelah disetujui.
            </p>
            <p className="text-sm leading-relaxed">
              Anda dapat mencabut pendaftaran. Perangkat yang sedang offline menerima perubahan saat
              kembali tersambung; pencabutan tidak berarti seluruh riwayat akademik dihapus.
            </p>
            <label className="checkbox-label items-start">
              <input type="checkbox" required />
              <span>
                Saya memahami dan menyetujui penggunaan biometrik untuk presensi dalam penelitian
                ini.
              </span>
            </label>
            <ErrorNotice error={create.error} />
            <Submit pending={create.isPending}>Setuju dan mulai</Submit>
          </form>
        </Modal>
      )}
      {selected && (
        <EnrollmentEditor
          key={selected}
          id={selected}
          student={student}
          close={() => setSelected(undefined)}
        />
      )}
    </>
  )
}
