/**
 * Collision RESPONSE. Called by World.step for every [a, b] pair from the
 * detector. Rules look at kind and at components (`pickup`, `takeDamage`),
 * so a new entity type usually needs no new rule.
 */
const CONTACT_DAMAGE = { asteroid: 15, ship: 8 }

export function resolveCollision(world, a, b) {
  if (handle(world, a, b)) return
  handle(world, b, a)
}

function handle(world, a, b) {
  if (a.kind === 'bullet') return hitByBullet(world, a, b)

  if (a.pickup && b.kind === 'ship') {
    b.applyEffect(a.pickup.effect, a.pickup.duration)
    world.despawn(a.id)
    return true
  }

  if (a.kind === 'ship' && (b.kind === 'asteroid' || b.kind === 'ship')) {
    bounce(world, a, b)
    if (a.contactCooldown <= 0) {
      a.takeDamage(CONTACT_DAMAGE[b.kind])
      a.contactCooldown = 0.5
    }
    if (b.kind === 'ship' && b.contactCooldown <= 0) {
      b.takeDamage(CONTACT_DAMAGE.ship)
      b.contactCooldown = 0.5
    }
    return true
  }

  if (a.kind === 'asteroid' && b.kind === 'asteroid') {
    bounce(world, a, b)
    return true
  }

  return false
}

function hitByBullet(world, bullet, target) {
  // bullets pass through pickups, explosions and other bullets
  if (typeof target.takeDamage !== 'function') return true
  // no friendly fire on your own ship
  if (target.player && target.player === bullet.player) return true

  target.takeDamage(bullet.damage, bullet.player)
  world.despawn(bullet.id)
  return true
}

/** Elastic collision of two circles, mass ~ radius². */
function bounce(world, a, b) {
  const d = world.delta(a.pos, b.pos)
  const dist = d.length() || 0.0001
  const n = d.scale(1 / dist)
  const ma = a.radius * a.radius
  const mb = b.radius * b.radius

  // push apart so they don't stay overlapped
  const overlap = a.radius + b.radius - dist
  if (overlap > 0) {
    a.pos = a.pos.sub(n.scale((overlap * mb) / (ma + mb)))
    b.pos = b.pos.add(n.scale((overlap * ma) / (ma + mb)))
  }

  const relative = a.vel.sub(b.vel).dot(n)
  if (relative <= 0) return // already separating
  const impulse = (2 * relative) / (ma + mb)
  a.vel = a.vel.sub(n.scale(impulse * mb))
  b.vel = b.vel.add(n.scale(impulse * ma))
}
