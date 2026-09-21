import { useQuery } from '@tanstack/react-query'
import { api, useApi } from '@/lib/api'
import type { Student, StudentAttendance } from '@/lib/contracts'
export function useStudentAttendance() {
  const profile = useApi<Student>('/academic/my-profile')
  const path = `/attendance/students/${profile.data?.student_id}`
  const attendance = useQuery({
    queryKey: [path],
    queryFn: ({ signal }) => api<StudentAttendance>(path, { signal }),
    enabled: !!profile.data,
    refetchInterval: 30_000,
  })
  return { profile, attendance }
}
