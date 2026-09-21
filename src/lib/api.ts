import { QueryClient, useMutation, useQuery } from '@tanstack/react-query'
import type { Login } from './contracts'

const storageKey = 'ta.session.v1'
export function readSession(): Login | null {
  try {
    const session = JSON.parse(sessionStorage.getItem(storageKey) || 'null') as Login | null
    if (
      !session ||
      typeof session.access_token !== 'string' ||
      !Number.isFinite(Date.parse(session.expires_at)) ||
      Date.parse(session.expires_at) <= Date.now()
    ) {
      sessionStorage.removeItem(storageKey)
      return null
    }
    return session
  } catch {
    sessionStorage.removeItem(storageKey)
    return null
  }
}
export function setSession(session: Login | null) {
  if (session) sessionStorage.setItem(storageKey, JSON.stringify(session))
  else sessionStorage.removeItem(storageKey)
  window.dispatchEvent(new Event('ta:session'))
}
export class ApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string) {
    super(errorMessage(status, code))
    this.status = status
    this.code = code
  }
}
const messages: Record<string, string> = {
  invalid_session_window:
    'Periksa waktu mulai dan selesai, batas presensi, serta toleransi keterlambatan. Sesi harus dibuat sebelum presensi dibuka.',
  session_outside_term: 'Tanggal perkuliahan harus berada dalam semester kelas.',
  session_schedule_conflict: 'Waktu sesi bertabrakan dengan dosen, kelas, atau ruangan lain.',
  class_or_term_inactive: 'Kelas atau semester tidak aktif.',
  invalid_or_duplicate_course: 'Pilih hanya satu kelas untuk setiap mata kuliah.',
  class_unavailable_or_full: 'Kelas tidak aktif atau kapasitasnya sudah penuh.',
  term_closed: 'Semester sudah berakhir atau tidak aktif.',
  course_selection_no_longer_valid:
    'Pilihan kelas tidak lagi berlaku. Minta mahasiswa memperbaiki KRS.',
  invalid_image:
    'Foto tidak dapat dibaca. Gunakan JPEG atau PNG yang valid, tegak, dengan resolusi 112–2048 piksel.',
  face_quality_insufficient:
    'Kualitas wajah belum mencukupi. Gunakan foto yang lebih terang, tajam, dan dekat.',
  enrollment_worker_not_configured: 'Layanan pengolahan foto belum siap. Hubungi administrator.',
  enrollment_inference_timeout:
    'Pemrosesan foto melewati batas waktu. Tunggu sejenak lalu coba kembali.',
  enrollment_inference_failed:
    'Foto belum dapat diproses. Coba foto lain atau hubungi administrator.',
  stale_session_revision:
    'Sesi telah diubah pengguna lain. Tutup dialog dan muat ulang sebelum menyimpan.',
  session_window_already_started:
    'Jendela presensi sudah dimulai. Sesi tidak dapat diubah atau dibatalkan.',
  account_exists: 'Email sudah terdaftar.',
  invalid_or_duplicate_lecturer_number: 'Nomor induk dosen tidak valid atau sudah digunakan.',
  invalid_class_references:
    'Pilih semester dan mata kuliah aktif, serta dosen dengan akun yang disetujui.',
  class_course_and_term_are_immutable:
    'Mata kuliah dan semester kelas yang sudah dibuat tidak dapat diganti.',
  capacity_below_enrollment:
    'Kapasitas tidak boleh lebih kecil dari jumlah mahasiswa yang sudah terdaftar.',
  administrator_identity_verification_required:
    'Konfirmasikan bahwa identitas mahasiswa sudah diverifikasi sebelum menyetujui.',
  enrollment_model_changed_reenroll:
    'Model pengenalan berubah. Mahasiswa perlu melakukan pendaftaran wajah ulang.',
  account_not_approved: 'Akun belum disetujui atau telah dinonaktifkan. Hubungi administrator.',
  registration_conflict: 'Email atau NIM sudah terdaftar.',
  invalid_credentials: 'Email atau kata sandi tidak sesuai.',
  password_policy: 'Gunakan kata sandi sepanjang 12–128 karakter.',
  invalid_current_password: 'Kata sandi saat ini tidak sesuai.',
  account_locked: 'Terlalu banyak percobaan masuk. Coba lagi setelah 15 menit.',
  enrollment_already_open: 'Masih ada pendaftaran wajah yang belum selesai. Muat ulang daftar.',
  duplicate_sample: 'Foto ini sudah digunakan. Pilih foto yang berbeda.',
  sample_limit_reached: 'Dua belas sampel sudah tersimpan. Hapus satu sampel sebelum menggantinya.',
  twelve_varied_samples_required: 'Lengkapi 12 foto, sedikitnya dua foto untuk setiap arah wajah.',
  face_not_found: 'Wajah belum terdeteksi. Gunakan foto yang terang dengan wajah terlihat jelas.',
  exactly_one_face_required: 'Gunakan foto dengan tepat satu wajah.',
  embedding_worker_unavailable:
    'Pemrosesan foto belum tersedia. Coba kembali atau hubungi administrator.',
  image_too_large: 'Ukuran foto maksimal 5 MiB.',
  jpeg_or_png_required: 'Gunakan foto JPEG atau PNG.',
  duplicate_course: 'Pilih hanya satu kelas untuk setiap mata kuliah.',
  class_capacity_exceeded: 'Kapasitas kelas tidak mencukupi. Periksa pilihan kelas.',
  revision_conflict: 'Data telah berubah. Muat ulang sebelum menyimpan koreksi.',
  session_revision_conflict: 'Sesi telah berubah. Muat ulang sebelum menyimpan.',
  attendance_revision_conflict: 'Presensi telah berubah. Muat ulang sebelum menyimpan koreksi.',
  device_exists: 'ID perangkat sudah digunakan.',
  session_conflict: 'Waktu bertabrakan dengan kelas, dosen, atau ruangan lain.',
  cannot_disable_own_account: 'Status akun Anda sendiri tidak dapat diubah.',
  historical_term_is_immutable: 'Semester yang sudah memiliki sesi berlangsung tidak dapat diubah.',
}
export function errorMessage(status: number, code: string) {
  return (
    messages[code] ||
    (status === 0
      ? 'Tidak dapat menghubungi server. Periksa koneksi, lalu coba lagi.'
      : status === 401
        ? 'Sesi berakhir atau informasi masuk tidak sesuai. Silakan masuk kembali.'
        : status === 403
          ? 'Anda tidak memiliki akses untuk tindakan ini.'
          : status === 404
            ? 'Data tidak ditemukan. Muat ulang halaman.'
            : status === 409
              ? 'Data berubah atau tindakan tidak sesuai status saat ini. Muat ulang dan periksa kembali.'
              : status === 413
                ? 'Berkas terlalu besar. Gunakan foto maksimal 5 MiB.'
                : status === 429
                  ? 'Layanan sedang sibuk. Tunggu sejenak sebelum mencoba lagi.'
                  : status >= 500
                    ? 'Layanan sedang tidak tersedia. Coba kembali beberapa saat lagi.'
                    : 'Data belum dapat diproses. Periksa isian dan persyaratan tindakan ini.')
  )
}
export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal; anonymous?: boolean } = {},
): Promise<T> {
  const token = options.anonymous ? null : readSession()?.access_token
  const headers = new Headers({ Accept: 'application/json' })
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const multipart = options.body instanceof FormData
  if (options.body !== undefined && !multipart) headers.set('Content-Type', 'application/json')
  let response: Response
  try {
    response = await fetch(`/api/v1${path}`, {
      method: options.method || 'GET',
      headers,
      credentials: 'omit',
      cache: 'no-store',
      signal: options.signal,
      body:
        options.body === undefined
          ? undefined
          : multipart
            ? (options.body as FormData)
            : JSON.stringify(options.body),
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    throw new ApiError(0, 'network_error')
  }
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    if (response.status === 401 && token && token === readSession()?.access_token) setSession(null)
    throw new ApiError(response.status, payload.error || 'request_failed')
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: false, refetchOnWindowFocus: true },
    mutations: { retry: false, gcTime: 0 },
  },
})
export function useApi<T>(path: string, enabled = true) {
  return useQuery({ queryKey: [path], queryFn: ({ signal }) => api<T>(path, { signal }), enabled })
}
export function useAction<T, V>(
  action: (value: V) => Promise<T>,
  refresh: { catalog?: boolean; profile?: boolean } = {},
) {
  return useMutation({
    mutationFn: action,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        predicate: (query) => {
          // Academic references and account identity do not change on routine workflow writes.
          // Avoid six catalog requests and /auth/me after every uploaded photo or correction.
          if (query.queryKey[0] === 'catalog') return refresh.catalog === true
          if (query.queryKey[0] === 'me') return refresh.profile === true
          return true
        },
      })
    },
  })
}
export async function allPages<T>(path: string, signal?: AbortSignal): Promise<T[]> {
  const records: T[] = []
  for (let page = 1; ; page++) {
    const rows = await api<T[]>(`${path}?page=${page}`, { signal })
    records.push(...rows)
    if (rows.length < 100) return records
  }
}
