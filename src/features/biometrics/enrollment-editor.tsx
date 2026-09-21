import { useEffect, useState } from 'react'
import { RefreshCw, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  ErrorNotice,
  Field,
  Loading,
  Modal,
  Notice,
  SelectField,
  Status,
  Submit,
} from '@/components/shared'
import { api, useAction, useApi } from '@/lib/api'
import type { EnrollmentDetail } from '@/lib/contracts'
import { labels } from '@/lib/format'
import { poses, photoError, poseInstructions, suggestedPose } from './photo'
import { CameraCapture } from './camera-capture'
export function EnrollmentEditor({
  id,
  student,
  close,
}: {
  id: string
  student: boolean
  close: () => void
}) {
  const detail = useApi<EnrollmentDetail>(`/biometric-enrollments/${id}`)
  const [file, setFile] = useState<File>()
  const [preview, setPreview] = useState('')
  const [selectedPose, setPose] = useState<string>()
  const pose = selectedPose ?? suggestedPose(detail.data?.samples ?? [])
  const [source, setSource] = useState<'upload' | 'camera'>('upload')
  const [localError, setLocalError] = useState('')
  const [reason, setReason] = useState(false)
  const [publication, setPublication] = useState(false)
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])
  const upload = useAction(async () => {
    if (!file) return
    const f = new FormData()
    f.append('pose', pose)
    f.append('image', file)
    await api(`/biometric-enrollments/${id}/samples/upload`, { method: 'POST', body: f })
    setFile(undefined)
    setPreview('')
    setPose(undefined)
  })
  const remove = useAction((sample: string) =>
    api(`/biometric-enrollments/${id}/samples/${sample}`, { method: 'DELETE' }),
  )
  const submit = useAction(() =>
    api(`/biometric-enrollments/${id}/submit`, { method: 'POST', body: {} }),
  )
  const review = useAction(async (f: FormData) => {
    const result = await api<{ publication: unknown }>(`/biometric-enrollments/${id}/review`, {
      method: 'POST',
      body: {
        decision: f.get('decision'),
        note: f.get('note'),
        identity_verified: f.get('verified') === 'on',
      },
    })
    setPublication(!!result.publication)
  })
  const revoke = useAction(async (f: FormData) => {
    await api(`/biometric-enrollments/${id}/revoke`, {
      method: 'POST',
      body: { reason: f.get('reason') },
    })
    setReason(false)
  })
  const d = detail.data
  const status = d?.enrollment.biometric_enrollment_status
  const draft = status === 'draft'
  const canSubmit =
    d &&
    d.samples.length === 12 &&
    poses.every((p) => d.samples.filter((s) => s.biometric_template_pose === p).length >= 2)
  const busy =
    upload.isPending || remove.isPending || submit.isPending || review.isPending || revoke.isPending
  return (
    <Modal
      title="Detail pendaftaran wajah"
      description="Sampel hanya dihitung setelah pemrosesan dan penyimpanan di server berhasil."
      open
      onClose={() => {
        if (!busy) close()
      }}
    >
      <ErrorNotice error={detail.error} />
      {detail.isPending ? (
        <Loading />
      ) : (
        d && (
          <div className="space-y-5">
            <div className="flex justify-between items-center">
              <Status value={status!} />
              <span className="text-sm font-semibold">{d.samples.length} / 12 sampel</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={busy || detail.isFetching}
              onClick={() => void detail.refetch()}
            >
              <RefreshCw size={15} />
              Muat ulang sampel
            </Button>
            {d.enrollment.biometric_enrollment_review_note && (
              <Notice>{d.enrollment.biometric_enrollment_review_note}</Notice>
            )}
            {publication && (
              <Notice tone="success">
                Pendaftaran disetujui dan galeri diterbitkan. Perangkat akan mengambil pembaruan
                ketika tersambung.
              </Notice>
            )}
            <div className="pose-counts">
              {poses.map((p) => {
                const count = d.samples.filter((s) => s.biometric_template_pose === p).length
                return (
                  <div key={p} className={count >= 2 ? 'complete' : ''}>
                    <span>{labels[p]}</span>
                    <strong>
                      {count}
                      <small> / 2 min.</small>
                    </strong>
                  </div>
                )
              })}
            </div>
            <ErrorNotice
              error={upload.error || remove.error || submit.error || review.error || revoke.error}
            />
            {student && draft && d.samples.length < 12 && (
              <form
                className="upload-form flex flex-col gap-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  upload.mutate()
                }}
              >
                <div className="flex flex-wrap gap-2" role="group" aria-label="Sumber foto">
                  <Button
                    type="button"
                    variant={source === 'camera' ? 'default' : 'outline'}
                    disabled={busy}
                    aria-pressed={source === 'camera'}
                    onClick={() => {
                      setSource('camera')
                      setFile(undefined)
                      setPreview('')
                      setLocalError('')
                      upload.reset()
                    }}
                  >
                    Gunakan kamera
                  </Button>
                  <Button
                    type="button"
                    variant={source === 'upload' ? 'default' : 'outline'}
                    disabled={busy}
                    aria-pressed={source === 'upload'}
                    onClick={() => {
                      setSource('upload')
                      setFile(undefined)
                      setPreview('')
                      setLocalError('')
                      upload.reset()
                    }}
                  >
                    Unggah foto
                  </Button>
                </div>
                <p className="text-sm muted">
                  {d.samples.length < 10
                    ? 'Lengkapi sedikitnya dua foto untuk setiap arah.'
                    : 'Lengkapi 12 foto berbeda. Arah yang masih kurang tetap harus dilengkapi.'}{' '}
                  Kemajuan mengikuti sampel yang sudah tersimpan.
                </p>
                <SelectField
                  label="Arah wajah pada foto"
                  value={pose}
                  disabled={busy}
                  onChange={(e) => setPose(e.target.value)}
                >
                  {poses.map((p) => (
                    <option key={p} value={p}>
                      {labels[p]}
                    </option>
                  ))}
                </SelectField>
                {source === 'camera' && !file && (
                  <CameraCapture
                    instruction={poseInstructions[pose]}
                    disabled={busy}
                    onCapture={(photo) => {
                      setFile(photo)
                      setPreview(URL.createObjectURL(photo))
                      upload.reset()
                    }}
                  />
                )}
                {source === 'upload' && (
                  <Field
                    key={d.samples.length}
                    label="Foto wajah"
                    type="file"
                    accept="image/jpeg,image/png"
                    disabled={busy}
                    onChange={(e) => {
                      upload.reset()
                      const candidate = e.target.files?.[0]
                      const error = candidate ? photoError(candidate) : null
                      setLocalError(error || '')
                      setFile(error ? undefined : candidate)
                      setPreview(candidate && !error ? URL.createObjectURL(candidate) : '')
                    }}
                    hint="JPEG / PNG, maksimal 5 MiB. Resolusi 112–2048 piksel; foto tegak, satu wajah yang jelas."
                  />
                )}
                {localError && <Notice tone="error">{localError}</Notice>}
                {preview && (
                  <img
                    src={preview}
                    alt="Pratinjau foto yang akan dikirim"
                    className="photo-preview"
                  />
                )}
                <div className="flex flex-wrap gap-2">
                  {source === 'camera' && file && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      onClick={() => {
                        setFile(undefined)
                        setPreview('')
                        upload.reset()
                      }}
                    >
                      Ambil ulang foto
                    </Button>
                  )}
                  <Submit
                    pending={upload.isPending}
                    disabled={!file || (busy && !upload.isPending)}
                  >
                    <Upload size={16} />
                    Proses dan simpan foto
                  </Submit>
                </div>
                {upload.error && (
                  <p className="muted text-xs">
                    Jika koneksi terputus, periksa jumlah sampel sebelum mengirim ulang.
                  </p>
                )}
              </form>
            )}
            {d.samples.length > 0 && (
              <div className="sample-list">
                {d.samples.map((s, i) => (
                  <div key={s.biometric_template_id} className="sample-row">
                    <span>Sampel {String(i + 1).padStart(2, '0')}</span>
                    <span className="muted">{labels[s.biometric_template_pose]}</span>
                    {draft && student && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={busy}
                        aria-label={`Hapus sampel ${i + 1}`}
                        onClick={() => remove.mutate(s.biometric_template_id)}
                      >
                        <Trash2 size={15} />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {student && draft && (
              <Button
                className="w-full"
                disabled={!canSubmit || busy}
                onClick={() => submit.mutate()}
              >
                Ajukan untuk verifikasi
              </Button>
            )}
            {!student && status === 'submitted' && (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  review.mutate(new FormData(e.currentTarget))
                }}
              >
                <SelectField label="Keputusan" name="decision">
                  <option value="approved">Setujui dan terbitkan galeri</option>
                  <option value="rejected">Tolak pendaftaran</option>
                </SelectField>
                <label className="checkbox-label items-start">
                  <input type="checkbox" name="verified" />
                  <span>
                    Saya telah memverifikasi identitas mahasiswa sesuai prosedur kampus. Wajib untuk
                    persetujuan.
                  </span>
                </label>
                <Field label="Catatan verifikasi" name="note" required maxLength={500} />
                <Submit pending={review.isPending}>Simpan keputusan</Submit>
              </form>
            )}
            {status !== 'revoked' && !reason && (
              <Button
                variant="ghost"
                className="text-destructive"
                disabled={busy}
                onClick={() => setReason(true)}
              >
                Cabut pendaftaran ini
              </Button>
            )}
            {reason && (
              <form
                className="space-y-4 border-t pt-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  revoke.mutate(new FormData(e.currentTarget))
                }}
              >
                <Notice>
                  Sampel pendaftaran ini akan dinonaktifkan dari galeri. Perangkat offline menerima
                  pembaruan saat tersambung kembali.
                </Notice>
                <Field label="Alasan pencabutan" name="reason" required maxLength={500} />
                <Submit pending={revoke.isPending}>Konfirmasi pencabutan</Submit>
              </form>
            )}
          </div>
        )
      )}
    </Modal>
  )
}
