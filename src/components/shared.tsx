import { useId, type ReactNode } from 'react'
import { ArrowRight, CheckCircle2, Inbox, LoaderCircle, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { labels } from '@/lib/format'
import { cn } from '@/lib/utils'

export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="page-title">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        <p className="muted mt-2 max-w-2xl">{description}</p>
      </div>
      {action}
    </div>
  )
}
export function Panel({
  title,
  description,
  children,
  action,
  className,
}: {
  title?: string
  description?: string
  children: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <section className={cn('panel', className)}>
      {title && (
        <div className="panel-heading">
          <div>
            <h2>{title}</h2>
            {description && <p className="muted text-sm mt-1">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
export function Field({
  label,
  hint,
  children,
  ...props
}: React.ComponentProps<typeof Input> & { label: string; hint?: string; children?: ReactNode }) {
  const generated = useId()
  const id = props.id || generated
  return (
    <div className="field">
      <Label htmlFor={id}>{label}</Label>
      {children ? (
        <div id={id}>{children}</div>
      ) : (
        <Input {...props} id={id} aria-describedby={hint ? `${id}-hint` : undefined} />
      )}
      {hint && (
        <p id={`${id}-hint`} className="text-xs muted leading-relaxed">
          {hint}
        </p>
      )}
    </div>
  )
}
export function SelectField({
  label,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const id = useId()
  return (
    <div className="field">
      <Label htmlFor={id}>{label}</Label>
      <select {...props} id={id} className="select">
        {children}
      </select>
    </div>
  )
}
export function Notice({
  children,
  tone = 'info',
}: {
  children: ReactNode
  tone?: 'info' | 'success' | 'error'
}) {
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'error' ? TriangleAlert : Inbox
  return (
    <div className={`notice notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  )
}
export function ErrorNotice({ error }: { error: unknown }) {
  return error ? (
    <Notice tone="error">
      {error instanceof Error ? error.message : 'Terjadi kendala. Silakan coba kembali.'}
    </Notice>
  ) : null
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="animate-spin" size={20} />
      Memuat data…
    </div>
  )
}
export function Empty({
  title = 'Belum ada data',
  description = 'Data akan muncul di sini setelah tersedia.',
}: {
  title?: string
  description?: string
}) {
  return (
    <div className="empty">
      <Inbox size={28} />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )
}
export function Status({ value }: { value: string }) {
  const tone = ['approved', 'present', 'closed'].includes(value)
    ? 'positive'
    : ['submitted', 'pending', 'corrections', 'late', 'draft'].includes(value)
      ? 'warning'
      : ['rejected', 'disabled', 'revoked', 'absent', 'cancelled'].includes(value)
        ? 'negative'
        : 'neutral'
  return (
    <span className={`status status-${tone}`}>
      <span className="status-dot" />
      {labels[value] || value}
    </span>
  )
}
export function Table({
  headers,
  children,
  caption,
}: {
  headers: string[]
  children: ReactNode
  caption: string
}) {
  return (
    <div className="table-scroll" tabIndex={0} role="region" aria-label={caption}>
      <table>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}
export function Modal({
  title,
  description,
  open,
  onClose,
  children,
}: {
  title: string
  description: string
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose()
      }}
    >
      <DialogContent className="sm:max-w-xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}
export function Submit({
  pending,
  children = 'Simpan perubahan',
  disabled,
}: {
  pending: boolean
  children?: ReactNode
  disabled?: boolean
}) {
  return (
    <Button type="submit" disabled={pending || disabled}>
      {pending && <LoaderCircle size={16} className="animate-spin" />}
      {pending ? 'Memproses…' : children}
    </Button>
  )
}
export function PageLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link className="text-link" to={to}>
      {children}
      <ArrowRight size={15} />
    </Link>
  )
}
export function LimitNotice({ count, limit }: { count: number; limit: number }) {
  return count >= limit ? (
    <Notice>
      Daftar mencapai batas {limit} data terbaru dari server. Gunakan filter bila tersedia untuk
      mempersempit hasil.
    </Notice>
  ) : null
}
