import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CameraCapture } from '../../src/features/biometrics/camera-capture'
import { capturePhoto } from '../../src/features/biometrics/camera'

let root: Root
let host: HTMLDivElement
const getUserMedia = vi.fn()
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('isSecureContext', true)
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })
  getUserMedia.mockReset()
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(() => root.unmount())
  host.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
async function render() {
  await act(() =>
    root.render(
      createElement(CameraCapture, {
        instruction: 'Hadapkan wajah ke kamera.',
        disabled: false,
        onCapture: vi.fn(),
      }),
    ),
  )
}
async function click(label: string) {
  const button = [...host.querySelectorAll('button')].find((b) => b.textContent?.includes(label))!
  await act(async () => {
    button.click()
    await Promise.resolve()
  })
}
function media() {
  const track = { stop: vi.fn(), addEventListener: vi.fn() }
  return {
    track,
    stream: { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream,
  }
}
describe('camera privacy and failure lifecycle', () => {
  it('does not request access until explicit activation, never requests audio, and stops on unmount', async () => {
    const { track, stream } = media()
    getUserMedia.mockResolvedValue(stream)
    await render()
    expect(getUserMedia).not.toHaveBeenCalled()
    await click('Aktifkan kamera')
    expect(getUserMedia.mock.calls[0][0].audio).toBe(false)
    await act(() => root.unmount())
    expect(track.stop).toHaveBeenCalledTimes(1)
  })
  it('stops a late permission result after the dialog was closed', async () => {
    const { track, stream } = media()
    let resolve!: (stream: MediaStream) => void
    getUserMedia.mockReturnValue(
      new Promise<MediaStream>((done) => {
        resolve = done
      }),
    )
    await render()
    await click('Aktifkan kamera')
    await act(() => root.unmount())
    await act(async () => {
      resolve(stream)
      await Promise.resolve()
    })
    expect(track.stop).toHaveBeenCalledOnce()
  })
  it('stops when the tab becomes hidden', async () => {
    const { track, stream } = media()
    getUserMedia.mockResolvedValue(stream)
    await render()
    await click('Aktifkan kamera')
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    await act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(track.stop).toHaveBeenCalledOnce()
    expect(host.textContent).toContain('Aktifkan kamera')
  })
  it('explains permission denial and keeps the upload alternative available', async () => {
    getUserMedia.mockRejectedValue(new DOMException('denied', 'NotAllowedError'))
    await render()
    await click('Aktifkan kamera')
    expect(host.querySelector('[role="alert"]')?.textContent).toContain(
      'Izin kamera belum diberikan',
    )
    expect(host.textContent).toContain('unggah foto')
  })
  it('rejects capture before a usable video frame exists', async () => {
    await expect(capturePhoto(document.createElement('video'))).rejects.toThrow(
      'Tunggu sampai gambar',
    )
  })
})
