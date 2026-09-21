export const poses = ['frontal', 'left', 'right', 'up', 'down']
export const poseInstructions: Record<string, string> = {
  frontal: 'Hadapkan wajah ke kamera. Untuk foto tambahan, ubah ekspresi atau posisi sedikit.',
  left: 'Putar wajah sedikit ke kiri Anda, dengan kedua mata tetap terlihat.',
  right: 'Putar wajah sedikit ke kanan Anda, dengan kedua mata tetap terlihat.',
  up: 'Angkat dagu sedikit; jangan menengadah terlalu jauh.',
  down: 'Turunkan dagu sedikit, dengan mata tetap mengarah ke kamera.',
}
export function suggestedPose(samples: { biometric_template_pose: string }[]) {
  return (
    poses.find((pose) => samples.filter((s) => s.biometric_template_pose === pose).length < 2) ??
    'frontal'
  )
}
export function photoError(file: Pick<File, 'size' | 'type'>): string | null {
  if (!['image/jpeg', 'image/png'].includes(file.type)) return 'Pilih foto JPEG atau PNG.'
  if (file.size === 0 || file.size > 5 * 1024 * 1024)
    return 'Ukuran foto harus lebih dari 0 dan maksimal 5 MiB.'
  return null
}
