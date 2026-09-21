import { Component, type ReactNode } from 'react'
import { Notice } from '@/components/shared'
import { paths } from '@/config/paths'
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? (
      <main className="max-w-lg mx-auto p-8 space-y-4">
        <Notice tone="error">
          Halaman belum dapat ditampilkan. Muat ulang untuk mencoba kembali.
        </Notice>
        <a className="text-link" href={paths.home}>
          Muat ulang portal
        </a>
      </main>
    ) : (
      this.props.children
    )
  }
}
