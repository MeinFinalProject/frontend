import type { Roster, RosterRow, Summary } from '@/lib/contracts'
import { dateTime, labels } from '@/lib/format'

export type ClassReportRow = { student: RosterRow['student']; summary: Summary }
type Cell = string | number | boolean | null | undefined

export function csv(rows: Cell[][]) {
  // Quote every field, preserve newlines/quotes, and neutralize spreadsheet formulas.
  const cell = (value: Cell) => {
    let text = value == null ? '' : String(value)
    if (/^[\s\uFEFF]*[=+\-@＝＋－＠]/u.test(text) || /^[\t\r\n]/u.test(text)) text = `'${text}`
    return `"${text.replaceAll('"', '""')}"`
  }
  return '\uFEFF' + rows.map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n'
}

export function sessionReport(data: Roster, classLabel: string, exportedAt: string) {
  return csv([
    ['Laporan presensi per sesi'],
    ['Kelas', classLabel],
    ['Mata kuliah', data.session.teaching_session_course_name],
    ['Mulai (WIB)', dateTime(data.session.teaching_session_start)],
    ['Selesai (WIB)', dateTime(data.session.teaching_session_end)],
    [
      'Status sesi',
      labels[data.session.teaching_session_status] ?? data.session.teaching_session_status,
    ],
    ['Diekspor pada (WIB)', dateTime(exportedAt)],
    ['Keterangan', 'Salinan data server saat ekspor. Sesi dibatalkan tidak dihitung dalam rekap.'],
    [],
    ['NIM', 'Nama mahasiswa', 'Status presensi', 'Waktu tercatat (WIB)', 'Sumber'],
    ...data.students.map(({ student, status, attendance }) => [
      student.student_number,
      student.account_name,
      status === 'pending' ? 'Belum tercatat' : (labels[status] ?? status),
      attendance?.session_attendance_occurred_at
        ? dateTime(attendance.session_attendance_occurred_at)
        : '',
      attendance?.session_attendance_source === 'manual'
        ? 'Koreksi manual'
        : attendance?.session_attendance_source === 'automatic'
          ? 'Perangkat Edge'
          : (attendance?.session_attendance_source ?? ''),
    ]),
  ])
}

export function classReport(data: ClassReportRow[], classLabel: string, exportedAt: string) {
  return csv([
    ['Rekap kehadiran kelas'],
    ['Kelas', classLabel],
    ['Diekspor pada (WIB)', dateTime(exportedAt)],
    [
      'Perhitungan',
      'Hanya sesi selesai; hadir dan terlambat dihitung sebagai kehadiran; izin dikecualikan dari pembagi.',
    ],
    [
      'Keterangan',
      'Kolom persentase kosong berarti belum dapat dihitung. Nilai mengikuti backend.',
    ],
    [],
    [
      'NIM',
      'Nama mahasiswa',
      'Sesi selesai',
      'Hadir',
      'Terlambat',
      'Izin',
      'Tidak hadir',
      'Kehadiran (%)',
      'Minimum (%)',
      'Di bawah minimum',
    ],
    ...data.map(({ student, summary: s }) => [
      student.student_number,
      student.account_name,
      s.held_sessions,
      s.present,
      s.late,
      s.excused,
      s.absent,
      s.percentage,
      s.minimum_percentage,
      s.below_minimum === null ? '' : s.below_minimum ? 'Ya' : 'Tidak',
    ]),
  ])
}
