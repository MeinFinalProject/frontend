import { test, expect, type Page } from '@playwright/test'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

const fixture = () =>
  JSON.parse(process.env.E2E_FIXTURE!) as { password: string; room_id: string; model_hash: string }
async function removeScratch(scratch: string) {
  if (
    path.dirname(path.resolve(scratch)) !== path.resolve(tmpdir()) ||
    !path.basename(scratch).startsWith('ta-realtime-test-')
  )
    throw new Error('Unexpected native probe scratch path')
  await rm(scratch, { recursive: true, force: true })
}
async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill('admin@e2e.invalid')
  await page.getByLabel('Kata sandi', { exact: true }).fill(fixture().password)
  await page.getByRole('button', { name: 'Masuk ke portal' }).click()
  await expect(page).toHaveURL('http://localhost:5174/')
}
async function api(page: Page, endpoint: string, method: string, body?: unknown) {
  return page.evaluate(
    async ({ endpoint, method, body }) => {
      const token = JSON.parse(sessionStorage.getItem('ta.session.v1')!).access_token as string
      const response = await fetch('/api/v1' + endpoint, {
        method,
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      if (!response.ok) throw new Error(`API test failed: ${response.status}`)
      return response.status === 204 ? null : response.json()
    },
    { endpoint, method, body },
  )
}

test('SignalR updates another administrator without navigation or manual refresh', async ({
  page,
  browser,
}) => {
  let received = false
  page.on('websocket', (socket) =>
    socket.on('framereceived', (event) => {
      if (String(event.payload).includes('invalidate')) received = true
    }),
  )
  await login(page)
  await page.goto('/devices')
  const context = await browser.newContext()
  try {
    const other = await context.newPage()
    await login(other)
    const id = 'live-' + Date.now()
    await api(other, '/admin/devices', 'POST', {
      device_id: id,
      device_name: 'Perangkat Uji Langsung',
    })
    // Device list has no polling. Only a SignalR invalidation can add this row here.
    await expect(page.getByRole('row').filter({ hasText: id })).toContainText('Tidak terhubung', {
      timeout: 8000,
    })
    await expect.poll(() => received).toBe(true)
    await page.context().setOffline(true)
    const missedId = id + '-offline'
    await api(other, '/admin/devices', 'POST', {
      device_id: missedId,
      device_name: 'Perangkat Saat Portal Terputus',
    })
    await page.context().setOffline(false)
    await expect(page.getByRole('row').filter({ hasText: missedId })).toBeVisible()
  } finally {
    await context.close()
  }
})

test('Windows native channel, gallery notification and operational readiness reach the portal', async ({
  page,
}) => {
  test.skip(
    !process.env.EDGE_REALTIME_PROBE,
    'Set EDGE_REALTIME_PROBE to the built Windows integration probe.',
  )
  test.setTimeout(100_000)
  await login(page)
  const id = 'native-' + Date.now()
  const credential = (await api(page, '/admin/devices', 'POST', {
    device_id: id,
    device_name: 'Native Integration Probe',
  })) as { token: string }
  await api(page, `/admin/devices/${id}/classroom`, 'PUT', { classroom_id: fixture().room_id })
  const scratch = await mkdtemp(path.join(tmpdir(), 'ta-realtime-test-'))
  const probe = spawn(
    process.env.EDGE_REALTIME_PROBE!,
    [fixture().model_hash, 'https://localhost:7243/api/v1', scratch],
    {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, TA_TEST_DEVICE_TOKEN: credential.token },
    },
  )
  let notifications = 0
  probe.stdout.on('data', (data: Buffer) => {
    notifications += (data.toString().match(/RECONCILE/g) || []).length
  })
  probe.stderr.on('data', () => {
    /* no private diagnostics */
  })
  const frames = setInterval(() => {
    if (!probe.killed && probe.exitCode === null) probe.stdin.write('frame\n')
  }, 1000)
  const stopped = once(probe, 'exit')
  try {
    await page.goto('/devices')
    const row = page.getByRole('row').filter({ hasText: id })
    await expect.poll(() => notifications).toBeGreaterThan(0)
    await expect(row).toContainText('Perlu perhatian')
    await row.getByRole('button', { name: 'Kelola perangkat' }).click()
    const details = page.getByRole('dialog')
    await expect(details).toContainText('Belum dilaporkan')
    const publish = async (version: string) => {
      const vector = Buffer.alloc(512 * 4)
      vector.writeFloatLE(1, 0)
      await api(page, '/admin/gallery-releases', 'POST', {
        schema_version: 1,
        gallery_version: version,
        embedding_model: 'insightface/w600k_r50',
        model_sha256: fixture().model_hash,
        embedding_dimension: 512,
        embedding_encoding: 'f32le-base64',
        templates: [
          {
            template_id: 'synthetic-template',
            identity_id: 'synthetic-identity',
            dimension: 512,
            encoding: 'f32le-base64',
            data: vector.toString('base64'),
          },
        ],
      })
    }
    const first = 'native-release-' + Date.now()
    const before = notifications
    await publish(first)
    await expect.poll(() => notifications).toBeGreaterThan(before)
    await expect(details).toContainText(first)
    await expect(details).toContainText('Galeri terbaru belum terpasang')
    probe.stdin.write(`install ${first}\n`)
    await expect(details.getByText('Siap presensi', { exact: true })).toBeVisible({
      timeout: 15000,
    })
    probe.stdin.write('state persistence_blocked\n')
    await expect(details).toContainText('Penyimpanan lokal bermasalah', { timeout: 15000 })
    probe.stdin.write('disconnect\n')
    await expect(details.locator('span.status')).toHaveText('Tidak terhubung')
    const second = first + '-next'
    await publish(second) // Missed while offline; reconnect must reconcile.
    const reconnectBefore = notifications
    probe.stdin.write('state running\nconnect\n')
    await expect.poll(() => notifications).toBeGreaterThan(reconnectBefore)
    await expect(details).toContainText('Galeri terbaru belum terpasang')
    probe.stdin.write(`install ${second}\n`)
    await expect(details.getByText('Siap presensi', { exact: true })).toBeVisible({
      timeout: 15000,
    })
    await mkdir('.local/screenshots', { recursive: true })
    await page.screenshot({ path: '.local/screenshots/device-operational.png', fullPage: true })
    await api(page, `/admin/devices/${id}/status`, 'PUT', { enabled: false })
    await expect(details).toContainText('Akses dinonaktifkan')
    await expect(details.locator('span.status')).toHaveText('Tidak terhubung')
    const restoredBefore = notifications
    await api(page, `/admin/devices/${id}/status`, 'PUT', { enabled: true })
    // No connect command: the actual native worker must reconnect using the unchanged DPAPI credential.
    await expect.poll(() => notifications, { timeout: 20000 }).toBeGreaterThan(restoredBefore)
    await expect(details.getByText('Siap presensi', { exact: true })).toBeVisible({
      timeout: 15000,
    })
  } finally {
    clearInterval(frames)
    probe.stdin.end('stop\n')
    const timeout = setTimeout(() => probe.kill(), 5000)
    await stopped
    clearTimeout(timeout)
    // mkdtemp provides the exact owned path; never delete an arbitrary configured directory.
    await removeScratch(scratch)
  }
})
