import { Entity } from './entity.js'
import { Vector2 } from './vector.js'
import { Explosion } from './explosion.js'
import { Pickup } from './pickup.js'
import { makeHoming } from './homing.js'

export const ASTEROID_SIZES = {
  3: { radius: 44, hp: 75, speed: 50, score: 20 },
  2: { radius: 27, hp: 40, speed: 80, score: 30 },
  1: { radius: 15, hp: 20, speed: 120, score: 50 },
}

export class Asteroid extends Entity {
  constructor({ pos, vel, size = 3, hunter = false }) {
    const spec = ASTEROID_SIZES[size]
    super({
      kind: 'asteroid',
      pos,
      vel,
      angle: Math.random() * Math.PI * 2,
      radius: spec.radius,
    })
    this.size = size
    this.hp = spec.hp
    this.spin = (Math.random() - 0.5) * 1.2
    this.shape = Array.from({ length: 11 }, () => 0.75 + Math.random() * 0.3)

    // composition: same homing component as bullets, slow turn rate
    if (hunter) {
      this.homing = makeHoming({
        targetKinds: ['ship'],
        turnRate: 0.7,
        range: 520,
      })
    }
  }

  static random(pos, size = 3, hunter = false) {
    const speed = ASTEROID_SIZES[size].speed * (0.6 + Math.random() * 0.6)
    return new Asteroid({
      pos,
      vel: Vector2.fromAngle(Math.random() * Math.PI * 2, speed),
      size,
      hunter,
    })
  }

  update(dt) {
    super.update(dt)
    this.angle += this.spin * dt
  }

  takeDamage(amount, byPlayer = null) {
    if (!this.alive) return false
    this.hp -= amount
    if (this.hp <= 0) this.#destroy(byPlayer)
    return true
  }

  #destroy(byPlayer) {
    const world = this.world
    world.despawn(this.id)
    world.spawn(
      new Explosion({
        pos: this.pos,
        color: this.homing ? '#f87171' : '#cbd5e1',
        count: 10 + this.size * 8,
      }),
    )
    if (byPlayer) {
      byPlayer.score += ASTEROID_SIZES[this.size].score
      byPlayer.asteroids = (byPlayer.asteroids ?? 0) + 1
    }

    if (this.size > 1) {
      for (let i = 0; i < 2; i++)
        world.spawn(Asteroid.random(this.pos, this.size - 1))
    }
    if (Math.random() < 0.15) world.spawn(Pickup.random(this.pos))
  }
}
