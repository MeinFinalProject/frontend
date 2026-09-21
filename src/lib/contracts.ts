// Wire names follow the backend's snake_case OpenAPI contract.
export type Role = 'administrator' | 'lecturer' | 'student'
export interface Account {
  account_id: string
  account_email: string
  account_name: string
  account_role: Role
  account_status: string
}
export interface Login {
  access_token: string
  token_type: string
  expires_at: string
  role: Role
  account_id: string
}
export interface Program {
  study_program_id: string
  study_program_code: string
  study_program_name: string
  study_program_active: boolean
}
export interface Term {
  academic_term_id: string
  academic_term_name: string
  academic_term_start: string
  academic_term_end: string
  academic_term_minimum_attendance: number
  academic_term_active: boolean
}
export interface Course {
  course_id: string
  study_program_id: string
  course_code: string
  course_name: string
  course_credits: number
  course_active: boolean
}
export interface Room {
  classroom_id: string
  classroom_code: string
  classroom_name: string
  classroom_active: boolean
}
export interface Class {
  academic_class_id: string
  academic_term_id: string
  course_id: string
  lecturer_id: string
  academic_class_name: string
  academic_class_capacity: number
  academic_class_active: boolean
}
export interface Lecturer {
  lecturer_id: string
  lecturer_number: string
  account_id: string
  account_name: string
}
export interface Student {
  student_id: string
  account_id: string
  study_program_id: string
  advisor_lecturer_id: string | null
  student_number: string
  student_phone: string
  student_entry_year: number
}
export interface StudentRow {
  student: Student
  account_name: string
  account_status: string
}
export interface Registration {
  course_registration_id: string
  student_id: string
  academic_term_id: string
  course_registration_status: string
  course_registration_review_note: string
  course_registration_submitted_at: string | null
}
export interface RegistrationDetail {
  registration: Registration
  classes: { academic_class_id: string }[]
}
export interface Session {
  teaching_session_id: string
  academic_class_id: string
  classroom_id: string
  teaching_session_start: string
  teaching_session_end: string
  teaching_session_status: string
  teaching_session_course_name: string
  teaching_session_revision: number
  teaching_session_early_minutes: number
  teaching_session_late_minutes: number
  teaching_session_checkin_minutes: number
}
export interface Attendance {
  session_attendance_revision: number
  session_attendance_status: string
  session_attendance_source: string
  session_attendance_occurred_at: string | null
}
export interface RosterRow {
  student: { student_id: string; student_number: string; account_name: string }
  attendance: Attendance | null
  status: string
}
export interface Roster {
  session: Session
  students: RosterRow[]
}
export interface Summary {
  class_id: string
  held_sessions: number
  present: number
  late: number
  excused: number
  absent: number
  percentage: number | null
  minimum_percentage: number
  below_minimum: boolean | null
}
export interface StudentAttendance {
  student_id: string
  summaries: Summary[]
  sessions: { session: Session; status: string; attendance: Attendance | null }[]
  ongoing_sessions: { session: Session; status: string; attendance: Attendance | null }[]
}
export interface EnrollmentStatus {
  latest_enrollment: Enrollment | null
  latest_sample_count: number
  active_sample_count: number
  required_samples: number
}
export interface Enrollment {
  biometric_enrollment_id: string
  student_id: string
  biometric_enrollment_status: string
  biometric_enrollment_created_at: string
  biometric_enrollment_review_note: string
}
export interface Sample {
  biometric_template_id: string
  biometric_template_pose: string
  biometric_template_active: boolean
}
export interface EnrollmentDetail {
  enrollment: Enrollment
  samples: Sample[]
  required_samples: number
  minimum_per_orientation: number
  orientations: string[]
}
export interface Device {
  device_id: string
  device_name: string
  device_enabled: boolean
  device_created_at: string
  device_credential_changed_at: string
}
export interface DeviceActivity {
  latest_received_observation: { attendance_received_at: string } | null
  room_assignments: { classroom_id: string; device_room_assignment_valid_until: string | null }[]
}
