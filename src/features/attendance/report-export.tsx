import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNotice } from '@/components/shared'
import { api } from '@/lib/api'
import type { Roster } from '@/lib/contracts'
import { classReport, sessionReport, type ClassReportRow } from './report'

export function ReportExport({
  id,
  kind,
  classLabel,
}: {
  id: string
  kind: 'session' | 'class'
  classLabel: string
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>()
  async function download() {
    setBusy(true)
    setError(undefined)
    try {
      // Fresh authorized reads prevent an export from silently using an old query cache.
      const data =
        kind === 'session'
          ? await api<Roster>(`/attendance/sessions/${id}`)
          : await api<ClassReportRow[]>(`/attendance/classes/${id}/summary`)
      const now = new Date().toISOString()
      const content =
        kind === 'session'
          ? sessionReport(data as Roster, classLabel, now)
          : classReport(data as ClassReportRow[], classLabel, now)
      const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `attendance-${kind}-${id}-${now.slice(0, 10)}.csv`
      document.body.append(link)
      link.click()
      link.remove()
      // Allow the browser to begin reading the Blob before releasing it.
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="space-y-2">
      <Button variant="outline" disabled={busy} onClick={() => void download()}>
        <Download size={16} />
        {busy ? 'Menyiapkan laporan…' : 'Unduh CSV'}
      </Button>
      <ErrorNotice error={error} />
    </div>
  )
}
