import { describe, expect, it } from 'vitest'
import { csv, classReport } from '../../src/features/attendance/report'
import { suggestedPose } from '../../src/features/biometrics/photo'
import { enrollmentMessage } from '../../src/features/biometrics/enrollment-guidance'
import type { EnrollmentStatus } from '../../src/lib/contracts'

describe('spreadsheet report boundaries', () => {
  it('quotes delimiters, quotes and multiline fields with UTF-8 BOM and CRLF records', () => {
    expect(csv([['Nama, mahasiswa', '"kutipan"', 'baris\nberikut', null]])).toBe(
      '\uFEFF"Nama, mahasiswa","""kutipan""","baris\nberikut",""\r\n',
    )
  })
  it('neutralizes formula cells including leading whitespace and control characters', () => {
    for (const attack of [
      '=1+1',
      '+SUM(1)',
      '-1+2',
      '@SUM(1)',
      '  =1',
      '\t=1',
      '\r=1',
      '\n=1',
      '＝1',
    ])
      expect(csv([[attack]])).toContain(`"'${attack}"`)
  })
  it('keeps an unavailable percentage empty, without inventing zero or recomputing it', () => {
    const report = classReport(
      [
        {
          student: { student_id: 's', student_number: '001', account_name: 'Mahasiswa' },
          summary: {
            class_id: 'c',
            held_sessions: 1,
            present: 0,
            late: 0,
            excused: 1,
            absent: 0,
            percentage: null,
            minimum_percentage: 85,
            below_minimum: null,
          },
        },
      ],
      'Kelas uji',
      '2026-09-21T00:00:00Z',
    )
    expect(report).toContain('"001","Mahasiswa","1","0","0","1","0","","85",""')
  })
})
describe('student enrollment guidance', () => {
  it('resumes from persisted pose counts and returns to a missing orientation after deletion', () => {
    const samples = ['frontal', 'frontal', 'left'].map((pose) => ({
      biometric_template_pose: pose,
    }))
    expect(suggestedPose(samples)).toBe('left')
    samples.push({ biometric_template_pose: 'left' })
    expect(suggestedPose(samples)).toBe('right')
    samples.shift()
    expect(suggestedPose(samples)).toBe('frontal')
  })
  it('distinguishes approval from usable samples and a replacement draft', () => {
    const data: EnrollmentStatus = {
      latest_enrollment: {
        biometric_enrollment_id: 'e',
        student_id: 's',
        biometric_enrollment_created_at: '',
        biometric_enrollment_review_note: '',
        biometric_enrollment_status: 'approved',
      },
      latest_sample_count: 12,
      active_sample_count: 0,
      required_samples: 12,
    }
    expect(enrollmentMessage(data).title).toBe('Sampel wajah perlu diperiksa')
    expect(enrollmentMessage({ ...data, active_sample_count: 12 }).title).toBe(
      'Pendaftaran wajah disetujui',
    )
    expect(
      enrollmentMessage({
        ...data,
        active_sample_count: 12,
        latest_enrollment: { ...data.latest_enrollment!, biometric_enrollment_status: 'draft' },
      }).title,
    ).toBe('Lanjutkan pendaftaran wajah')
  })
})
