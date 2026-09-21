export function stopCamera(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
}

export function cameraError(error: unknown) {
  const name = error instanceof DOMException || error instanceof Error ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return 'Izin kamera belum diberikan. Izinkan kamera melalui pengaturan browser, atau gunakan unggah foto.'
  if (name === 'NotFoundError')
    return 'Kamera tidak ditemukan. Sambungkan kamera atau gunakan unggah foto.'
  if (name === 'NotReadableError')
    return 'Kamera sedang digunakan atau tidak dapat dibuka. Tutup aplikasi kamera lain, lalu coba lagi.'
  return 'Kamera belum dapat digunakan. Coba kembali atau gunakan unggah foto.'
}

export async function capturePhoto(video: HTMLVideoElement): Promise<File> {
  if (video.readyState < 2 || video.videoWidth < 112 || video.videoHeight < 112)
    throw new Error('Tunggu sampai gambar kamera terlihat jelas sebelum mengambil foto.')
  const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(video.videoWidth * scale)
  canvas.height = Math.round(video.videoHeight * scale)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Browser tidak dapat mengambil foto. Gunakan unggah foto.')
  // Mirror only the live preview. Send the original camera orientation to extraction.
  context.drawImage(video, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) =>
        value ? resolve(value) : reject(new Error('Foto belum berhasil diambil. Coba lagi.')),
      'image/jpeg',
      0.92,
    )
  })
  canvas.width = canvas.height = 0
  return new File([blob], 'enrollment-camera.jpg', { type: 'image/jpeg' })
}
