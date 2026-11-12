// `npm run dev` at the root: start the Node server and the Vite client together.
import { spawn } from 'node:child_process'

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const procs = [
  ['server', ['run', 'dev', '-w', 'server']],
  ['client', ['run', 'dev', '-w', 'client']],
].map(([name, args]) => {
  const child = spawn(npm, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  })
  const tag = (chunk) => chunk.toString().replace(/^(?=.)/gm, `[${name}] `)
  child.stdout.on('data', (c) => process.stdout.write(tag(c)))
  child.stderr.on('data', (c) => process.stderr.write(tag(c)))
  child.on('exit', (code) => console.log(`[${name}] exited with ${code}`))
  return child
})

const stop = () => procs.forEach((p) => p.kill('SIGINT'))
process.once('SIGINT', stop)
process.once('SIGTERM', stop)
