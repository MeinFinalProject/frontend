import { test, expect, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
type Fixture = {
  password: string
  student_id: string
  session_id: string
  class_id: string
  term_id: string
  room_id: string
  program_id: string
}
const fixture = () => JSON.parse(process.env.E2E_FIXTURE!) as Fixture
async function login(page: Page, role: 'admin' | 'dosen' | 'mahasiswa') {
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(`${role}@e2e.invalid`)
  await page.getByLabel('Kata sandi', { exact: true }).fill(fixture().password)
  await page.getByRole('button', { name: 'Masuk ke portal' }).click()
  await expect(page).toHaveURL('http://localhost:5174/')
  await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeVisible()
}
test.describe.configure({ mode: 'serial' })
test('public navigation uses canonical English URLs and keeps Indonesian labels', async ({
  page,
}) => {
  await page.goto('/masuk')
  await expect(page).toHaveURL('http://localhost:5174/login')
  await expect(page.getByRole('button', { name: 'Masuk ke portal' })).toBeVisible()
  await page.getByRole('link', { name: 'Daftar akun', exact: true }).click()
  await expect(page).toHaveURL('http://localhost:5174/register')
  await expect(page.getByRole('heading', { name: 'Daftar sebagai mahasiswa' })).toBeVisible()
  await page.goto('/accounts')
  await expect(page).toHaveURL('http://localhost:5174/login')
})
test('student submits KRS; assigned lecturer approves; membership appears', async ({
  page,
  browser,
}) => {
  await login(page, 'mahasiswa')
  await page.getByRole('link', { name: 'Rencana studi', exact: true }).click()
  await page.getByRole('button', { name: 'Susun KRS' }).click()
  await page.getByLabel('Semester', { exact: true }).selectOption(fixture().term_id)
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Simpan draf KRS' }).click()
  await expect(page.getByRole('dialog')).toContainText('Detail rencana studi')
  await page.getByRole('button', { name: 'Ajukan ke pembimbing' }).click()
  await expect(page.getByRole('table')).toContainText('Menunggu persetujuan')
  const context = await browser.newContext()
  const lecturer = await context.newPage()
  await login(lecturer, 'dosen')
  await lecturer.getByRole('link', { name: 'Rencana studi', exact: true }).click()
  await expect(lecturer.getByRole('table')).toContainText('Mahasiswa Uji')
  await lecturer.getByRole('button', { name: 'Lihat KRS' }).click()
  await lecturer
    .getByLabel('Catatan untuk mahasiswa')
    .fill('Pilihan kelas telah diperiksa pada uji integrasi.')
  await lecturer.getByRole('button', { name: 'Kirim keputusan' }).click()
  await expect(lecturer.getByRole('table')).toContainText('Disetujui')
  await page.reload()
  await expect(page.getByRole('table')).toContainText('Disetujui')
  await page.getByRole('link', { name: 'Perkuliahan', exact: true }).click()
  await expect(page.getByLabel('Kelas', { exact: true })).toContainText('Rekayasa Perangkat Lunak')
  await context.close()
})
test('lecturer corrects real attendance; student sees confirmed percentage; concurrent correction conflicts', async ({
  page,
  browser,
}) => {
  await login(page, 'dosen')
  await page.goto(`/sessions/${fixture().session_id}`)
  await expect(page.getByRole('table')).toContainText('Tidak hadir')
  const otherContext = await browser.newContext()
  const other = await otherContext.newPage()
  await login(other, 'dosen')
  await other.goto(`/sessions/${fixture().session_id}`)
  await other.getByRole('button', { name: 'Koreksi', exact: true }).click()
  await page.getByRole('button', { name: 'Koreksi', exact: true }).click()
  await page.getByLabel('Status kehadiran').selectOption('present')
  await page.getByLabel('Alasan koreksi').fill('Kehadiran diverifikasi dalam pengujian integrasi.')
  await page.getByRole('button', { name: 'Simpan koreksi' }).click()
  await expect(page.getByRole('status')).toContainText('Koreksi tersimpan di server.')
  await other.getByLabel('Status kehadiran').selectOption('absent')
  await other.getByLabel('Alasan koreksi').fill('Menguji konflik revisi dari tab lain.')
  await other.getByRole('button', { name: 'Simpan koreksi' }).click()
  await expect(other.getByRole('alert')).toContainText('Presensi telah berubah')
  await expect(other.getByRole('button', { name: 'Tutup dan muat ulang data' })).toBeVisible()
  await otherContext.close()
  await page.getByRole('button', { name: 'Selesai', exact: true }).click()
  await mkdir('.local/screenshots', { recursive: true })
  await page.screenshot({ path: '.local/screenshots/lecturer-attendance.png', fullPage: true })
  await page.getByRole('button', { name: 'Keluar', exact: true }).click()
  await login(page, 'mahasiswa')
  await page.getByRole('link', { name: 'Presensi saya', exact: true }).click()
  await expect(page.getByRole('table', { name: 'Ringkasan presensi' })).toContainText('100%')
  await expect(page.getByRole('table', { name: 'Riwayat pertemuan' })).toContainText('Hadir')
  await page.screenshot({ path: '.local/screenshots/student-attendance.png', fullPage: true })
})
test('admin creates reference data and device; lecturer schedules an actual session', async ({
  page,
  browser,
}) => {
  await login(page, 'admin')
  await page.getByRole('link', { name: 'Data akademik', exact: true }).click()
  await page.getByRole('button', { name: 'Tambah program studi' }).click()
  await page.getByLabel('Kode', { exact: true }).fill('E2E-SI')
  await page.getByLabel('Nama', { exact: true }).fill('Sistem Informasi · Uji')
  await page.getByRole('button', { name: 'Simpan perubahan' }).click()
  await expect(page.getByRole('table')).toContainText('Sistem Informasi · Uji')
  await page.getByRole('link', { name: 'Perangkat', exact: true }).click()
  await page.getByRole('button', { name: 'Daftarkan perangkat' }).click()
  await page.getByLabel('ID perangkat', { exact: true }).fill('edge-e2e-browser')
  await page.getByLabel('Nama perangkat', { exact: true }).fill('Perangkat Uji Browser')
  await page.getByRole('button', { name: 'Daftarkan dan buat token' }).click()
  await expect(page.getByLabel('Token perangkat', { exact: true })).toHaveValue(
    /[a-zA-Z0-9_-]{20,}/,
  )
  await page.getByRole('button', { name: 'Tutup', exact: true }).click()
  await page.getByRole('button', { name: 'Kelola perangkat' }).click()
  await page.getByLabel('Ruangan penempatan').selectOption(fixture().room_id)
  await page.getByRole('button', { name: 'Simpan ruangan' }).click()
  await expect(page.getByRole('status')).toContainText('Penempatan ruangan tersimpan.')
  await page.getByRole('button', { name: 'Tutup', exact: true }).click()
  const context = await browser.newContext()
  const lecturer = await context.newPage()
  await login(lecturer, 'dosen')
  await lecturer.getByRole('link', { name: 'Perkuliahan', exact: true }).click()
  await lecturer.getByRole('button', { name: 'Jadwalkan sesi' }).click()
  const dialog = lecturer.getByRole('dialog')
  await dialog.getByLabel('Kelas', { exact: true }).selectOption(fixture().class_id)
  await dialog.getByLabel('Ruangan', { exact: true }).selectOption(fixture().room_id)
  const date = new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10)
  await dialog.getByLabel('Mulai (WIB)').fill(`${date}T09:00`)
  await dialog.getByLabel('Selesai (WIB)').fill(`${date}T11:00`)
  await dialog.getByRole('button', { name: 'Buat sesi perkuliahan' }).click()
  await expect(dialog).not.toBeVisible()
  await expect(lecturer.getByRole('table')).toContainText('Laboratorium Uji')
  await context.close()
  await page.getByRole('link', { name: 'Ringkasan', exact: true }).click()
  await page.screenshot({ path: '.local/screenshots/admin-overview.png', fullPage: true })
})
test('student biometric consent, multipart rejection, revocation and role guard', async ({
  page,
}) => {
  await login(page, 'mahasiswa')
  await page.getByRole('link', { name: 'Pendaftaran wajah', exact: true }).click()
  await page.getByRole('button', { name: 'Mulai pendaftaran' }).click()
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Setuju dan mulai' }).click()
  await expect(page.getByRole('dialog')).toContainText('0 / 12 sampel')
  await expect(page.getByRole('button', { name: 'Ajukan untuk verifikasi' })).toBeDisabled()
  const response = page.waitForResponse(
    (r) => r.url().includes('/samples/upload') && r.request().method() === 'POST',
  )
  await page.getByLabel('Foto wajah', { exact: true }).setInputFiles({
    name: 'invalid.png',
    mimeType: 'image/png',
    buffer: Buffer.from('not a decodable photograph'),
  })
  await page.getByRole('button', { name: 'Proses dan simpan foto' }).click()
  const rejectedUpload = await response
  expect(rejectedUpload.status()).toBe(400)
  expect(await rejectedUpload.json()).toEqual({ error: 'invalid_image' })
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('dialog')).toContainText('0 / 12 sampel')
  await page.getByRole('button', { name: 'Cabut pendaftaran ini' }).click()
  await page
    .getByLabel('Alasan pencabutan')
    .fill('Selesai menguji pendaftaran tanpa menyimpan foto pribadi.')
  await page.getByRole('button', { name: 'Konfirmasi pencabutan' }).click()
  await expect(page.getByRole('dialog')).toContainText('Dicabut')
  await page.getByRole('button', { name: 'Tutup', exact: true }).click()
  await expect(page.getByRole('navigation')).not.toContainText('Akun & mahasiswa')
  await page.goto('/accounts')
  await expect(page.getByRole('status')).toContainText('tidak tersedia untuk peran Anda')
})
test('registration and administrator approval use real API', async ({ page, browser }) => {
  await page.goto('/register')
  await page.getByLabel('Nama lengkap').fill('Pendaftar Uji Browser')
  await page.getByLabel('NIM', { exact: true }).fill('E2E-M002')
  await page.getByLabel('Program studi', { exact: true }).selectOption(fixture().program_id)
  await page.getByLabel('Email', { exact: true }).fill('pendaftar@e2e.invalid')
  await page.getByLabel('Kata sandi', { exact: true }).fill(fixture().password)
  await page.getByRole('button', { name: 'Kirim pendaftaran' }).click()
  await expect(page.getByRole('status')).toContainText('Pendaftaran diterima')
  await page.getByRole('link', { name: 'Kembali ke halaman masuk' }).click()
  await page.getByLabel('Email', { exact: true }).fill('pendaftar@e2e.invalid')
  await page.getByLabel('Kata sandi', { exact: true }).fill(fixture().password)
  await page.getByRole('button', { name: 'Masuk ke portal' }).click()
  await expect(page.getByRole('alert')).toContainText('belum disetujui')
  const context = await browser.newContext()
  const admin = await context.newPage()
  await login(admin, 'admin')
  await admin.getByRole('link', { name: 'Akun & mahasiswa', exact: true }).click()
  await admin
    .getByRole('row')
    .filter({ hasText: 'Pendaftar Uji Browser' })
    .getByRole('button', { name: 'Kelola akses' })
    .click()
  await admin.getByLabel('Status baru').selectOption('approved')
  await admin.getByLabel('Alasan keputusan').fill('Identitas uji telah diperiksa.')
  await admin.getByRole('button', { name: 'Simpan keputusan' }).click()
  await expect(admin.getByRole('row').filter({ hasText: 'Pendaftar Uji Browser' })).toContainText(
    'Disetujui',
  )
  await page.getByRole('button', { name: 'Masuk ke portal' }).click()
  await expect(page.getByRole('navigation')).toBeVisible()
  await context.close()
})
test('mobile navigation, login failure and readable connection failure', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/login')
  await page.screenshot({ path: '.local/screenshots/login-mobile.png', fullPage: true })
  await login(page, 'mahasiswa')
  await expect(page.getByRole('navigation')).not.toBeVisible()
  await page.getByRole('button', { name: 'Buka menu' }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Buka menu' })).toBeFocused()
  await page.getByRole('button', { name: 'Buka menu' }).click()
  await page.getByRole('link', { name: 'Presensi saya', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Presensi saya', exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Ringkasan kehadiran mobile' })).toContainText(
    '100%',
  )
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.screenshot({ path: '.local/screenshots/student-mobile.png', fullPage: true })
  await page.route('**/api/v1/course-registrations', (route) => route.abort('connectionfailed'))
  await page.getByRole('button', { name: 'Buka menu' }).click()
  await page.getByRole('link', { name: 'Rencana studi', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Tidak dapat menghubungi server')
  await page.unroute('**/api/v1/course-registrations')
})
