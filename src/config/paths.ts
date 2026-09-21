// Browser URLs are English; visible navigation labels are localized separately.
export const paths = {
  home: '/',
  login: '/login',
  register: '/register',
  sessions: '/sessions',
  sessionPattern: '/sessions/:id',
  session: (id: string) => `/sessions/${encodeURIComponent(id)}`,
  classAttendancePattern: '/classes/:id/attendance',
  classAttendance: (id: string) => `/classes/${encodeURIComponent(id)}/attendance`,
  registrations: '/course-registrations',
  myAttendance: '/my-attendance',
  enrollments: '/biometric-enrollments',
  academic: '/academic',
  accounts: '/accounts',
  activity: '/attendance-activity',
  devices: '/devices',
  settings: '/settings',
} as const
