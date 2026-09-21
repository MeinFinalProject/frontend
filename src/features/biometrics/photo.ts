export const poses = ['frontal', 'left', 'right', 'up', 'down']
export function photoError(file: Pick<File, 'size' | 'type'>): string | null {
  if (!['image/jpeg', 'image/png'].includes(file.type)) return 'Pilih foto JPEG atau PNG.'
  if (file.size === 0 || file.size > 5 * 1024 * 1024)
    return 'Ukuran foto harus lebih dari 0 dan maksimal 5 MiB.'
  return null
}
