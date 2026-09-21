import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface OperationalStatus {
  device_id: string
  connected: boolean
  healthy: boolean
  attendance_ready: boolean
  reasons: string[]
  expected_gallery_version: string | null
  latest: {
    device_last_seen_at: string
    device_runtime_state: string
    device_frame_age_ms: number | null
    device_installed_gallery_version: string
    device_installed_template_count: number
    device_outbox_pending_count: number
    device_outbox_dead_count: number
  } | null
}
export function useOperationalStatus() {
  return useQuery({
    queryKey: ['/admin/devices/operational-status'],
    queryFn: ({ signal }) =>
      api<OperationalStatus[]>('/admin/devices/operational-status', { signal }),
    refetchInterval: 15_000,
  })
}
