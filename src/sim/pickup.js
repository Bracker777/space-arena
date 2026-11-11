import { Entity } from './entity.js'

export const PICKUP_EFFECTS = {
  shield: { duration: 5, color: '#a3e635', label: 'S' },
  rapid: { duration: 6, color: '#fbbf24', label: 'R' },
  homing: { duration: 8, color: '#c084fc', label: 'H' },
}

/**
 * Stationary, collidable, NOT a ship. What it does on touch is data in the
 * `pickup` component; the collision rule only checks `other.pickup`.
 */
export class Pickup extends Entity {
  constructor({ pos, effect = 'shield', ttl = 12 }) {
    super({ kind: 'pickup', pos, radius: 13 })
    this.pickup = { effect, duration: PICKUP_EFFECTS[effect].duration }
    this.ttl = ttl
    this.age = 0
  }

  static random(pos) {
    const effects = Object.keys(PICKUP_EFFECTS)
    return new Pickup({
      pos,
      effect: effects[Math.floor(Math.random() * effects.length)],
    })
  }

  update(dt) {
    // no super.update: pickups don't move
    this.age += dt
    this.ttl -= dt
    if (this.ttl <= 0) this.world.despawn(this.id)
  }
}
