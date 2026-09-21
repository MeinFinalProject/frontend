export const roles = { administrator: 'Administrator', lecturer: 'Dosen', student: 'Mahasiswa' }
export const labels: Record<string, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  disabled: 'Nonaktif',
  draft: 'Draf',
  submitted: 'Menunggu persetujuan',
  corrections: 'Perlu perbaikan',
  withdrawn: 'Ditarik',
  revoked: 'Dicabut',
  scheduled: 'Terjadwal',
  cancelled: 'Dibatalkan',
  closed: 'Selesai',
  present: 'Hadir',
  late: 'Terlambat',
  excused: 'Izin',
  absent: 'Tidak hadir',
  frontal: 'Depan',
  left: 'Kiri',
  right: 'Kanan',
  up: 'Atas',
  down: 'Bawah',
}
export function dateTime(value: string | null | undefined) {
  return value
    ? new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Jakarta',
      }).format(new Date(value)) + ' WIB'
    : '—'
}
export function dateOnly(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: 'Asia/Jakarta' }).format(
    new Date(value),
  )
}
export function percentage(value: number | null) {
  return value === null
    ? 'Belum tersedia'
    : new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(value) + '%'
}
export function toWib(value: string) {
  return `${value}:00+07:00`
}
export function localWib(value: string) {
  const d = new Date(Date.parse(value) + 7 * 60 * 60 * 1000)
  return d.toISOString().slice(0, 16)
}
export function todayWib() {
  return localWib(new Date().toISOString()).slice(0, 10)
}
