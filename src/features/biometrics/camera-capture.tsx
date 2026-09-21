import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/shared'
import { cameraError, capturePhoto, stopCamera } from './camera'

export function CameraCapture({
  instruction,
  disabled,
  onCapture,
}: {
  instruction: string
  disabled: boolean
  onCapture: (file: File) => void
}) {
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const request = useRef(0)
  const [active, setActive] = useState(false)
  const [starting, setStarting] = useState(false)
  const [ready, setReady] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [error, setError] = useState('')

  function stop() {
    request.current++
    stopCamera(stream.current)
    stream.current = null
    if (video.current) video.current.srcObject = null
    setActive(false)
    setStarting(false)
    setReady(false)
  }
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) stop()
    }
    document.addEventListener('visibilitychange', hidden)
    return () => {
      document.removeEventListener('visibilitychange', hidden)
      // Invalidate the latest permission request; this is a counter, not a DOM ref.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      request.current++
      stopCamera(stream.current)
      stream.current = null
    }
  }, [])

  async function start() {
    setError('')
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError(
        'Kamera membutuhkan HTTPS atau localhost dan browser yang mendukung kamera. Anda tetap dapat mengunggah foto.',
      )
      return
    }
    const attempt = ++request.current
    setStarting(true)
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
      })
      // Permission may be granted after the dialog closes or the request is cancelled.
      if (attempt !== request.current) {
        stopCamera(media)
        return
      }
      stream.current = media
      media.getVideoTracks().forEach((track) =>
        track.addEventListener(
          'ended',
          () => {
            if (attempt === request.current) {
              stop()
              setError('Kamera terputus. Sambungkan kembali atau gunakan unggah foto.')
            }
          },
          { once: true },
        ),
      )
      setActive(true)
      video.current!.srcObject = media
      await video.current!.play()
    } catch (e) {
      if (attempt === request.current) {
        stop()
        setError(cameraError(e))
      }
    } finally {
      if (attempt === request.current) setStarting(false)
    }
  }
  async function capture() {
    const attempt = request.current
    setCapturing(true)
    setError('')
    try {
      const file = await capturePhoto(video.current!)
      if (attempt !== request.current) return
      stop()
      onCapture(file)
    } catch (e) {
      if (attempt === request.current)
        setError(e instanceof Error ? e.message : 'Foto gagal diambil.')
    } finally {
      setCapturing(false)
    }
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium">{instruction}</p>
      <p className="text-xs muted">
        Satu wajah, pencahayaan merata, tanpa penutup wajah. Panduan arah tidak menggantikan
        pemeriksaan kualitas oleh server.
      </p>
      <video
        ref={video}
        autoPlay
        muted
        playsInline
        aria-label="Pratinjau kamera"
        className={`w-full rounded-md bg-slate-950 max-h-80 object-contain ${active ? '' : 'hidden'}`}
        style={{ transform: 'scaleX(-1)' }}
        onLoadedData={() => setReady(true)}
      />
      <div className="flex flex-wrap gap-2">
        {!active && !starting && (
          <Button type="button" variant="outline" disabled={disabled} onClick={() => void start()}>
            <Camera size={16} /> Aktifkan kamera
          </Button>
        )}
        {active && (
          <Button
            type="button"
            disabled={!ready || disabled || capturing}
            onClick={() => void capture()}
          >
            {capturing ? 'Mengambil foto…' : 'Ambil foto'}
          </Button>
        )}
        {(active || starting) && (
          <Button type="button" variant="outline" onClick={stop}>
            <CameraOff size={16} />
            {starting ? 'Batalkan akses kamera' : 'Matikan kamera'}
          </Button>
        )}
      </div>
      {starting && (
        <p className="text-sm muted" role="status">
          Menunggu izin kamera dari browser…
        </p>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      <p className="text-xs muted">
        Kamera hanya aktif setelah Anda memilihnya. Foto tetap di tab ini sampai Anda menekan Proses
        dan simpan foto. Mikrofon tidak digunakan.
      </p>
    </div>
  )
}
