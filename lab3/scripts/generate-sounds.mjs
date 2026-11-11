// Generates the game's sound effects as 16-bit mono WAV files.
// Run: node scripts/generate-sounds.mjs  → public/assets/sounds/*.wav
import { writeFileSync, mkdirSync } from 'node:fs'

const RATE = 22050
const out = new URL('../public/assets/sounds/', import.meta.url)
mkdirSync(out, { recursive: true })

let seed = 12345
const noise = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0
  return (seed / 2 ** 32) * 2 - 1
}

function render(seconds, sampleFn) {
  const n = Math.floor(seconds * RATE)
  const data = new Float32Array(n)
  for (let i = 0; i < n; i++) data[i] = sampleFn(i / RATE, i / n)
  return data
}

function toWav(samples) {
  const buf = Buffer.alloc(44 + samples.length * 2)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + samples.length * 2, 4)
  buf.write('WAVE', 8)
  buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20) // PCM
  buf.writeUInt16LE(1, 22) // mono
  buf.writeUInt32LE(RATE, 24)
  buf.writeUInt32LE(RATE * 2, 28)
  buf.writeUInt16LE(2, 32)
  buf.writeUInt16LE(16, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(samples.length * 2, 40)
  samples.forEach((s, i) => {
    const v = Math.max(-1, Math.min(1, s))
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2)
  })
  return buf
}

// simple one-pole low-pass for noise
function lowpass(data, k) {
  let y = 0
  for (let i = 0; i < data.length; i++) data[i] = y += k * (data[i] - y)
  return data
}

const sounds = {
  // laser "pew": square wave sweeping down
  shoot: render(0.14, (t, p) => {
    const f = 1400 - 1100 * p
    const phase = (t * f) % 1
    return (phase < 0.5 ? 0.35 : -0.35) * (1 - p) ** 2
  }),
  // short metallic thump
  hit: render(0.12, (t, p) => {
    const tone = Math.sin(2 * Math.PI * (220 - 120 * p) * t)
    return (0.5 * tone + 0.35 * noise()) * (1 - p) ** 3
  }),
  // rumble: low-passed noise with long decay
  explosion: lowpass(
    render(0.9, (t, p) => noise() * (1 - p) ** 2.2 * 1.6),
    0.08,
  ),
  // pickup: rising arpeggio
  pickup: render(0.3, (t, p) => {
    const notes = [523, 659, 784, 1047]
    const f = notes[Math.min(3, Math.floor(p * 4))]
    return Math.sin(2 * Math.PI * f * t) * 0.35 * (1 - p * 0.6)
  }),
}

for (const [name, samples] of Object.entries(sounds)) {
  const file = new URL(`${name}.wav`, out)
  writeFileSync(file, toWav(samples))
  console.log('wrote', file.pathname, samples.length, 'samples')
}
