import { paths } from '@/config/paths'
import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Fingerprint,
  GraduationCap,
  LayoutGrid,
  LogOut,
  Menu,
  Monitor,
  Settings2,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/features/auth/auth-context'
import { roles } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { ErrorNotice } from '@/components/shared'
import type { Role } from '@/lib/contracts'

const navigation: { to: string; title: string; icon: LucideIcon; roles?: Role[] }[] = [
  { to: '/', title: 'Ringkasan', icon: LayoutGrid },
  { to: paths.sessions, title: 'Perkuliahan', icon: CalendarDays },
  { to: paths.registrations, title: 'Rencana studi', icon: BookOpen },
  { to: paths.myAttendance, title: 'Presensi saya', icon: ClipboardCheck, roles: ['student'] },
  {
    to: paths.enrollments,
    title: 'Pendaftaran wajah',
    icon: Fingerprint,
    roles: ['student', 'administrator'],
  },
  { to: paths.academic, title: 'Data akademik', icon: GraduationCap, roles: ['administrator'] },
  { to: paths.accounts, title: 'Akun & mahasiswa', icon: Users, roles: ['administrator'] },
  {
    to: paths.activity,
    title: 'Aktivitas presensi',
    icon: ClipboardCheck,
    roles: ['administrator'],
  },
  { to: paths.devices, title: 'Perangkat', icon: Monitor, roles: ['administrator'] },
  { to: paths.settings, title: 'Pengaturan akun', icon: Settings2 },
]
export function Layout() {
  const { account, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<unknown>()
  const [busy, setBusy] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (open) closeButton.current?.focus()
  }, [open])
  const location = useLocation()
  if (!account) return null
  const links = navigation.filter((n) => !n.roles || n.roles.includes(account.account_role))
  async function signOut() {
    setBusy(true)
    try {
      await logout()
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div
      className="app-shell"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          setOpen(false)
          menuButton.current?.focus()
        }
      }}
    >
      <a className="skip-link" href="#main">
        Lewati ke konten
      </a>
      {open && (
        <button className="nav-scrim" aria-label="Tutup navigasi" onClick={() => setOpen(false)} />
      )}
      <aside id="main-navigation" className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <span className="brand-icon">
            <GraduationCap size={23} />
          </span>
          <span>
            Presensi<span className="brand-sub">PORTAL AKADEMIK</span>
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="mobile-only ml-auto"
            aria-label="Tutup menu"
            ref={closeButton}
            onClick={() => {
              setOpen(false)
              menuButton.current?.focus()
            }}
          >
            <X />
          </Button>
        </div>
        <p className="sidebar-label">RUANG {roles[account.account_role].toUpperCase()}</p>
        <nav aria-label="Navigasi utama">
          {links.map(({ to, title, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}
            >
              <Icon size={19} />
              {title}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="profile-avatar">{account.account_name.slice(0, 1).toUpperCase()}</div>
          <div className="min-w-0">
            <p className="truncate font-medium text-sm">{account.account_name}</p>
            <p className="muted text-xs mt-1">{roles[account.account_role]}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto shrink-0"
            aria-label="Keluar"
            disabled={busy}
            onClick={() => void signOut()}
          >
            <LogOut size={17} />
          </Button>
        </div>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <Button
            variant="ghost"
            size="icon"
            className="mobile-only"
            aria-label="Buka menu"
            aria-controls="main-navigation"
            aria-expanded={open}
            ref={menuButton}
            onClick={() => setOpen(true)}
          >
            <Menu />
          </Button>
          <span className="muted text-sm">
            Portal akademik <span className="mx-2 text-border">/</span>
            <span className="text-foreground font-medium">
              {links.find((x) => x.to === location.pathname)?.title || 'Detail perkuliahan'}
            </span>
          </span>
          <span className="topbar-role">{roles[account.account_role]}</span>
        </header>
        <main id="main" tabIndex={-1} className="main-content">
          <ErrorNotice error={error} />
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>Presensi · Sistem kehadiran akademik</span>
          <span>Waktu perkuliahan ditampilkan dalam WIB</span>
        </footer>
      </div>
    </div>
  )
}
