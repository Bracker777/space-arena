import { shortestDelta } from './arena.js'

/**
 * Homing as a COMPONENT (plain data) + a SYSTEM (a function over the world).
 * Attach to anything that moves: `bullet.homing = makeHoming({...})`,
 * `asteroid.homing = makeHoming({...})`. The entity class doesn't change.
 */
export function makeHoming({
  targetKinds,
  turnRate = 3,
  range = 400,
  ignorePlayer = null,
}) {
  return {
    targetKinds: new Set(targetKinds),
    turnRate, // rad/s the velocity vector may rotate
    range,
    ignorePlayer, // don't chase entities owned by this player
    targetId: null,
  }
}

function isValidTarget(world, self, h, target) {
  if (!target || !target.alive || target === self) return false
  if (!h.targetKinds.has(target.kind)) return false
  if (h.ignorePlayer && target.player === h.ignorePlayer) return false
  return world.delta(self.pos, target.pos).length() <= h.range
}

function findTarget(world, self, h) {
  let best = null
  let bestDist = Infinity
  for (const e of world) {
    if (!isValidTarget(world, self, h, e)) continue
    const d = world.delta(self.pos, e.pos).lengthSq()
    if (d < bestDist) {
      bestDist = d
      best = e
    }
  }
  return best
}

export function homingSystem(world, dt) {
  for (const e of world) {
    const h = e.homing
    if (!h || !e.alive) continue

    let target = h.targetId == null ? null : world.get(h.targetId)
    if (!isValidTarget(world, e, h, target)) target = findTarget(world, e, h)
    h.targetId = target ? target.id : null
    if (!target) continue

    const desired = world.delta(e.pos, target.pos).angle()
    const current = e.vel.angle()
    const diff = shortestDelta(current, desired, Math.PI * 2)
    const maxTurn = h.turnRate * dt
    const turn = Math.max(-maxTurn, Math.min(maxTurn, diff))
    e.vel = e.vel.rotate(turn) // speed is preserved, only direction changes
  }
}
