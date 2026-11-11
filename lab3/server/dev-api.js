import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

/**
 * Vite plugin: a tiny dev "backend" until Lab 4 replaces it with a real server.
 *
 *  GET /api/rooms                 → room list (player counts drift over time)
 *  GET /api/rooms?fail=timeout    → never answers in time (client timeout)
 *  GET /api/rooms?fail=500        → server error
 *  GET /assets/manifest.json?fail=404,timeout,badjson,flaky,abort&latency=ms
 *                                 → manifest with injected faults (failure gallery)
 *  /__slow/<ms>/<path>            → serves <path> after a delay
 *  /__flaky/<n>/<key>/<path>      → 503 for the first n requests, then serves <path>
 */
const ROOMS = [
  { id: 'alpha', name: 'Alpha Station', arena: 'classic', maxPlayers: 8 },
  { id: 'swarm', name: 'Red Swarm', arena: 'swarm', maxPlayers: 6 },
  { id: 'belt', name: 'Calm Belt', arena: 'calm', maxPlayers: 4 },
  {
    id: 'full',
    name: 'Full House',
    arena: 'classic',
    maxPlayers: 4,
    full: true,
  },
]

function playersIn(room, tick) {
  if (room.full) return room.maxPlayers
  const h =
    Math.abs(Math.sin(tick * 12.9898 + room.id.length * 78.233)) * 43758.5453
  return Math.floor((h % 1) * room.maxPlayers)
}

function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(typeof body === 'string' ? body : JSON.stringify(body))
}

const MANIFEST = new URL('../public/assets/manifest.json', import.meta.url)

function applyFaults(manifest, faults, latency) {
  const nonce = randomUUID().slice(0, 8)
  const abs = (url) => (url.startsWith('/') ? url : `/assets/${url}`)
  const slow = (url, ms) => `/__slow/${ms}${abs(url)}`

  if (faults.has('404')) manifest.sprites.fx.url = 'sprites/fx-missing.svg'
  if (faults.has('badjson')) manifest.data.arenas.url = 'arenas-broken.json'
  if (faults.has('flaky')) {
    manifest.sprites.ships.url = `/__flaky/2/${nonce}${abs(manifest.sprites.ships.url)}`
  }
  if (faults.has('timeout')) {
    manifest.sounds.explosion.url = slow(manifest.sounds.explosion.url, 60_000)
  }
  if (faults.has('abort') && !latency) latency = 400

  if (latency) {
    for (const group of [manifest.data, manifest.sprites, manifest.sounds]) {
      for (const item of Object.values(group)) {
        if (!item.url.startsWith('/__slow/')) item.url = slow(item.url, latency)
      }
    }
  }
  return manifest
}

function middleware(req, res, next) {
  const url = new URL(req.url, 'http://localhost')

  let m = url.pathname.match(/^\/__slow\/(\d+)(\/.*)$/)
  if (m) {
    const timer = setTimeout(() => {
      req.url = m[2]
      next()
    }, Number(m[1]))
    req.on('close', () => clearTimeout(timer)) // client aborted / timed out
    return
  }

  m = url.pathname.match(/^\/__flaky\/(\d+)\/([\w-]+)(\/.*)$/)
  if (m) {
    const key = m[2] + m[3]
    const seen = flaky.get(key) ?? 0
    if (seen < Number(m[1])) {
      flaky.set(key, seen + 1)
      res.statusCode = 503
      res.end('Service Unavailable (injected)')
      return
    }
    req.url = m[3]
    next()
    return
  }

  if (url.pathname === '/assets/manifest.json' && url.search) {
    const faults = new Set(
      (url.searchParams.get('fail') ?? '').split(',').filter(Boolean),
    )
    const latency = Number(url.searchParams.get('latency')) || 0
    readFile(MANIFEST, 'utf8')
      .then((text) =>
        sendJson(res, 200, applyFaults(JSON.parse(text), faults, latency)),
      )
      .catch((err) => sendJson(res, 500, { error: String(err) }))
    return
  }

  if (url.pathname === '/api/rooms') {
    const fail = url.searchParams.get('fail')
    if (fail === '500') return sendJson(res, 500, { error: 'injected failure' })
    if (fail === 'badjson') return sendJson(res, 200, '{"rooms": [')
    const delay = fail === 'timeout' ? 30_000 : 80 + Math.random() * 120
    const timer = setTimeout(() => {
      const tick = Math.floor(Date.now() / 4000)
      sendJson(res, 200, {
        serverTime: new Date().toISOString(),
        rooms: ROOMS.map(({ full, ...room }) => ({
          ...room,
          players: playersIn({ full, ...room }, tick),
        })),
      })
    }, delay)
    req.on('close', () => clearTimeout(timer))
    return
  }

  next()
}

const flaky = new Map()

export function devApi() {
  return {
    name: 'space-arena-dev-api',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}
