import { Entity } from './entity.js'
import { Vector2 } from './vector.js'

/** Visual-only entity: a burst of particles. Not solid, despawns itself. */
export class Explosion extends Entity {
  constructor({
    pos,
    vel = Vector2.ZERO,
    color = '#fbbf24',
    count = 24,
    power = 180,
    ttl = 0.9,
  }) {
    super({ kind: 'explosion', pos, vel, radius: 0, solid: false })
    this.color = color
    this.ttl = ttl
    this.maxTtl = ttl
    this.particles = Array.from({ length: count }, () => ({
      offset: Vector2.ZERO,
      vel: Vector2.fromAngle(
        Math.random() * Math.PI * 2,
        power * (0.25 + Math.random()),
      ),
      size: 1 + Math.random() * 2.5,
    }))
  }

  update(dt) {
    super.update(dt)
    this.vel = this.vel.scale(Math.exp(-2 * dt))
    const drag = Math.exp(-2.5 * dt)
    for (const p of this.particles) {
      p.offset = p.offset.add(p.vel.scale(dt))
      p.vel = p.vel.scale(drag)
    }
    this.ttl -= dt
    if (this.ttl <= 0) this.world.despawn(this.id)
  }
}
