import { spawn } from 'node:child_process'
import { once } from 'node:events'
export default async function setup() {
  const host = spawn(
    'dotnet',
    ['run', '--project', 'tests/backend-host', '--configuration', 'Release'],
    { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], env: process.env },
  )
  try {
    const fixture = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(
        () =>
          reject(
            new Error(
              'Backend fixture startup timed out. Check Tests:Postgres user secrets and .NET 10.',
            ),
          ),
        120_000,
      )
      let pending = ''
      host.stdout.on('data', (chunk: Buffer) => {
        pending += chunk.toString()
        const lines = pending.split(/\r?\n/)
        pending = lines.pop() || ''
        for (const line of lines)
          if (line.startsWith('E2E_READY:')) {
            clearTimeout(timeout)
            resolve(line.slice('E2E_READY:'.length))
          }
      })
      host.stderr.on('data', () => {
        /* Do not forward diagnostics that could include local configuration. */
      })
      host.once('exit', (code) => {
        clearTimeout(timeout)
        reject(
          new Error(
            `Backend fixture exited (${code}). Run dotnet build tests/backend-host to check prerequisites.`,
          ),
        )
      })
      host.once('error', reject)
    })
    process.env.E2E_FIXTURE = fixture
  } catch (error) {
    host.stdin.end('stop\n')
    throw error
  }
  return async () => {
    host.stdin.end('stop\n')
    await once(host, 'exit')
    delete process.env.E2E_FIXTURE
  }
}
