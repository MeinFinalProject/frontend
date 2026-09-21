import { useQuery } from '@tanstack/react-query'
import { allPages, api } from '@/lib/api'
import type { Class, Course, Lecturer, Program, Room, Term } from '@/lib/contracts'
export function useCatalog() {
  return useQuery({
    queryKey: ['catalog'],
    queryFn: async ({ signal }) => {
      const [programs, terms, courses, rooms, classes, lecturers] = await Promise.all([
        allPages<Program>('/academic/study-programs', signal),
        allPages<Term>('/academic/terms', signal),
        allPages<Course>('/academic/courses', signal),
        allPages<Room>('/academic/classrooms', signal),
        allPages<Class>('/academic/classes', signal),
        api<Lecturer[]>('/academic/lecturers', { signal }),
      ])
      return { programs, terms, courses, rooms, classes, lecturers }
    },
  })
}
export type Catalog = NonNullable<ReturnType<typeof useCatalog>['data']>
export function className(catalog: Catalog | undefined, id: string) {
  const c = catalog?.classes.find((c) => c.academic_class_id === id)
  const course = catalog?.courses.find((x) => x.course_id === c?.course_id)
  return c
    ? `${course?.course_name || 'Mata kuliah'} · ${c.academic_class_name}`
    : 'Kelas tidak tersedia'
}
export function termName(catalog: Catalog | undefined, id: string) {
  return (
    catalog?.terms.find((t) => t.academic_term_id === id)?.academic_term_name ||
    'Semester tidak tersedia'
  )
}
export function roomName(catalog: Catalog | undefined, id: string) {
  return (
    catalog?.rooms.find((r) => r.classroom_id === id)?.classroom_name || 'Ruangan tidak tersedia'
  )
}
