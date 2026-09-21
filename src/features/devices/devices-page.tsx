import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Empty,
  ErrorNotice,
  Field,
  Loading,
  Modal,
  Notice,
  PageTitle,
  Panel,
  SelectField,
  Submit,
  Table,
} from '@/components/shared'
import { api, useAction, useApi } from '@/lib/api'
import type { Device, DeviceActivity } from '@/lib/contracts'
import { dateTime } from '@/lib/format'
import { useCatalog } from '@/features/academic/data'
import { OperationalBadge, OperationalDetails } from './operational-status'
import { useOperationalStatus } from './data'
export function DevicesPage() {
  const devices = useApi<Device[]>('/admin/devices')
  const operational = useOperationalStatus()
  const [create, setCreate] = useState(false)
  const [selected, setSelected] = useState<Device>()
  return (
    <>
      <PageTitle
        title="Perangkat presensi"
        description="Kelola akses perangkat Edge dan penempatan ruang perkuliahan."
        action={
          <Button onClick={() => setCreate(true)}>
            <Plus size={17} />
            Daftarkan perangkat
          </Button>
        }
      />
      <Notice>
        Izin akses, koneksi, dan kesiapan presensi ditampilkan terpisah. Status diperbarui dari
        laporan perangkat; buka detail untuk memeriksa galeri dan antrean pengiriman.
      </Notice>
      <Panel title="Perangkat terdaftar">
        <ErrorNotice error={devices.error} />
        <ErrorNotice error={operational.error} />
        {devices.isPending ? (
          <Loading />
        ) : devices.data?.length ? (
          <Table
            caption="Perangkat"
            headers={['Perangkat', 'ID perangkat', 'Akses', 'Operasional', '']}
          >
            {devices.data.map((d) => (
              <tr key={d.device_id}>
                <td className="font-medium">{d.device_name}</td>
                <td>{d.device_id}</td>
                <td>
                  <span
                    className={`status ${d.device_enabled ? 'status-positive' : 'status-neutral'}`}
                  >
                    {d.device_enabled ? 'Diizinkan' : 'Dinonaktifkan'}
                  </span>
                </td>
                <td>
                  <OperationalBadge
                    status={
                      operational.error
                        ? undefined
                        : operational.data?.find((s) => s.device_id === d.device_id)
                    }
                  />
                </td>
                <td>
                  <Button variant="ghost" size="sm" onClick={() => setSelected(d)}>
                    Kelola perangkat
                  </Button>
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          !devices.error && (
            <Empty
              title="Belum ada perangkat"
              description="Daftarkan perangkat untuk mendapatkan kredensial integrasi Edge."
            />
          )
        )}
      </Panel>
      {create && <CreateDevice close={() => setCreate(false)} />}{' '}
      {selected && (
        <DeviceEditor
          device={devices.data?.find((d) => d.device_id === selected.device_id) || selected}
          close={() => setSelected(undefined)}
        />
      )}
    </>
  )
}
function Credential({ token }: { token: string }) {
  return (
    <div className="space-y-3">
      <Notice tone="success">
        Kredensial berhasil diterbitkan. Salin dan simpan dengan aman sebelum menutup dialog; token
        tidak dapat ditampilkan kembali.
      </Notice>
      <Field
        label="Token perangkat"
        value={token}
        readOnly
        onFocus={(e) => e.target.select()}
        hint="Gunakan token ini saat provisioning Edge. Jangan masukkan ke repositori atau bagikan kepada mahasiswa."
      />
    </div>
  )
}
function CreateDevice({ close }: { close: () => void }) {
  const action = useAction((f: FormData) =>
    api<{ token: string }>('/admin/devices', {
      method: 'POST',
      body: { device_id: f.get('id'), device_name: f.get('name') },
    }),
  )
  return (
    <Modal
      title="Daftarkan perangkat"
      description="Setiap perangkat memiliki identitas dan token tersendiri."
      open
      onClose={close}
    >
      {action.data ? (
        <Credential token={action.data.token} />
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            action.mutate(new FormData(e.currentTarget))
          }}
        >
          <ErrorNotice error={action.error} />
          <Field
            label="ID perangkat"
            name="id"
            placeholder="edge-ruang-101"
            required
            maxLength={100}
          />
          <Field label="Nama perangkat" name="name" required maxLength={200} />
          <Submit pending={action.isPending}>Daftarkan dan buat token</Submit>
        </form>
      )}
    </Modal>
  )
}
function DeviceEditor({ device, close }: { device: Device; close: () => void }) {
  const base = `/admin/devices/${encodeURIComponent(device.device_id)}`
  const activity = useApi<DeviceActivity>(`${base}/activity`)
  const operational = useOperationalStatus()
  const catalog = useCatalog()
  const [rotate, setRotate] = useState(false)
  const room = useAction((f: FormData) =>
    api(`${base}/classroom`, { method: 'PUT', body: { classroom_id: f.get('room') || null } }),
  )
  const status = useAction(() =>
    api(`${base}/status`, { method: 'PUT', body: { enabled: !device.device_enabled } }),
  )
  const credential = useAction(() =>
    api<{ token: string }>(`${base}/rotate-credential`, { method: 'POST', body: {} }),
  )
  const assignment = activity.data?.room_assignments.find(
    (a) => !a.device_room_assignment_valid_until,
  )
  return (
    <Modal title={device.device_name} description={device.device_id} open onClose={close}>
      <div className="space-y-5">
        <ErrorNotice
          error={
            activity.error ||
            operational.error ||
            catalog.error ||
            room.error ||
            status.error ||
            credential.error
          }
        />
        <OperationalDetails
          status={
            operational.error
              ? undefined
              : operational.data?.find((s) => s.device_id === device.device_id)
          }
        />
        <div>
          <p className="muted text-sm">Observasi terakhir diterima server</p>
          <p className="font-medium mt-1">
            {dateTime(activity.data?.latest_received_observation?.attendance_received_at)}
          </p>
        </div>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            room.mutate(new FormData(e.currentTarget))
          }}
        >
          <SelectField
            key={assignment?.classroom_id || 'none'}
            label="Ruangan penempatan"
            name="room"
            defaultValue={assignment?.classroom_id || ''}
            disabled={!activity.data || !catalog.data}
          >
            <option value="">Tidak ditempatkan</option>
            {catalog.data?.rooms
              .filter((r) => r.classroom_active)
              .map((r) => (
                <option key={r.classroom_id} value={r.classroom_id}>
                  {r.classroom_name}
                </option>
              ))}
          </SelectField>
          {room.isSuccess && <Notice tone="success">Penempatan ruangan tersimpan.</Notice>}
          <Submit pending={room.isPending} disabled={!activity.data || !catalog.data}>
            Simpan ruangan
          </Submit>
        </form>
        <div className="border-t pt-4 space-y-3">
          <p className="text-sm muted">
            Menonaktifkan akses menghentikan pengiriman observasi dan pengambilan galeri dari
            perangkat ini.
          </p>
          <Button variant="outline" disabled={status.isPending} onClick={() => status.mutate()}>
            {device.device_enabled ? 'Nonaktifkan akses perangkat' : 'Aktifkan akses perangkat'}
          </Button>
        </div>
        {credential.data ? (
          <Credential token={credential.data.token} />
        ) : rotate ? (
          <div className="space-y-3">
            <Notice>
              Token lama langsung tidak berlaku. Konfigurasikan token baru pada Edge agar
              sinkronisasi dapat dilanjutkan.
            </Notice>
            <Button disabled={credential.isPending} onClick={() => credential.mutate()}>
              Konfirmasi penggantian token
            </Button>
          </div>
        ) : (
          <Button variant="ghost" onClick={() => setRotate(true)}>
            Ganti token perangkat
          </Button>
        )}
      </div>
    </Modal>
  )
}
