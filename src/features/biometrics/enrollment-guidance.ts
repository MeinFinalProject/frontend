import type { EnrollmentStatus } from '@/lib/contracts'
export function enrollmentMessage(data: EnrollmentStatus) {
  const status = data.latest_enrollment?.biometric_enrollment_status
  if (status === 'draft')
    return {
      title: 'Lanjutkan pendaftaran wajah',
      description: `${data.latest_sample_count} dari ${data.required_samples} sampel tersimpan. Lengkapi foto sesuai panduan, lalu ajukan untuk verifikasi.`,
    }
  if (status === 'submitted')
    return {
      title: 'Menunggu verifikasi identitas',
      description:
        'Foto sudah diajukan. Administrator perlu memverifikasi identitas Anda sebelum sampel baru diaktifkan.',
    }
  if (status === 'rejected')
    return {
      title: 'Pendaftaran perlu diulang',
      description:
        data.latest_enrollment!.biometric_enrollment_review_note ||
        'Baca catatan administrator, lalu buat pendaftaran baru dengan foto yang sesuai.',
    }
  if (status === 'revoked')
    return {
      title: 'Pendaftaran terakhir dicabut',
      description:
        'Untuk menggunakan sampel baru, buat pendaftaran wajah dan berikan persetujuan kembali.',
    }
  if (status === 'approved' && data.active_sample_count > 0)
    return {
      title: 'Pendaftaran wajah disetujui',
      description:
        'Sampel yang sesuai dengan model pengenalan aktif tersedia di server. Tetap periksa catatan kehadiran setelah melewati perangkat.',
    }
  if (status === 'approved')
    return {
      title: 'Sampel wajah perlu diperiksa',
      description:
        'Pendaftaran disetujui, tetapi tidak ada sampel aktif yang sesuai untuk pengenalan. Hubungi administrator sebelum pendaftaran ulang.',
    }
  return {
    title: 'Mulai pendaftaran wajah',
    description:
      'Baca persetujuan penggunaan biometrik, lalu siapkan 12 foto melalui kamera atau unggah berkas.',
  }
}
