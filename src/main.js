import './style.css'
import { createLoop } from './loop.js'
import { createInput, readControls, KEYMAPS } from './input.js'
import { lerpWrap, lerpAngle } from './sim/arena.js'
import { Vector2 } from './sim/vector.js'
import { World } from './sim/world.js'
import { Ship, SHIP } from './sim/ship.js'
import { createRespawnMenu } from './ui/respawn-menu.js'
import { PICKUP_EFFECTS } from './sim/pickup.js'
import { circleCollisions } from './sim/collision.js'
import { resolveCollision } from './sim/rules.js'
import { homingSystem } from './sim/homing.js'
import { startDirector } from './sim/director.js'
import { setupCanvas } from './render/canvas.js'
import {
  drawArena,
  drawShip,
  drawBullet,
  drawAsteroid,
  drawPickup,
  drawExplosion,
  drawHud,
} from './render/draw.js'

const params = new URLSearchParams(window.location.search)
const experiment = params.get('exp') ?? ''

const app = document.querySelector('#app')
app.innerHTML = `<canvas id="game" tabindex="0"></canvas>`

const canvas = document.querySelector('#game')
const { ctx, size } = setupCanvas(canvas)
const input = createInput(window)

const world = new World({
  width: size.width,
  height: size.height,
  detect: circleCollisions,
  resolve: resolveCollision,
  systems: [homingSystem],
})

window.addEventListener('resize', () => {
  world.width = size.width
  world.height = size.height
})

const players = [
  {
    slot: 0,
    name: 'P1',
    color: '#38bdf8',
    keys: KEYMAPS.p1,
    autoRespawn: false, // respawns from the menu
    score: 0, // current life; reset on death
    asteroids: 0, // asteroids destroyed this life; reset on death
    best: 0,
    deaths: 0,
    ship: null,
    lastDeath: null,
  },
]

Ship.spawnFor(world, players[0], new Vector2(size.width / 2, size.height / 2))
startDirector(world)

const respawnMenu = createRespawnMenu(app, {
  delay: SHIP.respawnDelay,
  onRespawn: (player) => Ship.spawnFor(world, player),
})

// ---- Lab 2: the `this` bug, on purpose. Press F. -------------------------
// ?exp=this-bug   → naive: the listener gets a detached method
// ?exp=this-fix   → fixed with an arrow wrapper
let lastError = ''
if (experiment === 'this-bug') {
  const ship = players[0].ship
  // BUG: we pass the function, not the call. addEventListener later invokes it
  // with this === window (the currentTarget), so `this.#cooldown` inside
  // fire() throws "TypeError: Cannot read private member #cooldown ...".
  // (Fires on ANY key — that's the naive version.)
  window.addEventListener('keydown', ship.fire)
  window.addEventListener('error', (e) => {
    lastError = e.message
  })
} else if (experiment === 'this-fix') {
  // FIX: arrow wrapper — `ship.fire()` is a method call, implicit binding.
  // Reads players[0].ship at call time, so it also works after respawn
  // (ship.fire.bind(ship) would keep pointing at the dead ship).
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyF') players[0].ship?.fire()
  })
}

// ---- Lab 1 experiments (still available) ---------------------------------
const autoThrust = experiment === 'variable' || experiment === 'fixed-log'
const logUntil = performance.now() + 5000
let logged = false

function simulate(dt) {
  const inputs = players.map((p) => readControls(input, p.keys))
  if (autoThrust) inputs[0].thrust = true

  world.step(dt, inputs)

  if (
    autoThrust &&
    !logged &&
    performance.now() >= logUntil &&
    players[0].ship
  ) {
    logged = true
    const { pos, vel } = players[0].ship
    console.info('[lab-01] position after 5s of thrust', {
      experiment: experiment || 'fixed',
      x: pos.x,
      y: pos.y,
      vx: vel.x,
      vy: vel.y,
    })
  }
}

function viewOf(e, alpha) {
  return {
    x: lerpWrap(e.prevPos.x, e.pos.x, alpha, world.width),
    y: lerpWrap(e.prevPos.y, e.pos.y, alpha, world.height),
    angle: lerpAngle(e.prevAngle, e.angle, alpha),
  }
}

const renderers = new Map([
  ['asteroid', (e, v) => drawAsteroid(ctx, e, v)],
  ['pickup', (e, v) => drawPickup(ctx, e, v, world.time, PICKUP_EFFECTS)],
  ['ship', (e, v) => drawShip(ctx, e, v, world.time)],
  ['bullet', (e, v) => drawBullet(ctx, e, v)],
  ['explosion', (e, v) => drawExplosion(ctx, e, v)],
])
const drawOrder = [...renderers.keys()]

const labels = {
  block: 'EXP1 blocking 100ms / 60 frames',
  interval: 'EXP2 setInterval(16) instead of rAF',
  variable: 'EXP3 variable dt (hold thrust 5s, see console)',
  'fixed-log': 'control: fixed step + 5s thrust log',
  'this-bug':
    "THIS BUG: press any key → addEventListener('keydown', ship.fire)",
  'this-fix': 'THIS FIX: press F → () => players[0].ship?.fire()',
}

function render(alpha, stats) {
  drawArena(ctx, size.width, size.height)

  for (const kind of drawOrder) {
    const draw = renderers.get(kind)
    for (const e of world.ofKind(kind)) draw(e, viewOf(e, alpha))
  }

  const extra = labels[experiment] ?? ''
  drawHud(ctx, {
    error: lastError,
    stats,
    players,
    world,
    width: size.width,
    height: size.height,
    effects: PICKUP_EFFECTS,
    extra,
  })
  respawnMenu.update(players[0], world.time)
  input.endFrame()
}

const loop = createLoop({
  step: 1 / 60,
  simulate,
  render,
  useInterval: experiment === 'interval',
  variableStep: experiment === 'variable',
  blockEvery: experiment === 'block' ? 60 : 0,
  blockMs: experiment === 'block' ? 100 : 0,
})

loop.start()
canvas.focus()

// handy for console experiments: __lab.world, __lab.players[0].ship, ...
window.__lab = { loop, world, players, size, Vector2, Ship }

if (experiment === 'interval') {
  setTimeout(() => {
    console.info(
      '[lab-01] setInterval frame-time stats (10s)',
      loop.getFrameTimeStats(),
    )
  }, 10_000)
}
