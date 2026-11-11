// Generates the SVG sprite sheets + frame tables used by public/assets/manifest.json.
// Run: node scripts/generate-sprites.mjs
import { writeFileSync } from 'node:fs'

const dir = new URL('../public/assets/sprites/', import.meta.url)
let seed = 7
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0
  return seed / 2 ** 32
}

const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n${body}\n</svg>\n`

// ---- ships: 2 frames 64×64, nose points to +x -----------------------------
function ship(x, thrust) {
  const cx = x + 32
  const flame = thrust
    ? `<path d="M${cx - 14} 26 L${cx - 30} 32 L${cx - 14} 38 Z" fill="url(#flame)"/>`
    : ''
  return `<g>
  ${flame}
  <path d="M${cx + 26} 32 L${cx - 16} 15 L${cx - 8} 32 L${cx - 16} 49 Z" fill="url(#hull)" stroke="#e0f2fe" stroke-width="1.6" stroke-linejoin="round"/>
  <path d="M${cx - 16} 15 L${cx - 20} 12 L${cx - 10} 24 Z M${cx - 16} 49 L${cx - 20} 52 L${cx - 10} 40 Z" fill="#0ea5e9"/>
  <ellipse cx="${cx + 6}" cy="32" rx="7" ry="3.6" fill="#0c4a6e" stroke="#bae6fd" stroke-width="1"/>
  </g>`
}
const shipDefs = `<defs>
  <linearGradient id="hull" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#7dd3fc"/><stop offset="0.5" stop-color="#38bdf8"/><stop offset="1" stop-color="#0369a1"/>
  </linearGradient>
  <linearGradient id="flame" x1="1" y1="0" x2="0" y2="0">
    <stop offset="0" stop-color="#fde68a"/><stop offset="0.5" stop-color="#fb923c"/><stop offset="1" stop-color="#ef4444" stop-opacity="0"/>
  </linearGradient>
</defs>`
writeFileSync(
  new URL('ships.svg', dir),
  svg(128, 64, shipDefs + ship(0, false) + ship(64, true)),
)

// ---- asteroids: 9 cells 96×96 (mean radius 44) ------------------------------
const asteroidFrames = {}
const cells = [
  ['3-0', false],
  ['3-1', false],
  ['2-0', false],
  ['2-1', false],
  ['1-0', false],
  ['1-1', false],
  ['h3', true],
  ['h2', true],
  ['h1', true],
]
const rocks = cells
  .map(([name, hunter], i) => {
    const cx = i * 96 + 48
    const cy = 48
    const pts = Array.from({ length: 13 }, (_, k) => {
      const a = (k / 13) * Math.PI * 2
      const r = 44 * (0.8 + rnd() * 0.25)
      return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`
    }).join(' ')
    const craters = Array.from({ length: 3 }, () => {
      const a = rnd() * Math.PI * 2
      const d = rnd() * 22
      const r = 4 + rnd() * 7
      return `<circle cx="${(cx + Math.cos(a) * d).toFixed(1)}" cy="${(cy + Math.sin(a) * d).toFixed(1)}" r="${r.toFixed(1)}" fill="${hunter ? '#2a1015' : '#111827'}" opacity="0.55"/>`
    }).join('')
    asteroidFrames[name] = [i * 96, 0, 96, 96]
    const fill = hunter ? 'url(#rockHot)' : 'url(#rock)'
    const stroke = hunter ? '#f87171' : '#94a3b8'
    return `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="2.5" stroke-linejoin="round"/>${craters}`
  })
  .join('\n')
const rockDefs = `<defs>
  <radialGradient id="rock" cx="0.35" cy="0.35" r="0.8"><stop offset="0" stop-color="#475569"/><stop offset="1" stop-color="#1e293b"/></radialGradient>
  <radialGradient id="rockHot" cx="0.35" cy="0.35" r="0.8"><stop offset="0" stop-color="#7f1d1d"/><stop offset="1" stop-color="#3b1d24"/></radialGradient>
</defs>`
writeFileSync(
  new URL('asteroids.svg', dir),
  svg(96 * cells.length, 96, rockDefs + rocks),
)

// ---- fx: 5 cells 32×32 -------------------------------------------------------
const pickup = (x, color, label) => `<g>
  <polygon points="${x + 16},2 ${x + 28},9 ${x + 28},23 ${x + 16},30 ${x + 4},23 ${x + 4},9" fill="#0f172a" stroke="${color}" stroke-width="2.4"/>
  <text x="${x + 16}" y="21" font-family="Consolas, monospace" font-weight="700" font-size="13" text-anchor="middle" fill="${color}">${label}</text>
</g>`
const fx = [
  `<rect x="6" y="14" width="20" height="4" rx="2" fill="#f8fafc"/><rect x="2" y="12" width="28" height="8" rx="4" fill="#38bdf8" opacity="0.35"/>`,
  `<rect x="38" y="14" width="20" height="4" rx="2" fill="#f5d0fe"/><rect x="34" y="12" width="28" height="8" rx="4" fill="#c084fc" opacity="0.45"/>`,
  pickup(64, '#a3e635', 'S'),
  pickup(96, '#fbbf24', 'R'),
  pickup(128, '#c084fc', 'H'),
].join('\n')
writeFileSync(new URL('fx.svg', dir), svg(160, 32, fx))

console.log(
  JSON.stringify({
    ships: { ship: [0, 0, 64, 64], 'ship-thrust': [64, 0, 64, 64] },
    asteroids: asteroidFrames,
    fx: {
      bullet: [0, 0, 32, 32],
      'bullet-homing': [32, 0, 32, 32],
      'pickup-shield': [64, 0, 32, 32],
      'pickup-rapid': [96, 0, 32, 32],
      'pickup-homing': [128, 0, 32, 32],
    },
  }),
)
