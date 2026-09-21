import { describe, expect, it } from 'vitest'
import { photoError } from '../../src/features/biometrics/photo'
describe('photo input guard', () => {
  it('accepts supported images at the maximum size', () => {
    expect(photoError({ type: 'image/jpeg', size: 5 * 1024 * 1024 })).toBeNull()
  })
  it('rejects empty, oversized and unsupported uploads before sending', () => {
    expect(photoError({ type: 'image/png', size: 0 })).not.toBeNull()
    expect(photoError({ type: 'image/png', size: 5 * 1024 * 1024 + 1 })).not.toBeNull()
    expect(photoError({ type: 'image/svg+xml', size: 20 })).not.toBeNull()
  })
})
