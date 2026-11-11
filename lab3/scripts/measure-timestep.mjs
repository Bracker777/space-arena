import { Ship } from '../src/sim/ship.js'
import { Vector2 } from '../src/sim/vector.js'
import { wrap } from '../src/sim/arena.js'

const width = 1280
const height = 720
const hold = { thrust: true }

function stepShip(ship, dt) {
  ship.control(hold, dt)
  ship.pos = ship.pos.add(ship.vel.scale(dt))
  ship.pos = new Vector2(wrap(ship.pos.x, width), wrap(ship.pos.y, height))
}

function run(variable, seconds = 5) {
  const ship = new Ship({ pos: new Vector2(width / 2, height / 2) })
  const step = 1 / 60
  let t = 0
  let steps = 0

  if (variable) {
    const dts = [1 / 60, 1 / 30, 1 / 12, 1 / 8]
    let i = 0
    while (t < seconds) {
      const dt = dts[i % dts.length]
      stepShip(ship, dt)
      t += dt
      steps++
      i++
    }
  } else {
    const n = Math.round(seconds / step)
    for (let i = 0; i < n; i++) {
      stepShip(ship, step)
      steps++
    }
    t = n * step
  }

  return {
    mode: variable ? 'variable' : 'fixed',
    t,
    steps,
    x: ship.pos.x,
    y: ship.pos.y,
    vx: ship.vel.x,
    vy: ship.vel.y,
    speed: ship.vel.length(),
  }
}

console.log(
  JSON.stringify({ a: run(false), b: run(false), c: run(true) }, null, 2),
)
