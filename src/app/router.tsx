import { Suspense, lazy } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import { paths } from '@/config/paths'
import { RequireAuth } from '@/features/auth/auth-context'
import { LoginPage } from '@/features/auth/login'
import { Loading } from '@/components/shared'
import { Layout } from './layout'
const Dashboard = lazy(() =>
  import('@/features/dashboard/dashboard').then((m) => ({ default: m.Dashboard })),
)
const Catalog = lazy(() =>
  import('@/features/academic/catalog-page').then((m) => ({ default: m.CatalogPage })),
)
const Accounts = lazy(() =>
  import('@/features/accounts/accounts-page').then((m) => ({ default: m.AccountsPage })),
)
const Registrations = lazy(() =>
  import('@/features/registrations/registrations-page').then((m) => ({
    default: m.RegistrationsPage,
  })),
)
const Sessions = lazy(() =>
  import('@/features/sessions/sessions-page').then((m) => ({ default: m.SessionsPage })),
)
const SessionDetail = lazy(() =>
  import('@/features/attendance/session-detail').then((m) => ({ default: m.SessionDetailPage })),
)
const Summary = lazy(() =>
  import('@/features/attendance/session-detail').then((m) => ({ default: m.ClassSummaryPage })),
)
const Attendance = lazy(() =>
  import('@/features/attendance/student-attendance').then((m) => ({
    default: m.StudentAttendancePage,
  })),
)
const Enrollment = lazy(() =>
  import('@/features/biometrics/enrollment-page').then((m) => ({ default: m.EnrollmentPage })),
)
const Activity = lazy(() =>
  import('@/features/devices/activity-page').then((m) => ({ default: m.ActivityPage })),
)
const Devices = lazy(() =>
  import('@/features/devices/devices-page').then((m) => ({ default: m.DevicesPage })),
)
const Settings = lazy(() =>
  import('@/features/auth/settings').then((m) => ({ default: m.SettingsPage })),
)

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          {/* Preserve pre-release authentication bookmarks; canonical URLs stay English. */}
          <Route path="/masuk" element={<Navigate to={paths.login} replace />} />
          <Route path="/daftar" element={<Navigate to={paths.register} replace />} />
          <Route path={paths.login} element={<LoginPage />} />
          <Route path={paths.register} element={<LoginPage key="register" register />} />
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path={paths.sessions} element={<Sessions />} />
            <Route
              path={paths.sessionPattern}
              element={
                <RequireAuth roles={['administrator', 'lecturer']}>
                  <SessionDetail />
                </RequireAuth>
              }
            />
            <Route
              path={paths.classAttendancePattern}
              element={
                <RequireAuth roles={['administrator', 'lecturer']}>
                  <Summary />
                </RequireAuth>
              }
            />
            <Route path={paths.registrations} element={<Registrations />} />
            <Route
              path={paths.myAttendance}
              element={
                <RequireAuth roles={['student']}>
                  <Attendance />
                </RequireAuth>
              }
            />
            <Route
              path={paths.enrollments}
              element={
                <RequireAuth roles={['administrator', 'student']}>
                  <Enrollment />
                </RequireAuth>
              }
            />
            <Route
              path={paths.academic}
              element={
                <RequireAuth roles={['administrator']}>
                  <Catalog />
                </RequireAuth>
              }
            />
            <Route
              path={paths.accounts}
              element={
                <RequireAuth roles={['administrator']}>
                  <Accounts />
                </RequireAuth>
              }
            />
            <Route
              path={paths.activity}
              element={
                <RequireAuth roles={['administrator']}>
                  <Activity />
                </RequireAuth>
              }
            />
            <Route
              path={paths.devices}
              element={
                <RequireAuth roles={['administrator']}>
                  <Devices />
                </RequireAuth>
              }
            />
            <Route path={paths.settings} element={<Settings />} />
            <Route
              path="*"
              element={
                <div className="space-y-5">
                  <h1>Halaman tidak ditemukan</h1>
                  <p className="muted">Alamat yang Anda buka belum tersedia.</p>
                  <Link className="text-link" to={paths.home}>
                    Kembali ke ringkasan
                  </Link>
                </div>
              }
            />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
